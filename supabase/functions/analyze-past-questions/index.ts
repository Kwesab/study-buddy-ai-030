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

    const { pastQuestionId, extractedText } = await req.json();
    if (!pastQuestionId || !extractedText) throw new Error("Missing required fields");

    // Update status to processing
    await supabase.from("past_questions").update({ status: "processing", extracted_text: extractedText }).eq("id", pastQuestionId);

    const systemPrompt = `You are an expert academic tutor. You will receive text extracted from a past exam paper. Your job is to:
1. Identify each question in the paper
2. Provide detailed, well-explained answers for every question
3. Create comprehensive study notes based on the topics covered

IMPORTANT: Write at a level appropriate for university students. Be thorough but clear. Use examples where helpful.

Respond with valid JSON only (no markdown fences):
{
  "questions_and_answers": [
    {
      "question_number": "1",
      "question": "The full question text",
      "answer": "Detailed answer with explanation",
      "topic": "The topic this question covers"
    }
  ],
  "study_notes": {
    "title": "Study Notes: [Subject/Course]",
    "sections": [
      {
        "topic": "Topic name",
        "explanation": "Clear explanation of the topic",
        "key_points": ["point 1", "point 2"],
        "tips": "Exam tips for this topic"
      }
    ],
    "summary": "Overall summary of key themes"
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the past exam paper content:\n\n${extractedText}` },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      await supabase.from("past_questions").update({ status: "failed" }).eq("id", pastQuestionId);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    // Save results
    await supabase.from("past_questions").update({
      answers: parsed.questions_and_answers || parsed,
      study_notes: parsed.study_notes || {},
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", pastQuestionId);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-past-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
