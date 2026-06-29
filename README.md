# LINT — Matchmaking Dashboard

Dashboard interaktif untuk matchmaking teacher-student berbasis weighted scoring system.

## Stack
- Vite + React 18
- Pure inline styles (no CSS framework dependency)

## Local Development

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Deploy ke Vercel

### Option A — Via GitHub (Recommended)
1. Push repo ini ke GitHub
2. Buka https://vercel.com/new
3. Import repo → Vercel auto-detect Vite → klik **Deploy**
4. Done. URL langsung live.

### Option B — Via Vercel CLI
```bash
npm install -g vercel
vercel
```

## Build Manual
```bash
npm run build   # output ke /dist
npm run preview # preview build lokal
```

---
Prepared by Akbar Rahmada · LINT 2026
