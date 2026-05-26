-- Admins mogen sync_logs verwijderen
CREATE POLICY "Admins kunnen sync_logs verwijderen"
  ON sync_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
