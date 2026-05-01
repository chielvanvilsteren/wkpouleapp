-- WK 2026 wedstrijden seed
-- Run AFTER 005_wk_poule_schema.sql

INSERT INTO matches (match_number, stage, group_name, home_team, away_team, match_date) VALUES

-- ============================================================
-- GROEPSFASE
-- ============================================================

-- Groep A
(1,  'group', 'A', 'Mexico',         'Zuid-Afrika',     '2026-06-11'),
(2,  'group', 'A', 'Zuid-Korea',     'Tsjechië',        '2026-06-12'),
(3,  'group', 'A', 'Tsjechië',       'Zuid-Afrika',     '2026-06-18'),
(4,  'group', 'A', 'Mexico',         'Zuid-Korea',      '2026-06-19'),
(5,  'group', 'A', 'Tsjechië',       'Mexico',          '2026-06-25'),
(6,  'group', 'A', 'Zuid-Afrika',    'Zuid-Korea',      '2026-06-25'),

-- Groep B
(7,  'group', 'B', 'Canada',         'Bosnië',          '2026-06-12'),
(8,  'group', 'B', 'Qatar',          'Zwitserland',     '2026-06-13'),
(9,  'group', 'B', 'Zwitserland',    'Bosnië',          '2026-06-18'),
(10, 'group', 'B', 'Canada',         'Qatar',           '2026-06-19'),
(11, 'group', 'B', 'Zwitserland',    'Canada',          '2026-06-24'),
(12, 'group', 'B', 'Bosnië',         'Qatar',           '2026-06-24'),

-- Groep C
(13, 'group', 'C', 'Brazilië',       'Marokko',         '2026-06-14'),
(14, 'group', 'C', 'Haïti',          'Schotland',       '2026-06-14'),
(15, 'group', 'C', 'Schotland',      'Marokko',         '2026-06-20'),
(16, 'group', 'C', 'Brazilië',       'Haïti',           '2026-06-20'),
(17, 'group', 'C', 'Schotland',      'Brazilië',        '2026-06-25'),
(18, 'group', 'C', 'Marokko',        'Haïti',           '2026-06-25'),

-- Groep D
(19, 'group', 'D', 'USA',            'Paraguay',        '2026-06-13'),
(20, 'group', 'D', 'Australië',      'Turkije',         '2026-06-13'),
(21, 'group', 'D', 'Turkije',        'Paraguay',        '2026-06-19'),
(22, 'group', 'D', 'USA',            'Australië',       '2026-06-19'),
(23, 'group', 'D', 'Turkije',        'USA',             '2026-06-26'),
(24, 'group', 'D', 'Paraguay',       'Australië',       '2026-06-26'),

-- Groep E
(25, 'group', 'E', 'Duitsland',      'Curaçao',         '2026-06-14'),
(26, 'group', 'E', 'Ivoorkust',      'Ecuador',         '2026-06-15'),
(27, 'group', 'E', 'Duitsland',      'Ivoorkust',       '2026-06-20'),
(28, 'group', 'E', 'Ecuador',        'Curaçao',         '2026-06-21'),
(29, 'group', 'E', 'Ecuador',        'Duitsland',       '2026-06-25'),
(30, 'group', 'E', 'Curaçao',        'Ivoorkust',       '2026-06-25'),

-- Groep F (Nederland)
(31, 'group', 'F', 'Nederland',      'Japan',           '2026-06-14'),
(32, 'group', 'F', 'Zweden',         'Tunesië',         '2026-06-15'),
(33, 'group', 'F', 'Tunesië',        'Japan',           '2026-06-20'),
(34, 'group', 'F', 'Nederland',      'Zweden',          '2026-06-20'),
(35, 'group', 'F', 'Japan',          'Zweden',          '2026-06-26'),
(36, 'group', 'F', 'Tunesië',        'Nederland',       '2026-06-26'),

-- Groep G
(37, 'group', 'G', 'België',         'Egypte',          '2026-06-15'),
(38, 'group', 'G', 'Iran',           'Nieuw-Zeeland',   '2026-06-16'),
(39, 'group', 'G', 'België',         'Iran',            '2026-06-21'),
(40, 'group', 'G', 'Nieuw-Zeeland',  'Egypte',          '2026-06-22'),
(41, 'group', 'G', 'Egypte',         'Iran',            '2026-06-27'),
(42, 'group', 'G', 'Nieuw-Zeeland',  'België',          '2026-06-27'),

-- Groep H
(43, 'group', 'H', 'Spanje',         'Kaapverdië',      '2026-06-15'),
(44, 'group', 'H', 'Saudi-Arabië',   'Uruguay',         '2026-06-16'),
(45, 'group', 'H', 'Spanje',         'Saudi-Arabië',    '2026-06-21'),
(46, 'group', 'H', 'Uruguay',        'Kaapverdië',      '2026-06-22'),
(47, 'group', 'H', 'Kaapverdië',     'Saudi-Arabië',    '2026-06-27'),
(48, 'group', 'H', 'Uruguay',        'Spanje',          '2026-06-27'),

-- Groep I
(49, 'group', 'I', 'Frankrijk',      'Senegal',         '2026-06-16'),
(50, 'group', 'I', 'Irak',           'Noorwegen',       '2026-06-17'),
(51, 'group', 'I', 'Frankrijk',      'Irak',            '2026-06-22'),
(52, 'group', 'I', 'Noorwegen',      'Senegal',         '2026-06-23'),
(53, 'group', 'I', 'Noorwegen',      'Frankrijk',       '2026-06-26'),
(54, 'group', 'I', 'Senegal',        'Irak',            '2026-06-26'),

