-- Allow public read of display_name for ranglijst/display pages
-- Run in Supabase SQL editor

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (TRUE);
