-- WK 2026 Oranje Pool — database schema
-- Run this in your Supabase SQL editor

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  selectie TEXT[] DEFAULT '{}',
  basis_xi TEXT[] DEFAULT '{}',
  rode_kaart TEXT DEFAULT '',
  gele_kaart TEXT DEFAULT '',
  geblesseerde TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS master_uitslag (
  id INT PRIMARY KEY DEFAULT 1,
  selectie TEXT[] DEFAULT '{}',
  basis_xi TEXT[] DEFAULT '{}',
  rode_kaart TEXT DEFAULT '',
  gele_kaart TEXT DEFAULT '',
  geblesseerde TEXT DEFAULT '',
  inzendingen_open BOOLEAN DEFAULT TRUE,
  scores_zichtbaar BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Ensure the single master_uitslag row exists
INSERT INTO master_uitslag (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS scores (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  selectie_punten INT DEFAULT 0,
  basis_xi_punten INT DEFAULT 0,
  incidenten_punten INT DEFAULT 0,
  totaal INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Trigger: auto-create profile on user registration
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_uitslag ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- profiles: own row + admins can read all
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- predictions: own row only + admins can read all
DROP POLICY IF EXISTS "predictions_select_own" ON predictions;
CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_select_admin" ON predictions;
CREATE POLICY "predictions_select_admin" ON predictions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- master_uitslag: everyone reads, only admins write
DROP POLICY IF EXISTS "uitslag_select_all" ON master_uitslag;
CREATE POLICY "uitslag_select_all" ON master_uitslag
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "uitslag_write_admin" ON master_uitslag;
CREATE POLICY "uitslag_write_admin" ON master_uitslag
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- scores: everyone reads
DROP POLICY IF EXISTS "scores_select_all" ON scores;
CREATE POLICY "scores_select_all" ON scores
  FOR SELECT USING (TRUE);

-- scores are written via service role (bypasses RLS), so no INSERT/UPDATE policy needed for authenticated users
