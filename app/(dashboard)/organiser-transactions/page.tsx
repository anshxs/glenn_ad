"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type OrganiserTxRow = {
  id: string;
  organiser_id: string;
  amount: string;
  type: "credit" | "debit" | "commission" | "penalty";
  description: string | null;
  tournament_id: string | null;
  created_at: string;
  status: "pending" | "paid" | "failed";
  updated_at: string;
  organiser: {
    id: string;
    name: string;
    glenn_id: string;
    user_id: string;
  } | null;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...`;
}

export default function OrganiserTransactionsPage() {
  const [rows, setRows] = useState<OrganiserTxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await fetch(
      `/api/organiser-transactions?page=${page}&limit=${LIMIT}&status=pending`
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to load organiser transactions");
      setLoading(false);
      return;
    }

    setRows((data.data ?? []) as OrganiserTxRow[]);
    setTotal(data.count ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organiser Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pending organiser transactions only.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No pending organiser transactions.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Organiser</th>
                <th className="px-4 py-3 text-left font-medium">Glenn ID</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Tournament</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(tx.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {tx.organiser ? (
                      <Link href={`/organisers/${tx.organiser.id}`} className="hover:underline">
                        {tx.organiser.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{tx.organiser?.glenn_id ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">Rs {Number(tx.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{tx.type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-55 truncate" title={tx.description ?? ""}>
                    {tx.description ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{shortId(tx.tournament_id)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                      pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} / {pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
