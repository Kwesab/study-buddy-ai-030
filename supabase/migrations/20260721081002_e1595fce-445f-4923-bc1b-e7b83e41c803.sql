-- exam_predictions
CREATE TABLE IF NOT EXISTS public.exam_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  predictions JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_predictions TO authenticated;
GRANT ALL ON public.exam_predictions TO service_role;

ALTER TABLE public.exam_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exam predictions"
  ON public.exam_predictions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all exam predictions"
  ON public.exam_predictions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_exam_predictions_user_subject
  ON public.exam_predictions(user_id, subject);

-- concept_maps
CREATE TABLE IF NOT EXISTS public.concept_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (upload_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concept_maps TO authenticated;
GRANT ALL ON public.concept_maps TO service_role;

ALTER TABLE public.concept_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own concept maps"
  ON public.concept_maps FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all concept maps"
  ON public.concept_maps FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));