-- Groep J
(55, 'group', 'J', 'Oostenrijk',     'Jordanië',        '2026-06-16'),
(56, 'group', 'J', 'Argentinië',     'Algerije',        '2026-06-17'),
(57, 'group', 'J', 'Argentinië',     'Oostenrijk',      '2026-06-22'),
(58, 'group', 'J', 'Jordanië',       'Algerije',        '2026-06-23'),
(59, 'group', 'J', 'Algerije',       'Oostenrijk',      '2026-06-28'),
(60, 'group', 'J', 'Jordanië',       'Argentinië',      '2026-06-28'),

-- Groep K
(61, 'group', 'K', 'Portugal',       'Congo',           '2026-06-17'),
(62, 'group', 'K', 'Oezbekistan',    'Colombia',        '2026-06-18'),
(63, 'group', 'K', 'Portugal',       'Oezbekistan',     '2026-06-23'),
(64, 'group', 'K', 'Colombia',       'Congo',           '2026-06-24'),
(65, 'group', 'K', 'Colombia',       'Portugal',        '2026-06-28'),
(66, 'group', 'K', 'Congo',          'Oezbekistan',     '2026-06-28'),

-- Groep L
(67, 'group', 'L', 'Engeland',       'Kroatië',         '2026-06-17'),
(68, 'group', 'L', 'Ghana',          'Panama',          '2026-06-18'),
(69, 'group', 'L', 'Engeland',       'Ghana',           '2026-06-23'),
(70, 'group', 'L', 'Panama',         'Kroatië',         '2026-06-24'),
(71, 'group', 'L', 'Panama',         'Engeland',        '2026-06-27'),
(72, 'group', 'L', 'Kroatië',        'Ghana',           '2026-06-27'),

-- ============================================================
-- RONDE VAN 32 (16 wedstrijden, ~2-6 juli)
-- ============================================================

(73,  'r32', NULL, '1e Groep A',  '2e Groep C',  '2026-07-02'),
(74,  'r32', NULL, '1e Groep C',  '2e Groep A',  '2026-07-02'),
(75,  'r32', NULL, '1e Groep B',  '2e Groep D',  '2026-07-03'),
(76,  'r32', NULL, '1e Groep D',  '2e Groep B',  '2026-07-03'),
(77,  'r32', NULL, '1e Groep E',  '2e Groep G',  '2026-07-04'),
(78,  'r32', NULL, '1e Groep G',  '2e Groep E',  '2026-07-04'),
(79,  'r32', NULL, '1e Groep F',  '2e Groep H',  '2026-07-04'),
(80,  'r32', NULL, '1e Groep H',  '2e Groep F',  '2026-07-05'),
(81,  'r32', NULL, '1e Groep I',  '2e Groep K',  '2026-07-05'),
(82,  'r32', NULL, '1e Groep K',  '2e Groep I',  '2026-07-05'),
(83,  'r32', NULL, '1e Groep J',  '2e Groep L',  '2026-07-06'),
(84,  'r32', NULL, '1e Groep L',  '2e Groep J',  '2026-07-06'),
(85,  'r32', NULL, 'Beste 3e #1', 'Beste 3e #2', '2026-07-06'),
(86,  'r32', NULL, 'Beste 3e #3', 'Beste 3e #4', '2026-07-07'),
(87,  'r32', NULL, 'Beste 3e #5', 'Beste 3e #6', '2026-07-07'),
(88,  'r32', NULL, 'Beste 3e #7', 'Beste 3e #8', '2026-07-07'),

-- ============================================================
-- RONDE VAN 16 (8 wedstrijden, ~8-12 juli)
-- ============================================================

(89,  'r16', NULL, 'Winnaar R32 #1',  'Winnaar R32 #2',  '2026-07-08'),
(90,  'r16', NULL, 'Winnaar R32 #3',  'Winnaar R32 #4',  '2026-07-08'),
(91,  'r16', NULL, 'Winnaar R32 #5',  'Winnaar R32 #6',  '2026-07-09'),
(92,  'r16', NULL, 'Winnaar R32 #7',  'Winnaar R32 #8',  '2026-07-09'),
(93,  'r16', NULL, 'Winnaar R32 #9',  'Winnaar R32 #10', '2026-07-10'),
(94,  'r16', NULL, 'Winnaar R32 #11', 'Winnaar R32 #12', '2026-07-11'),
(95,  'r16', NULL, 'Winnaar R32 #13', 'Winnaar R32 #14', '2026-07-11'),
(96,  'r16', NULL, 'Winnaar R32 #15', 'Winnaar R32 #16', '2026-07-12'),

-- ============================================================
-- KWARTFINALES (4 wedstrijden, ~16-19 juli)
-- ============================================================

(97,  'qf',  NULL, 'Winnaar R16 #1', 'Winnaar R16 #2', '2026-07-16'),
(98,  'qf',  NULL, 'Winnaar R16 #3', 'Winnaar R16 #4', '2026-07-17'),
(99,  'qf',  NULL, 'Winnaar R16 #5', 'Winnaar R16 #6', '2026-07-18'),
(100, 'qf',  NULL, 'Winnaar R16 #7', 'Winnaar R16 #8', '2026-07-19'),

-- ============================================================
-- HALVE FINALES (2 wedstrijden, ~22-23 juli)
-- ============================================================

(101, 'sf',  NULL, 'Winnaar KF #1', 'Winnaar KF #2', '2026-07-22'),
(102, 'sf',  NULL, 'Winnaar KF #3', 'Winnaar KF #4', '2026-07-23'),

-- ============================================================
-- 3E PLAATSWEDSTRIJD + FINALE
-- ============================================================

(103, '3rd',   NULL, 'Verliezer HF #1', 'Verliezer HF #2', '2026-07-26'),
(104, 'final', NULL, 'Winnaar HF #1',   'Winnaar HF #2',   '2026-07-27');
