# Prompt: Implement Store Selector and Store Management

Read the CLAUDE.md file for project context, then implement the full store selector logic as described below. Stores are user-managed (NOT derived from snapshots). The user predetermines which store they're working on.

---

## Backend Changes

### 1. Add Store model and table

In `backend/models.py`, add a new model:

```python
class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # e.g. "default", "store_a"
```

### 2. Seed "default" store on startup

In `backend/main.py` `on_startup()`, after migrations: if the stores table is empty, insert a row with `name="default"`.

### 3. Add Store API endpoints in main.py

- **GET /stores** — Return list of all stores: `{"stores": [{"id": 1, "name": "default"}, ...]}`
- **POST /stores** — Add a new store. Body: `{"name": "store_a"}`. Validate name is non-empty, unique. Return the created store.
- **DELETE /stores/{id}** — Remove a store. **Constraint:** Only allow if no snapshots exist with that store_name. If snapshots exist, return 400 with detail: `"Cannot remove store: it has existing snapshots."`

### 4. Validate store_name on upload and manual snapshot

When creating a snapshot (upload or manual), validate that `store_name` exists in the stores table. If not, return 400: `"Store not found. Add the store first."`

---

## Frontend Changes

### 5. API client (frontend/lib/api.ts)

Add:

- `getStores(): Promise<{ id: number; name: string }[]>`
- `addStore(name: string): Promise<{ id: number; name: string }>`
- `deleteStore(id: number): Promise<void>`

### 6. Shared store selection: URL + localStorage

- Use query param `?store=store_name` (e.g. `/?store=default`, `/inventory?store=default`).
- When user selects a store, update the URL and save to `localStorage` under key `storacle_selected_store`.
- When loading a page, read selected store from: (1) URL query param, or (2) localStorage if no param. Default to `"default"` if neither has a value.

### 7. AppShell: Store selector in sidebar

In `frontend/components/app-shell.tsx`:

- Add a **store dropdown** in the sidebar (below the logo, above or near the search input). It should:
  - Fetch stores from GET /stores on mount
  - Display the currently selected store
  - On change: update URL (all dashboard routes: `/`, `/inventory`, `/upload`, `/forecasts`) with `?store=<name>` and save to localStorage
- Add **"Add store"** — a text input + button. User types a name, clicks Add, calls POST /stores, refreshes the store list, and selects the new store
- Add **"Remove store"** — per store in the dropdown or in a small menu. Call DELETE /stores/{id}. Only show/enable if the store has no snapshots (or show the error from the API if they try). Refresh the list after removal. If the removed store was selected, switch to "default"

Ensure nav links (Dashboard, Upload, Inventory, Forecasts) include the current `?store=` param so the selection persists when navigating.

### 8. Dashboard page (app/(dashboard)/page.tsx)

- Read selected store from URL (useSearchParams) or localStorage
- Pass `store_name` to all API calls: getSnapshots(storeName), getForecast(..., storeName), etc.
- Filter all displayed data by the selected store

### 9. Inventory page (app/(dashboard)/inventory/page.tsx)

- Read selected store from URL or localStorage
- Call GET /snapshots with `?store_name=<selected>`
- Display only inventory for the selected store

### 10. Upload page (app/(dashboard)/upload/page.tsx)

- Add a **store dropdown** (same list as AppShell)
- Pre-select the store from URL/localStorage (the one selected on Dashboard)
- When submitting, send the selected `store_name` in the form (uploadSnapshot already accepts storeName)
- Ensure the dropdown shows all stores from GET /stores

### 11. Forecasts page (app/(dashboard)/forecasts/page.tsx)

- Read selected store from URL or localStorage
- Pass `store_name` to getForecastableProducts and getForecast calls

---

## Migration for existing DBs

If the stores table does not exist, create it. Then seed "default" if empty. Existing snapshots with store_name="default" will work once the default store exists.

---

## Summary of files to modify

**Backend:** models.py, main.py  
**Frontend:** lib/api.ts, components/app-shell.tsx, app/(dashboard)/page.tsx, app/(dashboard)/inventory/page.tsx, app/(dashboard)/upload/page.tsx, app/(dashboard)/forecasts/page.tsx

---

## Verification

1. Start backend and frontend. "default" store should exist.
2. Dashboard: select "default" → data loads. Add a new store "store_a" → it appears, selecting it shows empty data until you upload for that store.
3. Upload: select "store_a", upload a photo → snapshot is stored for store_a.
4. Inventory: with store_a selected, see only store_a's snapshots.
5. Forecasts: with store_a selected, see forecasts for store_a only.
6. Remove store: try to remove a store with snapshots → error. Remove a store with no snapshots → succeeds.
