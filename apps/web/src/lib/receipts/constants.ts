// Keep in sync with supabase/migrations/*_create_receipts.sql
// (bucket limits and table check constraints).

import type { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/ocr/schema";

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const RECEIPTS_BUCKET = "receipts";

export const MAX_RECEIPT_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
export const MAX_RECEIPTS_PER_BATCH = 4;

export const RECEIPT_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ReceiptMimeType = keyof typeof RECEIPT_MIME_TYPES;

export const RECEIPT_STATUSES = [
  "uploading",
  "uploaded", // no longer used: verified images go straight to `processing`
  "processing",
  "needs_review",
  "saved",
  "failed",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export type Receipt = {
  id: string;
  user_id: string;
  batch_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: ReceiptMimeType;
  size_bytes: number;
  image_hash: string | null;
  status: ReceiptStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
};

/** The extracted fields shown alongside a receipt in lists. */
export type ExtractionSummary = {
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  category: ExpenseCategory | null;
};

export type ExtractionItem = {
  position: number;
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
};

export type ExtractionDetail = ExtractionSummary & {
  payment_method: PaymentMethod | null;
  model: string;
  created_at: string;
  items: ExtractionItem[];
};

/** Storage path for a receipt image: `{user_id}/{receipt_id}.{ext}`. */
export function receiptStoragePath(
  userId: string,
  receiptId: string,
  mimeType: ReceiptMimeType,
) {
  return `${userId}/${receiptId}.${RECEIPT_MIME_TYPES[mimeType]}`;
}
