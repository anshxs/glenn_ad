"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Users, Filter, RefreshCw } from "lucide-react";

type NotifForm = {
  title: string;
  body: string;
  url: string;
  large_icon: string;
  big_picture: string;
  small_icon: string;
  android_channel_id: string;
  collapse_id: string;
  priority: string;
  ios_badge_count: string;
  data: string;
};

type Filters = {
  earnings_min: string;
  earnings_max: string;
  is_online: boolean | null;
  is_bluetick: boolean | null;
  is_redtick: boolean | null;
  is_banned: boolean | null;
  joined_after: string;
  joined_before: string;
  has_ffuid: boolean | null;
  rank_max: string;
  winrate_min: string;
  notifications_enabled: boolean | null;
};

function defaultForm(): NotifForm {
  return { title: "", body: "", url: "", large_icon: "", big_picture: "", small_icon: "", android_channel_id: "", collapse_id: "", priority: "10", ios_badge_count: "", data: "" };
}

function defaultFilters(): Filters {
  return { earnings_min: "", earnings_max: "", is_online: null, is_bluetick: null, is_redtick: null, is_banned: null, joined_after: "", joined_before: "", has_ffuid: null, rank_max: "", winrate_min: "", notifications_enabled: null };
}

type TriState = { label: string; value: boolean | null };
const TRI: TriState[] = [{ label: "Any", value: null }, { label: "Yes", value: true }, { label: "No", value: false }];

function TriToggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex rounded-md border border-border overflow-hidden text-xs">
        {TRI.map(opt => (
          <button key={String(opt.value)} onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1.5 transition-colors ${value === opt.value ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-muted/40"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type PreviewResult = { total_matched: number; has_player_id: number } | null;
type SendResult = { sent: number; skipped: number; batches: number; batch_ids?: string[] } | null;

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function buildFilterPayload(f: Filters) {
  const out: Record<string, unknown> = {};
  if (f.earnings_min !== "") out.earnings_min = Number(f.earnings_min);
  if (f.earnings_max !== "") out.earnings_max = Number(f.earnings_max);
  if (f.is_online !== null) out.is_online = f.is_online;
  if (f.is_bluetick !== null) out.is_bluetick = f.is_bluetick;
  if (f.is_redtick !== null) out.is_redtick = f.is_redtick;
  if (f.is_banned !== null) out.is_banned = f.is_banned;
  if (f.joined_after !== "") out.joined_after = f.joined_after;
  if (f.joined_before !== "") out.joined_before = f.joined_before;
  if (f.has_ffuid !== null) out.has_ffuid = f.has_ffuid;
  if (f.rank_max !== "") out.rank_max = Number(f.rank_max);
  if (f.winrate_min !== "") out.winrate_min = Number(f.winrate_min);
  if (f.notifications_enabled !== null) out.notifications_enabled = f.notifications_enabled;
  return out;
}

export default function NotifyPage() {
  const [form, setForm] = useState<NotifForm>(defaultForm());
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewResult>(null);
  const [result, setResult] = useState<SendResult>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const setF = (k: keyof NotifForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setFilt = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters(f => ({ ...f, [k]: v }));

  async function handlePreview() {
    setPreviewing(true); setError(""); setPreview(null); setResult(null);
    const res = await fetch("/api/notifications/send-mass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview_only: true, filters: buildFilterPayload(filters) }),
    });
    const d = await res.json().catch(() => ({}));
    setPreviewing(false);
    if (res.ok) setPreview(d);
    else setError(d.error ?? "Preview failed");
  }

  async function handleSend() {
    let extraData: Record<string, unknown> | undefined;
    if (form.data.trim()) {
      try { extraData = JSON.parse(form.data); }
      catch { setError("Extra data must be valid JSON"); return; }
    }

    setSending(true); setConfirming(false); setError(""); setResult(null);
    const res = await fetch("/api/notifications/send-mass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: buildFilterPayload(filters),
        title: form.title.trim(),
        body: form.body.trim(),
        url: form.url.trim() || undefined,
        large_icon: form.large_icon.trim() || undefined,
        big_picture: form.big_picture.trim() || undefined,
        small_icon: form.small_icon.trim() || undefined,
        android_channel_id: form.android_channel_id.trim() || undefined,
        collapse_id: form.collapse_id.trim() || undefined,
        priority: Number(form.priority) || 10,
        ios_badge_count: form.ios_badge_count.trim() ? Number(form.ios_badge_count) : undefined,
        data: extraData,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (res.ok) setResult(d);
    else setError(d.error ?? "Send failed");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mass Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Send push notifications to filtered user groups via OneSignal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Filters ── */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Audience Filters</h2>
            <button onClick={() => { setFilters(defaultFilters()); setPreview(null); }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw className="size-3" /> Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Earnings ≥">
              <Input type="number" value={filters.earnings_min} onChange={e => setFilt("earnings_min", e.target.value)} placeholder="0" className="h-8 text-xs" />
            </FormField>
            <FormField label="Earnings ≤">
              <Input type="number" value={filters.earnings_max} onChange={e => setFilt("earnings_max", e.target.value)} placeholder="Any" className="h-8 text-xs" />
            </FormField>
            <FormField label="Rank ≤">
              <Input type="number" value={filters.rank_max} onChange={e => setFilt("rank_max", e.target.value)} placeholder="Any" className="h-8 text-xs" />
            </FormField>
            <FormField label="Win Rate ≥ (%)">
              <Input type="number" value={filters.winrate_min} onChange={e => setFilt("winrate_min", e.target.value)} placeholder="Any" className="h-8 text-xs" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Joined After">
              <Input type="date" value={filters.joined_after} onChange={e => setFilt("joined_after", e.target.value)} className="h-8 text-xs" />
            </FormField>
            <FormField label="Joined Before">
              <Input type="date" value={filters.joined_before} onChange={e => setFilt("joined_before", e.target.value)} className="h-8 text-xs" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <TriToggle label="Currently Online" value={filters.is_online} onChange={v => setFilt("is_online", v)} />
            <TriToggle label="Blue Tick" value={filters.is_bluetick} onChange={v => setFilt("is_bluetick", v)} />
            <TriToggle label="Red Tick" value={filters.is_redtick} onChange={v => setFilt("is_redtick", v)} />
            <TriToggle label="Banned" value={filters.is_banned} onChange={v => setFilt("is_banned", v)} />
            <TriToggle label="Has FF UID" value={filters.has_ffuid} onChange={v => setFilt("has_ffuid", v)} />
            <TriToggle label="Notifications Enabled" value={filters.notifications_enabled} onChange={v => setFilt("notifications_enabled", v)} />
          </div>

          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing} className="w-full">
            {previewing ? <Loader2 className="size-3 animate-spin mr-2" /> : <Users className="size-3 mr-2" />}
            Preview Audience
          </Button>

          {preview && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Matched users:</span> <span className="font-semibold">{preview.total_matched.toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">With push token:</span> <span className="font-semibold text-green-400">{preview.has_player_id.toLocaleString()}</span></p>
              <p className="text-xs text-muted-foreground">{preview.total_matched - preview.has_player_id} will be skipped (no token)</p>
            </div>
          )}
        </div>

        {/* ── Notification Composer ── */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Notification Content</h2>
          </div>

          <FormField label="Title">
            <Input value={form.title} onChange={setF("title")} placeholder="Notification title" />
          </FormField>
          <FormField label="Body">
            <Textarea value={form.body} onChange={setF("body")} placeholder="Notification message" rows={3} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Open URL" hint="Deeplink or web URL">
              <Input value={form.url} onChange={setF("url")} placeholder="https://..." />
            </FormField>
            <FormField label="Collapse ID" hint="Replaces old notif with same ID">
              <Input value={form.collapse_id} onChange={setF("collapse_id")} placeholder="e.g. promo_jan" />
            </FormField>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Images</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Large Icon" hint="Circle icon (Android)">
              <Input value={form.large_icon} onChange={setF("large_icon")} placeholder="https://..." />
            </FormField>
            <FormField label="Small Icon" hint="Status bar icon">
              <Input value={form.small_icon} onChange={setF("small_icon")} placeholder="ic_stat_notify" />
            </FormField>
            <FormField label="Big Picture" hint="Banner image">
              <Input value={form.big_picture} onChange={setF("big_picture")} placeholder="https://..." />
            </FormField>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advanced</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Priority (1–10)">
              <Input type="number" min={1} max={10} value={form.priority} onChange={setF("priority")} />
            </FormField>
            <FormField label="iOS Badge Count">
              <Input type="number" min={0} value={form.ios_badge_count} onChange={setF("ios_badge_count")} placeholder="—" />
            </FormField>
            <FormField label="Android Channel ID">
              <Input value={form.android_channel_id} onChange={setF("android_channel_id")} placeholder="default" />
            </FormField>
          </div>
          <FormField label="Extra Data (JSON)" hint="Key-value pairs sent with the notification">
            <Textarea value={form.data} onChange={setF("data")} placeholder='{"key": "value"}' rows={2} className="font-mono text-xs" />
          </FormField>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {result && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm space-y-1">
              <p className="text-green-400 font-semibold">Notification sent!</p>
              <p><span className="text-muted-foreground">Delivered to:</span> <span className="font-medium">{result.sent.toLocaleString()} recipients</span></p>
              {result.skipped > 0 && <p className="text-xs text-muted-foreground">{result.skipped} skipped (no push token)</p>}
              {result.batches > 1 && <p className="text-xs text-muted-foreground">Sent in {result.batches} batches</p>}
            </div>
          )}

          {!confirming ? (
            <Button onClick={() => { setError(""); setConfirming(true); }} disabled={sending} className="w-full">
              <Send className="size-4 mr-2" />
              {preview ? `Send to ${preview.has_player_id.toLocaleString()} users` : "Send Notification"}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-400 text-center">
                {preview ? `This will send to ${preview.has_player_id.toLocaleString()} users. Confirm?` : "Send mass notification? Confirm?"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1" disabled={sending}>Cancel</Button>
                <Button onClick={handleSend} disabled={sending} className="flex-1">
                  {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {sending ? "Sending…" : "Confirm Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
