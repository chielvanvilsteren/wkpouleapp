ALTER TABLE flappy_pipe_events DROP CONSTRAINT IF EXISTS flappy_pipe_events_pipe_num_check;
ALTER TABLE flappy_pipe_events ADD CONSTRAINT flappy_pipe_events_pipe_num_check
  CHECK (pipe_num >= 1 AND pipe_num <= 2147483647);;
