CREATE POLICY "flappy_credit_grants_delete_admin" ON flappy_credit_grants FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));;
