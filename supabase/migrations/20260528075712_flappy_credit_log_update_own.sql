CREATE POLICY "flappy_credit_log_update_own" ON flappy_credit_log FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);;
