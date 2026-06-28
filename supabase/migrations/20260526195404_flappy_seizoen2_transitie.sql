
-- Wijzig default season in flappy_scores van 1 naar 2 (nieuwe scores krijgen seizoen 2)
ALTER TABLE flappy_scores ALTER COLUMN season SET DEFAULT 2;

-- Voeg season toe aan flappy_credit_log (bestaande = seizoen 1)
ALTER TABLE flappy_credit_log ADD COLUMN season SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE flappy_credit_log ALTER COLUMN season SET DEFAULT 2;

-- Voeg season toe aan flappy_credit_grants (bestaande = seizoen 1)
ALTER TABLE flappy_credit_grants ADD COLUMN season SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE flappy_credit_grants ALTER COLUMN season SET DEFAULT 2;

-- Verwijder dagelijkse credit cron jobs (10:00 en 13:00 CEST)
SELECT cron.unschedule(1);
SELECT cron.unschedule(2);

-- start_flappy_session: geen pre-pool credits meer, gefilterd op seizoen 2
CREATE OR REPLACE FUNCTION start_flappy_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  wk_credits INT := 0;
  admin_grants INT := 0;
  spent INT := 0;
  new_session_id UUID;
  current_season CONSTANT SMALLINT := 2;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Flappy credits via correcte WK-voorspellingen (5 exact, 2 goed resultaat)
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

  -- Admin-gegunde credits (alleen seizoen 2)
  SELECT COALESCE(SUM(amount), 0)
    INTO admin_grants
    FROM flappy_credit_grants
    WHERE user_id = uid AND season = current_season;

  -- Al gespeelde potjes (alleen seizoen 2)
  SELECT COUNT(*) INTO spent
    FROM flappy_credit_log
    WHERE user_id = uid AND season = current_season;

  IF (wk_credits + admin_grants - spent) <= 0 THEN
    RAISE EXCEPTION 'No credits available' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO flappy_credit_log (user_id, season)
  VALUES (uid, current_season)
  RETURNING session_id INTO new_session_id;

  RETURN new_session_id;
END;
$$;
;
