-- Restore separate write windows for group and knockout predictions.
-- The group deadline must not block knockout matches; those lock per match,
-- fifteen minutes before kickoff in Europe/Amsterdam.

SET search_path TO public;

ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mp_insert_own" ON public.match_predictions;
CREATE POLICY "mp_insert_own"
  ON public.match_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches AS m
      CROSS JOIN public.master_uitslag AS mu
      WHERE m.id = match_predictions.match_id
        AND mu.id = 1
        AND mu.wk_poule_open = TRUE
        AND (
          (
            m.stage = 'group'
            AND (mu.wk_poule_deadline IS NULL OR mu.wk_poule_deadline > NOW())
          )
          OR
          (
            m.stage <> 'group'
            AND (
              (m.match_date + COALESCE(m.match_time, TIME '00:00:00'))::TIMESTAMP
                AT TIME ZONE 'Europe/Amsterdam'
            ) - INTERVAL '15 minutes' > NOW()
          )
        )
    )
  );

DROP POLICY IF EXISTS "mp_update_own" ON public.match_predictions;
CREATE POLICY "mp_update_own"
  ON public.match_predictions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches AS m
      CROSS JOIN public.master_uitslag AS mu
      WHERE m.id = match_predictions.match_id
        AND mu.id = 1
        AND mu.wk_poule_open = TRUE
        AND (
          (
            m.stage = 'group'
            AND (mu.wk_poule_deadline IS NULL OR mu.wk_poule_deadline > NOW())
          )
          OR
          (
            m.stage <> 'group'
            AND (
              (m.match_date + COALESCE(m.match_time, TIME '00:00:00'))::TIMESTAMP
                AT TIME ZONE 'Europe/Amsterdam'
            ) - INTERVAL '15 minutes' > NOW()
          )
        )
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches AS m
      CROSS JOIN public.master_uitslag AS mu
      WHERE m.id = match_predictions.match_id
        AND mu.id = 1
        AND mu.wk_poule_open = TRUE
        AND (
          (
            m.stage = 'group'
            AND (mu.wk_poule_deadline IS NULL OR mu.wk_poule_deadline > NOW())
          )
          OR
          (
            m.stage <> 'group'
            AND (
              (m.match_date + COALESCE(m.match_time, TIME '00:00:00'))::TIMESTAMP
                AT TIME ZONE 'Europe/Amsterdam'
            ) - INTERVAL '15 minutes' > NOW()
          )
        )
    )
  );
