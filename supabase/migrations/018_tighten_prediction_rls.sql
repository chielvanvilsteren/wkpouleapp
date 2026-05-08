-- Enforce deadlines and locks server-side so direct API calls cannot bypass UI guards.
--
-- predictions:      blocked when inzendingen_open=FALSE or past inzendingen_deadline
-- match_predictions: blocked when wk_poule_open=FALSE, past wk_poule_deadline,
--                   OR the individual match has already started
-- wk_incidents_predictions: blocked when wk_poule_open=FALSE, past deadline,
--                            or is_definitief=TRUE on the existing row

-- ── predictions ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE inzendingen_open = TRUE
        AND (inzendingen_deadline IS NULL OR inzendingen_deadline > now())
    )
  );

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE inzendingen_open = TRUE
        AND (inzendingen_deadline IS NULL OR inzendingen_deadline > now())
    )
  );

-- ── match_predictions ────────────────────────────────────────────────────────
-- Per-match lock: match_date + match_time (stored in Europe/Amsterdam) must be
-- in the future. Falls back to start-of-day if match_time is NULL.

DROP POLICY IF EXISTS "mp_insert_own" ON match_predictions;
CREATE POLICY "mp_insert_own" ON match_predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE wk_poule_open = TRUE
        AND (wk_poule_deadline IS NULL OR wk_poule_deadline > now())
    )
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (m.match_date + COALESCE(m.match_time, '00:00:00'))::timestamp
              AT TIME ZONE 'Europe/Amsterdam' > now()
    )
  );

DROP POLICY IF EXISTS "mp_update_own" ON match_predictions;
CREATE POLICY "mp_update_own" ON match_predictions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE wk_poule_open = TRUE
        AND (wk_poule_deadline IS NULL OR wk_poule_deadline > now())
    )
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (m.match_date + COALESCE(m.match_time, '00:00:00'))::timestamp
              AT TIME ZONE 'Europe/Amsterdam' > now()
    )
  );

-- ── wk_incidents_predictions ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "wkip_insert_own" ON wk_incidents_predictions;
CREATE POLICY "wkip_insert_own" ON wk_incidents_predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE wk_poule_open = TRUE
        AND (wk_poule_deadline IS NULL OR wk_poule_deadline > now())
    )
  );

DROP POLICY IF EXISTS "wkip_update_own" ON wk_incidents_predictions;
CREATE POLICY "wkip_update_own" ON wk_incidents_predictions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND is_definitief = FALSE
    AND EXISTS (
      SELECT 1 FROM master_uitslag
      WHERE wk_poule_open = TRUE
        AND (wk_poule_deadline IS NULL OR wk_poule_deadline > now())
    )
  );
