-- WK Poule schema
-- Run in Supabase SQL editor

-- ============================================================
-- matches: alle 104 WK-wedstrijden
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id            SERIAL PRIMARY KEY,
  match_number  INT NOT NULL,
  stage         TEXT NOT NULL CHECK (stage IN ('group','r32','r16','qf','sf','3rd','final')),
  group_name    TEXT,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  match_date    DATE NOT NULL,
  home_score    INT,
  away_score    INT,
  is_finished   BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- match_predictions: gebruiker voorspelt uitslag per wedstrijd
-- ============================================================

CREATE TABLE IF NOT EXISTS match_predictions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id    INT  REFERENCES matches(id) ON DELETE CASCADE,
  home_score  INT  NOT NULL DEFAULT 0,
  away_score  INT  NOT NULL DEFAULT 0,
  UNIQUE(user_id, match_id)
);

-- ============================================================
-- wk_incidents_predictions: NL incidents + topscorer per user
-- ============================================================

CREATE TABLE IF NOT EXISTS wk_incidents_predictions (
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  rode_kaart       TEXT DEFAULT '',
  gele_kaart       TEXT DEFAULT '',
  geblesseerde     TEXT DEFAULT '',
  eerste_goal_nl   TEXT DEFAULT '',
  topscorer_wk     TEXT DEFAULT '',
  is_definitief    BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- wk_incidents_uitslag: admin vult werkelijke antwoorden in
-- ============================================================

CREATE TABLE IF NOT EXISTS wk_incidents_uitslag (
  id               INT PRIMARY KEY DEFAULT 1,
  rode_kaart       TEXT DEFAULT '',
  gele_kaart       TEXT DEFAULT '',
  geblesseerde     TEXT DEFAULT '',
  eerste_goal_nl   TEXT DEFAULT '',
  topscorer_wk     TEXT DEFAULT '',
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO wk_incidents_uitslag (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- wk_scores: berekende scores per user voor WK poule
-- ============================================================

CREATE TABLE IF NOT EXISTS wk_scores (
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  match_punten       INT DEFAULT 0,
  incidents_punten   INT DEFAULT 0,
  topscorer_punten   INT DEFAULT 0,
  totaal             INT DEFAULT 0,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- master_uitslag: extra toggles voor WK poule
-- ============================================================

ALTER TABLE master_uitslag
  ADD COLUMN IF NOT EXISTS wk_poule_open       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS wk_scores_zichtbaar BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Migrate incidents from predictions → wk_incidents_predictions
-- ============================================================

INSERT INTO wk_incidents_predictions (user_id, rode_kaart, gele_kaart, geblesseerde, eerste_goal_nl)
SELECT user_id,
       COALESCE(rode_kaart, ''),
       COALESCE(gele_kaart, ''),
       COALESCE(geblesseerde, ''),
       COALESCE(eerste_goal, '')
FROM predictions
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE matches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wk_incidents_predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wk_incidents_uitslag       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wk_scores                  ENABLE ROW LEVEL SECURITY;

-- matches: iedereen leest
DROP POLICY IF EXISTS "matches_select_all" ON matches;
CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (TRUE);

-- matches: alleen admin schrijft
DROP POLICY IF EXISTS "matches_write_admin" ON matches;
CREATE POLICY "matches_write_admin" ON matches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- match_predictions: eigen rij
DROP POLICY IF EXISTS "mp_select_own" ON match_predictions;
CREATE POLICY "mp_select_own" ON match_predictions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mp_insert_own" ON match_predictions;
CREATE POLICY "mp_insert_own" ON match_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mp_update_own" ON match_predictions;
CREATE POLICY "mp_update_own" ON match_predictions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mp_select_admin" ON match_predictions;
CREATE POLICY "mp_select_admin" ON match_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- wk_incidents_predictions: eigen rij
DROP POLICY IF EXISTS "wkip_select_own" ON wk_incidents_predictions;
CREATE POLICY "wkip_select_own" ON wk_incidents_predictions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wkip_insert_own" ON wk_incidents_predictions;
CREATE POLICY "wkip_insert_own" ON wk_incidents_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wkip_update_own" ON wk_incidents_predictions;
CREATE POLICY "wkip_update_own" ON wk_incidents_predictions FOR UPDATE USING (auth.uid() = user_id);

-- wk_incidents_uitslag: iedereen leest
DROP POLICY IF EXISTS "wkiu_select_all" ON wk_incidents_uitslag;
CREATE POLICY "wkiu_select_all" ON wk_incidents_uitslag FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "wkiu_write_admin" ON wk_incidents_uitslag;
CREATE POLICY "wkiu_write_admin" ON wk_incidents_uitslag FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- wk_scores: iedereen leest, service role schrijft
DROP POLICY IF EXISTS "wk_scores_select_all" ON wk_scores;
CREATE POLICY "wk_scores_select_all" ON wk_scores FOR SELECT USING (TRUE);
