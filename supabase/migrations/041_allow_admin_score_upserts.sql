-- Allow authenticated admins to run score recalculations without requiring the
-- service-role key in the Next.js route.

GRANT INSERT, UPDATE ON TABLE public.scores TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.wk_scores TO authenticated;

DROP POLICY IF EXISTS "scores_insert_admin" ON public.scores;
CREATE POLICY "scores_insert_admin"
  ON public.scores
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "scores_update_admin" ON public.scores;
CREATE POLICY "scores_update_admin"
  ON public.scores
  FOR UPDATE
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())))
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "wk_scores_insert_admin" ON public.wk_scores;
CREATE POLICY "wk_scores_insert_admin"
  ON public.wk_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "wk_scores_update_admin" ON public.wk_scores;
CREATE POLICY "wk_scores_update_admin"
  ON public.wk_scores
  FOR UPDATE
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())))
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));
