A lightweight, mobile-first Participatory GIS (PPGIS) web app for classroom use: students scan a QR code, open a map on their phone, and drop a "like / dislike" marker with a short comment. Data is saved securely via a Vercel API route into Supabase.

## Design (UI/UX)
This project must look and feel **minimalist and modern**.
- Use **shadcn/ui** components for all UI (forms, buttons, dialogs/sheets, toasts).
- Prefer a clean "map-first" layout: the map is the main screen; controls are minimal.
- Mobile interaction: use a bottom sheet / drawer pattern for the submission form.

## Architecture
- Frontend: GitHub Pages (static React + Vite)
- Backend: Vercel API Route (`/api/save-marker`) to hide Supabase service key
- Database: Supabase (Postgres + optional PostGIS)

## Quick Start

### Prerequisites
- Bun installed
- Supabase project created
- Vercel project created (for API route)

### 1) Install
```bash
git clone https://github.com/<you>/ppgis-classroom-mapper.git
cd ppgis-classroom-mapper
bun install
```

### 2) Configure env
Create frontend/.env.local:
```bash
VITE_API_BASE_URL=http://localhost:3000
```
Set Vercel env vars (Project Settings → Environment Variables):
```bash
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
```
3) Create database table
Create a submissions table in Supabase (minimum fields):

- `id` (uuid, primary key)
- `latitude` (double precision)
- `longitude` (double precision)
- `sentiment` (text: like|dislike)
- `response_text` (text)
- `submitted_at` (timestamp)

4) Run locally
```bash
# Option A: run Vite frontend only
bun run dev
# Option B: run Vercel dev to test API routes locally
bunx vercel dev
```

## Deployment
- Frontend: build and deploy to GitHub Pages
- Backend: deploy to Vercel (push to main, or `vercel --prod`)

## Contribution guidelines
- Keep UI minimalist and consistent with shadcn/ui.
- Keep the backend stateless (serverless friendly).
- No personally identifying data (PII).
```