import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import {
  RECEIPTS_BUCKET,
  type ExtractionSummary,
  type Receipt,
} from "@/lib/receipts/constants";
import { failStaleUploads } from "@/lib/receipts/process";

const RECENT_LIMIT = 50;
const PREVIEW_URL_TTL_SECONDS = 60 * 60;

type ReceiptRow = Receipt & {
  // One-to-one (extractions.receipt_id is unique), so PostgREST embeds an
  // object, but older versions return an array.
  extraction: ExtractionSummary | ExtractionSummary[] | null;
};

/**
 * Lists the user's receipts, newest first, with signed preview URLs and the
 * extracted summary fields. Returns the most recent 50 unless `?all=true`.
 */
export async function GET(request: NextRequest) {
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await failStaleUploads(userId);

  const all = request.nextUrl.searchParams.get("all") === "true";
  let query = supabase
    .from("receipts")
    .select("*, extraction:extractions(merchant, amount, currency, date, category)")
    .order("created_at", { ascending: false });
  if (!all) query = query.limit(RECENT_LIMIT);

  const { data, error } = await query.returns<ReceiptRow[]>();

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
      extraction: Array.isArray(receipt.extraction)
        ? (receipt.extraction[0] ?? null)
        : receipt.extraction,
      preview_url: previewUrls.get(receipt.storage_path) ?? null,
    })),
  });
}
