-- Replace service_role usage with SECURITY DEFINER function + tightened RLS.
-- Goal: prevent score replay without exposing service_role key in the API.

-- ── start_flappy_session: atomic balance check + insert ─────────────────────
-- Runs as function owner (postgres) so RLS does not apply inside the function.
-- Authenticated callers cannot bypass the balance check because the function
-- is the only allowed path to insert into flappy_credit_log.

CREATE OR REPLACE FUNCTION start_flappy_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  pre_credits INT := 0;
  wk_credits INT := 0;
  admin_grants INT := 0;
  spent INT := 0;
  new_session_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Pre-pool credits
  SELECT COALESCE(selectie_punten, 0) + COALESCE(basis_xi_punten, 0)
    INTO pre_credits
    FROM scores WHERE user_id = uid;
  pre_credits := COALESCE(pre_credits, 0);

  -- WK match prediction credits (5 exact, 2 correct result)
  SELECT COALESCE(SUM(
    CASE
      WHEN mp.home_score = m.home_score AND mp.away_score = m.away_score THEN 5
      WHEN sign(mp.home_score - mp.away_score) = sign(m.home_score - m.away_score) THEN 2
      ELSE 0
    END
  ), 0)
    INTO wk_credits
    FROM match_predictions mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.user_id = uid
      AND m.is_finished = TRUE
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL;

  -- Admin-granted credits
  SELECT COALESCE(SUM(amount), 0)
    INTO admin_grants
    FROM flappy_credit_grants WHERE user_id = uid;

  -- Already spent
  SELECT COUNT(*) INTO spent
    FROM flappy_credit_log WHERE user_id = uid;

  IF (pre_credits + wk_credits + admin_grants - spent) <= 0 THEN
    RAISE EXCEPTION 'No credits available' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO flappy_credit_log (user_id)
  VALUES (uid)
  RETURNING session_id INTO new_session_id;

  RETURN new_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION start_flappy_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION start_flappy_session() FROM anon;
GRANT EXECUTE ON FUNCTION start_flappy_session() TO authenticated;

-- ── flappy_scores INSERT policy ─────────────────────────────────────────────
-- Restore INSERT via user JWT client. RLS enforces:
--   1. user_id matches caller (no impersonation)
--   2. credit_log_id references a session owned by caller
-- UNIQUE(credit_log_id) prevents replaying with a different score.

DROP POLICY IF EXISTS "flappy_scores_insert" ON flappy_scores;
CREATE POLICY "flappy_scores_insert" ON flappy_scores
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM flappy_credit_log
      WHERE session_id = credit_log_id
        AND user_id = auth.uid()
    )
  );
