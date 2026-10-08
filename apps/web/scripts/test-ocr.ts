/**
 * Dev-only: runs the receipt OCR on a local image and prints the result.
 *
 *   bun run ocr:test path/to/receipt.jpg
 *
 * Reads GEMINI_API_KEY from apps/web/.env. Nothing is written to Supabase.
 */
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

// Minimal typing for the Bun runtime API used below (no @types/bun).
declare const Bun: {
  plugin(plugin: {
    name: string;
    setup(build: {
      module(
        specifier: string,
        callback: () => { exports: Record<string, unknown>; loader: "object" },
      ): void;
    }): void;
  }): void;
};

// `server-only` is resolved by Next.js; outside Next, stub it out.
Bun.plugin({
  name: "server-only-stub",
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

async function main() {
  const path = "C:/Users/WELCOME/Downloads/bill.jpg"; // demo receipt path
  if (!path) {
    console.error("Usage: bun run ocr:test <path/to/receipt.(jpg|jpeg|png|webp)>");
    process.exit(1);
  }

  const mimeType = MIME_TYPES[extname(path).toLowerCase() as keyof typeof MIME_TYPES];
  if (!mimeType) {
    console.error("Only JPG, JPEG, PNG and WebP images are supported.");
    process.exit(1);
  }

  const { size } = await stat(path);
  if (size > 1024 * 1024) {
    console.warn(`Warning: ${(size / 1024).toFixed(0)} KB is over the app's 1 MB upload limit.\n`);
  }

  // Imported after the stub is registered.
  const { extractReceipt, InvalidOcrOutputError } = await import("@/lib/ocr/extract");
  const { isEmptyExtraction } = await import("@/lib/ocr/schema");

  const started = performance.now();
  try {
    const bytes = new Uint8Array(await readFile(path));
    const { model, extraction, raw } = await extractReceipt(bytes, mimeType);
    const seconds = ((performance.now() - started) / 1000).toFixed(1);

    console.log(`Model: ${model} (${seconds}s)\n`);
    console.log("Raw model output:");
    console.log(JSON.stringify(raw, null, 2));
    console.log("\nValidated and cleaned:");
    console.log(JSON.stringify(extraction, null, 2));
    console.log(
      `\nResult: ${isEmptyExtraction(extraction) ? "would be marked failed (not a receipt / nothing readable)" : "would go to needs_review"}`,
    );
  } catch (error) {
    if (error instanceof InvalidOcrOutputError) {
      console.error(error.message);
      console.error("\nLast raw output:\n" + (error.rawText ?? "(none)"));
    } else {
      // API errors include the HTTP status and Gemini's message, e.g. an
      // unsupported responseJsonSchema feature.
      console.error(error);
    }
    process.exit(1);
  }
}

main();
