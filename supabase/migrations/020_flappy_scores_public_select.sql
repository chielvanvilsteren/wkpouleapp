-- Allow unauthenticated reads for public leaderboard display
DROP POLICY "flappy_scores_select" ON flappy_scores;
CREATE POLICY "flappy_scores_select"
  ON flappy_scores FOR SELECT
  USING (true);
