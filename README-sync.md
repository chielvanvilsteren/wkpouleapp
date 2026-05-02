# Automatische uitslag-sync via Football-Data.org

Dit project haalt automatisch WK-uitslagen op via de [Football-Data.org API](https://www.football-data.org/) en updatet de Supabase database.

---

## Hoe het werkt

```
Elke 30 minuten
     │
     ▼
Render Cron / cron-job.org
     │  POST /api/sync-results
     ▼
Next.js API route (src/app/api/sync-results/route.ts)
     │
     ├─► Football-Data.org API  →  wedstrijden met status FINISHED
     │                              van de afgelopen 3 uur
     │
     ├─► Koppel aan DB via external_api_id of teamnaam
     │
     ├─► UPDATE matches SET home_score, away_score, is_finished = true
     │   (idempotent: geen actie als score al correct is)
     │
     └─► Scores worden automatisch herberekend
```

De sync haalt wedstrijden op die **in de afgelopen 3 uur** zijn afgelopen. Dit zorgt dat:
- Een wedstrijd die om 21:00 begint, om ~23:30 in de API beschikbaar is
- Bij elke run van 30 minuten geen wedstrijd gemist wordt

---

## Installatie

### 1. API sleutel aanvragen

1. Ga naar [football-data.org](https://www.football-data.org/client/register)
2. Registreer een gratis account (Free tier = 10 requests/minuut)
3. Kopieer je API token uit het dashboard

### 2. Omgevingsvariabelen instellen

Voeg toe aan `.env.local`:

```env
FOOTBALL_DATA_API_KEY=jouw_api_sleutel_hier
SYNC_SECRET_TOKEN=een_willekeurig_lang_geheim_token   # bijv. via: openssl rand -hex 32
NEXT_PUBLIC_APP_URL=https://jouw-app.onrender.com      # of http://localhost:3000
```

### 3. Database migraties uitvoeren

Voer in de Supabase SQL editor uit (in volgorde):

```sql
-- 009_add_match_time.sql     → voegt speeltijden toe
-- 010_add_external_api_id.sql → voegt external_api_id kolom toe
```

---

## Testen

### Handmatig testen (lokaal)

```bash
# Kopieer .env.local zodat het script de variabelen leest
npx tsx scripts/sync-match-results.ts
```

### API endpoint testen via curl

```bash
# Lokaal
curl -s -X POST http://localhost:3000/api/sync-results \
  -H "Authorization: Bearer jouw_sync_secret_token" | jq

# Productie
curl -s -X POST https://jouw-app.onrender.com/api/sync-results \
  -H "Authorization: Bearer jouw_sync_secret_token" | jq
```

Verwachte response als er geen wedstrijden zijn:
```json
{ "message": "Geen afgeronde wedstrijden gevonden", "log": [] }
```

Verwachte response na een update:
```json
{
  "updated": 2,
  "skipped": 0,
  "unmatched": 0,
  "log": [
    "2 afgeronde wedstrijden van API",
    "✅ #31 Nederland 2-1 Japan",
    "✅ #32 Zweden 0-0 Tunesië",
    "Klaar: 2 bijgewerkt, 0 overgeslagen, 0 niet gekoppeld"
  ]
}
```

### API beschikbaarheid controleren

```bash
# Bekijk alle competities (controleer of WK beschikbaar is)
curl -H "X-Auth-Token: jouw_api_sleutel" \
  https://api.football-data.org/v4/competitions | jq '.competitions[] | select(.code == "WC")'

# Bekijk WK-wedstrijden van vandaag
curl -H "X-Auth-Token: jouw_api_sleutel" \
  "https://api.football-data.org/v4/competitions/2000/matches?dateFrom=2026-06-11&dateTo=2026-06-11" | jq '.matches[] | {id, status, home: .homeTeam.name, away: .awayTeam.name, score: .score.fullTime}'
```

---

## Cronjob instellen

### Optie A: Render (aanbevolen, al geconfigureerd in render.yaml)

De `render.yaml` bevat al een cron-definitie die elke 30 minuten draait.

Stel in Render de environment variables in:
- `FOOTBALL_DATA_API_KEY`
- `SYNC_SECRET_TOKEN`
- `NEXT_PUBLIC_APP_URL` (de URL van je web service)

### Optie B: cron-job.org (gratis, extern)

1. Ga naar [cron-job.org](https://cron-job.org)
2. Maak een nieuwe cronjob aan:
   - **URL**: `https://jouw-app.onrender.com/api/sync-results`
   - **Method**: POST
   - **Header**: `Authorization: Bearer jouw_sync_secret_token`
   - **Schedule**: elke 30 minuten

### Optie C: Lokale cronjob (macOS/Linux)

```bash
crontab -e
```

Voeg toe:
```cron
*/30 * * * * curl -s -X POST -H "Authorization: Bearer TOKEN" https://jouw-app.onrender.com/api/sync-results >> /tmp/sync.log 2>&1
```

---

## Teamnamen koppeling

Football-Data.org gebruikt Engelse teamnamen. De `TEAM_NAME_MAP` in het script/route vertaalt deze naar de Nederlandse namen in de database.

Als een team niet gekoppeld wordt (log: `WARN: Niet gekoppeld: ...`), voeg je de vertaling toe in:
- `scripts/sync-match-results.ts` → `TEAM_NAME_MAP`
- `src/app/api/sync-results/route.ts` → `TEAM_NAME_MAP`

### external_api_id koppeling

De eerste keer dat een wedstrijd gematcht wordt op teamnaam, wordt het `external_api_id` opgeslagen. Daarna wordt altijd op dit ID gekoppeld — dit is betrouwbaarder en sneller.

Je kunt `external_api_id` ook handmatig invullen voor groepsfase-wedstrijden:

```sql
-- Voorbeeld: zoek het juiste API ID op via de test curl hierboven
UPDATE public.matches SET external_api_id = 12345 WHERE match_number = 31;
```

---

## Beveiliging

- Het `/api/sync-results` endpoint vereist een `Authorization: Bearer <SYNC_SECRET_TOKEN>` header
- Genereer een sterk token: `openssl rand -hex 32`
- Stel `SYNC_SECRET_TOKEN` in als environment variable (nooit hardcoden)
- Als `SYNC_SECRET_TOKEN` niet ingesteld is, is het endpoint onbeveiligd (alleen lokaal acceptabel)

---

## Frequentie & API limieten

| Free tier Football-Data.org | |
|---|---|
| Requests per minuut | 10 |
| Requests per dag | geen limiet |
| WK-data beschikbaar | ja (competition ID 2000) |

Bij elke sync-run worden **maximaal 1-2 API requests** gedaan. Met een interval van 30 minuten blijf je ruim onder de limieten.
