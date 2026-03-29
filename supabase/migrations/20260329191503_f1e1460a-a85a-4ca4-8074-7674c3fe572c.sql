-- Admin read access for tables that don't have it yet
CREATE POLICY "Admins read all flashcards" ON public.flashcards FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all generated_content" ON public.generated_content FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all quiz_questions" ON public.quiz_questions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all study_plans" ON public.study_plans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all timetable_entries" ON public.timetable_entries FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all achievements" ON public.achievements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin delete access for content moderation
CREATE POLICY "Admins delete uploads" ON public.uploads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete flashcards" ON public.flashcards FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete generated_content" ON public.generated_content FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete chat_messages" ON public.chat_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete quiz_questions" ON public.quiz_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete quiz_attempts" ON public.quiz_attempts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));