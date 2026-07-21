import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_MAX_AGE_DAYS = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { uploadId, refresh } = await req.json();
    if (!uploadId) throw new Error("uploadId is required");

    // Verify user owns the upload
    const { data: upload } = await supabase
      .from("uploads")
      .select("id, file_name, user_id")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!upload) throw new Error("Upload not found");

    // Check cache unless refresh requested
    if (!refresh) {
      const { data: cached } = await supabase
        .from("video_recommendations")
        .select("*")
        .eq("upload_id", uploadId)
        .order("relevance_score", { ascending: false });

      if (cached && cached.length > 0) {
        const newest = new Date(cached[0].cached_at).getTime();
        const ageDays = (Date.now() - newest) / 86_400_000;
        if (ageDays < CACHE_MAX_AGE_DAYS) {
          return new Response(JSON.stringify({ videos: cached, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch the topic summary to build the query
    const { data: summaryRow } = await supabase
      .from("generated_content")
      .select("content")
      .eq("upload_id", uploadId)
      .eq("content_type", "summary")
      .maybeSingle();

    const title: string = summaryRow?.content?.title || upload.file_name.replace(/\.(pdf|pptx?|docx?)$/i, "");
    const summary: string = summaryRow?.content?.summary || "";
    const keyTerms: string[] = (summaryRow?.content?.key_terms || [])
      .map((t: any) => t?.term)
      .filter(Boolean)
      .slice(0, 4);

    const searchQuery = `${title} ${keyTerms.join(" ")} lecture explanation`.trim().slice(0, 200);

    // YouTube search
    const ytUrl =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
      `&videoEmbeddable=true&maxResults=10&safeSearch=strict` +
      `&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`;
    const ytResp = await fetch(ytUrl);
    if (!ytResp.ok) {
      const t = await ytResp.text();
      console.error("YouTube API error:", ytResp.status, t);
      throw new Error(`YouTube API error (${ytResp.status})`);
    }
    const ytData = await ytResp.json();
    const items = (ytData.items || []).map((v: any) => ({
      id: v.id?.videoId,
      title: v.snippet?.title,
      description: v.snippet?.description,
      channel: v.snippet?.channelTitle,
      thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url,
    })).filter((v: any) => v.id);

    if (items.length === 0) {
      return new Response(JSON.stringify({ videos: [], cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask Gemini to rerank
    const rerankPrompt = `Given this lecture topic:
Title: ${title}
Summary: ${summary}

Rank these YouTube videos by educational relevance for a beginner student. Return the top 3 as strict JSON, no markdown:
${JSON.stringify(items.map(({ id, title, description, channel }) => ({ id, title, description: (description || "").slice(0, 300), channel })))}

Return: { "videos": [{ "id": "", "relevance_score": 0-100, "reason": "one short sentence" }] }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an educational content curator. Reply with valid JSON only, no markdown." },
          { role: "user", content: rerankPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI rerank error:", aiResp.status, t);
      // Fallback: use YouTube's order
    }

    let ranked: { id: string; relevance_score: number; reason: string }[] = [];
    try {
      const aiData = await aiResp.json();
      const raw = aiData.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      ranked = JSON.parse(cleaned).videos || [];
    } catch {
      ranked = items.slice(0, 3).map((v: any, i: number) => ({
        id: v.id,
        relevance_score: 80 - i * 5,
        reason: "Top YouTube result",
      }));
    }

    const rows = ranked
      .map((r) => {
        const src = items.find((v: any) => v.id === r.id);
        if (!src) return null;
        return {
          upload_id: uploadId,
          user_id: user.id,
          video_id: src.id,
          title: src.title,
          thumbnail: src.thumbnail,
          channel_name: src.channel,
          duration: null,
          relevance_score: Math.max(0, Math.min(100, Math.round(r.relevance_score || 0))),
          reason: r.reason || "",
          watched: false,
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      // Clear old cache for this topic, then insert new
      await supabase.from("video_recommendations").delete().eq("upload_id", uploadId);
      const { error: insErr } = await supabase.from("video_recommendations").insert(rows as any);
      if (insErr) console.error("Insert error:", insErr);
    }

    const { data: fresh } = await supabase
      .from("video_recommendations")
      .select("*")
      .eq("upload_id", uploadId)
      .order("relevance_score", { ascending: false });

    return new Response(JSON.stringify({ videos: fresh || [], cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-videos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});