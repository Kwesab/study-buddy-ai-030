import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  BookOpen, CreditCard, HelpCircle, Loader2, ArrowLeft,
  FileText, CheckCircle2, XCircle, Check, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Upload {
  id: string;
  file_name: string;
  created_at: string;
}

interface ContentItem {
  id: string;
  content_type: string;
  content: any;
  upload_id: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  mastered: boolean;
  upload_id: string;
}

interface QuizQuestion {
  id: string;
  question_type: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  upload_id: string;
}

export default function TopicsPage() {
  const { user } = useAuth();
  
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [u, c, f, q] = await Promise.all([
        supabaseClient.from("uploads").select("id, file_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabaseClient.from("generated_content").select("id, content_type, content, upload_id").eq("user_id", user.id),
        supabaseClient.from("flashcards").select("*").eq("user_id", user.id),
        supabaseClient.from("quiz_questions").select("*").eq("user_id", user.id),
      ]);
      setUploads((u.data as Upload[]) || []);
      setContent((c.data as ContentItem[]) || []);
      setFlashcards((f.data as Flashcard[]) || []);
      setQuestions((q.data as QuizQuestion[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (selectedUpload) {
    const topicContent = content.filter(c => c.upload_id === selectedUpload.id);
    const topicFlashcards = flashcards.filter(f => f.upload_id === selectedUpload.id);
    const topicQuestions = questions.filter(q => q.upload_id === selectedUpload.id);

    return (
      <TopicDetail
        upload={selectedUpload}
        content={topicContent}
        flashcards={topicFlashcards}
        questions={topicQuestions}
        onBack={() => setSelectedUpload(null)}
        onFlashcardUpdate={(id, mastered) => {
          setFlashcards(prev => prev.map(f => f.id === id ? { ...f, mastered } : f));
        }}
        user={user}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Topics</h1>
        <p className="text-muted-foreground mt-1">Select a topic to view summaries, flashcards & quizzes</p>
      </div>

      {uploads.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No topics yet. Upload slides to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {uploads.map((upload, i) => {
            const hasContent = content.some(c => c.upload_id === upload.id);
            const fcCount = flashcards.filter(f => f.upload_id === upload.id).length;
            const qCount = questions.filter(q => q.upload_id === upload.id).length;
            const summaryCount = content.filter(c => c.upload_id === upload.id && c.content_type === "summary").length;

            return (
              <motion.div key={upload.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="border-border/50 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                  onClick={() => setSelectedUpload(upload)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{upload.file_name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {summaryCount > 0 && <Badge variant="secondary" className="text-xs">Summary</Badge>}
                          {fcCount > 0 && <Badge variant="secondary" className="text-xs">{fcCount} Cards</Badge>}
                          {qCount > 0 && <Badge variant="secondary" className="text-xs">{qCount} Quiz Q's</Badge>}
                          {!hasContent && fcCount === 0 && qCount === 0 && (
                            <span className="text-xs text-muted-foreground">Processing...</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Topic Detail View ─── */

function TopicDetail({
  upload, content, flashcards, questions, onBack, onFlashcardUpdate, user,
}: {
  upload: Upload;
  content: ContentItem[];
  flashcards: Flashcard[];
  questions: QuizQuestion[];
  onBack: () => void;
  onFlashcardUpdate: (id: string, mastered: boolean) => void;
  user: any;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground truncate">{upload.file_name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All study materials for this topic</p>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <BookOpen className="w-4 h-4 mr-1.5" /> Summary
          </TabsTrigger>
          <TabsTrigger value="flashcards">
            <CreditCard className="w-4 h-4 mr-1.5" /> Flashcards ({flashcards.length})
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <HelpCircle className="w-4 h-4 mr-1.5" /> Quiz ({questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <SummaryTab content={content} />
        </TabsContent>
        <TabsContent value="flashcards" className="mt-4">
          <FlashcardsTab flashcards={flashcards} onUpdate={onFlashcardUpdate} />
        </TabsContent>
        <TabsContent value="quiz" className="mt-4">
          <QuizTab questions={questions} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Summary Tab ─── */

function SummaryTab({ content }: { content: ContentItem[] }) {
  const summaries = content.filter(c => c.content_type === "summary");
  const notes = content.filter(c => c.content_type === "notes");
  const guides = content.filter(c => c.content_type === "study_guide");

  if (summaries.length === 0 && notes.length === 0 && guides.length === 0) {
    return <EmptyState text="No summaries or notes generated yet for this topic." />;
  }

  return (
    <div className="space-y-4">
      {summaries.map(item => (
        <Card key={item.id} className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">{item.content?.title || "Summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{item.content?.summary}</p>
            {item.content?.key_points && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-foreground">Key Points</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {item.content.key_points.map((p: string, j: number) => <li key={j}>{p}</li>)}
                </ul>
              </div>
            )}
            {item.content?.key_terms && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-foreground">Key Terms</h4>
                <div className="space-y-1">
                  {item.content.key_terms.map((t: any, j: number) => (
                    <p key={j} className="text-sm">
                      <span className="font-medium text-primary">{t.term}:</span>{" "}
                      <span className="text-muted-foreground">{t.definition}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {notes.map(item => (
        <Card key={item.id} className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">{item.content?.title || "Study Notes"}</CardTitle>
          </CardHeader>
          <CardContent>
            {item.content?.sections?.map((section: any, j: number) => (
              <div key={j} className="mb-4">
                <h4 className="font-medium text-foreground mb-1">{section.heading}</h4>
                <p className="text-sm text-muted-foreground mb-2">{section.content}</p>
                {section.bullet_points && (
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                    {section.bullet_points.map((p: string, k: number) => <li key={k}>{p}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {guides.map(item => (
        <Card key={item.id} className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">{item.content?.title || "Study Guide"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.content?.learning_objectives && (
              <div>
                <h4 className="font-medium text-sm text-foreground mb-1">Learning Objectives</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {item.content.learning_objectives.map((o: string, j: number) => <li key={j}>{o}</li>)}
                </ul>
              </div>
            )}
            {item.content?.study_plan?.map((plan: any, j: number) => (
              <div key={j} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm text-foreground">{plan.topic} <span className="text-muted-foreground">({plan.duration_minutes} min)</span></p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                  {plan.activities?.map((a: string, k: number) => <li key={k}>{a}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Flashcards Tab ─── */

function FlashcardsTab({ flashcards, onUpdate }: { flashcards: Flashcard[]; onUpdate: (id: string, m: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "unmastered">("all");

  const filtered = filter === "all" ? flashcards : flashcards.filter(c => !c.mastered);
  const current = filtered[index];

  const toggle = async (id: string, mastered: boolean) => {
    await supabase.from("flashcards").update({ mastered }).eq("id", id);
    onUpdate(id, mastered);
  };

  if (flashcards.length === 0) return <EmptyState text="No flashcards for this topic yet." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setIndex(0); setFlipped(false); }}>All ({flashcards.length})</Button>
        <Button variant={filter === "unmastered" ? "default" : "outline"} size="sm" onClick={() => { setFilter("unmastered"); setIndex(0); setFlipped(false); }}>To Review ({flashcards.filter(c => !c.mastered).length})</Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">All mastered! 🎉</p>
      ) : (
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-center text-sm text-muted-foreground">{index + 1} / {filtered.length}</p>
          <div className="cursor-pointer" onClick={() => setFlipped(!flipped)} style={{ perspective: "1000px" }}>
            <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.4 }} style={{ transformStyle: "preserve-3d" }} className="relative">
              <Card className={cn("min-h-[250px] flex items-center justify-center p-8 border-border/50", flipped && "[transform:rotateY(180deg)]")}>
                <CardContent className="p-0 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{flipped ? "Answer" : "Question"}</p>
                  <p className="text-lg font-medium text-foreground">{flipped ? current.answer : current.question}</p>
                  <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => { setFlipped(false); setIndex(i => (i - 1 + filtered.length) % filtered.length); }}>← Previous</Button>
            <Button variant={current.mastered ? "default" : "outline"} size="sm" onClick={() => toggle(current.id, !current.mastered)}>
              <Check className="w-4 h-4 mr-1" /> {current.mastered ? "Mastered" : "Mark Mastered"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setFlipped(false); setIndex(i => (i + 1) % filtered.length); }}>Next →</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Quiz Tab ─── */

function QuizTab({ questions, user }: { questions: QuizQuestion[]; user: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const current = questions[currentIndex];

  const checkAnswer = async (qId: string) => {
    const answer = answers[qId]?.toLowerCase().trim();
    const correct = current.correct_answer.toLowerCase().trim();
    const isCorrect = answer === correct;
    setShowResult(prev => ({ ...prev, [qId]: true }));
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id, question_id: current.id,
        upload_id: current.upload_id, selected_answer: answers[qId], is_correct: isCorrect,
      });
    }
  };

  if (questions.length === 0) return <EmptyState text="No quiz questions for this topic yet." />;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
        {score.total > 0 && <Badge variant="outline">Score: {score.correct}/{score.total}</Badge>}
      </div>

      {current && (
        <motion.div key={current.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-border/50">
            <CardHeader>
              <Badge variant="secondary" className="capitalize w-fit mb-2">{current.question_type.replace("_", "/")}</Badge>
              <CardTitle className="font-display text-lg leading-relaxed">{current.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {current.question_type === "mcq" && current.options && (
                <RadioGroup value={answers[current.id] || ""} onValueChange={v => setAnswers(p => ({ ...p, [current.id]: v }))} disabled={!!showResult[current.id]}>
                  {(current.options as string[]).map((opt, i) => (
                    <div key={i} className={cn(
                      "flex items-center space-x-2 p-3 rounded-lg border transition-colors",
                      showResult[current.id] && opt.toLowerCase().trim() === current.correct_answer.toLowerCase().trim() ? "border-primary bg-primary/5" :
                      showResult[current.id] && answers[current.id] === opt ? "border-destructive bg-destructive/5" : "border-border"
                    )}>
                      <RadioGroupItem value={opt} id={`opt-${current.id}-${i}`} />
                      <Label htmlFor={`opt-${current.id}-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {current.question_type === "true_false" && (
                <RadioGroup value={answers[current.id] || ""} onValueChange={v => setAnswers(p => ({ ...p, [current.id]: v }))} disabled={!!showResult[current.id]}>
                  {["True", "False"].map(opt => (
                    <div key={opt} className={cn(
                      "flex items-center space-x-2 p-3 rounded-lg border transition-colors",
                      showResult[current.id] && opt.toLowerCase() === current.correct_answer.toLowerCase() ? "border-primary bg-primary/5" :
                      showResult[current.id] && answers[current.id] === opt ? "border-destructive bg-destructive/5" : "border-border"
                    )}>
                      <RadioGroupItem value={opt} id={`tf-${current.id}-${opt}`} />
                      <Label htmlFor={`tf-${current.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {current.question_type === "short_answer" && (
                <Input placeholder="Type your answer..." value={answers[current.id] || ""} onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))} disabled={!!showResult[current.id]} />
              )}

              {showResult[current.id] && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1 mb-1">
                    {answers[current.id]?.toLowerCase().trim() === current.correct_answer.toLowerCase().trim()
                      ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Correct!</>
                      : <><XCircle className="w-4 h-4 text-destructive" /> Incorrect. Answer: {current.correct_answer}</>}
                  </p>
                  {current.explanation && <p className="text-sm text-muted-foreground">{current.explanation}</p>}
                </motion.div>
              )}

              <div className="flex justify-between pt-2">
                {!showResult[current.id] ? (
                  <Button onClick={() => checkAnswer(current.id)} disabled={!answers[current.id]}>Check Answer</Button>
                ) : (
                  <Button onClick={() => setCurrentIndex(i => Math.min(i + 1, questions.length - 1))} disabled={currentIndex >= questions.length - 1}>Next Question →</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
