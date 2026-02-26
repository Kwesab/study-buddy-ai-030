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

    const { uploadId, action, slideText } = await req.json();

    const prompts: Record<string, string> = {
      summary: `You are an educational AI. Given the following lecture content, create a concise summary. Return JSON: {"title": "...", "summary": "...", "key_points": ["..."], "key_terms": [{"term": "...", "definition": "..."}]}

Lecture content:
${slideText}`,
      notes: `You are an educational AI. Create structured study notes from the following lecture. Return JSON: {"title": "...", "sections": [{"heading": "...", "content": "...", "bullet_points": ["..."]}]}

Lecture content:
${slideText}`,
      flashcards: `You are an educational AI. Generate 10 flashcards from this lecture content. Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}]}

Lecture content:
${slideText}`,
      quiz: `You are an educational AI. Generate exam-style questions from this lecture. Include 5 MCQ, 3 True/False, and 2 short answer questions. Return JSON: {"questions": [{"type": "mcq|true_false|short_answer", "question": "...", "options": ["..."] or null, "correct_answer": "...", "explanation": "..."}]}

Lecture content:
${slideText}`,
      study_guide: `You are an educational AI. Create a complete self-learning study guide from this lecture. Return JSON: {"title": "...", "learning_objectives": ["..."], "prerequisite_knowledge": ["..."], "study_plan": [{"topic": "...", "duration_minutes": 30, "activities": ["..."], "resources": ["..."]}], "review_questions": ["..."]}

Lecture content:
${slideText}`,
    };

    const prompt = prompts[action];
    if (!prompt) throw new Error(`Invalid action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert educational AI assistant. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    // Save to database based on action
    if (action === "flashcards" && parsed.flashcards) {
      const flashcardRows = parsed.flashcards.map((fc: any) => ({
        upload_id: uploadId,
        user_id: user.id,
        question: fc.question,
        answer: fc.answer,
        difficulty: fc.difficulty || "medium",
      }));
      await supabase.from("flashcards").insert(flashcardRows);
    } else if (action === "quiz" && parsed.questions) {
      const questionRows = parsed.questions.map((q: any) => ({
        upload_id: uploadId,
        user_id: user.id,
        question_type: q.type,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));
      await supabase.from("quiz_questions").insert(questionRows);
    } else if (["summary", "notes", "study_guide"].includes(action)) {
      await supabase.from("generated_content").insert({
        upload_id: uploadId,
        user_id: user.id,
        content_type: action,
        content: parsed,
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-slides error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
