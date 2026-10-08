import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import { RECEIPTS_BUCKET, type Receipt } from "@/lib/receipts/constants";
import { failStaleUploads } from "@/lib/receipts/process";

const RECENT_LIMIT = 50;
const PREVIEW_URL_TTL_SECONDS = 60 * 60;

/** Lists the user's most recent receipts with signed preview URLs. */
export async function GET() {
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await failStaleUploads(userId);

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT)
    .returns<Receipt[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const previewUrls = new Map<string, string>();
  if (data.length > 0) {
    const { data: signed } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrls(
        data.map((receipt) => receipt.storage_path),
        PREVIEW_URL_TTL_SECONDS,
      );

    signed?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) previewUrls.set(path, signedUrl);
    });
  }

  return NextResponse.json({
    receipts: data.map((receipt) => ({
      ...receipt,
      preview_url: previewUrls.get(receipt.storage_path) ?? null,
    })),
  });
}
