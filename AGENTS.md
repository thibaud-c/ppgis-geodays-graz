Extra context for coding agents and maintainers (build steps, conventions, and API contract).

## Non-negotiables
1) UI must be minimalist + modern, built with shadcn/ui components.
2) Frontend is static (GitHub Pages). Backend is Vercel API routes.
3) Never expose Supabase service role key to the frontend.

## Repo layout (suggested)
ppgis-GeoDays/
  api/
    save-marker.js          # Vercel API route (server-side insert into Supabase)
  frontend/
    src/
      app/
        MapPage.tsx         # Leaflet map + interactions
      components/
        ui/                 # shadcn/ui components (generated into repo)
      lib/
        geo.ts              # GeoJSON helpers, Turf utilities
        api.ts              # fetch wrapper to backend
    index.html
    vite.config.ts
    tailwind.config.*
  README.md
  AGENTS.md
  Rules.md

## Setup (Bun)
```bash
bun install
cd frontend
bun install
```

## shadcn/ui setup (Vite)
Follow the official Vite installation steps for shadcn/ui, including running the CLI init and generating components.json. [web:49]

### Typical commands (keep as guidance, adapt to prompts):

```bash
cd frontend
bunx shadcn@latest init
bunx shadcn@latest add button textarea label sheet dialog toast
```

### Frontend conventions (Leaflet + Turf)
- Use Leaflet for rendering and interactions.
- Keep marker state internally as GeoJSON (FeatureCollection).
- Use Turf.js client-side for lightweight checks (e.g., study-area containment) and optional analytics.
- Import only Turf modules you need (avoid importing everything).

## UX pattern
- Tap on map => open a shadcn Sheet/Drawer with:
    - sentiment (like/dislike)
    - response_text (short text)
    - submit button
- On submit: optimistic UI (show marker immediately), then persist via API.

## Backend API contract (Vercel route)
Endpoint:

- POST /api/save-marker

### Request JSON:
```json
{
"latitude": number,
"longitude": number,
"sentiment": "like" | "dislike",
"response_text": string
}

Response JSON (201):
{
"status": "ok",
"id": "uuid",
"submitted_at": "ISO8601"
}
```

### Validation rules:

- reject missing/invalid coordinates
- reject sentiment not in {like, dislike}
- enforce a short max length for response_text (e.g., 280 chars)

## Security checklist (must)
- Supabase service role key only in Vercel env vars.
- API route validates inputs (defense in depth).
- Add basic abuse protection (at minimum: per-IP throttling or duplicate suppression).

## Testing (MVP)
Manual test checklist:

1. Mobile: map loads, tap works, sheet opens.
2. Submit marker: request returns 201, row appears in Supabase.
3. Fail mode: disable network -> UI shows toast error, app stays usable.