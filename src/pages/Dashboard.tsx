import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, BookOpen, CreditCard, HelpCircle, Sparkles, TrendingUp, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface Stats {
  uploads: number;
  summaries: number;
  flashcards: number;
  quizzes: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ uploads: 0, summaries: 0, flashcards: 0, quizzes: 0 });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("uploads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([u, s, f, q]) => {
      setStats({
        uploads: u.count ?? 0,
        summaries: s.count ?? 0,
        flashcards: f.count ?? 0,
        quizzes: q.count ?? 0,
      });
    });
  }, [user]);

  const cards = [
    { title: "Uploads", value: stats.uploads, icon: Upload, to: "/upload", color: "text-primary" },
    { title: "Summaries", value: stats.summaries, icon: BookOpen, to: "/summaries", color: "text-accent" },
    { title: "Flashcards", value: stats.flashcards, icon: CreditCard, to: "/flashcards", color: "text-warning" },
    { title: "Quiz Questions", value: stats.quizzes, icon: HelpCircle, to: "/quiz", color: "text-info" },
    { title: "Performance", value: null, icon: TrendingUp, to: "/performance", color: "text-success" },
    { title: "Timetable", value: null, icon: CalendarDays, to: "/timetable", color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back! <Sparkles className="w-7 h-7 inline text-primary" />
        </h1>
        <p className="text-muted-foreground mt-1">Here's your study overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={card.to}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold text-foreground">{card.value !== null ? card.value : "→"}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/upload" className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-primary/10 transition-colors">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm text-foreground">Upload Lecture Slides</p>
                <p className="text-xs text-muted-foreground">PDF files supported</p>
              </div>
            </Link>
            <Link to="/ai-learning" className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-accent/10 transition-colors">
              <Sparkles className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium text-sm text-foreground">AI Learning Hub</p>
                <p className="text-xs text-muted-foreground">Chat tutor & structured lessons</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50 gradient-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              Upload your lecture slides (PDF)
            </p>
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              Generate summaries, flashcards & quizzes with AI
            </p>
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              Study with flashcards and test yourself
            </p>
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              Chat with AI tutor for deeper understanding
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
