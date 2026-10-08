import { z } from "zod";

// Keep in sync with the enums in supabase/migrations/*_create_extractions.sql.
export const EXPENSE_CATEGORIES = [
  "food_and_dining",
  "groceries",
  "transport",
  "shopping",
  "bills_and_utilities",
  "entertainment",
  "health",
  "travel",
  "other",
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "upi",
  "net_banking",
  "wallet",
  "other",
] as const;

// Largest value numeric(12, 2) can hold.
const MAX_AMOUNT = 9_999_999_999.99;

/**
 * Cleans up a value the model got wrong instead of rejecting the whole
 * response: a bad value becomes null, like any field it couldn't read.
 */
const text = z
  .string()
  .nullable()
  .transform((value) => value?.trim() || null);

const money = z
  .number()
  .nullable()
  .transform((value) =>
    value !== null && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
      ? Math.round(value * 100) / 100
      : null,
  );

const currency = z
  .string()
  .nullable()
  .transform((value) => {
    const code = value?.trim().toUpperCase();
    return code && /^[A-Z]{3}$/.test(code) ? code : null;
  });

const date = z
  .string()
  .nullable()
  .transform((value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    // Rejects impossible dates like 2026-02-30.
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
      ? value
      : null;
  });

const itemSchema = z.object({
  name: z.string(),
  quantity: z
    .number()
    .nullable()
    .transform((value) =>
      value !== null && Number.isFinite(value) && value > 0 && value < 1e9
        ? value
        : null,
    ),
  unit_price: money,
  total: money,
});

/**
 * What the OCR model must return. Sent to the model as a JSON Schema
 * (`receiptExtractionJsonSchema`) and used to validate and clean its response.
 */
export const receiptExtractionSchema = z.object({
  is_receipt: z.boolean(),
  merchant: text,
  amount: money.transform((value) => (value !== null && value >= 0 ? value : null)),
  currency,
  date,
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  payment_method: z.enum(PAYMENT_METHODS).nullable(),
  items: z.array(itemSchema).transform((items) =>
    items
      .map((item) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name),
  ),
});

export type ReceiptExtraction = z.output<typeof receiptExtractionSchema>;

/** JSON Schema for the model's `responseJsonSchema` (the shape before cleanup). */
export const receiptExtractionJsonSchema = (() => {
  const schema = z.toJSONSchema(receiptExtractionSchema, { io: "input" });
  // The Gemini API doesn't need the `$schema` dialect marker.
  delete schema.$schema;
  return schema;
})();

/** True if the model found nothing usable, so the image is treated as not a receipt. */
export function isEmptyExtraction(extraction: ReceiptExtraction) {
  return (
    !extraction.is_receipt ||
    (extraction.merchant === null &&
      extraction.amount === null &&
      extraction.date === null &&
      extraction.items.length === 0)
  );
}
