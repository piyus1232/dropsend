import { z } from "zod";
import { EXPENSE_CATEGORIES, MAX_AMOUNT, PAYMENT_METHODS } from "@/lib/ocr/schema";
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

const MAX_ITEMS = 50;

/** Blank strings from empty form fields mean "not set", same as null. */
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** Empty number inputs come through as NaN via `valueAsNumber`. */
const blankToNull = (value: unknown) =>
  typeof value === "number" && Number.isNaN(value) ? null : emptyToNull(value);

const editableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

/** The receipt's final total paid: never negative. */
const editableAmount = z.preprocess(
  blankToNull,
  z
    .number()
    .finite()
    .min(0, { error: "Must be 0 or more" })
    .max(MAX_AMOUNT, { error: "Amount is too large" })
    .nullable(),
);

/** A line item's price/total: can be negative (e.g. a discount row). */
const editableItemAmount = z.preprocess(
  blankToNull,
  z
    .number()
    .finite()
    .refine((value) => Math.abs(value) <= MAX_AMOUNT, { error: "Amount is too large" })
    .nullable(),
);

const editableCurrency = z.preprocess(
  (value) => {
    const cleaned = emptyToNull(value);
    return typeof cleaned === "string" ? cleaned.trim().toUpperCase() : cleaned;
  },
  z
    .string()
    .regex(/^[A-Z]{3}$/, { error: "Use a 3-letter code, e.g. INR" })
    .nullable(),
);

const editableDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Invalid date" })
    .nullable()
    .refine(
      (value) => {
        if (!value) return true;
        const parsed = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
        );
      },
      { error: "Invalid date" },
    ),
);

export const updateExtractionItemSchema = z.object({
  name: z.string().trim().min(1, { error: "Item name is required" }).max(200),
  quantity: z.preprocess(
    blankToNull,
    z
      .number()
      .finite()
      .positive({ error: "Must be greater than 0" })
      .max(1e9)
      .nullable(),
  ),
  unit_price: editableItemAmount,
  total: editableItemAmount,
});

export const updateExtractionSchema = z.object({
  merchant: editableText(200),
  amount: editableAmount,
  currency: editableCurrency,
  date: editableDate,
  category: z.preprocess(emptyToNull, z.enum(EXPENSE_CATEGORIES).nullable()),
  payment_method: z.preprocess(emptyToNull, z.enum(PAYMENT_METHODS).nullable()),
  items: z.array(updateExtractionItemSchema).max(MAX_ITEMS, {
    error: `A receipt can have up to ${MAX_ITEMS} items`,
  }),
});

export type UpdateExtractionInput = z.input<typeof updateExtractionSchema>;
export type UpdateExtractionOutput = z.output<typeof updateExtractionSchema>;
