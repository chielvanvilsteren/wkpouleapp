-- Fill the Round of 32 participants confirmed after their group stage ended.
-- Football-Data.org had not populated these team slots yet on 2026-06-27.

WITH known_teams(match_number, home_team, away_team, external_api_id) AS (
  VALUES
    (74, NULL::TEXT, 'Paraguay',    537415),
    (77, 'Frankrijk', 'Zweden',     537416),
    (78, NULL::TEXT, 'Noorwegen',   537424),
    (82, 'België',    NULL::TEXT,    537422),
    (84, 'Spanje',    NULL::TEXT,    537420),
    (86, NULL::TEXT, 'Kaapverdië',  537427),
    (88, NULL::TEXT, 'Egypte',      537428)
)
UPDATE public.matches AS m
SET
  home_team = COALESCE(k.home_team, m.home_team),
  away_team = COALESCE(k.away_team, m.away_team),
  external_api_id = k.external_api_id
FROM known_teams AS k
WHERE m.match_number = k.match_number
  AND m.stage = 'r32';
