
-- Fix overly permissive subscription policy
DROP POLICY "Service can manage subscriptions" ON public.subscriptions;

-- Users can insert their own subscription
CREATE POLICY "Users insert own subscription"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users update own subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
