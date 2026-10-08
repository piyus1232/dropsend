import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import type { ExtractionDetail } from "@/lib/receipts/constants";

/** Returns a receipt's extracted fields and line items. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/receipts/[id]/extraction">,
) {
  const { id } = await ctx.params;
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("extractions")
    .select(
      "merchant, amount, currency, date, category, payment_method, model, created_at, items:extraction_items(position, name, quantity, unit_price, total)",
    )
    .eq("receipt_id", id)
    .returns<ExtractionDetail[]>()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Extraction not found" }, { status: 404 });
  }

  return NextResponse.json({
    extraction: {
      ...data,
      items: [...data.items].sort((a, b) => a.position - b.position),
    },
  });
}
