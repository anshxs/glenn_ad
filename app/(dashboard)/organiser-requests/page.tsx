"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type RequestStatus = "pending" | "approved" | "rejected";

type OrganiserRequest = {
  id: string;
  user_id: string;
  glenn_id: string;
  name: string;
  contact_number: string;
  alternate_contact_number: string | null;
  address: string;
  aadhar_card_url: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  permanently_banned: boolean;
  can_reappeal: boolean;
  created_at: string;
};

type ApproveForm = {
  name: string;
  glenn_id: string;
  contact_number: string;
  alternate_contact_number: string;
  address: string;
  aadhar_card_url: string;
};

function fmt(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrganiserRequestsPage() {
  const [requests, setRequests] = useState<OrganiserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [approveTarget, setApproveTarget] = useState<OrganiserRequest | null>(null);
  const [form, setForm] = useState<ApproveForm>({
    name: "",
    glenn_id: "",
    contact_number: "",
    alternate_contact_number: "",
    address: "",
    aadhar_card_url: "",
  });

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const requestsRes = await fetch("/api/organiser-requests?tab=requests");
    const requestsJson = await requestsRes.json().catch(() => ({}));

    if (!requestsRes.ok) {
      setError(requestsJson.error ?? "Failed to load organiser requests");
      setLoading(false);
      return;
    }

    setRequests((requestsJson.data ?? []) as OrganiserRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openApproveDialog(item: OrganiserRequest) {
    setApproveTarget(item);
    setForm({
      name: item.name,
      glenn_id: item.glenn_id,
      contact_number: item.contact_number,
      alternate_contact_number: item.alternate_contact_number ?? "",
      address: item.address,
      aadhar_card_url: item.aadhar_card_url ?? "",
    });
  }

  async function approveRequest() {
    if (!approveTarget) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/organiser-requests/${approveTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", ...form }),
    });

    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Approval failed");
      return;
    }

    setApproveTarget(null);
    await loadData();
  }

  async function rejectRequest(item: OrganiserRequest) {
    const reason = window.prompt("Enter rejection reason");
    if (!reason || !reason.trim()) return;

    const allowReappeal = window.confirm("Allow reappeal for this rejection?");
    const permanentlyBanned = window.confirm("Permanently ban this user from organiser requests?");

    setSaving(true);
    setError("");

    const res = await fetch(`/api/organiser-requests/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reject",
        rejection_reason: reason.trim(),
        can_reappeal: allowReappeal,
        permanently_banned: permanentlyBanned,
      }),
    });

    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Rejection failed");
      return;
    }

    await loadData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organiser Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review pending requests and approve with editable details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-[11px] font-bold text-black">
            <span className="size-1.5 rounded-full bg-black" />
            {pendingCount} pending
          </span>
          <Button variant="outline" onClick={loadData} disabled={loading || saving}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
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
      ) : requests.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          No organiser requests found.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => {
            const statusClass =
              item.status === "approved"
                ? "text-green-400 border-green-500/30 bg-green-500/10"
                : item.status === "rejected"
                  ? "text-red-400 border-red-500/30 bg-red-500/10"
                  : "text-amber-400 border-amber-500/30 bg-amber-500/10";

            return (
              <div key={item.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{item.name || "Unnamed request"}</div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium uppercase ${statusClass}`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid gap-1 text-sm text-muted-foreground">
                  <div>User ID: <span className="font-mono text-foreground">{item.user_id}</span></div>
                  <div>Glenn ID: <span className="text-foreground">{item.glenn_id || "-"}</span></div>
                  <div>Contact: <span className="text-foreground">{item.contact_number || "-"}</span></div>
                  <div>Created: <span className="text-foreground">{fmt(item.created_at)}</span></div>
                  {item.rejection_reason && (
                    <div>Reason: <span className="text-red-300">{item.rejection_reason}</span></div>
                  )}
                </div>

                {item.aadhar_card_url && (
                  <a
                    href={item.aadhar_card_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-300 underline underline-offset-2"
                  >
                    View Aadhaar image
                  </a>
                )}

                {item.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button onClick={() => openApproveDialog(item)} disabled={saving}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectRequest(item)}
                      disabled={saving}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit details and approve organiser</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Glenn ID</Label>
              <Input
                value={form.glenn_id}
                onChange={(event) => setForm((prev) => ({ ...prev, glenn_id: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Contact Number</Label>
              <Input
                value={form.contact_number}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contact_number: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Alternate Contact Number</Label>
              <Input
                value={form.alternate_contact_number}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, alternate_contact_number: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Address</Label>
              <Textarea
                rows={3}
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Aadhaar Image URL</Label>
              <Input
                value={form.aadhar_card_url}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, aadhar_card_url: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={approveRequest} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
