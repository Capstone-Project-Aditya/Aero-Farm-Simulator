\
# AeroFarm Simulator

Indoor aeroponic crop **growth + profitability simulator** with:

- Auth (email/password + Google OAuth via Supabase)
- Simulation engine (growth model + economics)
- Dashboard + reports (Supabase-backed history)
- Side-by-side comparison of runs
- AI Crop Advisor (Supabase Edge Function)

Deployed app (example): https://aero-farm-simulator.vercel.app

---

## Table of contents

- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Authentication setup](#authentication-setup)
- [AI Crop Advisor (Edge Function)](#ai-crop-advisor-edge-function)
- [Deploy to Vercel](#deploy-to-vercel)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

---

## Tech stack

- **Frontend:** Vite + React + TypeScript
- **UI:** Tailwind CSS + shadcn-ui (Radix UI)
- **Data layer:** Supabase (Auth, PostgREST, Edge Functions)
- **Charts:** Chart.js / Recharts
- **Testing:** Vitest (+ Testing Library)
- **Linting:** ESLint

---

## Quick start

### Prerequisites

- Node.js **18+** (recommended: latest LTS)
- npm (or your preferred Node package manager)
- A Supabase project (required for auth + saving simulation runs)

### 1) Install

```bash
npm install
```

### 2) Configure env vars

Create a `.env.local` file in the repo root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
# Supabase “anon public” key (JWT that starts with eyJ...)
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Optional but recommended for stable OAuth/email redirects in production
VITE_SITE_URL=https://aero-farm-simulator.vercel.app
```

### 3) Run the dev server

This project is configured to run on **port 7905**.

```bash
npm run dev
```

Open: http://localhost:7905

---

## Environment variables

These are read at build time by Vite.

- `VITE_SUPABASE_URL` (required)
- `VITE_SUPABASE_ANON_KEY` (required)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy fallback; prefer `VITE_SUPABASE_ANON_KEY`)
- `VITE_SITE_URL` (optional)
	- If set, the app uses it for Supabase auth redirects (Google OAuth + email flows).
	- If not set, it falls back to `window.location.origin`.

---

## Supabase setup

### 1) Create a Supabase project

Create a project in Supabase and copy:

- Project URL → set as `VITE_SUPABASE_URL`
- `anon` public key → set as `VITE_SUPABASE_ANON_KEY`

### 2) Apply the database migration (required)

This app stores history in these tables:

- `profiles`
- `simulation_runs`
- `daily_states`

To create them:

1. Open Supabase → **SQL Editor**
2. Run the migration file:
	 - `supabase/migrations/20260311204846_78e1e28f-a584-443a-8cbf-e451e9d5c801.sql`

What the migration does (high level):

- Adds RLS policies so users can only access their own runs
- Creates a trigger to auto-create `profiles` rows on signup

---

## Authentication setup

### Email/password auth

Works out of the box once your Supabase project + env vars are set.

### Google OAuth (works locally but redirects wrong on Vercel)

If Google login works on localhost but redirects incorrectly after deploying, it’s almost always because Supabase only allows redirects to URLs you explicitly configure.

#### 1) Supabase “URL Configuration”

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://aero-farm-simulator.vercel.app`
- **Redirect URLs:** add these entries (wildcards are allowed):
	- `https://aero-farm-simulator.vercel.app/*`
	- `http://localhost:7905/*`

If you use Vercel Preview Deployments and want OAuth to work on previews too, add:

- `https://*.vercel.app/*`

Or, alternatively, force redirects to production by setting `VITE_SITE_URL=https://aero-farm-simulator.vercel.app` in Vercel.

#### 2) Supabase “Google provider” setup

In Supabase → **Authentication → Providers → Google**:

- Enable Google provider
- Follow the instructions shown there to configure your Google Cloud OAuth consent screen and client.

Important: Google’s **Authorized redirect URI** is typically your Supabase callback URL:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

---

## AI Crop Advisor (Edge Function)

The AI Advisor page calls a Supabase Edge Function:

- Function name: `ai-crop-advisor`
- Source: `supabase/functions/ai-crop-advisor/index.ts`

It sends the selected crop + your recent simulation history and receives a markdown recommendation.

### Requirements

- Deploy the Edge Function to your Supabase project
- Configure an Edge Function secret:
	- `GEMINI_API_KEY`
	- (Optional) `GEMINI_MODEL` (default: `gemini-1.5-flash`)

### Deploy (Supabase CLI)

If you have the Supabase CLI installed and linked to your project:

```bash
supabase functions deploy ai-crop-advisor
supabase secrets set GEMINI_API_KEY=YOUR_KEY

# Optional
supabase secrets set GEMINI_MODEL=gemini-1.5-flash
```

Notes:

- If the AI endpoint returns `429`, that’s rate limiting.
- If it returns `401/403`, check your `GEMINI_API_KEY`.

---

## Deploy to Vercel

This is a client-side routed SPA (`react-router-dom`), so Vercel needs a rewrite to serve `index.html` for all routes.

### 1) Vercel project settings

- **Build Command:** `npm run build`
- **Output Directory:** `dist`

This repo already includes a rewrite config:

- `vercel.json` rewrites `/(.*)` → `/`

### 2) Vercel environment variables

In Vercel → Project → Settings → Environment Variables (Production):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL=https://aero-farm-simulator.vercel.app` (recommended)

### 3) Supabase allow-list

Make sure Supabase Redirect URLs includes:

- `https://aero-farm-simulator.vercel.app/*`

---

## Scripts

From `package.json`:

- `npm run dev` — start dev server (port 7905)
- `npm run build` — production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
- `npm test` — run Vitest once
- `npm run test:watch` — run Vitest in watch mode

---

## Project structure

High-level map:

- `src/pages/` — top-level routes (Dashboard, Simulator, AI Insights, Compare, Reports)
- `src/components/` — UI + feature components
- `src/lib/simulation/` — simulation engine (crops, environment, economics, optimizer)
- `src/integrations/supabase/` — Supabase client + helpers
- `supabase/migrations/` — database schema
- `supabase/functions/` — Edge Functions (AI Crop Advisor)

---

## Troubleshooting

### “Database tables not found (simulation_runs)”

- Apply the migration SQL in `supabase/migrations/...sql`.

### OAuth redirects work locally but not on Vercel

- Add `https://aero-farm-simulator.vercel.app/*` to Supabase Redirect URLs.
- Add `http://localhost:7905/*` for local development.
- Set `VITE_SITE_URL` in Vercel to force a stable redirect target.

### Vercel shows 404 on refresh for `/simulator` or `/reports`

- Ensure `vercel.json` rewrites are present (they are in this repo).


### Dev server won’t start

- This app uses port **7905** with `strictPort: true`. If it’s in use, free the port or change it in `vite.config.ts`.

---

## Security notes

- Never commit `.env.local`.
- If you ever paste a URL containing `access_token`/`refresh_token`, treat it like a password and rotate/revoke the session.

