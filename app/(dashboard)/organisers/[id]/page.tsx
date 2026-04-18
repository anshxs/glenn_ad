"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Organiser, OrganiserTransaction, Tournament } from "@/lib/supabase";

type OrganiserUser = {
  id: string;
  username: string;
  email: string;
  avatarurl: string;
  is_banned: boolean;
  is_bluetick: boolean;
  is_redtick: boolean;
  isonline: boolean;
};

type OrganiserDetailResponse = {
  organiser: Organiser;
  user: OrganiserUser | null;
};

type NotifyForm = {
  title: string;
  body: string;
  url: string;
  collapse_id: string;
  priority: string;
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

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: string | number | React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm break-all">{value}</span>
    </div>
  );
}

function Pager({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (value: number) => void;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {total} total · page {page}/{pages}
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-3" />
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function OverviewTab({ detail }: { detail: OrganiserDetailResponse }) {
  const { organiser, user } = detail;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">Organiser</h3>
        <OverviewRow label="Name" value={organiser.name} />
        <OverviewRow label="Glenn ID" value={organiser.glenn_id} />
        <OverviewRow
          label="Organiser Row ID"
          value={<span className="font-mono text-xs">{organiser.id}</span>}
        />
        <OverviewRow
          label="User ID"
          value={<span className="font-mono text-xs">{organiser.user_id}</span>}
        />
        <OverviewRow label="Contact" value={organiser.contact_number} />
        <OverviewRow
          label="Alt Contact"
          value={organiser.alternate_contact_number || "-"}
        />
        <OverviewRow label="Address" value={organiser.address} />
        <OverviewRow
          label="Aadhaar"
          value={
            organiser.aadhar_card_url ? (
              <a
                href={organiser.aadhar_card_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                Open document
              </a>
            ) : (
              "-"
            )
          }
        />
        <OverviewRow
          label="Balance"
          value={`Rs ${Number(organiser.balance).toFixed(2)}`}
        />
        <OverviewRow
          label="Commission Model"
          value="Fixed amount per tournament"
        />
        <OverviewRow label="OneSignal" value={organiser.onesignal_player_id || "-"} />
        <OverviewRow label="Created" value={fmtDate(organiser.created_at)} />
        <OverviewRow label="Updated" value={fmtDate(organiser.updated_at)} />
      </div>

      <div className="rounded-lg border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">Linked User</h3>
        {!user ? (
          <p className="text-sm text-muted-foreground">No linked sensitive user row found.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Username:</span>{" "}
              <Link href={`/users/${user.id}`} className="text-blue-400 hover:underline">
                {user.username}
              </Link>
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-muted-foreground">User ID:</span>{" "}
              <span className="font-mono text-xs">{user.id}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {user.is_banned ? "Banned" : user.isonline ? "Online" : "Offline"}
            </p>
            <p>
              <span className="text-muted-foreground">Ticks:</span>{" "}
              {user.is_bluetick ? "Blue " : ""}
              {user.is_redtick ? "Red" : ""}
              {!user.is_bluetick && !user.is_redtick ? "None" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentsTab({ organiserId }: { organiserId: string }) {
  const [rows, setRows] = useState<Tournament[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/organisers/${organiserId}/tournaments?page=${page}&limit=${LIMIT}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows((data.data ?? []) as Tournament[]);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [organiserId, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8">No tournaments found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Category</th>
              <th className="px-4 py-2 text-right font-medium">Slots</th>
              <th className="px-4 py-2 text-right font-medium">Entry</th>
              <th className="px-4 py-2 text-right font-medium">Commission</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b border-border/60 hover:bg-muted/20">
                <td className="px-4 py-2">{item.tournament_name}</td>
                <td className="px-4 py-2 capitalize">{item.type}</td>
                <td className="px-4 py-2">{item.categories}</td>
                <td className="px-4 py-2 text-right">
                  {item.totalslots - item.slotsleft}/{item.totalslots}
                </td>
                <td className="px-4 py-2 text-right">Rs {Number(item.entryfee).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">Rs {Number(item.organiser_commission).toFixed(2)}</td>
                <td className="px-4 py-2">{fmtDate(item.tournament_datetime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

function TransactionsTab({ organiserId }: { organiserId: string }) {
  const [rows, setRows] = useState<OrganiserTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/organisers/${organiserId}/transactions?page=${page}&limit=${LIMIT}&status=${status}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows((data.data ?? []) as OrganiserTransaction[]);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [organiserId, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["all", "pending", "paid", "failed"].map((item) => (
          <button
            key={item}
            onClick={() => {
              setStatus(item);
              setPage(1);
            }}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
              status === item
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No organiser transactions found.</p>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-left font-medium">Tournament</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">{shortId(item.id)}</td>
                    <td className="px-4 py-2 text-right">Rs {Number(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 capitalize">{item.type}</td>
                    <td className="px-4 py-2 capitalize">{item.status}</td>
                    <td className="px-4 py-2">{item.description || "-"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{shortId(item.tournament_id)}</td>
                    <td className="px-4 py-2">{fmtDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function NotifyTab({ detail }: { detail: OrganiserDetailResponse }) {
  const playerId = detail.organiser.onesignal_player_id;
  const [form, setForm] = useState<NotifyForm>({
    title: "",
    body: "",
    url: "",
    collapse_id: "",
    priority: "10",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const set = (key: keyof NotifyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: e.target.value }));
    };

  async function handleSend() {
    if (!playerId) {
      setResult({ ok: false, msg: "This organiser has no OneSignal player id." });
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      setResult({ ok: false, msg: "Title and body are required." });
      return;
    }

    setSending(true);
    setResult(null);

    const res = await fetch("/api/notifications/send-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: playerId,
        title: form.title.trim(),
        body: form.body.trim(),
        url: form.url.trim() || undefined,
        collapse_id: form.collapse_id.trim() || undefined,
        priority: Number(form.priority) || 10,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (res.ok) {
      setResult({ ok: true, msg: "Notification sent." });
      return;
    }

    setResult({ ok: false, msg: data.error ?? "Failed to send notification." });
  }

  return (
    <div className="rounded-lg border border-border p-5 space-y-4 max-w-2xl">
      <div>
        <h3 className="font-semibold text-sm">Send Notification to Organiser</h3>
        <p className="text-xs text-muted-foreground mt-1">
          OneSignal Player ID: {playerId ? shortId(playerId) : "not set"}
        </p>
      </div>

      {!playerId && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          This organiser does not have onesignal_player_id yet, so notify cannot be sent.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Title</label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={form.title}
          onChange={set("title")}
          placeholder="Notification title"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Body</label>
        <textarea
          className="flex min-h-22.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={form.body}
          onChange={set("body")}
          placeholder="Notification message"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">URL (optional)</label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={form.url}
            onChange={set("url")}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Collapse ID (optional)</label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={form.collapse_id}
            onChange={set("collapse_id")}
            placeholder="e.g. organiser_notice"
          />
        </div>
      </div>

      <div className="space-y-1.5 max-w-45">
        <label className="text-xs text-muted-foreground">Priority (1-10)</label>
        <input
          type="number"
          min={1}
          max={10}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={form.priority}
          onChange={set("priority")}
        />
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? "text-green-400" : "text-red-400"}`}>{result.msg}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={sending || !playerId}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send Notification
        </Button>
      </div>
    </div>
  );
}

export default function OrganiserDetailPage() {
  const params = useParams<{ id: string }>();
  const organiserId = params.id;

  const [detail, setDetail] = useState<OrganiserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/organisers/${organiserId}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to load organiser details");
      setLoading(false);
      return;
    }

    setDetail(data as OrganiserDetailResponse);
    setLoading(false);
  }, [organiserId]);

  useEffect(() => {
    if (!organiserId) return;
    loadDetail();
  }, [organiserId, loadDetail]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail) {
    return <p className="text-sm text-red-400">{error || "Organiser not found"}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.organiser.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Glenn ID: {detail.organiser.glenn_id} · User: {shortId(detail.organiser.user_id)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/organisers">Back to Organisers</Link>
          </Button>
          <Button variant="outline" onClick={loadDetail}>Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="notify">Notify</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab detail={detail} />
        </TabsContent>
        <TabsContent value="tournaments" className="mt-4">
          <TournamentsTab organiserId={detail.organiser.id} />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsTab organiserId={detail.organiser.id} />
        </TabsContent>
        <TabsContent value="notify" className="mt-4">
          <NotifyTab detail={detail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
