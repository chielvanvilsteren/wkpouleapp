-- Add configurable pre-pool deadline to master_uitslag
ALTER TABLE master_uitslag
  ADD COLUMN IF NOT EXISTS inzendingen_deadline timestamptz;
