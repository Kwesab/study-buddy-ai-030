import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, PLAN_LIMITS, type Plan } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  User, Flame, Trophy, BookOpen, Brain, Target, Star,
  Upload, Zap, Crown, Loader2, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface ProfileData {
  display_name: string | null;
  study_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_study_minutes: number;
}

interface Achievement {
  achievement_key: string;
  unlocked_at: string;
}

const ACHIEVEMENT_DEFS: Record<string, { icon: typeof Trophy; label: string; description: string }> = {
  first_upload: { icon: Upload, label: "First Upload", description: "Uploaded your first lecture slides" },
  quiz_master: { icon: Brain, label: "Quiz Master", description: "Scored 100% on a quiz" },
  streak_7: { icon: Flame, label: "Week Warrior", description: "7-day study streak" },
  streak_30: { icon: Flame, label: "Monthly Grinder", description: "30-day study streak" },
  flashcard_100: { icon: Star, label: "Card Collector", description: "Studied 100 flashcards" },
  topics_10: { icon: BookOpen, label: "Scholar", description: "Uploaded 10 topics" },
  perfect_quiz_5: { icon: Target, label: "Sharpshooter", description: "5 perfect quizzes" },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { currentPlan, limits } = useSubscription();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({ uploads: 0, flashcards: 0, quizAttempts: 0, quizCorrect: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const [profileRes, achievRes, uploadsRes, flashRes, quizRes] = await Promise.all([
      supabase.from("profiles").select("display_name, study_streak, longest_streak, last_study_date, total_study_minutes").eq("user_id", user!.id).single(),
      supabase.from("achievements").select("achievement_key, unlocked_at").eq("user_id", user!.id),
      supabase.from("uploads").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("quiz_attempts").select("is_correct").eq("user_id", user!.id),
    ]);

    setProfile(profileRes.data);
    setAchievements(achievRes.data || []);
    setStats({
      uploads: uploadsRes.count ?? 0,
      flashcards: flashRes.count ?? 0,
      quizAttempts: quizRes.data?.length ?? 0,
      quizCorrect: quizRes.data?.filter(a => a.is_correct).length ?? 0,
    });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const quizPct = stats.quizAttempts > 0 ? Math.round((stats.quizCorrect / stats.quizAttempts) * 100) : 0;
  const unlockedKeys = new Set(achievements.map(a => a.achievement_key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your study stats and achievements</p>
      </div>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 overflow-hidden">
          <div className="h-24 gradient-hero" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
              <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-display font-bold text-foreground">
                  {profile?.display_name || user?.email?.split("@")[0]}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentPlan === "pro" ? "default" : "secondary"} className="gap-1">
                  {currentPlan === "pro" && <Crown className="w-3 h-3" />}
                  {limits.name} Plan
                </Badge>
                {currentPlan === "free" && (
                  <Link to="/pricing">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Zap className="w-3 h-3" /> Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Study Streak", value: `${profile?.study_streak ?? 0} days`, icon: Flame, color: "text-orange-500" },
          { label: "Longest Streak", value: `${profile?.longest_streak ?? 0} days`, icon: Calendar, color: "text-primary" },
          { label: "Topics Uploaded", value: stats.uploads, icon: Upload, color: "text-accent" },
          { label: "Quiz Accuracy", value: `${quizPct}%`, icon: Target, color: "text-info" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Study Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Study Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flashcards Created</span>
              <span className="font-medium text-foreground">{stats.flashcards}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quiz Attempts</span>
              <span className="font-medium text-foreground">{stats.quizAttempts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Correct Answers</span>
              <span className="font-medium text-foreground">{stats.quizCorrect}</span>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Quiz Accuracy</span>
                <span className="font-medium text-foreground">{quizPct}%</span>
              </div>
              <Progress value={quizPct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Plan</span>
              <Badge variant={currentPlan === "pro" ? "default" : "secondary"}>{limits.name}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Upload Limit</span>
              <span className="font-medium text-foreground">{limits.uploads === -1 ? "Unlimited" : limits.uploads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">AI Chat Limit</span>
              <span className="font-medium text-foreground">{limits.aiChats === -1 ? "Unlimited" : limits.aiChats}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">AI Teacher</span>
              <span className="font-medium text-foreground">{limits.teacher ? "✅ Enabled" : "❌ Upgrade needed"}</span>
            </div>
            {currentPlan !== "pro" && (
              <Link to="/pricing">
                <Button className="w-full mt-2 gap-1">
                  <Zap className="w-4 h-4" /> Upgrade Plan
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" /> Achievements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ACHIEVEMENT_DEFS).map(([key, def], i) => {
            const unlocked = unlockedKeys.has(key);
            return (
              <motion.div key={key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                <Card className={`border-border/50 transition-all ${unlocked ? "bg-primary/5 border-primary/30" : "opacity-50"}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unlocked ? "gradient-primary" : "bg-muted"}`}>
                      <def.icon className={`w-5 h-5 ${unlocked ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{def.label}</p>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    {unlocked && <Star className="w-4 h-4 text-warning ml-auto" />}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
