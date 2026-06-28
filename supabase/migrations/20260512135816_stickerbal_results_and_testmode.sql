CREATE TABLE stickerbal_results (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  display_name TEXT NOT NULL,
  result      TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  goals_for   INT NOT NULL DEFAULT 0,
  goals_against INT NOT NULL DEFAULT 0,
  room_code   TEXT,
  played_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stickerbal_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stickerbal_results_insert" ON stickerbal_results FOR INSERT WITH CHECK (true);
CREATE POLICY "stickerbal_results_select" ON stickerbal_results FOR SELECT USING (true);

ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false;;
