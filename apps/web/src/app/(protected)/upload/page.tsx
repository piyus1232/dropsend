import type { Metadata } from "next";
import { ReceiptUpload } from "@/components/receipts/receipt-upload";

export const metadata: Metadata = { title: "Upload Receipt" };

export default function UploadPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Upload Receipt
        </h1>
        <p className="text-sm text-muted-foreground">
          Drop photos or screenshots of your receipts and bills.
        </p>
      </div>
      <ReceiptUpload />
    </div>
  );
}
