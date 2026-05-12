CREATE TABLE game_rooms (
  code         TEXT PRIMARY KEY,
  host_id      TEXT NOT NULL,
  team_size    SMALLINT NOT NULL DEFAULT 1,
  max_goals    SMALLINT NOT NULL DEFAULT 5,
  max_minutes  SMALLINT NOT NULL DEFAULT 3,
  status       TEXT NOT NULL DEFAULT 'waiting',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE game_players (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code     TEXT NOT NULL REFERENCES game_rooms(code) ON DELETE CASCADE,
  session_id    TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  team          TEXT NOT NULL,
  player_index  SMALLINT NOT NULL,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_code, session_id)
);

ALTER TABLE game_rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_rooms_all"   ON game_rooms   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "game_players_all" ON game_players FOR ALL USING (true) WITH CHECK (true);
