ALTER TABLE flappy_scores
  DROP CONSTRAINT flappy_scores_credit_log_id_fkey,
  ADD CONSTRAINT flappy_scores_credit_log_id_fkey
    FOREIGN KEY (credit_log_id)
    REFERENCES flappy_credit_log(session_id)
    ON UPDATE CASCADE;;
