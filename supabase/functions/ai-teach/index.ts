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

    const { slideText, topic, lessonIndex, mode } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "generate_outline") {
      systemPrompt = `You are an expert university lecturer creating a course outline. Given lecture content, break it down into 4-8 bite-sized lessons that build on each other, like a Coursera course.

Return ONLY valid JSON in this format:
{
  "courseTitle": "string",
  "description": "One sentence course overview",
  "lessons": [
    {
      "title": "Lesson title",
      "objective": "What the student will learn",
      "estimatedMinutes": 5
    }
  ]
}`;
      userPrompt = `Create a course outline from this lecture content:\n\n${slideText}`;
    } else if (mode === "teach_lesson") {
      systemPrompt = `You are a warm, engaging university lecturer teaching a live class. Your job is to teach ONE lesson clearly and thoroughly, as if you're standing in front of students.

Rules:
- Start with a friendly greeting and tell students what they'll learn
- Use simple language a beginner can understand
- Use real-world analogies and examples (like explaining to a friend)
- Break complex ideas into small, digestible pieces
- Use markdown formatting: headers, bold for key terms, bullet points
- Include 1-2 "Think about it" moments where you pose a question and then answer it
- End with a brief recap and a preview of what's next
- Keep the tone conversational and encouraging, like a great professor
- Use emojis sparingly for warmth (🎯, 💡, 🤔, ✅)

Make the student feel like they're in an actual classroom with an amazing teacher.`;
      userPrompt = `You are teaching lesson ${lessonIndex + 1} about "${topic}" from this lecture material:\n\n${slideText}\n\nTeach this lesson now. Make it feel like a real class session.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: mode === "teach_lesson",
        ...(mode === "generate_outline" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    if (mode === "teach_lesson") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    return new Response(JSON.stringify({ content: JSON.parse(content) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-teach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
