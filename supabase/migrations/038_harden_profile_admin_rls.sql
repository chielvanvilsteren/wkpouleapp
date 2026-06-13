-- Harden admin authorization.
--
-- RLS decides which rows are reachable, not which columns may be changed.
-- The old profiles_update_own policy allowed users to update their own row,
-- which could include is_admin if the Data API role also had table-level UPDATE.

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT TRUE
      FROM public.profiles
      WHERE id = p_user_id
        AND is_admin = TRUE
      LIMIT 1
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_admin(UUID) FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(UUID) TO authenticated;

-- Keep direct profile edits narrow. Profile rows are created by the auth trigger;
-- normal users may only rename themselves, never self-promote or change participation.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "predictions_select_admin" ON public.predictions;
CREATE POLICY "predictions_select_admin" ON public.predictions
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "uitslag_write_admin" ON public.master_uitslag;
CREATE POLICY "uitslag_write_admin" ON public.master_uitslag
  FOR ALL
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())))
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "matches_write_admin" ON public.matches;
CREATE POLICY "matches_write_admin" ON public.matches
  FOR ALL
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())))
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "mp_select_admin" ON public.match_predictions;
CREATE POLICY "mp_select_admin" ON public.match_predictions
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "wkiu_write_admin" ON public.wk_incidents_uitslag;
CREATE POLICY "wkiu_write_admin" ON public.wk_incidents_uitslag
  FOR ALL
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())))
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "flappy_credit_grants_select_admin" ON public.flappy_credit_grants;
CREATE POLICY "flappy_credit_grants_select_admin"
  ON public.flappy_credit_grants
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "flappy_credit_grants_insert_admin" ON public.flappy_credit_grants;
CREATE POLICY "flappy_credit_grants_insert_admin"
  ON public.flappy_credit_grants
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins kunnen sync_logs lezen" ON public.sync_logs;
CREATE POLICY "Admins kunnen sync_logs lezen"
  ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins kunnen sync_logs verwijderen" ON public.sync_logs;
CREATE POLICY "Admins kunnen sync_logs verwijderen"
  ON public.sync_logs
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins kunnen sync_logs schrijven" ON public.sync_logs;
CREATE POLICY "Admins kunnen sync_logs schrijven"
  ON public.sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "push_admin_read" ON public.push_subscriptions;
CREATE POLICY "push_admin_read"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "flappy_credit_log_select_admin" ON public.flappy_credit_log;
CREATE POLICY "flappy_credit_log_select_admin"
  ON public.flappy_credit_log
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "suspicious_admin_select" ON public.flappy_suspicious_attempts;
CREATE POLICY "suspicious_admin_select"
  ON public.flappy_suspicious_attempts
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));
