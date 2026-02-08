# Plan: Wire Frontend Pages to Backend API

## Context

All 4 frontend pages (Upload, Inventory, Dashboard, Forecasts) currently use hardcoded placeholder data. The backend API already has working endpoints for snapshots, upload, and spend. We need to connect them so the app has a real end-to-end flow.

**Note:** The Forecasts page and Dashboard's stockout/reorder cards depend on a `/forecast` endpoint that doesn't exist yet — those will stay as placeholders for now, to be wired up when the forecast model is built.

## API base URL

Already configured: `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`

## Prerequisites: Update lib/api.ts

Before wiring pages, update the API client so types match the backend and upload supports `store_name`.

### 1. Extend types in `frontend/lib/api.ts`

- **Snapshot** — Add `store_name?: string` and `counts?: InventoryCount[]` to match the backend response.
- **uploadSnapshot** — Add optional `storeName?: string` (default `"default"`). Append `store_name` to FormData when provided.

### 2. Ensure getSnapshots returns full snapshot shape

The backend returns `{ id, timestamp, time_of_day, store_name, counts }`. Update the `Snapshot` interface and ensure `getSnapshots()` is typed to return this shape (it should already work if the backend returns it; just fix the TypeScript interface).

---

## Changes by Page

### 1. Upload page — `frontend/app/(dashboard)/upload/page.tsx`

- Replace the fake `setTimeout` in `handleSubmit` with a call to `uploadSnapshot(file, timeOfDay, storeName)` from `@/lib/api`.
- Pass `store_name: "default"` for now (or add a store input field if desired).
- On success:
  - Display the returned product counts (`response.counts` — product_type + count) below the form in a table or list.
  - Optionally add a link/button to navigate to the Inventory page so the user can see the new snapshot there.
- On error: catch `ApiError` and show `error.message` (backend error messages like spend limit or parsing failure will come through).
- Keep loading state and form reset behavior.

### 2. Inventory page — `frontend/app/(dashboard)/inventory/page.tsx`

- Ensure it's a `"use client"` component.
- On mount, call `getSnapshots()` from `@/lib/api` to fetch recent snapshots.
- Replace `placeholderProducts` with the latest snapshot's `counts` (or empty array if no snapshots).
- Derive status: `"out"` if count === 0, `"low"` if count < 10, `"ok"` otherwise.
- Show snapshot history in the bottom card: timestamp, time_of_day, store_name, product counts for each.
- Add a loading state while fetching.
- Handle empty state when no snapshots exist.

### 3. Dashboard page — `frontend/app/(dashboard)/page.tsx`

- Ensure it's a `"use client"` component.
- On mount, call `getSnapshots()` to get snapshot data.
- **Snapshot feed card:** Show latest snapshot info (store_name, time_of_day, timestamp, total units from counts).
- **Daily usage card:** If there are AM + EOD snapshots for the same calendar day, compute delta (EOD total − AM total) and display. Otherwise show "Need AM + EOD data for today."
- **Stockout countdown + Suggested reorder cards:** Leave as placeholder (depends on `/forecast` endpoint).

### 4. Forecasts page — `frontend/app/(dashboard)/forecasts/page.tsx`

- Leave as-is for now (all placeholder). Will wire up once `/forecast` endpoint is built.

---

## Files to modify

1. `frontend/lib/api.ts` — Extend Snapshot type, add storeName to uploadSnapshot
2. `frontend/app/(dashboard)/upload/page.tsx`
3. `frontend/app/(dashboard)/inventory/page.tsx`
4. `frontend/app/(dashboard)/page.tsx`

## Files unchanged

- `frontend/app/(dashboard)/forecasts/page.tsx` (no endpoint yet)
- All backend files (no changes needed)

---

## Verification

1. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. **Upload page:** Select an image + AM/EOD → submit → should see real Gemini counts returned below the form.
4. **Inventory page:** Should show the snapshot you just uploaded with real counts. If you added a link, clicking it from Upload should navigate here.
5. **Dashboard:** Should show latest snapshot info and, if AM + EOD exist for today, the daily usage delta.
