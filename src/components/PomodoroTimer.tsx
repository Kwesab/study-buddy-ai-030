import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Timer as TimerIcon, Coffee } from "lucide-react";
import { toast } from "sonner";

const FOCUS = 25 * 60;
const BREAK = 5 * 60;

export function PomodoroTimer({ uploadId }: { uploadId?: string | null }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === "focus") {
      logSession();
      setCompleted((c) => c + 1);
      toast.success("Focus complete! Take a 5-minute break.");
      setPhase("break");
      setSecondsLeft(BREAK);
    } else {
      toast("Break over — back to focus.", { icon: "📚" });
      setPhase("focus");
      setSecondsLeft(FOCUS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const logSession = async () => {
    if (!user) return;
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      upload_id: uploadId ?? null,
      duration_minutes: 25,
      session_type: "pomodoro",
    });
  };

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(FOCUS);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {phase === "focus" ? (
            <TimerIcon className="w-5 h-5 text-primary" />
          ) : (
            <Coffee className="w-5 h-5 text-emerald-500" />
          )}
          <div>
            <div className="text-2xl font-display font-bold tabular-nums">
              {mm}:{ss}
            </div>
            <p className="text-xs text-muted-foreground capitalize">{phase} session</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {completed} done today
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}