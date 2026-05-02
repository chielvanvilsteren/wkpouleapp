-- Voeg match_time kolom toe aan matches tabel
-- Alle tijden zijn Nederlandse tijd (CET/CEST)

SET search_path TO public;

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time TIME;

-- ============================================================
-- GROEPSFASE
-- ============================================================

-- Groep A
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 1;   -- Mexico - Zuid-Afrika (11 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 2;   -- Zuid-Korea - Tsjechië (12 jun)
UPDATE public.matches SET match_time = '18:00' WHERE match_number = 3;   -- Tsjechië - Zuid-Afrika (18 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 4;   -- Mexico - Zuid-Korea (19 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 5;   -- Tsjechië - Mexico (25 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 6;   -- Zuid-Afrika - Zuid-Korea (25 jun)

-- Groep B
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 7;   -- Canada - Bosnië (12 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 8;   -- Qatar - Zwitserland (13 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 9;   -- Zwitserland - Bosnië (18 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 10;  -- Canada - Qatar (19 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 11;  -- Zwitserland - Canada (24 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 12;  -- Bosnië - Qatar (24 jun)

-- Groep C
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 13;  -- Brazilië - Marokko (14 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 14;  -- Haïti - Schotland (14 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 15;  -- Schotland - Marokko (20 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 16;  -- Brazilië - Haïti (20 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 17;  -- Schotland - Brazilië (25 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 18;  -- Marokko - Haïti (25 jun)

-- Groep D
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 19;  -- USA - Paraguay (13 jun)
UPDATE public.matches SET match_time = '06:00' WHERE match_number = 20;  -- Australië - Turkije (13 jun)
UPDATE public.matches SET match_time = '06:00' WHERE match_number = 21;  -- Turkije - Paraguay (19 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 22;  -- USA - Australië (19 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 23;  -- Turkije - USA (26 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 24;  -- Paraguay - Australië (26 jun)

-- Groep E
UPDATE public.matches SET match_time = '19:00' WHERE match_number = 25;  -- Duitsland - Curaçao (14 jun)
UPDATE public.matches SET match_time = '01:00' WHERE match_number = 26;  -- Ivoorkust - Ecuador (15 jun)
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 27;  -- Duitsland - Ivoorkust (20 jun)
UPDATE public.matches SET match_time = '02:00' WHERE match_number = 28;  -- Ecuador - Curaçao (21 jun)
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 29;  -- Ecuador - Duitsland (25 jun)
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 30;  -- Curaçao - Ivoorkust (25 jun)

-- Groep F (Nederland)
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 31;  -- Nederland - Japan (14 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 32;  -- Zweden - Tunesië (15 jun)
UPDATE public.matches SET match_time = '06:00' WHERE match_number = 33;  -- Tunesië - Japan (20 jun)
UPDATE public.matches SET match_time = '19:00' WHERE match_number = 34;  -- Nederland - Zweden (20 jun)
UPDATE public.matches SET match_time = '01:00' WHERE match_number = 35;  -- Japan - Zweden (26 jun)
UPDATE public.matches SET match_time = '01:00' WHERE match_number = 36;  -- Tunesië - Nederland (26 jun)

-- Groep G
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 37;  -- België - Egypte (15 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 38;  -- Iran - Nieuw-Zeeland (16 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 39;  -- België - Iran (21 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 40;  -- Nieuw-Zeeland - Egypte (22 jun)
UPDATE public.matches SET match_time = '05:00' WHERE match_number = 41;  -- Egypte - Iran (27 jun)
UPDATE public.matches SET match_time = '05:00' WHERE match_number = 42;  -- Nieuw-Zeeland - België (27 jun)

-- Groep H
UPDATE public.matches SET match_time = '18:00' WHERE match_number = 43;  -- Spanje - Kaapverdië (15 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 44;  -- Saudi-Arabië - Uruguay (16 jun)
UPDATE public.matches SET match_time = '18:00' WHERE match_number = 45;  -- Spanje - Saudi-Arabië (21 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 46;  -- Uruguay - Kaapverdië (22 jun)
UPDATE public.matches SET match_time = '02:00' WHERE match_number = 47;  -- Kaapverdië - Saudi-Arabië (27 jun)
UPDATE public.matches SET match_time = '02:00' WHERE match_number = 48;  -- Uruguay - Spanje (27 jun)

-- Groep I
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 49;  -- Frankrijk - Senegal (16 jun)
UPDATE public.matches SET match_time = '00:00' WHERE match_number = 50;  -- Irak - Noorwegen (17 jun)
UPDATE public.matches SET match_time = '23:00' WHERE match_number = 51;  -- Frankrijk - Irak (22 jun)
UPDATE public.matches SET match_time = '02:00' WHERE match_number = 52;  -- Noorwegen - Senegal (23 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 53;  -- Noorwegen - Frankrijk (26 jun)
UPDATE public.matches SET match_time = '21:00' WHERE match_number = 54;  -- Senegal - Irak (26 jun)

-- Groep J
UPDATE public.matches SET match_time = '06:00' WHERE match_number = 55;  -- Oostenrijk - Jordanië (16 jun)
UPDATE public.matches SET match_time = '03:00' WHERE match_number = 56;  -- Argentinië - Algerije (17 jun)
UPDATE public.matches SET match_time = '19:00' WHERE match_number = 57;  -- Argentinië - Oostenrijk (22 jun)
UPDATE public.matches SET match_time = '05:00' WHERE match_number = 58;  -- Jordanië - Algerije (23 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 59;  -- Algerije - Oostenrijk (28 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 60;  -- Jordanië - Argentinië (28 jun)

-- Groep K
UPDATE public.matches SET match_time = '19:00' WHERE match_number = 61;  -- Portugal - Congo (17 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 62;  -- Oezbekistan - Colombia (18 jun)
UPDATE public.matches SET match_time = '19:00' WHERE match_number = 63;  -- Portugal - Oezbekistan (23 jun)
UPDATE public.matches SET match_time = '04:00' WHERE match_number = 64;  -- Colombia - Congo (24 jun)
UPDATE public.matches SET match_time = '01:30' WHERE match_number = 65;  -- Colombia - Portugal (28 jun)
UPDATE public.matches SET match_time = '01:30' WHERE match_number = 66;  -- Congo - Oezbekistan (28 jun)

-- Groep L
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 67;  -- Engeland - Kroatië (17 jun)
UPDATE public.matches SET match_time = '01:00' WHERE match_number = 68;  -- Ghana - Panama (18 jun)
UPDATE public.matches SET match_time = '22:00' WHERE match_number = 69;  -- Engeland - Ghana (23 jun)
UPDATE public.matches SET match_time = '01:00' WHERE match_number = 70;  -- Panama - Kroatië (24 jun)
UPDATE public.matches SET match_time = '23:00' WHERE match_number = 71;  -- Panama - Engeland (27 jun)
UPDATE public.matches SET match_time = '23:00' WHERE match_number = 72;  -- Kroatië - Ghana (27 jun)

-- ============================================================
-- RONDE VAN 32 — datums en tijden gecorrigeerd o.b.v. ESPN
-- ============================================================

UPDATE public.matches SET match_date = '2026-06-28', match_time = '21:00' WHERE match_number = 73;
UPDATE public.matches SET match_date = '2026-06-29', match_time = '22:30' WHERE match_number = 74;
UPDATE public.matches SET match_date = '2026-06-30', match_time = '03:00' WHERE match_number = 75;
UPDATE public.matches SET match_date = '2026-06-29', match_time = '19:00' WHERE match_number = 76;
UPDATE public.matches SET match_date = '2026-06-30', match_time = '23:00' WHERE match_number = 77;
UPDATE public.matches SET match_date = '2026-06-30', match_time = '19:00' WHERE match_number = 78;
UPDATE public.matches SET match_date = '2026-07-01', match_time = '03:00' WHERE match_number = 79;
UPDATE public.matches SET match_date = '2026-07-01', match_time = '18:00' WHERE match_number = 80;
UPDATE public.matches SET match_date = '2026-07-02', match_time = '02:00' WHERE match_number = 81;
UPDATE public.matches SET match_date = '2026-07-01', match_time = '22:00' WHERE match_number = 82;
UPDATE public.matches SET match_date = '2026-07-03', match_time = '01:00' WHERE match_number = 83;
UPDATE public.matches SET match_date = '2026-07-02', match_time = '21:00' WHERE match_number = 84;
UPDATE public.matches SET match_date = '2026-07-03', match_time = '05:00' WHERE match_number = 85;
UPDATE public.matches SET match_date = '2026-07-04', match_time = '00:00' WHERE match_number = 86;
UPDATE public.matches SET match_date = '2026-07-04', match_time = '03:30' WHERE match_number = 87;
UPDATE public.matches SET match_date = '2026-07-03', match_time = '20:00' WHERE match_number = 88;

-- ============================================================
-- RONDE VAN 16 — datums en tijden gecorrigeerd o.b.v. ESPN
-- ============================================================

UPDATE public.matches SET match_date = '2026-07-04', match_time = '23:00' WHERE match_number = 89;
UPDATE public.matches SET match_date = '2026-07-04', match_time = '19:00' WHERE match_number = 90;
UPDATE public.matches SET match_date = '2026-07-05', match_time = '22:00' WHERE match_number = 91;
UPDATE public.matches SET match_date = '2026-07-06', match_time = '02:00' WHERE match_number = 92;
UPDATE public.matches SET match_date = '2026-07-06', match_time = '21:00' WHERE match_number = 93;
UPDATE public.matches SET match_date = '2026-07-07', match_time = '02:00' WHERE match_number = 94;
UPDATE public.matches SET match_date = '2026-07-07', match_time = '18:00' WHERE match_number = 95;
UPDATE public.matches SET match_date = '2026-07-07', match_time = '22:00' WHERE match_number = 96;

-- ============================================================
-- KWARTFINALES — datums en tijden gecorrigeerd o.b.v. ESPN
-- ============================================================

UPDATE public.matches SET match_date = '2026-07-09', match_time = '22:00' WHERE match_number = 97;
UPDATE public.matches SET match_date = '2026-07-10', match_time = '21:00' WHERE match_number = 98;
UPDATE public.matches SET match_date = '2026-07-11', match_time = '23:00' WHERE match_number = 99;
UPDATE public.matches SET match_date = '2026-07-12', match_time = '03:00' WHERE match_number = 100;

-- ============================================================
-- HALVE FINALES — datums en tijden gecorrigeerd o.b.v. ESPN
-- ============================================================

UPDATE public.matches SET match_date = '2026-07-14', match_time = '21:00' WHERE match_number = 101;
UPDATE public.matches SET match_date = '2026-07-15', match_time = '21:00' WHERE match_number = 102;

-- ============================================================
-- 3E PLAATSWEDSTRIJD + FINALE — gecorrigeerd o.b.v. ESPN
-- ============================================================

UPDATE public.matches SET match_date = '2026-07-18', match_time = '23:00' WHERE match_number = 103;
UPDATE public.matches SET match_date = '2026-07-19', match_time = '21:00' WHERE match_number = 104;
