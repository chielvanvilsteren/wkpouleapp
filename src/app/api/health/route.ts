import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const accept = req.headers.get('accept') ?? ''

  if (!accept.includes('text/html')) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Status — WK Poule</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      background: #003082;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      color: white;
      padding: 2rem;
    }

    .flag { font-size: 4rem; margin-bottom: 1.5rem; }

    h1 {
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #FF6200;
      text-shadow:
        0 0 10px rgba(255, 98, 0, 0.8),
        0 0 25px rgba(255, 98, 0, 0.6),
        0 0 50px rgba(255, 98, 0, 0.4),
        0 0 100px rgba(255, 98, 0, 0.2);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.55);
      margin-bottom: 3rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .card {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 1.5rem;
      padding: 2.5rem 3rem;
      text-align: center;
      backdrop-filter: blur(8px);
      max-width: 420px;
      width: 100%;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      animation: pulse 2s ease-in-out infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); opacity: 1; }
      50%  { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); opacity: 0.7; }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); opacity: 1; }
    }

    .status-label {
      font-size: 1.4rem;
      font-weight: 700;
      color: #22c55e;
    }

    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 1.5rem 0;
    }

    .meta {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.4);
      line-height: 1.8;
    }

    .meta strong {
      color: rgba(255,255,255,0.7);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="flag">🇳🇱</div>
  <h1>WK Poule</h1>
  <p class="subtitle">Oranje WK 2026</p>

  <div class="card">
    <div class="status-row">
      <div class="dot"></div>
      <span class="status-label">Alles operationeel</span>
    </div>
    <hr class="divider" />
    <div class="meta">
      <div>Gecontroleerd op</div>
      <strong>${now}</strong>
    </div>
  </div>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
