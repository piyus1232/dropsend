# Review Receipt Before Saving

Lets the user edit a receipt's OCR'd fields and line items while it's `needs_review`, then save — which commits the edits and moves the receipt to `saved`. Implements issue #17.

## Decisions

- **Scope:** both the top-level fields (merchant, amount, currency, date, category, payment method) and the line items table (add, edit, remove rows) are editable — not just the scalar fields.
- **Editable only while `needs_review`.** Once a receipt is `saved`, the sheet reverts to the original read-only view; there's no re-editing a saved receipt.
- **Write path: a service-role RPC, not RLS.** `extractions`/`extraction_items` have no write policies for users (only the OCR worker writes, with the secret key — see `004_OCR-gemma.md`). Rather than adding user-facing RLS update policies, the API route checks ownership + status via the normal RLS-scoped client (same pattern as the `retry` route), then calls a new `SECURITY DEFINER`-equivalent RPC with the admin client. Keeps all extraction writes going through one trusted path, consistent with how `save_receipt_extraction` already works.
- **Items are fully replaced on save:** delete all existing `extraction_items` for the extraction, bulk-insert the new set, same single-statement `jsonb_array_elements ... with ordinality` pattern `save_receipt_extraction` already uses. O(N), one round trip, no per-item queries.
- **Validation mirrors the OCR schema's asymmetry:** top-level `amount` must be ≥ 0, but item `unit_price`/`total` can be negative (e.g. a discount line) — same as `ocr/schema.ts`'s `money` validator already allows for items. Caught in review: an earlier version wrongly forced items non-negative too.
- **No Select component existed yet.** Category and payment method use a native `<select>` styled to match the `Input` component's classes, rather than pulling in a new dependency for two dropdowns.
- **Unsaved-changes protection** reuses the existing `AlertDialog` component (the same one used for delete confirmation in `receipt-actions.tsx`) — closing the sheet (X, Escape, overlay click) while the form is dirty intercepts with "Discard your changes?" / "Keep editing" / "Discard". A confirmed discard bumps a remount key so reopening the same receipt doesn't show the discarded edits (react-hook-form's own state otherwise persists across a close/reopen of the same receipt id). The post-save auto-close bypasses this entirely — it's an intentional close, not a discard.
- **Stale-cache fix (found in review):** the sheet's fetch effect depended only on the receipt id, so reopening the *same* receipt right after saving showed the previous fetch's data. It now also refetches whenever the sheet opens. Separately, `ReceiptsTable` passes an `onSaved` callback that calls `refresh()`, since `useReceipts`'s Realtime handler only refetches the extraction summary on the `processing`/`needs_review`/insert transitions, not `saved`.

## Database

Migration: `supabase/migrations/20261009120000_update_receipt_extraction.sql`.

### `update_receipt_extraction()` function

```
update_receipt_extraction(p_receipt_id, p_extraction, p_items) → boolean
```

In one transaction:

1. Locks the extraction row for the receipt. Returns `false` if it doesn't exist.
2. Re-checks the receipt is still `needs_review` (defensive, race-safe — same pattern as `save_receipt_extraction`'s own status re-check). Returns `false` otherwise, e.g. a concurrent save already applied, or the receipt was deleted.
3. Updates the extraction's fields.
4. Deletes all existing `extraction_items` for it and bulk-inserts the new set, in order.
5. Moves the receipt to `saved` and clears `error`.

`p_extraction` is `{ merchant, amount, currency, date, category, payment_method }`; `p_items` is `[{ name, quantity, unit_price, total }]`. Execute is revoked from `public`, `anon` and `authenticated`, granted only to `service_role`.

## API

### `PATCH /api/receipts/[id]/extraction`

Added to the existing extraction route (which already had `GET`).

| Step | Behavior |
| --- | --- |
| Auth | 401 if no session. |
| Validation | Request body validated against `updateExtractionSchema` (`lib/receipts/schemas.ts`). 400 on failure. |
| Ownership + status | Receipt looked up via the RLS-scoped client (only the owner's rows are visible). 404 if not found/not owned. 409 if found but not `needs_review`. |
| Write | Admin client calls `update_receipt_extraction`. 409 if the RPC itself reports the status changed underneath (race). 500 on a database error. |
| Success | `{ success: true }`. |

### `updateExtractionSchema` (`lib/receipts/schemas.ts`)

Reuses `EXPENSE_CATEGORIES`, `PAYMENT_METHODS` and `MAX_AMOUNT` from `ocr/schema.ts`. Blank form inputs (empty strings, or `NaN` from `valueAsNumber` on an empty number field) are treated as `null`, same meaning as an OCR field the model couldn't read. Items capped at 50 per receipt.

## Frontend

### `ExtractionSheet` (`components/receipts/extraction-sheet.tsx`)

- Branches on `receipt.status === "needs_review"`: editable form, or the original read-only view.
- The fetch effect now re-runs on every open (not just when the receipt id changes) — see stale-cache fix above.
- Header shows "Review extraction" with the existing `ReceiptStatusBadge` while editing, so it's clear why the sheet looks different from the read-only view.
- Items use `useFieldArray` (react-hook-form) for add/remove; a single "Qty / Price / Total" header row sits above the item cards instead of repeating those labels on every card (per-card labels kept as `sr-only` for accessibility). Numeric inputs are right-aligned with `tabular-nums`, matching the read-only table's existing convention.
- Footer (`SheetFooter`) has `border-t` + a subtle `bg-muted/30`, separating the fixed Save button from the scrollable content above it.
- Save button label: "Save changes" / "Saving changes...".
- On success: toast, sheet closes, `onSaved` callback fires (table refresh).
- On failure: toast only, sheet stays open, edits preserved (react-hook-form doesn't reset on a failed submit), Save re-enables automatically once the request settles.

### `ReceiptsTable`

Passes `onSaved={() => void refresh()}` into `ExtractionSheet`.

## Dependencies Added

None. Reuses react-hook-form, zod, and existing shadcn-derived components (`Field`, `Input`, `Button`, `Sheet`, `AlertDialog`, `Badge` via `ReceiptStatusBadge`).

## Not Included / Future Work

- A real Select component (native `<select>` used instead, styled to match).
- Required-field enforcement before finalizing (e.g. requiring `amount` to be non-null) — any combination of nulls can currently be saved, matching the extraction table's existing nullability.
- Duplicate detection and per-field confidence scores — unchanged from `004_OCR-gemma.md`'s future work.
- Broadening `useReceipts`'s Realtime handler to also refetch on the `saved` transition, for multi-tab/session consistency — the explicit `onSaved` callback covers the single-tab case, which is what this issue needed.
