export interface SM2State {
  easiness: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function sm2(card: SM2State, quality: SM2Quality): SM2State {
  let { easiness, interval, repetitions } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }
  easiness = Math.max(
    1.3,
    easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const next_review_date = new Date(Date.now() + interval * 86_400_000).toISOString();
  return { easiness, interval, repetitions, next_review_date };
}

export const QUALITY_LABELS: { quality: SM2Quality; label: string; tone: string }[] = [
  { quality: 0, label: "Again", tone: "bg-destructive text-destructive-foreground" },
  { quality: 3, label: "Hard", tone: "bg-amber-500 text-white" },
  { quality: 4, label: "Good", tone: "bg-primary text-primary-foreground" },
  { quality: 5, label: "Easy", tone: "bg-emerald-500 text-white" },
];