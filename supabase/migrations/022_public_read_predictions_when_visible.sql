-- Allow public read on predictions when pre-pool scores are published
CREATE POLICY "predictions_select_public_when_visible"
  ON predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM master_uitslag WHERE id = 1 AND scores_zichtbaar = true
    )
  );

-- Allow public read on wk_incidents_predictions when WK scores are published
CREATE POLICY "wkip_select_public_when_visible"
  ON wk_incidents_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM master_uitslag WHERE id = 1 AND wk_scores_zichtbaar = true
    )
  );
