import "server-only";
import { ApiError } from "@google/genai";
import { NonRetriableError } from "inngest";
import { extractReceipt, InvalidOcrOutputError } from "@/lib/ocr/extract";
import { isEmptyExtraction, type ReceiptExtraction } from "@/lib/ocr/schema";
import { failReceipts } from "@/lib/receipts/process";
import { RECEIPTS_BUCKET } from "@/lib/receipts/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export type OcrResult =
  | { status: "skipped" }
  | { status: "failed"; error: string }
  | {
      status: "extracted";
      model: string;
      extraction: ReceiptExtraction;
      raw: unknown;
    };

/**
 * Runs OCR on a `processing` receipt. Nothing is written here so the result
 * can be kept by Inngest and saved in a separate step (a failed save doesn't
 * repeat the model call).
 *
 * - Not a receipt / unreadable output → `failed` with a message for the user.
 * - Rate limits, outages, database or Storage errors → thrown (Inngest retries).
 * - Other Gemini request errors (bad key, rejected request) → NonRetriableError,
 *   since retrying won't help; the function's onFailure marks it failed.
 */
export async function runReceiptOcr(receiptId: string): Promise<OcrResult> {
  const admin = createAdminClient();

  const { data: receipt, error: fetchError } = await admin
    .from("receipts")
    .select("storage_path, mime_type, status")
    .eq("id", receiptId)
    .maybeSingle();

  if (fetchError) throw new Error(`Failed to load receipt: ${fetchError.message}`);
  // Deleted in the meantime.
  if (!receipt || receipt.status !== "processing") return { status: "skipped" };

  const { data: file, error: downloadError } = await admin.storage
    .from(RECEIPTS_BUCKET)
    .download(receipt.storage_path);
  if (downloadError || !file) {
    throw new Error(`Failed to download image: ${downloadError?.message}`);
  }

  try {
    const { model, extraction, raw } = await extractReceipt(
      new Uint8Array(await file.arrayBuffer()),
      receipt.mime_type,
    );

    if (isEmptyExtraction(extraction)) {
      return { status: "failed", error: "This doesn't look like a receipt." };
    }
    return { status: "extracted", model, extraction, raw };
  } catch (error) {
    if (error instanceof InvalidOcrOutputError) {
      console.error(error.message, error.rawText);
      return {
        status: "failed",
        error: "Couldn't read this receipt. Please try again.",
      };
    }
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    ) {
      throw new NonRetriableError(`Gemini request rejected: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Saves an OCR result: the extraction and its items, moving the receipt to
 * `needs_review` in one transaction, or marks the receipt failed. Does
 * nothing if the receipt was deleted or is no longer `processing`.
 */
export async function saveReceiptOcrResult(
  receiptId: string,
  result: OcrResult,
) {
  if (result.status === "skipped") return;

  if (result.status === "failed") {
    await failReceipts([{ id: receiptId, error: result.error }]);
    return;
  }

  const { items, ...fields } = result.extraction;
  const { error } = await createAdminClient().rpc("save_receipt_extraction", {
    p_receipt_id: receiptId,
    p_model: result.model,
    p_raw_output: result.raw,
    p_extraction: {
      merchant: fields.merchant,
      amount: fields.amount,
      currency: fields.currency,
      date: fields.date,
      category: fields.category,
      payment_method: fields.payment_method,
    },
    p_items: items,
  });
  if (error) throw new Error(`Failed to save extraction: ${error.message}`);
}
