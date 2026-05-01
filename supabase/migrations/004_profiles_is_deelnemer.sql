-- Add is_deelnemer flag to profiles
-- Existing users default to true (they participate)
-- Admin/organisator accounts set to false

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_deelnemer BOOLEAN DEFAULT TRUE;
