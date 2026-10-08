"use client";

import { RotateCw, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  deleteReceipt,
  retryReceipt,
  type ReceiptWithPreview,
} from "@/lib/receipts/client";

type ReceiptActionsProps = {
  receipt: ReceiptWithPreview;
  /** The original file, if the browser still has it, for re-uploading. */
  file?: File;
  /** Show the retry button for failed receipts. */
  showRetry?: boolean;
  onChange: () => void;
};

/** Retry (for failed receipts) and delete buttons for a receipt. */
export function ReceiptActions({
  receipt,
  file,
  showRetry = true,
  onChange,
}: ReceiptActionsProps) {
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <>
      {showRetry && receipt.status === "failed" && (
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
    </>
  );
}
