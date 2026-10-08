"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import {
  MAX_RECEIPTS_PER_BATCH,
  RECEIPT_MIME_TYPES,
} from "@/lib/receipts/constants";
import { uploadReceipts, validateReceiptFile } from "@/lib/receipts/client";

type SelectedFile = {
  key: string;
  file: File;
  error: string | null;
  previewUrl: string | null;
};

type ReceiptDropzoneProps = {
  /** Called with each uploaded receipt's id and its original File. */
  onUploaded: (uploads: { receiptId: string; file: File }[]) => void;
};

const ACCEPT = Object.keys(RECEIPT_MIME_TYPES).join(",");

export function ReceiptDropzone({ onUploaded }: ReceiptDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Revoke preview URLs when the component unmounts.
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(
    () => () => revokePreviews(selectedRef.current),
    [],
  );

  const validFiles = selected.filter((item) => !item.error);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;

    const room = MAX_RECEIPTS_PER_BATCH - selected.length;
    const incoming = Array.from(files);
    if (incoming.length > room) {
      toast.error(
        `You can upload up to ${MAX_RECEIPTS_PER_BATCH} images at a time`,
      );
    }

    const added = incoming.slice(0, Math.max(room, 0)).map((file) => {
      const error = validateReceiptFile(file);
      return {
        key: crypto.randomUUID(),
        file,
        error,
        previewUrl: error ? null : URL.createObjectURL(file),
      };
    });

    setSelected((current) => [...current, ...added]);
  }

  function removeFile(key: string) {
    setSelected((current) => {
      revokePreviews(current.filter((item) => item.key === key));
      return current.filter((item) => item.key !== key);
    });
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!uploading) addFiles(event.dataTransfer.files);
  }

  async function handleUpload() {
    if (validFiles.length === 0) return;
    setUploading(true);

    const files = validFiles.map((item) => item.file);
    const result = await uploadReceipts(files);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // The receipts exist now (even if some failed), so clear the selection;
    // failures are retried from Recent uploads, not by uploading again.
    const { receiptIds, failedCount, completeError } = result.data;
    onUploaded(receiptIds.map((receiptId, i) => ({ receiptId, file: files[i] })));
    revokePreviews(selected);
    setSelected([]);

    const uploadedCount = files.length - failedCount;
    if (completeError) {
      toast.error(
        "Your images were uploaded, but processing couldn't start. They'll be marked as failed within 10 minutes, and you can retry them then.",
      );
    } else if (uploadedCount === 0) {
      toast.error(
        files.length === 1
          ? "The receipt couldn't be uploaded."
          : "None of the receipts could be uploaded.",
      );
    } else if (failedCount > 0) {
      toast.warning(
        `${uploadedCount} of ${files.length} receipts uploaded. Retry the failed ones from Recent uploads.`,
      );
    } else {
      toast.success(
        files.length === 1 ? "Receipt uploaded" : `${files.length} receipts uploaded`,
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={uploading || selected.length >= MAX_RECEIPTS_PER_BATCH}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card px-6 py-12 text-center transition-colors outline-none",
          "hover:border-primary/50 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          dragging && "border-primary bg-accent/60",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ImageUp className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Drag and drop receipts here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP · up to 1 MB each · max {MAX_RECEIPTS_PER_BATCH} at a time
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files);
          // Allow selecting the same file again after removing it.
          event.target.value = "";
        }}
      />

      {selected.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selected.map((item) => (
            <li
              key={item.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-card p-2",
                item.error && "border-destructive/40",
              )}
            >
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageUp className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.file.name}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    item.error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {item.error ?? formatBytes(item.file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.file.name}`}
                disabled={uploading}
                onClick={() => removeFile(item.key)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleUpload}
            disabled={uploading || validFiles.length === 0}
          >
            {uploading
              ? "Uploading..."
              : `Upload ${validFiles.length} receipt${validFiles.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function revokePreviews(items: SelectedFile[]) {
  items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
}
