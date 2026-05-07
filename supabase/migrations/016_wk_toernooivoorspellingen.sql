-- Add wereldkampioen and finale predictions to incident tables
ALTER TABLE wk_incidents_predictions
  ADD COLUMN wereldkampioen TEXT NOT NULL DEFAULT '',
  ADD COLUMN finale_team1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN finale_team2 TEXT NOT NULL DEFAULT '';

ALTER TABLE wk_incidents_uitslag
  ADD COLUMN wereldkampioen TEXT NOT NULL DEFAULT '',
  ADD COLUMN finale_team1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN finale_team2 TEXT NOT NULL DEFAULT '';

-- Add toernooi_punten column to wk_scores for wereldkampioen + finale points
ALTER TABLE wk_scores
  ADD COLUMN toernooi_punten INTEGER NOT NULL DEFAULT 0;
