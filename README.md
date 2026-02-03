# Community Safety Map (PPGIS)

A modern, mobile-first Participatory GIS (PPGIS) application designed for community safety reporting. Users can drop "Safe" or "Unsafe" markers on a map, provide comments, and view real-time statistics of report density and safety scores.

## Key Features
- **Map Interaction**: Tap to drop markers with localized sentiments.
- **Safety Analytics**: Real-time dashboard with heatmap, H3 grid visualization, and safety score KPIs.
- **Mobile First**: Optimized for field use with a compact, bento-style UI.
- **Dark Mode**: High-contrast, premium dark aesthetic for various lighting conditions.

## Architecture
- **Frontend**: [React](https://react.dev/) + [Vite](https://vite.dev/) + [Leaflet](https://leafletjs.com/). Hosted on **GitHub Pages**.
- **Backend**: Serverless functions (Node.js/Bun) hosted on **Vercel**.
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL).

## Project Structure
- `/frontend`: The React application code.
- `/api`: Vercel serverless functions for database communication.
- `.github/workflows`: CI/CD pipeline for automatic deployment to GitHub Pages.

## Environment Variables

### Frontend (`/frontend/.env`)
- `VITE_API_BASE_URL`: The URL of your deployed Vercel API.

### API (`/api` - set in Vercel)
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key.

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
bun install
```

### 2. Run API (Local)
Create `.env` in root with Supabase credentials and run:
```bash
bun run dev:api
```

### 3. Run Frontend (Local)
```bash
cd frontend
bun run dev
```

## Deployment
- **Frontend**: Automatically deployed via GitHub Actions on push to `main`.
- **Backend**: Automatically deployed via Vercel GitHub integration.

---
Built for Uni Graz GeoDays.
