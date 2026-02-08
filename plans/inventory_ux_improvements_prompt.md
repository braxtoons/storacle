# Prompt: Inventory & Upload UX Improvements

Read the CLAUDE.md file for project context. Implement the following four changes.

---

## 1. Manual date selection for uploads

**Problem:** Snapshot timestamp uses `datetime.utcnow()` (upload time), not the date the photo was actually taken. Users may upload a photo taken yesterday today.

**Backend (main.py):**
- Add optional `snapshot_date` to `POST /snapshots/upload` as a form field (format: `YYYY-MM-DD`). If provided, use it for the snapshot's `timestamp` (set time to start of day UTC or a sensible default like 12:00 UTC). If not provided, fall back to `datetime.utcnow()`.
- Validate: `snapshot_date` must be a valid date string; reject if invalid or in the future (optional: allow future for testing, or disallow).

**Frontend (upload/page.tsx):**
- Add a date input (native `<input type="date">` or a date picker component). Default to today's date.
- Include the selected date in the upload form. Extend `uploadSnapshot` in api.ts to accept an optional `snapshotDate?: string` (YYYY-MM-DD) and append it to FormData as `snapshot_date`.

---

## 2. Inventory "Current Inventory" = latest EOD snapshot only

**Problem:** Current Inventory uses `snapshots[0]` (most recent snapshot overall), which could be AM. We want Current Inventory to show the **latest EOD snapshot's counts** for the selected store — that represents "current" end-of-day stock.

**Backend (optional but cleaner):**
- Add `GET /snapshots/latest-eod?store_name=X` — returns the single most recent snapshot where `time_of_day == "EOD"` for that store, or 404 if none. Response shape matches a single snapshot object.

**Frontend (inventory/page.tsx):**
- **Option A (if backend adds `/snapshots/latest-eod`):** Call that endpoint for Current Inventory. Use it for the "Current inventory" card.
- **Option B (no backend change):** From `getSnapshots(storeName)`, filter snapshots where `time_of_day === "EOD"`, take the first (most recent). Use its counts for "Current inventory".
- Update the card description to say something like: "From latest EOD snapshot — [timestamp]"
- Keep "Snapshot history" as a separate card below, showing both AM and EOD snapshots in chronological order.

---

## 3. Image preview after upload

**Problem:** After uploading, there's no preview of the image the user just sent.

**Frontend (upload/page.tsx):**
- After a successful upload, show the uploaded image to the **right** of the form (or in a grid: form left, preview right). Use `URL.createObjectURL(selectedFile)` **before** clearing the form — store the blob URL in state, display an `<img src={previewUrl} />`. Revoke the object URL when the component unmounts or when the user uploads again.
- Layout: use a two-column layout on larger screens (form | preview) or stack on mobile. The preview should appear in the same area as "Detected products" — e.g. form + detected products on the left, image preview card on the right.
- Don't clear `selectedFile` until after we've created the object URL for preview. Or keep the File in state until next upload so we can show the preview.

---

## 4. Edit snapshot counts in the UI

**Problem:** Backend has `PUT /snapshots/{snapshot_id}/counts` but there's no UI to edit counts. Users need to fix Gemini mistakes.

**Backend:** No changes — endpoint already exists. Body: `[{"product_type": "x", "count": N}, ...]`

**Frontend:**
- Add `editSnapshotCounts(snapshotId: number, updates: { product_type: string; count: number }[]): Promise<void>` to `lib/api.ts`. Calls `PUT /snapshots/{snapshotId}/counts` with JSON body.
- **Inventory page (Snapshot history section):** For each snapshot in the history list, add an "Edit" button. Clicking it opens an inline edit mode or modal where the user can:
  - See the current counts for that snapshot
  - Edit the count for each product (number inputs)
  - Optionally add a new product/count row
  - Save → call `editSnapshotCounts(snapshot.id, updates)` → refetch snapshots so Current Inventory and history reflect the changes
  - Cancel to close without saving
- Manual edits must be reflected immediately in the "Current inventory" card if the edited snapshot is the latest EOD (refetch after save).

---

## Summary of files to modify

| File | Changes |
|------|---------|
| backend/main.py | Accept `snapshot_date` in upload; optionally add GET /snapshots/latest-eod |
| frontend/lib/api.ts | Add `snapshotDate` to uploadSnapshot; add `editSnapshotCounts` |
| frontend/app/(dashboard)/upload/page.tsx | Date picker, image preview to the right, pass snapshot_date |
| frontend/app/(dashboard)/inventory/page.tsx | Current Inventory from latest EOD; Edit button + inline/modal edit for each snapshot |

---

## Verification

1. **Date:** Upload with a past date → snapshot timestamp reflects that date. Check in Inventory/Dashboard.
2. **Current Inventory:** Add AM and EOD snapshots → Current Inventory shows latest EOD's counts, not the most recent AM.
3. **Preview:** Upload image → see preview to the right of the form after success.
4. **Edit:** Click Edit on a snapshot in history → change a count → Save → Current Inventory (if that snapshot is latest EOD) and history update accordingly.
