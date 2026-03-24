"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Author = { id: string; username: string; avatarurl: string; email: string };

type FeedbackItem = {
  id: string;
  user_id: string;
  category: "feedback" | "idea" | "bug" | "feature_request" | "other";
  title: string;
  message: string;
  created_at: string;
  user: Author | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "feedback", label: "Feedback" },
  { key: "idea", label: "Idea" },
  { key: "bug", label: "Bug" },
  { key: "feature_request", label: "Feature Request" },
  { key: "other", label: "Other" },
];

const CAT_COLOR: Record<string, string> = {
  feedback: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  idea: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  bug: "bg-red-500/15 text-red-400 border-red-500/30",
  feature_request: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const LIMIT = 20;

// ─── Feedback card ────────────────────────────────────────────────────────────

function FeedbackCard({ item, onDelete }: { item: FeedbackItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isLong = item.message.length > 240;
  const preview = isLong && !expanded ? item.message.slice(0, 240) + "…" : item.message;

  async function handleDelete() {
    if (!confirm("Delete this feedback? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/users/${item.user_id}/feedback?feedbackId=${item.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onDelete(item.id);
    else alert("Delete failed");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {item.user ? (
            <Link href={`/users/${item.user.id}`} className="shrink-0">
              <Image
                src={item.user.avatarurl || "/placeholder.svg"}
                alt={item.user.username}
                width={36}
                height={36}
                className="rounded-full object-cover"
                unoptimized
              />
            </Link>
          ) : (
            <div className="size-9 rounded-full bg-muted shrink-0" />
          )}
          <div className="min-w-0">
            {item.user ? (
              <Link href={`/users/${item.user.id}`} className="text-sm font-medium hover:underline truncate block">
                {item.user.username}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Unknown user</span>
            )}
            <p className="text-xs text-muted-foreground">{fmt(item.created_at)}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${CAT_COLOR[item.category] ?? "bg-muted text-muted-foreground border-border"}`}>
          {item.category.replace("_", " ")}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </Button>
      </div>

      <div>
        <p className="text-sm font-semibold mb-1">{item.title}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{preview}</p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
          >
            {expanded ? <><ChevronUp className="size-3" />Show less</> : <><ChevronDown className="size-3" />Read more</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (cat) params.set("category", cat);
      const res = await fetch(`/api/feedback?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.count ?? 0);
      setCatCounts(json.category_counts ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, category); }, [load, page, category]);

  const totalAll = Object.values(catCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback</h1>
          <p className="text-muted-foreground text-sm mt-0.5">User-submitted feedback, ideas, and bug reports</p>
        </div>
        <span className="text-xs bg-muted rounded-full px-3 py-1 font-medium text-muted-foreground">
          {total} {category ? `${category.replace("_", " ")} entries` : "total"}
        </span>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const count = c.key === "" ? totalAll : (catCounts[c.key] ?? 0);
          const active = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                ${active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}
            >
              {c.label}
              <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${active ? "bg-white/20" : "bg-muted"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
          <Loader2 className="size-4 animate-spin" /> Loading feedback…
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">No feedback found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <FeedbackCard key={item.id} item={item} onDelete={(id) => {
            setItems(prev => prev.filter(f => f.id !== id));
            setTotal(t => t - 1);
            setCatCounts(prev => {
              const row = items.find(f => f.id === id);
              if (!row) return prev;
              const updated = { ...prev };
              updated[row.category] = Math.max(0, (updated[row.category] ?? 1) - 1);
              return updated;
            });
          }} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > LIMIT && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>{total} total · page {page}/{Math.ceil(total / LIMIT)}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-3" />
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
