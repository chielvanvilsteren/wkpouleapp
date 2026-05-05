-- Flappy Bal easter egg scores

CREATE TABLE IF NOT EXISTS flappy_scores (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      INT NOT NULL,
  played_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flappy_scores ENABLE ROW LEVEL SECURITY;

-- Iedereen die ingelogd is mag alle scores lezen (globaal scorebord)
CREATE POLICY "flappy_scores_select"
  ON flappy_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Je mag alleen je eigen score invoegen
CREATE POLICY "flappy_scores_insert"
  ON flappy_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);
