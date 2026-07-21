CREATE TABLE IF NOT EXISTS public.video_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail TEXT,
  channel_name TEXT,
  duration TEXT,
  relevance_score INT NOT NULL DEFAULT 0,
  reason TEXT,
  watched BOOLEAN NOT NULL DEFAULT false,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (upload_id, video_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_recommendations TO authenticated;
GRANT ALL ON public.video_recommendations TO service_role;

ALTER TABLE public.video_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own video recommendations"
  ON public.video_recommendations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all video recommendations"
  ON public.video_recommendations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_video_recs_upload ON public.video_recommendations(upload_id);