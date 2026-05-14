-- Allow authenticated users to read all credit log entries for stats (games played count)
DROP POLICY IF EXISTS "flappy_credit_log_select_own" ON flappy_credit_log;
CREATE POLICY "flappy_credit_log_select"
  ON flappy_credit_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
