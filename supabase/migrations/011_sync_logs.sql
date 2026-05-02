-- sync_logs tabel: houdt bij wanneer de uitslag-sync is gedraaid en wat het resultaat was

CREATE TABLE IF NOT EXISTS sync_logs (
  id          SERIAL PRIMARY KEY,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated     INT NOT NULL DEFAULT 0,
  skipped     INT NOT NULL DEFAULT 0,
  unmatched   INT NOT NULL DEFAULT 0,
  status      TEXT NOT NULL CHECK (status IN ('success', 'none', 'error')),
  message     TEXT,
  details     TEXT[],
  triggered_by TEXT NOT NULL DEFAULT 'cron'  -- 'cron' of 'admin'
);

-- Alleen admins mogen logs lezen; service role schrijft
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins kunnen sync_logs lezen"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
