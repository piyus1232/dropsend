import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import { RECEIPTS_BUCKET, receiptStoragePath } from "@/lib/receipts/constants";
import { failReceipts } from "@/lib/receipts/process";
import { uploadUrlsSchema } from "@/lib/receipts/schemas";
import { parseJsonBody } from "@/lib/parse-json-body";

/**
 * Step 1 of an upload: validates the selected files, creates a receipt row
 * (status `uploading`) for each, and returns a signed upload URL token per
 * file so the browser can upload straight to Storage.
 */
export async function POST(request: Request) {
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, uploadUrlsSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const batchId = randomUUID();
  const rows = parsed.data.files.map((file) => {
    const id = randomUUID();
    return {
      id,
      user_id: userId,
      batch_id: batchId,
      storage_path: receiptStoragePath(userId, id, file.type),
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    };
  });

  const { error: insertError } = await supabase.from("receipts").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const results = await Promise.all(
    rows.map(async (row) => {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUploadUrl(row.storage_path);
      return { row, data, error };
    }),
  );

  const failed = results.filter((result) => result.error || !result.data);
  await failReceipts(
    failed.map(({ row }) => ({
      id: row.id,
      error: "Could not start the upload. Please try again.",
    })),
  );

  return NextResponse.json(
    {
      batchId,
      uploads: results.map(({ row, data }) => ({
        receiptId: row.id,
        path: row.storage_path,
        token: data?.token ?? null,
      })),
    },
    { status: 201 },
  );
}
