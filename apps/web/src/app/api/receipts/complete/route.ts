import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import {
  enqueueReceiptProcessing,
  failReceipts,
} from "@/lib/receipts/process";
import { completeUploadSchema } from "@/lib/receipts/schemas";
import { parseJsonBody } from "@/lib/parse-json-body";

/**
 * Step 3 of an upload: the browser reports which files reached Storage and
 * which failed. Uploaded receipts are handed to the Inngest worker; failures
 * are recorded.
 */
export async function POST(request: Request) {
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, completeUploadSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { uploaded, failed } = parsed.data;
  const ids = [...uploaded, ...failed.map((failure) => failure.id)];

  // RLS limits this to the user's own receipts, so anything missing from the
  // result isn't theirs (or doesn't exist) and is ignored.
  const { data: owned, error } = await supabase
    .from("receipts")
    .select("id")
    .in("id", ids)
    .eq("status", "uploading");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ownedIds = new Set(owned.map((receipt) => receipt.id));

  try {
    await Promise.all([
      failReceipts(failed.filter((failure) => ownedIds.has(failure.id))),
      enqueueReceiptProcessing(
        userId,
        uploaded.filter((id) => ownedIds.has(id)),
      ),
    ]);
  } catch (error) {
    // Safe for the client to call again: only receipts still `uploading`
    // are acted on.
    console.error("Failed to complete receipt uploads", error);
    return NextResponse.json(
      { error: "Couldn't finish the upload. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
