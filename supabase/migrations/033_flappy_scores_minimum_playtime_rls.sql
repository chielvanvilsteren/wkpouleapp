-- Voeg tijdvalidatie toe aan flappy_scores INSERT policy.
-- Minimaal 1 seconde per gescoord punt moet verstreken zijn sinds sessiestart.
DROP POLICY IF EXISTS "flappy_scores_insert" ON flappy_scores;
CREATE POLICY "flappy_scores_insert" ON flappy_scores
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM flappy_credit_log cl
      WHERE cl.session_id = credit_log_id
        AND cl.user_id = auth.uid()
        AND EXTRACT(EPOCH FROM (NOW() - cl.played_at)) >= GREATEST(score * 1, 0)
    )
  );
