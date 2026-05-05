-- Admin kan handmatig credits toekennen aan gebruikers

CREATE TABLE IF NOT EXISTS flappy_credit_grants (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  amount      INT NOT NULL CHECK (amount > 0),
  note        TEXT,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flappy_credit_grants ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag zijn eigen grants zien
CREATE POLICY "flappy_credit_grants_select_own"
  ON flappy_credit_grants FOR SELECT
  USING (auth.uid() = user_id);

-- Admin kan alle grants zien (gecontroleerd via profiles)
CREATE POLICY "flappy_credit_grants_select_admin"
  ON flappy_credit_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Alleen admins mogen insereren
CREATE POLICY "flappy_credit_grants_insert_admin"
  ON flappy_credit_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
