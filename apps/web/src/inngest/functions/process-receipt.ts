import { inngest } from "@/inngest/client";
import { receiptUploaded } from "@/inngest/events";
import { failReceipts, processReceipt } from "@/lib/receipts/process";

/**
 * Verifies an uploaded receipt image (exists, real image type, hash) and
 * moves it to `uploaded`. One run per receipt. OCR will hook in here later.
 */
export const processReceiptFunction = inngest.createFunction(
  {
    id: "process-receipt",
    triggers: [receiptUploaded],
    retries: 3,
    // Keep one user's batch from hogging the queue.
    concurrency: { key: "event.data.userId", limit: 2 },
    // All retries exhausted (e.g. Storage or the database kept erroring).
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
    await step.run("verify-image", () => processReceipt(event.data.receiptId));
  },
);
