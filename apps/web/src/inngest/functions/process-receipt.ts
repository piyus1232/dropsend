import { inngest } from "@/inngest/client";
import { receiptUploaded } from "@/inngest/events";
import { runReceiptOcr, saveReceiptOcrResult } from "@/lib/receipts/ocr";
import { failReceipts, verifyReceipt } from "@/lib/receipts/process";

/**
 * Processes one uploaded receipt: verifies the image (exists, real image
 * type, hash) and moves it to `processing`, runs OCR with Gemma 4, then saves
 * the extraction and moves it to `needs_review` (or `failed`). Each step's
 * result is kept by Inngest, so a retry only repeats the step that failed.
 */
export const processReceiptFunction = inngest.createFunction(
  {
    id: "process-receipt",
    triggers: [receiptUploaded],
    retries: 3,
    // One receipt at a time across all users, to stay within Gemini rate
    // limits. Other receipts wait in the queue.
    concurrency: { limit: 1 },
    // All retries exhausted, or a non-retriable error.
    onFailure: async ({ event }) => {
      await failReceipts([
        {
          id: event.data.event.data.receiptId,
          error: "Processing failed. Please try again.",
        },
      ]);
    },
  },
  async ({ event, step }) => {
    const { receiptId } = event.data;

    const ready = await step.run("verify-image", () => verifyReceipt(receiptId));
    if (!ready) return;

    const result = await step.run("extract", () => runReceiptOcr(receiptId));
    await step.run("save-extraction", () =>
      saveReceiptOcrResult(receiptId, result),
    );
  },
);
