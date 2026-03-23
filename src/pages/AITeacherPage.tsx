import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Play, ChevronRight, ChevronLeft, Loader2, ArrowLeft,
  BookOpen, Clock, CheckCircle2, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Upload {
  id: string;
  file_name: string;
  created_at: string;
}

interface Lesson {
  title: string;
  objective: string;
  estimatedMinutes: number;
}

interface CourseOutline {
  courseTitle: string;
  description: string;
  lessons: Lesson[];
}

export default function AITeacherPage() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);

  // Course state
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [lessonContent, setLessonContent] = useState("");
  const [isTeaching, setIsTeaching] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [slideText, setSlideText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("uploads")
        .select("id, file_name, created_at")
        .eq("user_id", user.id)
        .eq("status", "analyzed")
        .order("created_at", { ascending: false });
      setUploads(data || []);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (isTeaching) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [lessonContent, isTeaching]);

  const getSlideText = async (uploadId: string) => {
    const { data } = await supabase
      .from("generated_content")
      .select("content")
      .eq("upload_id", uploadId)
      .eq("content_type", "summary")
      .single();
    if (data?.content) {
      return typeof data.content === "string" ? data.content : JSON.stringify(data.content);
    }
    return "";
  };

  const generateOutline = async (upload: Upload) => {
    setSelectedUpload(upload);
    setGeneratingOutline(true);
    try {
      const text = await getSlideText(upload.id);
      setSlideText(text);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ slideText: text, mode: "generate_outline" }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to generate outline");
      setOutline(result.content);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate course");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const startLesson = async (index: number) => {
    if (!outline || !selectedUpload) return;
    setCurrentLessonIndex(index);
    setLessonContent("");
    setIsTeaching(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          slideText,
          topic: outline.lessons[index].title,
          lessonIndex: index,
          mode: "teach_lesson",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setLessonContent(accumulated);
            }
          } catch { /* partial */ }
        }
      }

      setCompletedLessons(prev => new Set([...prev, index]));
    } catch (e: any) {
      toast.error(e.message || "Lesson failed");
    } finally {
      setIsTeaching(false);
    }
  };

  const progressPercent = outline
    ? Math.round((completedLessons.size / outline.lessons.length) * 100)
    : 0;

  // Select a topic screen
  if (!selectedUpload) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            AI Teacher
          </h1>
          <p className="text-muted-foreground mt-1">Choose a topic and let AI teach you like a real professor</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : uploads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground mb-1">No topics yet</h3>
              <p className="text-sm text-muted-foreground">Upload lecture slides first, then come back for AI-powered lessons</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {uploads.map((upload, i) => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                  onClick={() => generateOutline(upload)}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{upload.file_name.replace(/\.[^.]+$/, "")}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(upload.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Generating outline loading
  if (generatingOutline) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-glow animate-pulse">
          <GraduationCap className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Preparing your course...</h2>
        <p className="text-sm text-muted-foreground">AI is creating a structured lesson plan from your slides</p>
        <Loader2 className="w-5 h-5 animate-spin text-primary mt-4" />
      </div>
    );
  }

  // Course outline / lesson view
  if (outline && currentLessonIndex === null) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedUpload(null); setOutline(null); setCompletedLessons(new Set()); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
        </Button>

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{outline.courseTitle}</h1>
          <p className="text-muted-foreground mt-1">{outline.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" /> {outline.lessons.length} lessons
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" /> {outline.lessons.reduce((a, l) => a + l.estimatedMinutes, 0)} min
            </Badge>
          </div>
        </div>

        {completedLessons.size > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-medium text-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <div className="space-y-3">
          {outline.lessons.map((lesson, i) => {
            const isCompleted = completedLessons.has(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? "border-primary/30 bg-primary/5" : "hover:border-primary/50"}`}
                  onClick={() => startLesson(i)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{lesson.objective}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{lesson.estimatedMinutes} min</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active lesson view
  if (outline && currentLessonIndex !== null) {
    const lesson = outline.lessons[currentLessonIndex];
    const isFirst = currentLessonIndex === 0;
    const isLast = currentLessonIndex === outline.lessons.length - 1;

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentLessonIndex(null); setLessonContent(""); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Course Outline
          </Button>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="w-3 h-3" /> Lesson {currentLessonIndex + 1} of {outline.lessons.length}
          </Badge>
        </div>

        <div className="mb-3 shrink-0">
          <h2 className="text-lg font-display font-bold text-foreground">{lesson.title}</h2>
          <Progress value={((currentLessonIndex + (completedLessons.has(currentLessonIndex) ? 1 : 0)) / outline.lessons.length) * 100} className="h-1.5 mt-2" />
        </div>

        {/* Lesson content */}
        <Card className="flex-1 overflow-hidden border-border/50">
          <div ref={scrollRef} className="h-full overflow-y-auto p-6">
            {lessonContent ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="prose prose-sm max-w-none dark:prose-invert [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base">
                  <ReactMarkdown>{lessonContent}</ReactMarkdown>
                </div>
                {isTeaching && (
                  <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Teaching...</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Your AI teacher is preparing the lesson...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        {!isTeaching && lessonContent && (
          <div className="flex justify-between mt-4 shrink-0">
            <Button variant="outline" disabled={isFirst} onClick={() => startLesson(currentLessonIndex - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            {isLast ? (
              <Button onClick={() => { setCurrentLessonIndex(null); setLessonContent(""); }}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Finish Course
              </Button>
            ) : (
              <Button onClick={() => startLesson(currentLessonIndex + 1)}>
                Next Lesson <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
