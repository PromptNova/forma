# Forma — 3D Furniture Physics Studio

## Overview
Forma is a world-class 3D furniture physics SaaS built with Next.js + Three.js + FastAPI + Supabase.

## Architecture
- **Frontend**: Next.js 14 (App Router), Three.js r160, Zustand, Framer Motion, TypeScript strict
- **Backend**: FastAPI + Supabase (PostgreSQL) + Redis (Upstash)
- **Deploy**: Vercel (frontend) + Render (backend)

## Project Structure
```
/app                  - Next.js App Router pages
/components           - React components
  Forma3D.tsx         - Three.js canvas + physics + GLB loader (CORE)
  Topbar.tsx          - Top navigation bar
  Sidebar.tsx         - Left sidebar with parts/presets/AI library
  PropsPanel.tsx      - Right panel with selected part properties
  CommandPalette      - ⌘K command palette (Raycast-style)
  Settings.tsx        - Settings slide-in panel
  Tutorial.tsx        - 4-step onboarding tutorial
  PhysicsHUD.tsx      - Physics score ring + stability info
  PhotoTo3D.tsx       - AI photo-to-3D modal (3-step upload flow)
/lib
  store.ts            - Zustand global state (incl. customParts)
  physics.ts          - Physics validation engine
  parts.ts            - Part definitions, presets, CustomPart interface
/styles
  globals.css         - Design tokens + animations
/backend
  main.py             - FastAPI app
  routers/            - auth, designs, physics, export, embed, analytics, photo_to_3d
  models/             - Pydantic models
  services/           - supabase, physics, cache services
  migrations/         - SQL migration files (001_initial, 002_ai_conversions)
```

## Design System

### Colors (Warm Studio Dark)
- `--bg: #0e0d0b` — Background
- `--panel: #181614` — Panel background
- `--acc: #d4754a` — Terracotta accent (NOT orange, NOT amber)
- `--gr: #3ec87a` — Success green
- `--rd: #e05252` — Error red

### Typography
- **Logo/Display**: Syne 800 — NEVER Inter/Roboto
- **UI Labels**: DM Sans 400/500
- **Data/Numbers**: DM Mono 400/500

## Physics Engine
The core physics validates furniture stability:
- Surface stable if: legs within X-span ±5cm, heights equal ±8cm, CoM within leg polygon
- Per-part emissive: stable=0x001a00 (green), unstable=0x1f0000 (red)
- Score 0-100 → Grade A/B/C/D
- Global red pulsing overlay when unstable

## Controls
- LEFT CLICK on part: select
- LEFT DRAG on part: move in XZ-plane
- LEFT DRAG on empty: orbit camera
- SCROLL: zoom in/out
- ⌘K: command palette
- ⌘Z/⌘Y: undo/redo
- D: duplicate, Del: delete, R: reset camera, F: fullscreen, ?: tutorial

## AI Photo-to-3D Feature

### Overview
Core differentiator: furniture manufacturers upload a product photo and get a physics-ready 3D GLB model in ~30 seconds.

### Pipeline
1. User uploads JPG/PNG/WEBP (max 10MB) via `PhotoTo3D.tsx` modal
2. Image uploaded to Supabase Storage (`part-images` bucket)
3. Sent to Tripo3D v2.5 via fal.ai queue API
4. Polled every 3s (max 120s timeout)
5. GLB downloaded and stored in Supabase Storage (`part-models` bucket)
6. Metadata saved to `ai_conversions` + `shop_parts` tables
7. Model appears in "My Library" tab in sidebar — draggable with full physics

### API Endpoints
- `POST /ai/photo-to-3d` — multipart/form-data upload + conversion
- `GET  /ai/conversions` — list user conversions with status
- `GET  /ai/quota` — check monthly quota (free: 3, pro: 25, business: unlimited)

### Business Model
- Free: 3 conversions/month
- Pro (€9/mo): 25 conversions/month
- Business (€99/mo): unlimited + branded library
- Per-conversion cost: ~$0.30 (Tripo3D via fal.ai)

### fal.ai Setup
1. Create account at https://fal.ai
2. Go to https://dashboard.fal.ai/keys
3. Create a new API key
4. Add to Render environment: `FAL_KEY=fal_...your_key`
5. Add to Vercel: no FAL_KEY needed on frontend

### Supabase Storage Setup
Run in Supabase Dashboard > SQL Editor:
```sql
-- Already handled by 002_ai_conversions.sql migration
-- But buckets must be created manually in Storage UI:
-- 1. Create bucket "part-images" → set to PUBLIC
-- 2. Create bucket "part-models" → set to PUBLIC
```
Or use the Supabase Dashboard > Storage > New Bucket:
- `part-images` — Public bucket for original photos + previews
- `part-models` — Public bucket for .glb 3D model files

### Database Migration
Run `backend/migrations/002_ai_conversions.sql` in Supabase SQL Editor:
- Creates `ai_conversions` table (tracks every conversion)
- Creates `conversion_quota` table (monthly usage limits)
- Adds `model_glb_url`, `preview_image_url`, `source`, `conversion_id` columns to `shop_parts`
- Enables RLS policies (users see only their own data)

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build
```

## Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables
See `.env.example` for all required variables.

Key additions for AI feature:
- `FAL_KEY` — fal.ai API key (get from dashboard.fal.ai)
- `SUPABASE_SERVICE_KEY` — needed for storage uploads (service role key)
- `SUPABASE_STORAGE_BUCKET_IMAGES` — default: `part-images`
- `SUPABASE_STORAGE_BUCKET_MODELS` — default: `part-models`
- `NEXT_PUBLIC_MAX_FILE_SIZE_MB` — default: `10`

## Business Model
B2B SaaS for furniture manufacturers and interior designers.
- Free tier: 5 designs + 3 AI conversions/month
- Pro: €9/month — 25 AI conversions + basic features (updated from old pricing)
- Business: €99/month — unlimited AI conversions + branded library + embed API
- Enterprise: custom pricing — white-label

## Deployment
- Frontend auto-deploys to Vercel on push to main
- Backend deploys to Render via render.yaml
