-- Separate deadline logic for group stage vs knockout stage.
-- Group stage: requires wk_poule_open=TRUE AND wk_poule_deadline not passed.
--              No per-match kickoff lock — the global deadline is the only gate.
-- Knockout stage: requires wk_poule_open=TRUE only (no global deadline).
--                 Blocked once the match has started.

DROP POLICY IF EXISTS "mp_insert_own" ON match_predictions;
CREATE POLICY "mp_insert_own" ON match_predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    -- Admin toggle must be on
    AND EXISTS (SELECT 1 FROM master_uitslag WHERE wk_poule_open = TRUE)
    AND EXISTS (
      SELECT 1 FROM matches m, master_uitslag mu
      WHERE m.id = match_id
        AND (
          -- Group stage: only the global deadline applies
          (
            m.stage = 'group'
            AND (mu.wk_poule_deadline IS NULL OR mu.wk_poule_deadline > now())
          )
          OR
          -- Knockout: no deadline, but match must not have started
          (
            m.stage != 'group'
            AND (m.match_date + COALESCE(m.match_time, '00:00:00'))::timestamp
                  AT TIME ZONE 'Europe/Amsterdam' > now()
          )
        )
    )
  );

DROP POLICY IF EXISTS "mp_update_own" ON match_predictions;
CREATE POLICY "mp_update_own" ON match_predictions
  FOR UPDATE USING (
    auth.uid() = user_id
    -- Admin toggle must be on
    AND EXISTS (SELECT 1 FROM master_uitslag WHERE wk_poule_open = TRUE)
    AND EXISTS (
      SELECT 1 FROM matches m, master_uitslag mu
      WHERE m.id = match_id
        AND (
          -- Group stage: only the global deadline applies
          (
            m.stage = 'group'
            AND (mu.wk_poule_deadline IS NULL OR mu.wk_poule_deadline > now())
          )
          OR
          -- Knockout: no deadline, but match must not have started
          (
            m.stage != 'group'
            AND (m.match_date + COALESCE(m.match_time, '00:00:00'))::timestamp
                  AT TIME ZONE 'Europe/Amsterdam' > now()
          )
        )
    )
  );
