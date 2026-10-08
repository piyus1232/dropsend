import { z } from "zod";
import {
  MAX_RECEIPT_FILE_SIZE_BYTES,
  MAX_RECEIPTS_PER_BATCH,
  RECEIPT_MIME_TYPES,
  type ReceiptMimeType,
} from "@/lib/receipts/constants";

const mimeTypes = Object.keys(RECEIPT_MIME_TYPES) as [
  ReceiptMimeType,
  ...ReceiptMimeType[],
];

export const receiptFileSchema = z.object({
  name: z.string().trim().min(1, { error: "File name is required" }).max(255),
  size: z
    .number()
    .int()
    .positive({ error: "File is empty" })
    .max(MAX_RECEIPT_FILE_SIZE_BYTES, { error: "File must be 1 MB or smaller" }),
  type: z.enum(mimeTypes, { error: "Only JPG, PNG and WebP images are allowed" }),
});

export const uploadUrlsSchema = z.object({
  files: z
    .array(receiptFileSchema)
    .min(1, { error: "Select at least one image" })
    .max(MAX_RECEIPTS_PER_BATCH, {
      error: `You can upload up to ${MAX_RECEIPTS_PER_BATCH} images at a time`,
    }),
});

export const completeUploadSchema = z
  .object({
    uploaded: z.array(z.uuid()).max(MAX_RECEIPTS_PER_BATCH).default([]),
    failed: z
      .array(z.object({ id: z.uuid(), error: z.string().trim().max(500) }))
      .max(MAX_RECEIPTS_PER_BATCH)
      .default([]),
  })
  .refine((body) => body.uploaded.length + body.failed.length > 0, {
    error: "No receipts to complete",
  });

export const retrySchema = z.object({
  /** Whether the browser still has the original file to upload again. */
  canReupload: z.boolean().default(false),
});

export type ReceiptFileInput = z.input<typeof receiptFileSchema>;
