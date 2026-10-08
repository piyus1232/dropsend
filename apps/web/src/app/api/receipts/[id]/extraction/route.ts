import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-user";
import type { ExtractionDetail } from "@/lib/receipts/constants";
import { updateExtractionSchema } from "@/lib/receipts/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/parse-json-body";

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

/**
 * Saves the user's edited extraction and moves the receipt to `saved`.
 * Only allowed while the receipt is `needs_review`.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/receipts/[id]/extraction">,
) {
  const { id } = await ctx.params;
  const { supabase, userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, updateExtractionSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // RLS: only the owner can read the receipt.
  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  if (receipt.status !== "needs_review") {
    return NextResponse.json(
      { error: "This receipt is no longer waiting for review." },
      { status: 409 },
    );
  }

  const { merchant, amount, currency, date, category, payment_method, items } =
    parsed.data;

  const { data: applied, error } = await createAdminClient().rpc(
    "update_receipt_extraction",
    {
      p_receipt_id: id,
      p_extraction: { merchant, amount, currency, date, category, payment_method },
      p_items: items,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!applied) {
    return NextResponse.json(
      { error: "This receipt is no longer waiting for review." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
