-- Bind each flappy play session to a credit log entry to prevent score replay attacks.
-- Inserts now go via service role in the API (balance check enforced there), so
-- the INSERT RLS policies on both tables are dropped.

-- Add session_id to credit log (generated server-side, returned to client)
ALTER TABLE flappy_credit_log
  ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();

-- Backfill existing rows
UPDATE flappy_credit_log SET session_id = gen_random_uuid() WHERE session_id IS NULL;

ALTER TABLE flappy_credit_log
  ALTER COLUMN session_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS flappy_credit_log_session_id_key
  ON flappy_credit_log(session_id);

-- Bind each saved score to its session (UNIQUE prevents replaying with a different score)
ALTER TABLE flappy_scores
  ADD COLUMN IF NOT EXISTS credit_log_id UUID REFERENCES flappy_credit_log(session_id);

CREATE UNIQUE INDEX IF NOT EXISTS flappy_scores_credit_log_id_key
  ON flappy_scores(credit_log_id);

-- Remove INSERT policies — inserts only allowed via service role (API)
DROP POLICY IF EXISTS "flappy_credit_log_insert_own" ON flappy_credit_log;
DROP POLICY IF EXISTS "flappy_scores_insert" ON flappy_scores;
