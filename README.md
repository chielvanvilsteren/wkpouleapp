# WK 2026 Oranje Pool

WK 2026 voorspellingsspel voor de Oranje-selectie, basis XI en incidenten.

## Technologie

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database + Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Styling**: Tailwind CSS (oranje #FF6200 + KNVB-blauw #003082)
- **Hosting**: Render (free tier)

## Lokaal starten

### 1. Dependencies installeren

```bash
npm install
```

### 2. Environment variables

Kopieer `.env.local.example` naar `.env.local` en vul in:

```bash
cp .env.local.example .env.local
```

Vul de waarden in (zie Supabase instellen hieronder).

### 3. Starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase instellen

### 1. Project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account
2. Maak een nieuw project aan (kies een EU-regio voor lage latency)
3. Wacht tot het project klaar is (~2 minuten)

### 2. Database schema uitvoeren

1. Ga in Supabase naar **SQL Editor**
2. Maak een nieuw query aan
3. Kopieer de volledige inhoud van `supabase/migrations/001_schema.sql`
4. Klik **Run**

### 3. Credentials ophalen

In Supabase: **Settings → API**

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ geheim houden!

### 4. Admin-account aanmaken

1. Start de app en maak een account aan via `/register`
2. Ga in Supabase naar **Table Editor → profiles**
3. Zoek jouw rij op (op e-mailadres of display_name)
4. Zet `is_admin` op `true`
5. Klik **Save**

Je hebt nu toegang tot `/admin`.

---

## Deployen op Render

### 1. Repository op GitHub

Push je code naar GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/jouw-username/wk-oranje-pool.git
git push -u origin main
```

### 2. Web Service aanmaken op Render

1. Ga naar [render.com](https://render.com) en maak een account
2. Klik **New → Web Service**
3. Verbind je GitHub-repository
4. Render detecteert automatisch `render.yaml`
5. Klik **Create Web Service**

### 3. Environment variables instellen

In Render → je service → **Environment**:

| Key | Waarde |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Jouw Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Jouw anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Jouw service_role key |

Klik **Save Changes** — Render herdeployt automatisch.

### 4. Supabase CORS instellen (optioneel)

Als je CORS-fouten krijgt: ga in Supabase naar **Authentication → URL Configuration** en voeg je Render-domein toe aan **Allowed Origins**.

---

## Gebruik

### Deelnemer

1. Ga naar de app en klik **Aanmelden**
2. Maak een account aan met naam + e-mail + wachtwoord
3. Vul je voorspelling in via **Mijn Voorspelling**:
   - 26 spelers voor de officiële selectie
   - 11 spelers voor de Basis XI vs. Japan
   - 3 incidenten (rode kaart, gele kaart, geblesseerde)
4. Klik **Opslaan** — je kunt aanpassen zolang inzendingen open zijn

### Organisator (admin)

1. Log in met het admin-account
2. Ga naar **Admin** in de navigatie
3. **Beheer**: sluit inzendingen voor het begin van het toernooi
4. **Master Uitslag**: vul na het WK de officiële gegevens in en sla op
   - Scores worden automatisch herberekend
5. **Scores zichtbaar**: zet aan om de ranglijst te publiceren

---

## Puntensysteem

| Categorie | Punten | Max |
|-----------|--------|-----|
| Elke speler in de officiële selectie (26 spelers) | 1 pt/speler | 26 |
| Elke speler in de Basis XI vs. Japan (11 spelers) | 1 pt/speler | 11 |
| Eerste rode kaart (correcte speler) | 10 pt | 10 |
| Eerste gele kaart (correcte speler) | 10 pt | 10 |
| Eerste geblesseerde (correcte speler) | 10 pt | 10 |
| **Totaal** | | **67** |

Vergelijking is hoofdletterongevoelig, witruimte wordt genegeerd.

---

## Projectstructuur

```
src/
  app/
    page.tsx                    # Landingspagina
    layout.tsx                  # Root layout + Navbar
    login/page.tsx              # Inloggen
    register/page.tsx           # Registreren
    mijn-voorspelling/page.tsx  # Voorspellingsformulier
    ranglijst/page.tsx          # Scorebord
    admin/page.tsx              # Admin dashboard
    auth/actions.ts             # Server action: logout
    api/scores/recalculate/     # Score herberekening API
  components/
    Navbar.tsx
    PredictieForm.tsx
    AdminUitslagForm.tsx
    AdminToggles.tsx
  lib/supabase/
    client.ts                   # Browser Supabase client
    server.ts                   # Server Supabase client
  middleware.ts                 # Auth middleware
  types/index.ts                # TypeScript types
supabase/
  migrations/001_schema.sql     # Database schema
render.yaml                     # Render deployment config
```
