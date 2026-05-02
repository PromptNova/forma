# Forma — 3D Furniture Physics Studio

## Overview
Forma is a world-class 3D furniture physics SaaS built with Next.js + Three.js + FastAPI + Supabase.

## Architecture
- **Frontend**: Next.js 14 (App Router), Three.js r160, Zustand, Framer Motion, TypeScript strict
- **Backend**: FastAPI + Supabase (PostgreSQL) + Redis (Upstash)
- **Deploy**: Vercel (frontend) + Render (backend)

## Project Structure
```
/app              - Next.js App Router pages
/components       - React components
  Forma3D.tsx     - Three.js canvas + physics visualization (CORE)
  Topbar.tsx      - Top navigation bar
  Sidebar.tsx     - Left sidebar with parts/presets
  PropsPanel.tsx  - Right panel with selected part properties
  CommandPalette  - ⌘K command palette (Raycast-style)
  Settings.tsx    - Settings slide-in panel
  Tutorial.tsx    - 4-step onboarding tutorial
  PhysicsHUD.tsx  - Physics score ring + stability info
/lib
  store.ts        - Zustand global state
  physics.ts      - Physics validation engine
  parts.ts        - Part definitions + presets
/styles
  globals.css     - Design tokens + animations
/backend
  main.py         - FastAPI app
  routers/        - auth, designs, physics, export, embed, analytics
  models/         - Pydantic models
  services/       - supabase, physics, cache services
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

## Development
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # Production build
```

## Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables
See `.env.example` for required variables.

## Business Model
B2B SaaS for furniture manufacturers and interior designers.
- Free tier: 5 designs
- Pro: €29/month — unlimited designs, PDF export, share links
- Enterprise: custom pricing — embed API, white-label

## Deployment
- Frontend auto-deploys to Vercel on push to main
- Backend deploys to Render via render.yaml
