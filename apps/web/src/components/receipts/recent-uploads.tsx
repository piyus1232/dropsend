"use client";

import { ImageIcon, Loader2, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import type { ReceiptStatus } from "@/lib/receipts/constants";
import {
  deleteReceipt,
  retryReceipt,
  type ReceiptWithPreview,
} from "@/lib/receipts/client";

const STATUS_BADGES: Record<
  ReceiptStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  uploading: { label: "Uploading", variant: "secondary" },
  uploaded: { label: "Uploaded", variant: "default" },
  processing: { label: "Processing", variant: "secondary" },
  needs_review: { label: "Needs review", variant: "outline" },
  saved: { label: "Saved", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

type RecentUploadsProps = {
  receipts: ReceiptWithPreview[];
  loading: boolean;
  error: string | null;
  /** Original files from this session, by receipt id, for re-uploading. */
  getFile: (receiptId: string) => File | undefined;
  onChange: () => void;
};

export function RecentUploads({
  receipts,
  loading,
  error,
  getFile,
  onChange,
}: RecentUploadsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">Recent uploads</h2>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : receipts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No receipts uploaded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {receipts.map((receipt) => (
            <ReceiptRow
              key={receipt.id}
              receipt={receipt}
              file={getFile(receipt.id)}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReceiptRow({
  receipt,
  file,
  onChange,
}: {
  receipt: ReceiptWithPreview;
  file: File | undefined;
  onChange: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const badge = STATUS_BADGES[receipt.status];

  async function handleRetry() {
    setRetrying(true);
    const result = await retryReceipt(receipt.id, file);
    setRetrying(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChange();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteReceipt(receipt.id);
    setDeleting(false);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Receipt deleted");
    onChange();
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {receipt.preview_url ? (
          <a href={receipt.preview_url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receipt.preview_url}
              alt={receipt.original_filename}
              className="size-12 object-cover"
            />
          </a>
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {receipt.original_filename}
          </p>
          <Badge variant={badge.variant}>
            {receipt.status === "uploading" && <Loader2 className="animate-spin" />}
            {badge.label}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {receipt.status === "failed" && receipt.error ? (
            <span className="text-destructive">{receipt.error}</span>
          ) : (
            <>
              {formatBytes(receipt.size_bytes)} · {formatRelativeTime(receipt.created_at)}
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {receipt.status === "failed" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Retry"
            disabled={retrying || deleting}
            onClick={handleRetry}
          >
            <RotateCw className={retrying ? "animate-spin" : undefined} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          disabled={retrying || deleting}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{receipt.original_filename}&rdquo; and its image will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
