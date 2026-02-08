# Prompt: Store Cascade Delete + Confidence Column

Read the CLAUDE.md file for project context. Implement the following two changes.

---

## 1. Allow store deletion with cascade (and confirmation)

**Current behavior:** `DELETE /stores/{id}` returns 400 if the store has existing snapshots.

**New behavior:**

### Backend (main.py)
- Change `DELETE /stores/{id}` to succeed even when the store has snapshots.
- **Cascade delete:** When deleting a store:
  1. Delete all `InventoryCount` rows for snapshots that belong to this store (snapshots with `store_name` matching the store's name).
  2. Delete all `Snapshot` rows where `store_name` matches the store's name.
  3. Delete the `Store` row.
- Perform these in the correct order to satisfy foreign key constraints (InventoryCount → Snapshot; Snapshots reference store by name, not FK, so delete counts first, then snapshots, then store).
- Return 204 No Content or 200 with `{"status": "deleted"}`.

### Frontend (AppShell or wherever store removal is triggered)
- Before calling `deleteStore(id)`, fetch the store's snapshot count (you may need a new endpoint `GET /stores/{id}/stats` returning `{ snapshot_count: N }`, or derive from existing data). Alternatively, pass the snapshot count from the store list if the API returns it.
- If the store has snapshots (snapshot_count > 0), show a **confirmation dialog**:
  - Title: "Delete store?"
  - Message: "This store has [N] snapshot(s). Deleting will permanently remove the store and all its data. Are you sure?"
  - Buttons: "Cancel" and "Delete" (or "Yes, delete")
- If the user confirms, call `deleteStore(id)`. If they cancel, do nothing.
- If the store has no snapshots, you may still show a lighter confirmation ("Delete this store?") or proceed directly — your choice for consistency.
- After successful deletion, refresh the store list and switch selection to "default" if the deleted store was selected.

**Optional backend addition:** Add `snapshot_count` to the store objects in `GET /stores` response so the frontend knows whether to show the strong confirmation. Example: `{"stores": [{"id": 1, "name": "default", "snapshot_count": 50}]}`

---

## 2. Add Confidence column to Inventory table

**Current:** Inventory "Current inventory" table has columns: Product | Count | Status

**New:** Add a **Confidence** column between Count and Status: Product | Count | **Confidence** | Status

### Frontend (inventory/page.tsx)
- The `counts` from snapshots include `confidence_score` ("low", "medium", or "high") — the backend already returns this.
- Add a `<TableHead>Confidence</TableHead>` between Count and Status.
- Add a `<TableCell>` for each row displaying the `confidence_score`. Format it as a readable label (e.g. "High", "Medium", "Low") with optional styling:
  - High: subtle green
  - Medium: subtle amber
  - Low: subtle red/muted
- Use a small Badge or text span for consistency with the Status column.

### Data source
- `row.confidence_score` or `c.confidence_score` from the count object. Default to "medium" if missing.

---

## Summary of files to modify

| File | Changes |
|------|---------|
| backend/main.py | DELETE /stores/{id} — cascade delete snapshots and inventory counts, then store |
| backend/main.py | Optional: add snapshot_count to GET /stores response |
| frontend (AppShell or store UI) | Confirmation dialog before deleteStore when snapshot_count > 0 |
| frontend/app/(dashboard)/inventory/page.tsx | Add Confidence column between Count and Status |

---

## Verification

1. **Cascade delete:** Create a store, add snapshots, delete the store with confirmation → store and all its snapshots/counts are removed from the DB.
2. **Confirmation:** Deleting a store with snapshots shows the confirmation dialog; cancel does nothing; confirm triggers delete.
3. **Confidence column:** Inventory table shows Product | Count | Confidence | Status; confidence displays low/medium/high from Gemini.
