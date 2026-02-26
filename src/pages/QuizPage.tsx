import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HelpCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: string;
  question_type: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

export default function QuizPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setQuestions((data as QuizQuestion[]) || []);
        setLoading(false);
      });
  }, [user]);

  const current = questions[currentIndex];

  const checkAnswer = (qId: string) => {
    const answer = answers[qId]?.toLowerCase().trim();
    const correct = current.correct_answer.toLowerCase().trim();
    const isCorrect = answer === correct || 
      (current.question_type === "true_false" && answer === correct) ||
      (current.question_type === "mcq" && answer === correct);
    
    setShowResult(prev => ({ ...prev, [qId]: true }));
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(i => Math.min(i + 1, questions.length - 1));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quiz</h1>
          <p className="text-muted-foreground mt-1">{questions.length} questions available</p>
        </div>
        {score.total > 0 && (
          <Badge variant="outline" className="text-base px-4 py-1">
            Score: {score.correct}/{score.total}
          </Badge>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16">
          <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No quiz questions yet. Upload slides and generate a quiz!</p>
        </div>
      ) : current && (
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-sm text-muted-foreground text-center">Question {currentIndex + 1} of {questions.length}</p>

          <motion.div key={current.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="capitalize">{current.question_type.replace("_", "/")}</Badge>
                </div>
                <CardTitle className="font-display text-lg leading-relaxed">{current.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {current.question_type === "mcq" && current.options && (
                  <RadioGroup
                    value={answers[current.id] || ""}
                    onValueChange={(v) => setAnswers(prev => ({ ...prev, [current.id]: v }))}
                    disabled={!!showResult[current.id]}
                  >
                    {(current.options as string[]).map((opt, i) => (
                      <div key={i} className={cn(
                        "flex items-center space-x-2 p-3 rounded-lg border transition-colors",
                        showResult[current.id] && opt.toLowerCase().trim() === current.correct_answer.toLowerCase().trim()
                          ? "border-success bg-success/5"
                          : showResult[current.id] && answers[current.id] === opt
                            ? "border-destructive bg-destructive/5"
                            : "border-border"
                      )}>
                        <RadioGroupItem value={opt} id={`opt-${i}`} />
                        <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {current.question_type === "true_false" && (
                  <RadioGroup
                    value={answers[current.id] || ""}
                    onValueChange={(v) => setAnswers(prev => ({ ...prev, [current.id]: v }))}
                    disabled={!!showResult[current.id]}
                  >
                    {["True", "False"].map((opt) => (
                      <div key={opt} className={cn(
                        "flex items-center space-x-2 p-3 rounded-lg border transition-colors",
                        showResult[current.id] && opt.toLowerCase() === current.correct_answer.toLowerCase()
                          ? "border-success bg-success/5"
                          : showResult[current.id] && answers[current.id] === opt
                            ? "border-destructive bg-destructive/5"
                            : "border-border"
                      )}>
                        <RadioGroupItem value={opt} id={`tf-${opt}`} />
                        <Label htmlFor={`tf-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {current.question_type === "short_answer" && (
                  <Input
                    placeholder="Type your answer..."
                    value={answers[current.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
                    disabled={!!showResult[current.id]}
                  />
                )}

                {showResult[current.id] && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1 mb-1">
                      {answers[current.id]?.toLowerCase().trim() === current.correct_answer.toLowerCase().trim() ? (
                        <><CheckCircle2 className="w-4 h-4 text-success" /> Correct!</>
                      ) : (
                        <><XCircle className="w-4 h-4 text-destructive" /> Incorrect. Answer: {current.correct_answer}</>
                      )}
                    </p>
                    {current.explanation && <p className="text-sm text-muted-foreground">{current.explanation}</p>}
                  </motion.div>
                )}

                <div className="flex justify-between pt-2">
                  {!showResult[current.id] ? (
                    <Button onClick={() => checkAnswer(current.id)} disabled={!answers[current.id]}>
                      Check Answer
                    </Button>
                  ) : (
                    <Button onClick={nextQuestion} disabled={currentIndex >= questions.length - 1}>
                      Next Question →
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
