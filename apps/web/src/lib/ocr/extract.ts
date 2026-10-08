import "server-only";
import { getGenAI, OCR_MODEL } from "@/lib/ocr/client";
import { RECEIPT_OCR_SYSTEM_PROMPT } from "@/lib/ocr/prompt";
import type { ReceiptMimeType } from "@/lib/receipts/constants";

/**
 * Runs OCR on a receipt image with Gemma 4 and returns the model's raw JSON
 * text. The image (≤ 1 MB) is sent inline. API errors are thrown as-is.
 */
export async function extractReceipt(
  bytes: Uint8Array,
  mimeType: ReceiptMimeType,
) {
  const response = await getGenAI().models.generateContent({
    model: OCR_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } },
          { text: "Extract the expense details from this receipt." },
        ],
      },
    ],
    config: {
      systemInstruction: RECEIPT_OCR_SYSTEM_PROMPT,
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("The model returned an empty response");
  return { model: OCR_MODEL, text };
}
