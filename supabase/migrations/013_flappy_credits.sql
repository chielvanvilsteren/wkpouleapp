-- Bijhoudt hoeveel Flappy Bal-potjes een gebruiker heeft gespeeld (= credits verbruikt)

CREATE TABLE IF NOT EXISTS flappy_credit_log (
  id        SERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flappy_credit_log ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag alleen zijn eigen log zien
CREATE POLICY "flappy_credit_log_select_own"
  ON flappy_credit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Gebruiker mag alleen zijn eigen entry invoegen
CREATE POLICY "flappy_credit_log_insert_own"
  ON flappy_credit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
