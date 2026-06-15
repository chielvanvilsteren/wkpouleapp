-- Keep Flappy Bal season-2 credits in one ledger:
-- flappy_credit_grants contains pre-poule and manual grants, match predictions
-- are calculated live, and flappy_credit_log contains spent credits.

ALTER TABLE public.flappy_credit_grants
  ADD COLUMN IF NOT EXISTS season INT;

UPDATE public.flappy_credit_grants
SET season = 2
WHERE season IS NULL;

ALTER TABLE public.flappy_credit_grants
  ALTER COLUMN season SET DEFAULT 2,
  ALTER COLUMN season SET NOT NULL;

ALTER TABLE public.flappy_credit_log
  ADD COLUMN IF NOT EXISTS season INT;

UPDATE public.flappy_credit_log
SET season = 2
WHERE season IS NULL;

ALTER TABLE public.flappy_credit_log
  ALTER COLUMN season SET DEFAULT 2,
  ALTER COLUMN season SET NOT NULL;

DROP POLICY IF EXISTS "flappy_credit_grants_delete_admin" ON public.flappy_credit_grants;
CREATE POLICY "flappy_credit_grants_delete_admin"
  ON public.flappy_credit_grants
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.start_flappy_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  wk_credits INT := 0;
  grant_credits INT := 0;
  spent INT := 0;
  new_session_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- WK match prediction credits (5 exact, 2 correct result)
  SELECT COALESCE(SUM(
    CASE
      WHEN mp.home_score = m.home_score AND mp.away_score = m.away_score THEN 5
      WHEN sign(mp.home_score - mp.away_score) = sign(m.home_score - m.away_score) THEN 2
      ELSE 0
    END
  ), 0)
    INTO wk_credits
    FROM public.match_predictions mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.user_id = uid
      AND m.is_finished = TRUE
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL;

  -- Pre-poule and manual season-2 grants.
  SELECT COALESCE(SUM(amount), 0)
    INTO grant_credits
    FROM public.flappy_credit_grants
    WHERE user_id = uid
      AND season = 2;

  -- Already spent in season 2.
  SELECT COUNT(*)
    INTO spent
    FROM public.flappy_credit_log
    WHERE user_id = uid
      AND season = 2;

  IF (wk_credits + grant_credits - spent) <= 0 THEN
    RAISE EXCEPTION 'No credits available' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.flappy_credit_log (user_id, season)
  VALUES (uid, 2)
  RETURNING session_id INTO new_session_id;

  RETURN new_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_flappy_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_flappy_session() FROM anon;
GRANT EXECUTE ON FUNCTION public.start_flappy_session() TO authenticated;
