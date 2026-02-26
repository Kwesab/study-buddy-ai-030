import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { entries } = await req.json();

    // Also get weak topics from quiz performance
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("upload_id, is_correct")
      .eq("user_id", user.id);

    let weakTopicsInfo = "";
    if (attempts && attempts.length > 0) {
      const grouped: Record<string, { total: number; correct: number }> = {};
      attempts.forEach((a: any) => {
        if (!grouped[a.upload_id]) grouped[a.upload_id] = { total: 0, correct: 0 };
        grouped[a.upload_id].total++;
        if (a.is_correct) grouped[a.upload_id].correct++;
      });

      const { data: uploads } = await supabase
        .from("uploads")
        .select("id, file_name")
        .in("id", Object.keys(grouped));

      const weak = Object.entries(grouped)
        .filter(([_, v]) => v.correct / v.total < 0.6)
        .map(([uid, v]) => {
          const name = uploads?.find((u: any) => u.id === uid)?.file_name || uid;
          return `${name}: ${Math.round((v.correct / v.total) * 100)}% correct`;
        });

      if (weak.length > 0) {
        weakTopicsInfo = `\n\nWeak topics that need extra study time:\n${weak.join("\n")}`;
      }
    }

    const prompt = `You are an AI study planner for a university student. Based on their schedule, generate an optimized weekly study plan.

The student's schedule:
${JSON.stringify(entries, null, 2)}
${weakTopicsInfo}

Create a personalized study plan that:
1. Uses free time slots between existing commitments
2. Allocates more time to weak topics
3. Includes breaks and varied study methods
4. Considers optimal study session lengths (25-50 min with breaks)

Return JSON: {"schedule": [{"day": "Monday", "time": "14:00-15:30", "activity": "...", "description": "...", "tips": "..."}], "summary": "...", "weekly_hours": 0}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert study planner. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    await supabase.from("study_plans").insert({
      user_id: user.id,
      plan_data: parsed,
    });

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
