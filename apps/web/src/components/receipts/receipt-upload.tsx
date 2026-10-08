"use client";

import { useCallback, useRef } from "react";
import { ReceiptDropzone } from "@/components/receipts/receipt-dropzone";
import { RecentUploads } from "@/components/receipts/recent-uploads";
import { useReceipts } from "@/hooks/use-receipts";

export function ReceiptUpload() {
  const { receipts, loading, error, refresh } = useReceipts();

  // Original files uploaded in this session, so a failed upload can be
  // retried without picking the file again. Lost on page reload.
  const filesRef = useRef(new Map<string, File>());
  const getFile = useCallback((id: string) => filesRef.current.get(id), []);

  return (
    <div className="flex flex-col gap-10">
      <ReceiptDropzone
        onUploaded={(uploads) => {
          uploads.forEach(({ receiptId, file }) =>
            filesRef.current.set(receiptId, file),
          );
          void refresh();
        }}
      />
      <RecentUploads
        receipts={receipts}
        loading={loading}
        error={error}
        getFile={getFile}
        onChange={() => void refresh()}
      />
    </div>
  );
}
