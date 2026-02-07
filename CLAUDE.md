# Storacle — Project Guidelines for Claude

This document helps Claude understand the project structure, conventions, and priorities.

---

## Project Overview

**Storacle** is a retail inventory tracker built for UGAHacks 11. A business takes one photo in the morning (AM) and one at end-of-day (EOD). The app uses Gemini Vision to count products, stores snapshots in a database, and forecasts stockouts with reorder suggestions.

**Hackathon tracks:** NCR Voyix (stockout prediction + reorder timing), First Time Hacker.

**Core flow:** Photo upload → Gemini counts → DB storage → Dashboard → Forecast → Reorder suggestion

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (TypeScript, Tailwind) |
| Backend | FastAPI (Python) |
| CV | Google Gemini API (Vision) |
| Database | SQLite (via SQLAlchemy) |
| Forecasting | Darts / statsmodels |
| Hosting | Vercel (frontend), Railway/Render (backend) |

Use **Gemini** for vision, not Rekognition. Use **SQLite** for the hackathon; avoid Supabase unless auth/multi-tenant is needed.

---

## Project Structure

```
storacle/
├── backend/           # FastAPI service
│   ├── main.py        # API routes
│   ├── database.py    # SQLAlchemy engine, session
│   ├── models.py      # Snapshot, InventoryCount
│   ├── requirements.txt
│   └── .env           # GEMINI_API_KEY (gitignored)
├── frontend/          # Next.js app (to be scaffolded)
├── scripts/           # Seed scripts (e.g. synthetic data)
├── plans/             # Planning documents
├── docs/              # Pitch outline, demo script
├── INSTRUCTIONS.md    # Backend setup & run instructions
└── CLAUDE.md          # This file
```

---

## Data Models

### Snapshot
- `id`, `timestamp`, `time_of_day` ("AM" or "EOD")
- One-to-many with `InventoryCount`

### InventoryCount
- `id`, `snapshot_id`, `product_type`, `count`
- Belongs to a `Snapshot`

**Daily delta:** EOD count − AM count = daily usage/demand. Use this for forecasting.

---

## API (Current & Planned)

| Method | Endpoint | Status | Purpose |
|--------|----------|--------|---------|
| GET | `/health` | Done | Health check |
| GET | `/snapshots` | Done | List recent snapshots |
| POST | `/snapshots/upload` | Planned | Upload image + AM/EOD → Gemini → store counts |
| GET | `/forecast` or `/snapshots/forecast` | Planned | Return predicted demand, reorder date, stockout risk |

**Upload contract:** Accept `file` (image) + `time_of_day` (AM | EOD). Return snapshot ID and counts: `[{ "product_type": string, "count": number }]`.

---

## Conventions

### Backend (Python)
- Use FastAPI dependency injection (`Depends(get_db)` for DB)
- Pydantic models for request/response validation
- Environment variables via `python-dotenv`; never hardcode keys
- CORS allows `http://localhost:3000` for local dev

### Frontend (Next.js)
- App Router (`app/` directory)
- API base URL from `NEXT_PUBLIC_API_URL`
- TypeScript for type safety

### General
- Prioritize **shipping a working demo** over perfect code
- Use **synthetic data** for forecasting if real history is insufficient
- Keep scope small: one product category (e.g. canned goods) for the demo

---

## Priorities

1. **Working pipeline:** Upload → counts → dashboard → forecast → reorder
2. **NCR alignment:** Explicitly show stockout prediction and reorder timing
3. **README & video:** Required for submission; include setup, env vars, credits, team names

---

## Important Files

- [backend/main.py](backend/main.py) — API entry point
- [backend/models.py](backend/models.py) — ORM models
- [backend/database.py](backend/database.py) — DB connection
- [plans/ugahacks_inventory_tracker_plan_c2e4946b.plan.md](plans/ugahacks_inventory_tracker_plan_c2e4946b.plan.md) — Full plan and timeline
