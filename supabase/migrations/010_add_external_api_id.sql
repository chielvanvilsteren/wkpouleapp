-- Voeg external_api_id toe aan matches tabel
-- Wordt gebruikt om wedstrijden te koppelen aan de Football-Data.org API

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_api_id INT UNIQUE;
