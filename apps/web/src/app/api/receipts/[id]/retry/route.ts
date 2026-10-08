import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import { RECEIPTS_BUCKET } from "@/lib/receipts/constants";
import { enqueueReceiptProcessing } from "@/lib/receipts/process";
import { retrySchema } from "@/lib/receipts/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/parse-json-body";

/**
 * Retries a failed receipt.
 * - Image is in Storage: re-queues processing → `{ action: "queued" }`.
 * - Image is missing and the browser still has the file: issues a new signed
 *   upload token → `{ action: "upload", path, token }`; the browser uploads
 *   and then calls `/api/receipts/complete`.
 * - Image is missing and the browser no longer has it: 409.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/receipts/[id]/retry">,
) {
  const { id } = await ctx.params;
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, retrySchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // RLS: only the owner can read the receipt.
  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  if (receipt.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed receipts can be retried" },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { data: imageExists } = await admin.storage
    .from(RECEIPTS_BUCKET)
    .exists(receipt.storage_path);

  if (!imageExists && !parsed.data.canReupload) {
    return NextResponse.json(
      {
        error:
          "The original image is no longer available. Delete this receipt and upload it again.",
      },
      { status: 409 },
    );
  }

  // Back to `uploading`; this also resets the stale-upload timer.
  const { error: resetError } = await admin
    .from("receipts")
    .update({ status: "uploading", error: null })
    .eq("id", id)
    .eq("status", "failed");

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  if (imageExists) {
    const queued = await enqueueReceiptProcessing(userId, [id]);
    if (!queued.ok) {
      return NextResponse.json(
        { error: "Couldn't start processing. Please try again." },
        { status: 503 },
      );
    }
    return NextResponse.json({ action: "queued" });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUploadUrl(receipt.storage_path);

  if (signError || !signed) {
    await admin
      .from("receipts")
      .update({
        status: "failed",
        error: "Could not start the upload. Please try again.",
      })
      .eq("id", id);
    return NextResponse.json(
      { error: "Could not start the upload. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    action: "upload",
    path: signed.path,
    token: signed.token,
  });
}
