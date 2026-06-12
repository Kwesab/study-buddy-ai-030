import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { cacheData, getCachedData } from "@/lib/offlineDb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { sm2, QUALITY_LABELS, type SM2Quality, type SM2State } from "@/lib/sm2";
import { PomodoroTimer } from "@/components/PomodoroTimer";

interface Flashcard extends SM2State {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  mastered: boolean;
  upload_id: string | null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"due" | "all">("due");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (online) {
        const { data } = await supabase
          .from("flashcards")
          .select("*")
          .eq("user_id", user.id)
          .order("next_review_date", { ascending: true });
        const fc = (data as Flashcard[]) || [];
        setCards(fc);
        cacheData("flashcards", fc);
      } else {
        const cached = await getCachedData<Flashcard>("flashcards");
        setCards(cached);
      }
      setLoading(false);
    };
    load();
  }, [user, online]);

  const dueCount = useMemo(
    () => cards.filter((c) => new Date(c.next_review_date).getTime() <= Date.now()).length,
    [cards],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => new Date(c.next_review_date).getTime() <= Date.now());
  }, [cards, filter]);

  const current = filtered[currentIndex];

  const rate = async (quality: SM2Quality) => {
    if (!current) return;
    const updated = sm2(
      {
        easiness: current.easiness ?? 2.5,
        interval: current.interval ?? 1,
        repetitions: current.repetitions ?? 0,
        next_review_date: current.next_review_date ?? new Date().toISOString(),
      },
      quality,
    );
    await supabase
      .from("flashcards")
      .update({
        easiness: updated.easiness,
        interval: updated.interval,
        repetitions: updated.repetitions,
        next_review_date: updated.next_review_date,
        mastered: updated.repetitions >= 3 && quality >= 4,
      })
      .eq("id", current.id);

    setCards((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, ...updated } : c)),
    );
    setFlipped(false);
    setCurrentIndex((i) => (filtered.length > 1 ? (i + 1) % filtered.length : 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Flashcards</h1>
          <p className="text-muted-foreground mt-1">
            {cards.length} cards · <span className="text-primary font-medium">{dueCount} due today</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "due" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("due");
              setCurrentIndex(0);
            }}
          >
            Due ({dueCount})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("all");
              setCurrentIndex(0);
            }}
          >
            All
          </Button>
        </div>
      </div>

      <PomodoroTimer uploadId={current?.upload_id ?? null} />

      {filtered.length === 0 || !current ? (
        <div className="text-center py-16">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {cards.length === 0
              ? "No flashcards yet. Upload slides and generate flashcards!"
              : "Nothing due right now — come back later 🎉"}
          </p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {currentIndex + 1} / {filtered.length}
            </span>
            <Badge variant="outline" className="text-xs">
              reps {current.repetitions ?? 0} · ease {(current.easiness ?? 2.5).toFixed(2)}
            </Badge>
          </div>

          <div
            className="cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            style={{ perspective: "1000px" }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative"
            >
              <Card
                className={cn(
                  "min-h-[260px] flex items-center justify-center p-8 border-border/50 relative",
                  flipped && "[transform:rotateY(180deg)]",
                )}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(flipped ? current.answer : current.question);
                  }}
                  aria-label="Read aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                <CardContent className="p-0 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {flipped ? "Answer" : "Question"}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {flipped ? current.answer : current.question}
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {QUALITY_LABELS.map(({ quality, label, tone }) => (
              <Button
                key={label}
                disabled={!flipped}
                onClick={() => rate(quality)}
                className={cn("h-auto py-2 flex flex-col", flipped && tone)}
                variant={flipped ? "default" : "outline"}
              >
                <span className="font-semibold">{label}</span>
                <span className="text-[10px] opacity-80">q={quality}</span>
              </Button>
            ))}
          </div>
          {!flipped && (
            <p className="text-xs text-center text-muted-foreground">
              Flip the card to rate how well you knew the answer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
