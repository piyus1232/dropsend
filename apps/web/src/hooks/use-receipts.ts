"use client";

import { useCallback, useEffect, useState } from "react";
import type { Receipt } from "@/lib/receipts/constants";
import { fetchReceipts, type ReceiptWithPreview } from "@/lib/receipts/client";
import { createClient } from "@/lib/supabase/client";

/**
 * The user's recent receipts, kept live with Supabase Realtime.
 * RLS ensures the channel only receives the current user's rows.
 */
export function useReceipts() {
  const [receipts, setReceipts] = useState<ReceiptWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchReceipts();
    if (result.ok) {
      setReceipts(result.data.receipts);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load; state updates happen after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const supabase = createClient();
    const channel = supabase
      .channel("receipts-changes")
      .on<Receipt>(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const { id } = payload.old;
            setReceipts((current) => current.filter((r) => r.id !== id));
            return;
          }

          const updated = payload.new;
          setReceipts((current) => {
            const index = current.findIndex((r) => r.id === updated.id);
            if (index === -1) return current;
            const next = [...current];
            next[index] = { ...current[index], ...updated };
            return next;
          });

          // New rows and newly uploaded images need a signed preview URL,
          // which only the server can create.
          if (payload.eventType === "INSERT" || updated.status === "uploaded") {
            void refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { receipts, loading, error, refresh };
}
