# Community Safety Map - Frontend

This is the React-based frontend for the Community Safety Map PPGIS application.

## Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI + Lucide Icons
- **Mapping**: Leaflet + H3-js + Turf.js

## Development

### Prerequisites
- [Bun](https://bun.sh/) installed.

### Setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to your local or remote API endpoint.

### Scripts
- `bun run dev`: Start development server.
- `bun run build`: Create production build (outputs to `dist/`).
- `bun run preview`: Preview production build locally.

## Deployment (GitHub Pages)
The frontend is configured for deployment on GitHub Pages at `https://thibaud-c.github.io/ppgis-geodays-graz/`.

### SPA Workaround
To support clean URLs (no `#`) on GitHub Pages, this project uses:
- `404.html`: Redirects 404s to `index.html` with route information.
- `index.html`: A tiny script in the `<head>` to restore the intended route from the redirect.

## Routing
Explicit navigation between **Map** and **Dashboard** is available via icons in the header.
