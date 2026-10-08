import "server-only";
import { getGenAI, OCR_MODEL } from "@/lib/ocr/client";
import { RECEIPT_OCR_SYSTEM_PROMPT } from "@/lib/ocr/prompt";
import {
  receiptExtractionJsonSchema,
  receiptExtractionSchema,
} from "@/lib/ocr/schema";
import type { ReceiptMimeType } from "@/lib/receipts/constants";

/** Tries per image when the model's response doesn't match the schema. */
const OUTPUT_ATTEMPTS = 2;

/** The model kept returning output that doesn't match the schema. */
export class InvalidOcrOutputError extends Error {
  constructor(
    message: string,
    readonly rawText: string | undefined,
  ) {
    super(message);
    this.name = "InvalidOcrOutputError";
  }
}

/**
 * Runs OCR on a receipt image with Gemma 4 and returns the validated,
 * cleaned-up extraction plus the raw response. The image (≤ 1 MB) is sent
 * inline. Invalid output is retried once, then throws InvalidOcrOutputError;
 * API errors (rate limits, outages) are thrown as-is.
 */
export async function extractReceipt(
  bytes: Uint8Array,
  mimeType: ReceiptMimeType,
) {
  const data = Buffer.from(bytes).toString("base64");
  let lastError = "";
  let lastText: string | undefined;

  for (let attempt = 1; attempt <= OUTPUT_ATTEMPTS; attempt++) {
    const response = await getGenAI().models.generateContent({
      model: OCR_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data } },
            { text: "Extract the expense details from this receipt." },
          ],
        },
      ],
      config: {
        systemInstruction: RECEIPT_OCR_SYSTEM_PROMPT,
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: receiptExtractionJsonSchema,
      },
    });

    lastText = response.text;
    if (!lastText) {
      lastError = "empty response";
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(lastText);
    } catch {
      lastError = "response is not valid JSON";
      continue;
    }

    const parsed = receiptExtractionSchema.safeParse(json);
    if (!parsed.success) {
      lastError = parsed.error.message;
      continue;
    }

    return { model: OCR_MODEL, extraction: parsed.data, raw: json };
  }

  throw new InvalidOcrOutputError(
    `Invalid OCR output after ${OUTPUT_ATTEMPTS} attempts: ${lastError}`,
    lastText,
  );
}
