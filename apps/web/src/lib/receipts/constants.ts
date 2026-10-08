// Keep in sync with supabase/migrations/*_create_receipts.sql
// (bucket limits and table check constraints).

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

/** Storage path for a receipt image: `{user_id}/{receipt_id}.{ext}`. */
export function receiptStoragePath(
  userId: string,
  receiptId: string,
  mimeType: ReceiptMimeType,
) {
  return `${userId}/${receiptId}.${RECEIPT_MIME_TYPES[mimeType]}`;
}
