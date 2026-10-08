import { eventType } from "inngest";
import { z } from "zod";

/** A receipt image reached Storage and is ready to be processed. */
export const receiptUploaded = eventType("receipt/uploaded", {
  schema: z.object({
    receiptId: z.string(),
    userId: z.string(),
  }),
});
