-- Add configurable WK poule deadline to master_uitslag
ALTER TABLE master_uitslag
  ADD COLUMN IF NOT EXISTS wk_poule_deadline timestamptz;
