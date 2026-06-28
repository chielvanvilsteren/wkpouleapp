
-- Exact port of the TypeScript minGameMs() function
CREATE OR REPLACE FUNCTION min_game_ms(p_score INT) RETURNS NUMERIC AS $$
DECLARE
  v_frames NUMERIC := 0;
  v_level INT;
  v_speed NUMERIC;
  v_interval INT;
  i INT;
BEGIN
  IF p_score <= 0 THEN RETURN 0; END IF;
  v_frames := ceil(810.0 / 3.8);
  FOR i IN 1..(p_score - 1) LOOP
    v_level := floor(i / 10);
    v_speed := LEAST(3.8 + v_level * 0.35, 6.5);
    v_interval := GREATEST(285 - v_level * 6, 230);
    v_frames := v_frames + ceil(v_interval::NUMERIC / v_speed);
  END LOOP;
  RETURN v_frames * (1000.0 / 60);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- All validation + insert in one SECURITY DEFINER function.
-- Bypasses RLS, so direct REST API calls can no longer insert scores.
CREATE OR REPLACE FUNCTION save_flappy_score(
  p_session_id UUID,
  p_score INT,
  p_fps INT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID := auth.uid();
  v_played_at TIMESTAMPTZ;
  v_elapsed_ms NUMERIC;
  v_min_ms NUMERIC;
  max_session_ms CONSTANT NUMERIC := 900000;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT played_at INTO v_played_at
  FROM flappy_credit_log
  WHERE session_id = p_session_id AND user_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ongeldige sessie' USING ERRCODE = 'P0001';
  END IF;

  v_elapsed_ms := EXTRACT(epoch FROM (now() - v_played_at)) * 1000;

  IF v_elapsed_ms > max_session_ms THEN
    RAISE EXCEPTION 'Sessie verlopen' USING ERRCODE = 'P0002';
  END IF;

  IF p_score > 0 THEN
    v_min_ms := min_game_ms(p_score) * 0.9;
    IF v_elapsed_ms < v_min_ms OR (p_duration_ms IS NOT NULL AND p_duration_ms < v_min_ms) THEN
      INSERT INTO flappy_suspicious_attempts
        (user_id, session_id, submitted_score, server_elapsed_ms, minimum_ms, client_duration_ms, fps)
      VALUES
        (uid, p_session_id, p_score, v_elapsed_ms::INT, v_min_ms::INT, p_duration_ms, p_fps);
      RAISE EXCEPTION 'Score niet mogelijk in de speeltijd' USING ERRCODE = 'P0003';
    END IF;
  END IF;

  INSERT INTO flappy_scores (user_id, score, credit_log_id, fps, duration_ms)
  VALUES (uid, p_score, p_session_id, p_fps, p_duration_ms);

  -- Invalidate session so the ID can't be reused
  UPDATE flappy_credit_log
  SET session_id = gen_random_uuid()
  WHERE session_id = p_session_id AND user_id = uid;
END;
$$;

-- Block direct REST inserts entirely — only save_flappy_score() can insert
DROP POLICY IF EXISTS flappy_scores_insert ON flappy_scores;
CREATE POLICY "flappy_scores_insert" ON flappy_scores FOR INSERT WITH CHECK (false);
;
