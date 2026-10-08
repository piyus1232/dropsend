"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, formatRelativeTime } from "@/lib/format";
import { fetchExtraction, type ReceiptWithPreview } from "@/lib/receipts/client";
import type { ExtractionDetail } from "@/lib/receipts/constants";
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/receipts/labels";

type LoadedExtraction =
  | { receiptId: string; ok: true; extraction: ExtractionDetail }
  | { receiptId: string; ok: false; error: string };

type ExtractionSheetProps = {
  /** The receipt to show. Kept set while closing so the content can animate out. */
  receipt: ReceiptWithPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Read-only view of a receipt's extracted fields and line items. */
export function ExtractionSheet({ receipt, open, onOpenChange }: ExtractionSheetProps) {
  const [loaded, setLoaded] = useState<LoadedExtraction | null>(null);
  const receiptId = receipt?.id;

  useEffect(() => {
    if (!receiptId) return;
    let cancelled = false;
    void fetchExtraction(receiptId).then((result) => {
      if (cancelled) return;
      setLoaded(
        result.ok
          ? { receiptId, ok: true, extraction: result.data.extraction }
          : { receiptId, ok: false, error: result.error },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  // Ignore a result left over from a previously viewed receipt.
  const current = loaded?.receiptId === receiptId ? loaded : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        {receipt && (
          <>
            <SheetHeader className="border-b border-border pr-12">
              <SheetTitle className="truncate">
                {current?.ok && current.extraction.merchant
                  ? current.extraction.merchant
                  : receipt.original_filename}
              </SheetTitle>
              <SheetDescription className="truncate">
                {receipt.original_filename} · uploaded{" "}
                {formatRelativeTime(receipt.created_at)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              {receipt.preview_url && (
                <a
                  href={receipt.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receipt.preview_url}
                    alt={receipt.original_filename}
                    className="max-h-64 w-full object-contain"
                  />
                  <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ExternalLink className="size-3" />
                    Open image
                  </span>
                </a>
              )}

              {!current ? (
                <ExtractionSkeleton />
              ) : !current.ok ? (
                <p className="text-sm text-destructive">{current.error}</p>
              ) : (
                <ExtractionDetails extraction={current.extraction} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ExtractionDetails({ extraction }: { extraction: ExtractionDetail }) {
  const money = (value: number | null) =>
    value === null ? "—" : formatMoney(value, extraction.currency);

  const fields = [
    { label: "Amount", value: money(extraction.amount) },
    { label: "Date", value: extraction.date ? formatDate(extraction.date) : "—" },
    {
      label: "Category",
      value: extraction.category ? CATEGORY_LABELS[extraction.category] : "—",
    },
    {
      label: "Payment method",
      value: extraction.payment_method
        ? PAYMENT_METHOD_LABELS[extraction.payment_method]
        : "—",
    },
    { label: "Merchant", value: extraction.merchant ?? "—" },
    { label: "Currency", value: extraction.currency ?? "—" },
  ];

  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">Details</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="truncate text-sm text-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">
          Items{" "}
          <span className="font-normal text-muted-foreground">
            ({extraction.items.length})
          </span>
        </h3>
        {extraction.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No line items were found on this receipt.
          </p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extraction.items.map((item) => (
                  <TableRow key={item.position}>
                    <TableCell className="max-w-48 whitespace-normal">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Extracted by {extraction.model} {formatRelativeTime(extraction.created_at)}
      </p>
    </>
  );
}

function ExtractionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
