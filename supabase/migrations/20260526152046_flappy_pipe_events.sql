CREATE TABLE IF NOT EXISTS flappy_pipe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pipe_num INT NOT NULL CHECK (pipe_num >= 1 AND pipe_num <= 9999),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS flappy_pipe_events_session_pipe_idx
  ON flappy_pipe_events(session_id, pipe_num);

ALTER TABLE flappy_pipe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipe_events_insert" ON flappy_pipe_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM flappy_credit_log cl
      WHERE cl.session_id = flappy_pipe_events.session_id
        AND cl.user_id = auth.uid()
    )
  );

CREATE POLICY "pipe_events_select_own" ON flappy_pipe_events
  FOR SELECT USING (auth.uid() = user_id);;
