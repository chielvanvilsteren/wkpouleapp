ALTER TABLE flappy_scores ADD COLUMN IF NOT EXISTS season SMALLINT NOT NULL DEFAULT 1;

-- Backfill: all existing scores are season 1 (already set by DEFAULT 1)
-- New scores will be inserted with season = 2 from the application

CREATE INDEX IF NOT EXISTS flappy_scores_season_idx ON flappy_scores(season);;
