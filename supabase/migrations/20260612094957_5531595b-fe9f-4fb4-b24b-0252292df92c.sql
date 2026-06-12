-- 1. SM-2 columns on flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS easiness FLOAT NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repetitions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Difficulty level on uploads (topics)
ALTER TABLE public.uploads
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'medium';

-- 3. study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  session_type TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study sessions"
  ON public.study_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all study sessions"
  ON public.study_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created
  ON public.study_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review
  ON public.flashcards(user_id, next_review_date);