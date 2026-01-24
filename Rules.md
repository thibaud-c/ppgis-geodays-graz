Project-wide development rules (good practices + design patterns).

## Product rules
- The UI must be minimalist and modern.
- Use shadcn/ui for all UI primitives (buttons, inputs, dialogs/sheets, toasts).
- Map-first: the map is always visible; forms appear as an overlay (sheet/drawer).

## Architecture rules
- Frontend: static SPA (React + Vite) deployable to GitHub Pages.
- Backend: Vercel API routes only (stateless functions).
- Database: Supabase; writes go through the API route (service key is never public).

## Frontend rules (Leaflet + UX)
- Keep the map interaction simple:
  - single tap to add point
  - clear "cancel" and "submit" actions
- Store markers as GeoJSON in state; derive Leaflet layers from that state.
- Always handle mobile constraints:
  - touch targets >= 44px
  - avoid tiny controls and dense toolbars
  - use a bottom sheet for forms

## Geospatial rules (Turf.js)
- Prefer client-side checks:
  - study-area containment, distance limits, snapping (optional)
- Import only needed Turf modules (performance).
- Never send raw geometry to the backend for processing (backend stays thin).

## Backend rules (API route)
- Validate and sanitize every field.
- Return consistent JSON shapes:
  - { status: "ok", ... } on success
  - { status: "error", message: "..." } on failure
- Add CORS restrictions to your GitHub Pages domain if needed.
- Avoid logging sensitive values.

## Data rules
- Do not store PII (names, emails, phone numbers).
- Keep response_text short (e.g., 280 chars) to reduce moderation risk.
- Record submitted_at server-side.

## Quality rules
- No hardcoded URLs (use env vars).
- Prefer small modules and clear boundaries:
  - ui components
  - map logic
  - api client
  - geo utilities
- If it's not needed for the classroom session, don't add it.