import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface TopicPerformance {
  uploadId: string;
  fileName: string;
  total: number;
  correct: number;
  percentage: number;
}

export default function PerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);

  useEffect(() => {
    if (!user) return;
    loadPerformance();
  }, [user]);

  const loadPerformance = async () => {
    setLoading(true);

    // Get all attempts grouped by upload
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("upload_id, is_correct")
      .eq("user_id", user!.id);

    if (!attempts || attempts.length === 0) {
      setLoading(false);
      return;
    }

    // Group by upload_id
    const grouped: Record<string, { total: number; correct: number }> = {};
    attempts.forEach((a) => {
      if (!grouped[a.upload_id]) grouped[a.upload_id] = { total: 0, correct: 0 };
      grouped[a.upload_id].total++;
      if (a.is_correct) grouped[a.upload_id].correct++;
    });

    // Get upload names
    const uploadIds = Object.keys(grouped);
    const { data: uploads } = await supabase
      .from("uploads")
      .select("id, file_name")
      .in("id", uploadIds);

    const results: TopicPerformance[] = uploadIds.map((uid) => ({
      uploadId: uid,
      fileName: uploads?.find((u) => u.id === uid)?.file_name || "Unknown",
      total: grouped[uid].total,
      correct: grouped[uid].correct,
      percentage: Math.round((grouped[uid].correct / grouped[uid].total) * 100),
    }));

    results.sort((a, b) => a.percentage - b.percentage);
    setTopics(results);
    setLoading(false);
  };

  const weakTopics = topics.filter((t) => t.percentage < 60);
  const strongTopics = topics.filter((t) => t.percentage >= 80);
  const overallCorrect = topics.reduce((s, t) => s + t.correct, 0);
  const overallTotal = topics.reduce((s, t) => s + t.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Performance Tracker</h1>
        <p className="text-muted-foreground mt-1">Identify weak topics and focus your study</p>
      </div>

      {topics.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No quiz attempts yet. Take some quizzes to track your performance!</p>
            <Link to="/quiz"><Button className="mt-4">Go to Quiz</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall score */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50 gradient-card">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                  <Badge variant={overallPct >= 70 ? "default" : "destructive"}>{overallPct}%</Badge>
                </div>
                <Progress value={overallPct} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">{overallCorrect} correct out of {overallTotal} attempts</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weak topics alert */}
          {weakTopics.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" /> Weak Topics — Focus Here
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {weakTopics.map((t) => (
                    <div key={t.uploadId} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate max-w-[200px]">{t.fileName}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={t.percentage} className="w-24 h-2" />
                        <span className="text-xs font-medium text-destructive w-10 text-right">{t.percentage}%</span>
                      </div>
                    </div>
                  ))}
                  <Link to="/quiz">
                    <Button size="sm" variant="outline" className="mt-2">Retry Weak Topics</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* All topics breakdown */}
          <div className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">Topic Breakdown</h2>
            {topics.map((t, i) => (
              <motion.div key={t.uploadId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {t.percentage >= 80 ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : t.percentage < 60 ? (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        ) : (
                          <Target className="w-4 h-4 text-warning" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate max-w-[250px]">{t.fileName}</span>
                      </div>
                      <Badge variant="outline">{t.correct}/{t.total}</Badge>
                    </div>
                    <Progress value={t.percentage} className="h-2" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
