"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import type { Transaction } from "@/lib/supabase";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.slice(0, 8) + "…";
}

function rupees(amount: string | number) {
  const n = Math.abs(Number(amount));
  return "₹" + n.toFixed(2);
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  verified:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  failed:    "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  refunded:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function MethodBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    UPI:      "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    BANK:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    GIFTCARD: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[method] ?? "bg-muted text-muted-foreground"}`}>
      {method}
    </span>
  );
}

function parseAccountDetails(details: Record<string, unknown> | null) {
  if (!details || typeof details !== "object") return "—";
  if (details.type === "UPI" && details.upiId) return `UPI: ${details.upiId}`;
  if (details.type === "GIFTCARD" && details.email)
    return `${details.giftCardType ?? "Gift Card"} → ${details.email}`;
  if (details.type === "BANK")
    return `Bank: ${details.accountNumber ?? details.accountNo ?? ""}`;
  return JSON.stringify(details).slice(0, 60);
}

// ─── Transactions Tab ────────────────────────────────────────────────────────

function TransactionsTab() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-44">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No transactions found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Order ID</th>
                <th className="px-4 py-3 text-left font-medium">Payment ID</th>
                <th className="px-4 py-3 text-right font-medium">Balance Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const orderId = tx.razorpay_order_id ?? "—";
                const paymentId = tx.razorpay_payment_id ?? "—";
                return (
                  <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(tx.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{shortId(tx.user_id)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">{rupees(tx.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.payment_status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={orderId}>
                      {orderId.length > 16 ? orderId.slice(0, 16) + "…" : orderId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={paymentId}>
                      {paymentId.length > 16 ? paymentId.slice(0, 16) + "…" : paymentId}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {tx.old_balance != null ? rupees(tx.old_balance) : "—"}
                      {" → "}
                      {tx.new_balance != null ? rupees(tx.new_balance) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Withdrawal Edit Dialog ───────────────────────────────────────────────────

const WITHDRAWAL_STATUSES = ["pending", "verified", "completed", "failed", "refunded", "cancelled"] as const;

interface EditWithdrawalDialogProps {
  tx: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditWithdrawalDialog({ tx, onClose, onSaved }: EditWithdrawalDialogProps) {
  const [status, setStatus] = useState<string>("");
  const [reference, setReference] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tx) {
      setStatus(tx.payment_status);
      setReference(tx.payment_reference ?? "");
      setRedeemCode(tx.redeem_code ?? "");
      setError("");
    }
  }, [tx]);

  async function handleSave() {
    if (!tx) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/withdrawals/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: status, payment_reference: reference, redeem_code: redeemCode }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save.");
    }
  }

  return (
    <Dialog open={!!tx} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Withdrawal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground font-mono">ID: {tx?.id}</p>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR number or transaction ID"
            />
          </div>
          {tx?.withdrawal_method === "GIFTCARD" && (
            <div className="space-y-1.5">
              <Label>Redeem Code</Label>
              <Input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="Gift card code"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────────────────────

function WithdrawalsTab() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/withdrawals?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-44">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No withdrawal requests found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Account Details</th>
                <th className="px-4 py-3 text-right font-medium">Fee</th>
                <th className="px-4 py-3 text-left font-medium">Expected Payout</th>
                <th className="px-4 py-3 text-left font-medium">Redeem Code</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(tx.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{shortId(tx.user_id)}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-400">{rupees(tx.amount)}</td>
                  <td className="px-4 py-3"><MethodBadge method={tx.withdrawal_method ?? null} /></td>
                  <td className="px-4 py-3"><StatusBadge status={tx.payment_status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate"
                    title={parseAccountDetails(tx.withdrawal_account_details as Record<string, unknown> | null)}>
                    {parseAccountDetails(tx.withdrawal_account_details as Record<string, unknown> | null)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {tx.platform_fee != null ? rupees(tx.platform_fee) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {tx.expected_payout_date
                      ? new Date(tx.expected_payout_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.redeem_code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate"
                    title={tx.payment_reference ?? undefined}>
                    {tx.payment_reference ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditTx(tx)}>
                      <Edit2 className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <EditWithdrawalDialog
        tx={editTx}
        onClose={() => setEditTx(null)}
        onSaved={() => { setEditTx(null); load(); }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">View deposits and manage withdrawal requests.</p>
      </div>
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="withdrawals" className="mt-4">
          <WithdrawalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
