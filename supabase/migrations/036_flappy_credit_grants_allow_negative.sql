ALTER TABLE flappy_credit_grants DROP CONSTRAINT flappy_credit_grants_amount_check;
ALTER TABLE flappy_credit_grants ADD CONSTRAINT flappy_credit_grants_amount_check CHECK (amount != 0);
