# Development

## Prereqs

- Node.js 18+
- Supabase CLI (only needed to deploy Edge Functions locally)

## Install

```bash
npm ci
```

## Run the web app

```bash
npm run dev
```

The app is a Vite + React frontend in `src/` that talks to Supabase Edge Functions under `supabase/functions/`.

## Environment variables

The frontend uses the Supabase client in `src/integrations/supabase/`. For local development, keep secrets in `.env` (see `.env.example`).

