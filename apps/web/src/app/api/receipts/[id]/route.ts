import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import { RECEIPTS_BUCKET } from "@/lib/receipts/constants";

/** Deletes a receipt and its image. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/receipts/[id]">,
) {
  const { id } = await ctx.params;
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Removing a file that was never uploaded is a no-op, not an error.
  const { error: storageError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([receipt.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
