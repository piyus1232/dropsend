"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ReceiptStatusBadge } from "@/components/receipts/receipt-status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import {
  fetchExtraction,
  updateExtraction,
  type ReceiptWithPreview,
} from "@/lib/receipts/client";
import type {
  ExpenseCategory,
  ExtractionDetail,
  PaymentMethod,
} from "@/lib/receipts/constants";
import {
  MAX_ITEMS,
  updateExtractionSchema,
  type UpdateExtractionOutput,
} from "@/lib/receipts/schemas";
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/receipts/labels";

type LoadedExtraction =
  | { receiptId: string; ok: true; extraction: ExtractionDetail }
  | { receiptId: string; ok: false; error: string };

type ExtractionSheetProps = {
  /** The receipt to show. Kept set while closing so the content can animate out. */
  receipt: ReceiptWithPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save, so the caller can refresh its list. */
  onSaved?: () => void;
};

/** Matches the Input component's styling, since there's no Select component yet. */
const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

/** Shows a receipt's extracted fields: editable while `needs_review`, read-only once `saved`. */
export function ExtractionSheet({
  receipt,
  open,
  onOpenChange,
  onSaved,
}: ExtractionSheetProps) {
  const [loaded, setLoaded] = useState<LoadedExtraction | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  // Bumped to force a fresh ExtractionForm (and so a fresh react-hook-form
  // instance) after a confirmed discard, since the receipt id alone doesn't
  // change when reopening the same receipt.
  const [resetCount, setResetCount] = useState(0);
  const receiptId = receipt?.id;

  useEffect(() => {
    // Refetch on every open, not just when the receipt id changes, so
    // reopening the same receipt after saving shows the latest values
    // instead of the sheet's previous fetch.
    if (!receiptId || !open) return;
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
  }, [receiptId, open]);

  // Ignore a result left over from a previously viewed receipt.
  const current = loaded?.receiptId === receiptId ? loaded : null;
  const editable = receipt?.status === "needs_review";

  function handleOpenChange(next: boolean) {
    if (!next && editable && dirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(next);
  }

  function handleDiscard() {
    setConfirmDiscardOpen(false);
    setDirty(false);
    setResetCount((count) => count + 1);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        {receipt && (
          <>
            <SheetHeader className="border-b border-border pr-12">
              {editable && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Review extraction
                  </span>
                  <ReceiptStatusBadge status="needs_review" />
                </div>
              )}
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

            {current?.ok && editable ? (
              <ExtractionForm
                key={`${receipt.id}-${resetCount}`}
                receiptId={receipt.id}
                extraction={current.extraction}
                previewUrl={receipt.preview_url}
                onDirtyChange={setDirty}
                onSaved={() => {
                  setDirty(false);
                  onOpenChange(false);
                  onSaved?.();
                }}
              />
            ) : (
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                {receipt.preview_url && (
                  <ReceiptPreview
                    previewUrl={receipt.preview_url}
                    filename={receipt.original_filename}
                  />
                )}

                {!current ? (
                  <ExtractionSkeleton />
                ) : !current.ok ? (
                  <p className="text-sm text-destructive">{current.error}</p>
                ) : (
                  <ExtractionDetails extraction={current.extraction} />
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to this receipt. Closing now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

function ReceiptPreview({
  previewUrl,
  filename,
}: {
  previewUrl: string;
  filename: string;
}) {
  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-lg border border-border bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={filename}
        className="max-h-64 w-full object-contain"
      />
      <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <ExternalLink className="size-3" />
        Open image
      </span>
    </a>
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

type ItemFormValue = {
  name: string;
  quantity: number | string;
  unit_price: number | string;
  total: number | string;
};

type ExtractionFormValues = {
  merchant: string;
  amount: number | string;
  currency: string;
  date: string;
  category: ExpenseCategory | "";
  payment_method: PaymentMethod | "";
  items: ItemFormValue[];
};

function toFormValues(extraction: ExtractionDetail): ExtractionFormValues {
  return {
    merchant: extraction.merchant ?? "",
    amount: extraction.amount ?? "",
    currency: extraction.currency ?? "",
    date: extraction.date ?? "",
    category: extraction.category ?? "",
    payment_method: extraction.payment_method ?? "",
    items: extraction.items.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? "",
      unit_price: item.unit_price ?? "",
      total: item.total ?? "",
    })),
  };
}

/** Editable form for a `needs_review` receipt. Saving moves it to `saved`. */
function ExtractionForm({
  receiptId,
  extraction,
  previewUrl,
  onDirtyChange,
  onSaved,
}: {
  receiptId: string;
  extraction: ExtractionDetail;
  previewUrl: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.input<typeof updateExtractionSchema>, unknown, UpdateExtractionOutput>({
    resolver: zodResolver(updateExtractionSchema),
    defaultValues: toFormValues(extraction),
  });

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateExtraction(receiptId, values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Receipt saved");
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        {previewUrl && <ReceiptPreview previewUrl={previewUrl} filename="Receipt image" />}

        {/* Disabled while submitting, so edits mid-request can't be silently
            dropped when the sheet closes on success. */}
        <fieldset disabled={isSubmitting} className="contents">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground">Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field data-invalid={!!errors.merchant}>
              <FieldLabel htmlFor="merchant">Merchant</FieldLabel>
              <Input
                id="merchant"
                aria-invalid={!!errors.merchant}
                {...register("merchant")}
              />
              <FieldError errors={[errors.merchant]} />
            </Field>

            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                aria-invalid={!!errors.amount}
                {...register("amount", { valueAsNumber: true })}
              />
              <FieldError errors={[errors.amount]} />
            </Field>

            <Field data-invalid={!!errors.date}>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input
                id="date"
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              <FieldError errors={[errors.date]} />
            </Field>

            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Input
                id="currency"
                placeholder="INR"
                maxLength={3}
                className="uppercase"
                aria-invalid={!!errors.currency}
                {...register("currency")}
              />
              <FieldError errors={[errors.currency]} />
            </Field>

            <Field data-invalid={!!errors.category}>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <select
                id="category"
                aria-invalid={!!errors.category}
                className={selectClassName}
                {...register("category")}
              >
                <option value="">—</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldError errors={[errors.category]} />
            </Field>

            <Field data-invalid={!!errors.payment_method}>
              <FieldLabel htmlFor="payment_method">Payment method</FieldLabel>
              <select
                id="payment_method"
                aria-invalid={!!errors.payment_method}
                className={selectClassName}
                {...register("payment_method")}
              >
                <option value="">—</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldError errors={[errors.payment_method]} />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Items{" "}
              <span className="font-normal text-muted-foreground">
                ({fields.length})
              </span>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= MAX_ITEMS}
              onClick={() =>
                append({ name: "", quantity: "", unit_price: "", total: "" })
              }
            >
              <Plus />
              Add item
            </Button>
          </div>
          <FieldError errors={[errors.items?.root]} />

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No line items. Add one if needed.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2 px-3 text-right text-xs font-medium text-muted-foreground">
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Field
                        className="flex-1"
                        data-invalid={!!errors.items?.[index]?.name}
                      >
                        <FieldLabel htmlFor={`items.${index}.name`} className="sr-only">
                          Item name
                        </FieldLabel>
                        <Input
                          id={`items.${index}.name`}
                          placeholder="Item name"
                          aria-invalid={!!errors.items?.[index]?.name}
                          {...register(`items.${index}.name`)}
                        />
                        <FieldError errors={[errors.items?.[index]?.name]} />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Field data-invalid={!!errors.items?.[index]?.quantity}>
                        <FieldLabel htmlFor={`items.${index}.quantity`} className="sr-only">
                          Qty
                        </FieldLabel>
                        <Input
                          id={`items.${index}.quantity`}
                          type="number"
                          step="1"
                          inputMode="decimal"
                          className="text-right tabular-nums"
                          aria-invalid={!!errors.items?.[index]?.quantity}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        <FieldError errors={[errors.items?.[index]?.quantity]} />
                      </Field>
                      <Field data-invalid={!!errors.items?.[index]?.unit_price}>
                        <FieldLabel htmlFor={`items.${index}.unit_price`} className="sr-only">
                          Price
                        </FieldLabel>
                        <Input
                          id={`items.${index}.unit_price`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="text-right tabular-nums"
                          aria-invalid={!!errors.items?.[index]?.unit_price}
                          {...register(`items.${index}.unit_price`, {
                            valueAsNumber: true,
                          })}
                        />
                        <FieldError errors={[errors.items?.[index]?.unit_price]} />
                      </Field>
                      <Field data-invalid={!!errors.items?.[index]?.total}>
                        <FieldLabel htmlFor={`items.${index}.total`} className="sr-only">
                          Total
                        </FieldLabel>
                        <Input
                          id={`items.${index}.total`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="text-right tabular-nums"
                          aria-invalid={!!errors.items?.[index]?.total}
                          {...register(`items.${index}.total`, { valueAsNumber: true })}
                        />
                        <FieldError errors={[errors.items?.[index]?.total]} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        </fieldset>
      </div>

      <SheetFooter className="border-t border-border bg-muted/30">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving changes..." : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
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
