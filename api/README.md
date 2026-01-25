# Community Safety Map - API

Serverless functions for the Community Safety Map backend, designed to run on **Vercel**.

## Endpoints
- `GET /api/markers`: Fetch all confirmed markers (supports `?version=X` filter).
- `POST /api/save-marker`: Create or update a safety report.
- `DELETE /api/delete-marker`: Soft-delete a marker (sets `deleted_at`).

## Environment Variables
The following must be set in your Vercel project environment settings:
- `SUPABASE_URL`: Your Supabase connection URL.
- `SUPABASE_SERVICE_KEY`: Your Supabase `service_role` key (to bypass RLS for administrative operations).

## Multi-Runtime Support
The scripts in this directory are optimized for **Multi-Runtime Deployment**:
- **Node.js**: Standard Vercel Lambda runtime.
- **Web Standard**: Edge-compatible (Fetch API based).

## Database Schema
The API expects a table named `ppgis-geodays` with the following columns:
- `id` (uuid, primary key)
- `latitude` (numeric)
- `longitude` (numeric)
- `sentiment` (text: 'like' | 'dislike')
- `comment` (text)
- `version` (int4)
- `created_at` (timestampz, default: now())
- `updated_at` (timestampz, default: now())
- `deleted_at` (timestampz, nullable)
