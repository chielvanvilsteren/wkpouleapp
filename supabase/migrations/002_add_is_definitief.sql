-- Add is_definitief flag to predictions
-- Run in Supabase SQL editor

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS is_definitief BOOLEAN DEFAULT FALSE;
