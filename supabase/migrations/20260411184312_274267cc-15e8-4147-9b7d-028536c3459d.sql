
CREATE TABLE public.past_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  extracted_text text,
  answers jsonb DEFAULT '{}'::jsonb,
  study_notes jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.past_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own past questions" ON public.past_questions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all past questions" ON public.past_questions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete past questions" ON public.past_questions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for past question files
INSERT INTO storage.buckets (id, name, public) VALUES ('past-questions', 'past-questions', false);

CREATE POLICY "Users upload own past questions" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'past-questions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own past questions" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'past-questions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own past questions" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'past-questions' AND auth.uid()::text = (storage.foldername(name))[1]);
