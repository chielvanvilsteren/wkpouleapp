CREATE TABLE IF NOT EXISTS flappy_suspicious_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  submitted_score INT NOT NULL,
  server_elapsed_ms INT NOT NULL,
  minimum_ms INT NOT NULL,
  client_duration_ms INT,
  fps INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE flappy_suspicious_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suspicious_admin_select" ON flappy_suspicious_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );;
