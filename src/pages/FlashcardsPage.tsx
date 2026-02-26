import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, RotateCcw, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  mastered: boolean;
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "unmastered">("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCards((data as Flashcard[]) || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = filter === "all" ? cards : cards.filter(c => !c.mastered);
  const current = filtered[currentIndex];

  const toggleMastered = async (id: string, mastered: boolean) => {
    await supabase.from("flashcards").update({ mastered }).eq("id", id);
    setCards(prev => prev.map(c => c.id === id ? { ...c, mastered } : c));
  };

  const next = () => {
    setFlipped(false);
    setCurrentIndex(i => (i + 1) % filtered.length);
  };

  const prev = () => {
    setFlipped(false);
    setCurrentIndex(i => (i - 1 + filtered.length) % filtered.length);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Flashcards</h1>
          <p className="text-muted-foreground mt-1">{cards.length} cards total · {cards.filter(c => c.mastered).length} mastered</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setCurrentIndex(0); }}>All</Button>
          <Button variant={filter === "unmastered" ? "default" : "outline"} size="sm" onClick={() => { setFilter("unmastered"); setCurrentIndex(0); }}>To Review</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {cards.length === 0 ? "No flashcards yet. Upload slides and generate flashcards!" : "All flashcards mastered! 🎉"}
          </p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-center text-sm text-muted-foreground">{currentIndex + 1} / {filtered.length}</p>

          <div className="cursor-pointer" onClick={() => setFlipped(!flipped)} style={{ perspective: "1000px" }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative"
            >
              <Card className={cn(
                "min-h-[250px] flex items-center justify-center p-8 border-border/50",
                flipped && "[transform:rotateY(180deg)]"
              )}>
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

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prev}>← Previous</Button>
            <div className="flex gap-2">
              <Button
                variant={current.mastered ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMastered(current.id, !current.mastered)}
              >
                <Check className="w-4 h-4 mr-1" />
                {current.mastered ? "Mastered" : "Mark Mastered"}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={next}>Next →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
