"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, ArrowLeft, Shield, Ban, Wifi, WifiOff, ChevronLeft, ChevronRight,
  Heart, MessageCircle, User, MessageSquare, Bell, CreditCard, Users, UserX,
  ChevronDown, ChevronUp, Plus, Trash2, ExternalLink, Send,
  FileText, ClipboardList, Smartphone, MapPin, Package,
} from "lucide-react";
import dynamic from "next/dynamic";
import type {
  SensitiveUserdata, PublicUserdata, Wallet as WalletType, NotificationSettings,
  CommunityMessage, CommunityComment, DirectMsg, Follower,
  BlockedUser, UserNotification, Transaction, UserFeedback, AdminNotes,
} from "@/lib/supabase";

const LocationsLeafletMap = dynamic(
  () => import("@/components/locations-leaflet-map").then((m) => ({ default: m.LocationsLeafletMap })),
  { ssr: false, loading: () => <div className="h-105 flex items-center justify-center text-muted-foreground text-sm">Loading map…</div> }
);

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "—";
const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) + "…" : "—");
const rupees = (v: string | number | null | undefined) =>
  v != null ? `₹${Number(v).toFixed(2)}` : "—";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  verified: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{total} total · page {page}/{pages}</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-3" /></Button>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="size-3" /></Button>
      </div>
    </div>
  );
}

function TableWrap({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  if (empty) return <p className="text-center text-sm text-muted-foreground py-12">No records found.</p>;
  return <>{children}</>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  sensitive: SensitiveUserdata;
  public: PublicUserdata | null;
  wallet: WalletType | null;
  notifSettings: NotificationSettings | null;
};

type LikeUser = { user_id: string; created_at: string | null; user: { id: string; username: string; avatarurl: string } | null };

type NestedComment = CommunityComment & {
  author: { id: string; username: string; avatarurl: string } | null;
  replies: (CommunityComment & { author: { id: string; username: string; avatarurl: string } | null })[];
};

type ChatPartner = { id: string; username: string; avatarurl: string; lastMsg: string; lastTime: string };

// ─── Send Notification Dialog ─────────────────────────────────────────────────

type NotifForm = {
  title: string;
  body: string;
  url: string;
  large_icon: string;
  big_picture: string;
  small_icon: string;
  android_channel_id: string;
  data: string;
  ios_badge_count: string;
  collapse_id: string;
  priority: string;
};

const defaultNotifForm = (): NotifForm => ({
  title: "",
  body: "",
  url: "",
  large_icon: "",
  big_picture: "",
  small_icon: "",
  android_channel_id: "",
  data: "",
  ios_badge_count: "",
  collapse_id: "",
  priority: "10",
});

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function SendNotifDialog({
  open, onOpenChange, playerId, username,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: string | null;
  username: string;
}) {
  const [form, setForm] = useState<NotifForm>(defaultNotifForm());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { if (open) { setForm(defaultNotifForm()); setResult(null); } }, [open]);

  const set = (k: keyof NotifForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true); setResult(null);

    let extraData: Record<string, unknown> | undefined;
    if (form.data.trim()) {
      try { extraData = JSON.parse(form.data); }
      catch { setResult({ ok: false, msg: "Extra data must be valid JSON" }); setSending(false); return; }
    }

    const payload: Record<string, unknown> = {
      player_id: playerId,
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
    };

    const res = await fetch("/api/notifications/send-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    setResult({ ok: res.ok, msg: res.ok ? "Notification sent!" : (d.error ?? "Failed") });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-4" /> Send Notification to {username}
          </DialogTitle>
        </DialogHeader>
        {!playerId ? (
          <p className="text-sm text-yellow-400 py-4">This user has no OneSignal player ID registered.</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              <FormField label="Title *">
                <Input value={form.title} onChange={set("title")} placeholder="Notification title" />
              </FormField>
              <FormField label="Body *">
                <Textarea value={form.body} onChange={set("body")} placeholder="Notification message" rows={3} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Open URL" hint="Deeplink or web URL to open on tap">
                <Input value={form.url} onChange={set("url")} placeholder="https://..." />
              </FormField>
              <FormField label="Collapse ID" hint="Replaces old notif with same ID">
                <Input value={form.collapse_id} onChange={set("collapse_id")} placeholder="e.g. promo_jan" />
              </FormField>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Images</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Large Icon" hint="Circle icon (Android)">
                <Input value={form.large_icon} onChange={set("large_icon")} placeholder="https://..." />
              </FormField>
              <FormField label="Small Icon" hint="Status bar icon name">
                <Input value={form.small_icon} onChange={set("small_icon")} placeholder="ic_stat_notify" />
              </FormField>
              <FormField label="Big Picture" hint="Banner image below text">
                <Input value={form.big_picture} onChange={set("big_picture")} placeholder="https://..." />
              </FormField>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Advanced</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Android Channel ID">
                <Input value={form.android_channel_id} onChange={set("android_channel_id")} placeholder="default" />
              </FormField>
              <FormField label="iOS Badge Count">
                <Input type="number" value={form.ios_badge_count} onChange={set("ios_badge_count")} placeholder="1" />
              </FormField>
              <FormField label="Priority (1–10)" hint="10 = urgent">
                <Input type="number" min={1} max={10} value={form.priority} onChange={set("priority")} />
              </FormField>
            </div>
            <FormField label="Extra Data (JSON)" hint='Custom key-value payload, e.g. {"type":"promo"}'>
              <Textarea value={form.data} onChange={set("data")} placeholder='{"key": "value"}' rows={2} className="font-mono text-xs" />
            </FormField>

            {result && (
              <p className={`text-xs font-medium ${result.ok ? "text-green-400" : "text-red-400"}`}>{result.msg}</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          {playerId && (
            <Button onClick={handleSend} disabled={sending || !form.title.trim() || !form.body.trim()}>
              {sending && <Loader2 className="size-4 animate-spin mr-2" />}
              Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const { sensitive, wallet } = profile;
  const pub = profile.public;

  const [editOpen, setEditOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: sensitive.name ?? "",
    bio: sensitive.bio ?? "",
    ffuid: sensitive.ffuid ?? "",
    ffname: sensitive.ffname ?? "",
    ff_level: sensitive.ff_level !== null ? String(sensitive.ff_level) : "",
    ff_creation_date: sensitive.ff_creation_date ?? "",
    yturl: sensitive.yturl ?? "",
    instaurl: sensitive.instaurl ?? "",
    kills: sensitive.kills ?? 0,
    death: sensitive.death ?? 0,
    winrate: sensitive.winrate ?? 0,
    followercount: sensitive.followercount ?? 0,
    followingcount: sensitive.followingcount ?? 0,
    tournmentsplayed: sensitive.tournmentsplayed ?? 0,
    tournamentswon: sensitive.tournamentswon ?? 0,
    rank: sensitive.rank !== null ? String(sensitive.rank) : "",
    earnings: sensitive.earnings ?? 0,
    is_bluetick: sensitive.is_bluetick,
    is_redtick: sensitive.is_redtick,
    is_banned: sensitive.is_banned,
    ban_reason: sensitive.ban_reason ?? "",
    banned_until: sensitive.banned_until ? sensitive.banned_until.slice(0, 10) : "",
    otherurls: sensitive.otherurls ? JSON.stringify(sensitive.otherurls, null, 2) : "",
    squad: sensitive.squad ? JSON.stringify(sensitive.squad, null, 2) : "",
    // wallet
    allow_deposits: wallet?.allow_deposits ?? true,
    allow_withdrawals: wallet?.allow_withdrawals ?? true,
    fraud_reason: wallet?.fraud_reason ?? "",
    balance: wallet ? String(Number(wallet.balance).toFixed(2)) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  async function handleSave() {
    setSaving(true); setSaveErr("");
    let otherurls: Record<string, unknown> | null = null;
    let squad: Record<string, unknown> | null = null;
    if (form.otherurls.trim()) {
      try { otherurls = JSON.parse(form.otherurls); }
      catch { setSaveErr("Other URLs must be valid JSON"); setSaving(false); return; }
    }
    if (form.squad.trim()) {
      try { squad = JSON.parse(form.squad); }
      catch { setSaveErr("Squad must be valid JSON"); setSaving(false); return; }
    }
    const res = await fetch(`/api/users/${sensitive.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        rank: form.rank === "" ? null : Number(form.rank),
        earnings: Number(form.earnings),
        banned_until: form.banned_until || null,
        ban_reason: form.ban_reason || null,
        kills: Number(form.kills),
        death: Number(form.death),
        winrate: Number(form.winrate),
        followercount: Number(form.followercount),
        followingcount: Number(form.followingcount),
        tournmentsplayed: Number(form.tournmentsplayed),
        tournamentswon: Number(form.tournamentswon),
        ff_level: form.ff_level === "" ? null : Number(form.ff_level),
        ff_creation_date: form.ff_creation_date || null,
        ffuid: form.ffuid || null,
        ffname: form.ffname || null,
        yturl: form.yturl || null,
        instaurl: form.instaurl || null,
        bio: form.bio || null,
        otherurls,
        squad,
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveErr(d.error ?? "Failed"); setSaving(false); return; }

    // Update wallet if it exists
    if (wallet) {
      const wRes = await fetch(`/api/users/${sensitive.id}/wallet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allow_deposits: form.allow_deposits,
          allow_withdrawals: form.allow_withdrawals,
          fraud_reason: form.fraud_reason || null,
          balance: Number(form.balance),
        }),
      });
      if (!wRes.ok) { const d = await wRes.json().catch(() => ({})); setSaveErr(d.error ?? "Wallet update failed"); setSaving(false); return; }
    }

    setSaving(false); setEditOpen(false); onRefresh();
  }

  async function quickAction(action: string) {
    setQuickSaving(action);
    try {
      if (action === "ban" || action === "unban") {
        await fetch(`/api/users/${sensitive.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_banned: action === "ban" }),
        });
      } else if (action === "block_deposits" || action === "allow_deposits") {
        await fetch(`/api/users/${sensitive.id}/wallet`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allow_deposits: action === "allow_deposits" }),
        });
      } else if (action === "block_withdrawals" || action === "allow_withdrawals") {
        await fetch(`/api/users/${sensitive.id}/wallet`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allow_withdrawals: action === "allow_withdrawals" }),
        });
      }
      onRefresh();
    } finally {
      setQuickSaving(null);
    }
  }

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm break-all">{value ?? "—"}</span>
    </div>
  );

  const renderJson = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj || Object.keys(obj).length === 0) return "—";
    return (
      <div className="space-y-0.5">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-muted-foreground font-mono">{k}:</span>
            <span className="break-all">
              {typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))
                ? <a href={v} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-0.5">{v}<ExternalLink className="size-2.5 shrink-0" /></a>
                : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile card */}
        <div className="rounded-lg border border-border p-5 space-y-1">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">Profile</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setNotifOpen(true)} className="h-7 text-xs">
                <Send className="size-3 mr-1.5" />Notify
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
            </div>
          </div>
          <Row label="ID" value={<span className="font-mono text-xs">{sensitive.id}</span>} />
          <Row label="Username" value={<span className="font-medium">{sensitive.username}</span>} />
          <Row label="Name" value={sensitive.name} />
          <Row label="Email" value={sensitive.email} />
          <Row label="Bio" value={sensitive.bio} />
          <Row label="FF UID" value={sensitive.ffuid} />
          <Row label="FF Name" value={sensitive.ffname} />
          <Row label="FF Level" value={sensitive.ff_level} />
          <Row label="FF Creation" value={sensitive.ff_creation_date} />
          <Row label="YouTube" value={sensitive.yturl ? <a href={sensitive.yturl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1">{sensitive.yturl}<ExternalLink className="size-3" /></a> : null} />
          <Row label="Instagram" value={sensitive.instaurl ? <a href={sensitive.instaurl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1">{sensitive.instaurl}<ExternalLink className="size-3" /></a> : null} />
          <Row label="Other URLs" value={renderJson(sensitive.otherurls)} />
          <Row label="Squad" value={renderJson(sensitive.squad)} />
          <Row label="Online" value={sensitive.isonline ? <span className="text-green-400 flex items-center gap-1"><Wifi className="size-3" /> Yes</span> : <span className="text-muted-foreground flex items-center gap-1"><WifiOff className="size-3" /> No</span>} />
          <Row label="Last Seen" value={fmt(sensitive.lastseen)} />
          <Row label="Joined" value={fmt(sensitive.created_at)} />
          <Row label="Updated" value={fmt(sensitive.updated_at)} />
        </div>

        <div className="space-y-4">
          {/* Stats */}
          <div className="rounded-lg border border-border p-5 space-y-1">
            <h3 className="font-semibold text-sm mb-3">Stats</h3>
            <Row label="Rank" value={sensitive.rank} />
            <Row label="Earnings" value={<span className="text-amber-400">₹{sensitive.earnings?.toLocaleString()}</span>} />
            <Row label="Followers" value={sensitive.followercount?.toLocaleString()} />
            <Row label="Following" value={sensitive.followingcount?.toLocaleString()} />
            <Row label="Tournaments Played" value={sensitive.tournmentsplayed} />
            <Row label="Tournaments Won" value={sensitive.tournamentswon} />
            <Row label="Win Rate" value={`${sensitive.winrate ?? 0}%`} />
            <Row label="Kills" value={sensitive.kills} />
            <Row label="Deaths" value={sensitive.death} />
          </div>

          {/* Flags & Wallet */}
          <div className="rounded-lg border border-border p-5 space-y-3">
            <h3 className="font-semibold text-sm mb-1">Flags & Wallet</h3>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
              <Button
                size="sm" variant={sensitive.is_banned ? "outline" : "destructive"}
                className="h-7 text-xs"
                disabled={quickSaving !== null}
                onClick={() => quickAction(sensitive.is_banned ? "unban" : "ban")}
              >
                {quickSaving === "ban" || quickSaving === "unban" ? <Loader2 className="size-3 animate-spin mr-1" /> : <Ban className="size-3 mr-1" />}
                {sensitive.is_banned ? "Unban User" : "Ban User"}
              </Button>
              {wallet && <>
                <Button
                  size="sm"
                  variant={wallet.allow_deposits ? "destructive" : "outline"}
                  className="h-7 text-xs"
                  disabled={quickSaving !== null}
                  onClick={() => quickAction(wallet.allow_deposits ? "block_deposits" : "allow_deposits")}
                >
                  {quickSaving === "block_deposits" || quickSaving === "allow_deposits" ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  {wallet.allow_deposits ? "Block Deposits" : "Allow Deposits"}
                </Button>
                <Button
                  size="sm"
                  variant={wallet.allow_withdrawals ? "destructive" : "outline"}
                  className="h-7 text-xs"
                  disabled={quickSaving !== null}
                  onClick={() => quickAction(wallet.allow_withdrawals ? "block_withdrawals" : "allow_withdrawals")}
                >
                  {quickSaving === "block_withdrawals" || quickSaving === "allow_withdrawals" ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  {wallet.allow_withdrawals ? "Block Withdrawals" : "Allow Withdrawals"}
                </Button>
              </>}
            </div>

            <div className="space-y-1">
              <Row label="Blue Tick" value={sensitive.is_bluetick ? <span className="text-blue-400 flex items-center gap-1"><Shield className="size-3" /> Yes</span> : "No"} />
              <Row label="Red Tick" value={sensitive.is_redtick ? <span className="text-red-400 flex items-center gap-1"><Shield className="size-3" /> Yes</span> : "No"} />
              <Row label="Banned" value={sensitive.is_banned ? <span className="text-red-400 flex items-center gap-1"><Ban className="size-3" /> Yes</span> : <span className="text-green-400">No</span>} />
              {sensitive.is_banned && <Row label="Ban Reason" value={sensitive.ban_reason} />}
              {sensitive.is_banned && <Row label="Banned Until" value={fmtDate(sensitive.banned_until)} />}
              {wallet && <>
                <Row label="Wallet Balance" value={<span className="text-green-400 font-medium">₹{Number(wallet.balance).toFixed(2)}</span>} />
                <Row label="Allow Deposits" value={wallet.allow_deposits ? <span className="text-green-400">Yes</span> : <span className="text-red-400">Blocked</span>} />
                <Row label="Allow Withdrawals" value={wallet.allow_withdrawals ? <span className="text-green-400">Yes</span> : <span className="text-red-400">Blocked</span>} />
                {wallet.fraud_reason && <Row label="Fraud Reason" value={<span className="text-red-400">{wallet.fraud_reason}</span>} />}
              </>}
              {profile.notifSettings && <Row label="Notifications" value={profile.notifSettings.is_notifications_enabled ? "Enabled" : "Disabled"} />}
              {profile.notifSettings?.onesignal_player_id && (
                <Row label="OneSignal ID" value={<span className="font-mono text-xs">{profile.notifSettings.onesignal_player_id}</span>} />
              )}
            </div>
          </div>

          {/* Showcase */}
          {pub && (pub.sc_character || pub.sc_weapon || pub.sc_weapon2) && (
            <div className="rounded-lg border border-border p-5 space-y-1">
              <h3 className="font-semibold text-sm mb-3">Showcase</h3>
              <Row label="Character" value={pub.sc_character} />
              <Row label="Weapon 1" value={pub.sc_weapon} />
              <Row label="Weapon 2" value={pub.sc_weapon2} />
            </div>
          )}
        </div>
      </div>

      {/* Send Notification Dialog */}
      <SendNotifDialog
        open={notifOpen}
        onOpenChange={setNotifOpen}
        playerId={profile.notifSettings?.onesignal_player_id ?? null}
        username={sensitive.username}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-6 py-2">

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic Info</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Name"><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
              </div>
              <div className="mt-3">
                <FormField label="Bio"><Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} /></FormField>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Free Fire</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="FF UID"><Input value={form.ffuid} onChange={(e) => setForm(f => ({ ...f, ffuid: e.target.value }))} /></FormField>
                <FormField label="FF Name"><Input value={form.ffname} onChange={(e) => setForm(f => ({ ...f, ffname: e.target.value }))} /></FormField>
                <FormField label="FF Level"><Input type="number" value={form.ff_level} onChange={(e) => setForm(f => ({ ...f, ff_level: e.target.value }))} /></FormField>
                <FormField label="FF Creation Date"><Input value={form.ff_creation_date} onChange={(e) => setForm(f => ({ ...f, ff_creation_date: e.target.value }))} placeholder="e.g. 2019-01-15" /></FormField>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Social Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="YouTube URL"><Input value={form.yturl} onChange={(e) => setForm(f => ({ ...f, yturl: e.target.value }))} placeholder="https://..." /></FormField>
                <FormField label="Instagram URL"><Input value={form.instaurl} onChange={(e) => setForm(f => ({ ...f, instaurl: e.target.value }))} placeholder="https://..." /></FormField>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Stats</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FormField label="Kills"><Input type="number" value={form.kills} onChange={(e) => setForm(f => ({ ...f, kills: Number(e.target.value) }))} /></FormField>
                <FormField label="Deaths"><Input type="number" value={form.death} onChange={(e) => setForm(f => ({ ...f, death: Number(e.target.value) }))} /></FormField>
                <FormField label="Win Rate %"><Input type="number" value={form.winrate} onChange={(e) => setForm(f => ({ ...f, winrate: Number(e.target.value) }))} /></FormField>
                <FormField label="Rank"><Input type="number" value={form.rank} onChange={(e) => setForm(f => ({ ...f, rank: e.target.value }))} /></FormField>
                <FormField label="Earnings ₹"><Input type="number" value={form.earnings} onChange={(e) => setForm(f => ({ ...f, earnings: Number(e.target.value) }))} /></FormField>
                <FormField label="Followers"><Input type="number" value={form.followercount} onChange={(e) => setForm(f => ({ ...f, followercount: Number(e.target.value) }))} /></FormField>
                <FormField label="Following"><Input type="number" value={form.followingcount} onChange={(e) => setForm(f => ({ ...f, followingcount: Number(e.target.value) }))} /></FormField>
                <FormField label="Tournaments"><Input type="number" value={form.tournmentsplayed} onChange={(e) => setForm(f => ({ ...f, tournmentsplayed: Number(e.target.value) }))} /></FormField>
                <FormField label="Won"><Input type="number" value={form.tournamentswon} onChange={(e) => setForm(f => ({ ...f, tournamentswon: Number(e.target.value) }))} /></FormField>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Moderation</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Blue Tick</Label>
                  <Switch checked={form.is_bluetick} onCheckedChange={(v) => setForm(f => ({ ...f, is_bluetick: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Red Tick</Label>
                  <Switch checked={form.is_redtick} onCheckedChange={(v) => setForm(f => ({ ...f, is_redtick: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Banned</Label>
                  <Switch checked={form.is_banned} onCheckedChange={(v) => setForm(f => ({ ...f, is_banned: v }))} />
                </div>
                {form.is_banned && <>
                  <FormField label="Ban Reason"><Input value={form.ban_reason} onChange={(e) => setForm(f => ({ ...f, ban_reason: e.target.value }))} /></FormField>
                  <FormField label="Banned Until"><Input type="date" value={form.banned_until} onChange={(e) => setForm(f => ({ ...f, banned_until: e.target.value }))} /></FormField>
                </>}
              </div>
            </div>

            {wallet && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Wallet</p>
                <div className="space-y-3">
                  <FormField label="Balance ₹"><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} /></FormField>
                  <div className="flex items-center justify-between">
                    <Label>Allow Deposits</Label>
                    <Switch checked={form.allow_deposits} onCheckedChange={(v) => setForm(f => ({ ...f, allow_deposits: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow Withdrawals</Label>
                    <Switch checked={form.allow_withdrawals} onCheckedChange={(v) => setForm(f => ({ ...f, allow_withdrawals: v }))} />
                  </div>
                  <FormField label="Fraud Reason"><Input value={form.fraud_reason} onChange={(e) => setForm(f => ({ ...f, fraud_reason: e.target.value }))} placeholder="Optional reason" /></FormField>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">JSON Fields</p>
              <div className="space-y-3">
                <FormField label="Other URLs (JSON)">
                  <Textarea value={form.otherurls} onChange={(e) => setForm(f => ({ ...f, otherurls: e.target.value }))} placeholder={'{"twitter":"https://..."}'} rows={3} className="font-mono text-xs" />
                </FormField>
                <FormField label="Squad (JSON)">
                  <Textarea value={form.squad} onChange={(e) => setForm(f => ({ ...f, squad: e.target.value }))} placeholder={'{"name":"...","members":[]}'} rows={3} className="font-mono text-xs" />
                </FormField>
              </div>
            </div>

            {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin mr-2" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Post card (likes + 2-level nested comments) ──────────────────────────────

function PostCard({ post, viewerId, onDelete }: { post: CommunityMessage; viewerId: string; onDelete?: (id: string) => void }) {
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [comments, setComments] = useState<NestedComment[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  void viewerId;

  async function loadLikes() {
    if (likes.length > 0) { setLikesOpen(v => !v); return; }
    setLikesLoading(true);
    const res = await fetch(`/api/community/${post.id}/likes`);
    if (res.ok) { const d = await res.json(); setLikes(d.data ?? []); }
    setLikesLoading(false);
    setLikesOpen(true);
  }

  async function loadComments() {
    if (comments.length > 0) { setCommentsOpen(v => !v); return; }
    setCommentsLoading(true);
    const res = await fetch(`/api/community/${post.id}/comments`);
    if (res.ok) { const d = await res.json(); setComments(d.data ?? []); }
    setCommentsLoading(false);
    setCommentsOpen(true);
  }

  async function handleDelete() {
    if (!confirm(`Delete this post?\n\nThis cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onDelete?.(post.id);
    else alert("Delete failed");
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-relaxed flex-1">{post.text ?? <span className="italic text-muted-foreground">Image only</span>}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {post.image_url && (
            <a href={post.image_url} target="_blank" rel="noreferrer">
              <div className="relative size-16 rounded-md overflow-hidden border border-border">
                <Image src={post.image_url} alt="post" fill className="object-cover" unoptimized sizes="64px" />
              </div>
            </a>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={loadLikes} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {likesLoading ? <Loader2 className="size-3 animate-spin" /> : <Heart className={`size-3 ${likesOpen ? "text-red-400" : ""}`} />}
          <span className={likesOpen ? "text-red-400" : ""}>{post.likes} likes</span>
          {likesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {commentsLoading ? <Loader2 className="size-3 animate-spin" /> : <MessageCircle className={`size-3 ${commentsOpen ? "text-blue-400" : ""}`} />}
          <span className={commentsOpen ? "text-blue-400" : ""}>{post.comments} comments</span>
          {commentsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <span className="text-xs text-muted-foreground ml-auto">{fmt(post.created_at)}</span>
      </div>

      {likesOpen && (
        <div className="rounded-md bg-muted/30 p-3">
          {likes.length === 0 ? <p className="text-xs text-muted-foreground italic">No likes.</p> : (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-2">Liked by</p>
              <div className="flex flex-wrap gap-2">
                {likes.map((l) => (
                  <Link key={l.user_id} href={`/users/${l.user_id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <div className="relative size-5 rounded-full overflow-hidden bg-muted shrink-0">
                      {l.user?.avatarurl && <Image src={l.user.avatarurl} alt="" fill className="object-cover" unoptimized sizes="20px" />}
                    </div>
                    <span className="text-xs">{l.user?.username ?? shortId(l.user_id)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {commentsOpen && (
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-xs text-muted-foreground italic">No comments.</p>}
          {comments.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex gap-2 rounded-md bg-muted/20 p-2.5">
                <div className="relative size-6 rounded-full overflow-hidden bg-muted shrink-0 mt-0.5">
                  {c.author?.avatarurl && <Image src={c.author.avatarurl} alt="" fill className="object-cover" unoptimized sizes="24px" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/users/${c.user_id}`} className="text-xs font-medium hover:underline">{c.author?.username ?? shortId(c.user_id)}</Link>
                    <span className="text-xs text-muted-foreground">{fmt(c.created_at)}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex items-center gap-0.5"><Heart className="size-2.5" />{c.likes_count}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 space-y-1.5">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2 rounded-md bg-muted/10 p-2 border-l-2 border-border/50 pl-3">
                      <div className="relative size-5 rounded-full overflow-hidden bg-muted shrink-0 mt-0.5">
                        {r.author?.avatarurl && <Image src={r.author.avatarurl} alt="" fill className="object-cover" unoptimized sizes="20px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/users/${r.user_id}`} className="text-xs font-medium hover:underline">{r.author?.username ?? shortId(r.user_id)}</Link>
                          <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
                          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-0.5"><Heart className="size-2.5" />{r.likes_count}</span>
                        </div>
                        <p className="text-sm">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Posts tab ────────────────────────────────────────────────────────────────

function PostsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<CommunityMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/posts?page=${page}&limit=${LIMIT}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  function handlePostDelete(id: string) {
    setRows(r => r.filter(p => p.id !== id));
    setTotal(t => t - 1);
  }

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="space-y-3">
          {rows.map((p) => <PostCard key={p.id} post={p} viewerId={userId} onDelete={handlePostDelete} />)}
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<CommunityComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/comments?page=${page}&limit=${LIMIT}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  async function handleCommentDelete(id: string) {
    if (!confirm("Delete this comment and all its replies?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) { setRows(r => r.filter(c => c.id !== id)); setTotal(t => t - 1); }
    else alert("Delete failed");
  }

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Comment</th>
                <th className="px-4 py-2 text-left font-medium">Post</th>
                <th className="px-4 py-2 text-right font-medium">Likes</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-2 max-w-xs truncate">{c.content}</td>
                  <td className="px-4 py-2 font-mono text-xs text-blue-400">
                    <Link href={`/community?post=${c.message_id}`} className="hover:underline flex items-center gap-1">
                      {shortId(c.message_id)}<ExternalLink className="size-2.5" />
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-xs">{c.likes_count}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(c.created_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleCommentDelete(c.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Chat conversation view ───────────────────────────────────────────────────

function ChatConversation({ userId, partner, onBack }: { userId: string; partner: ChatPartner; onBack: () => void }) {
  const [messages, setMessages] = useState<DirectMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}/chats/${partner.id}`);
      if (res.ok) { const d = await res.json(); setMessages(d.data ?? []); }
      setLoading(false);
    })();
  }, [userId, partner.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="size-4 mr-1" /> Back</Button>
        <div className="relative size-8 rounded-full overflow-hidden bg-muted shrink-0">
          <Image src={partner.avatarurl} alt={partner.username} fill className="object-cover" unoptimized sizes="32px" />
        </div>
        <Link href={`/users/${partner.id}`} className="font-medium text-sm hover:underline">{partner.username}</Link>
      </div>
      {loading && <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
      {!loading && messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No messages.</p>}
      {!loading && messages.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {messages.map((m) => {
            const isMine = m.sender_id === userId;
            const isDeletedForSender = m.deleted_for_sender && isMine;
            const isDeletedForReceiver = m.deleted_for_receiver && !isMine;
            const isDeleted = isDeletedForSender || isDeletedForReceiver;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm space-y-1 ${
                  isDeleted
                    ? "bg-red-500/15 border border-red-500/30"
                    : isMine
                      ? "bg-foreground text-background rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                }`}>
                  {isDeleted && (
                    <p className="text-[10px] text-red-400 font-medium">
                      🗑 Deleted{isDeletedForSender ? " for sender" : " for receiver"}
                    </p>
                  )}
                  {m.text && <p className={isDeleted ? "text-red-200/80" : ""}>{m.text}</p>}
                  {(m.media_urls?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.media_urls!.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className={`text-xs underline ${isDeleted ? "text-red-400/70" : isMine ? "text-background/70" : "text-blue-400"}`}>Media {i + 1}</a>
                      ))}
                    </div>
                  )}
                  {(m.giphy_urls?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.giphy_urls!.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className={`text-xs underline ${isDeleted ? "text-red-400/70" : isMine ? "text-background/70" : "text-blue-400"}`}>GIF {i + 1}</a>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs ${
                    isDeleted ? "text-red-400/50" : isMine ? "text-background/50 text-right" : "text-muted-foreground"
                  }`}>{fmt(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Chats tab ────────────────────────────────────────────────────────────────

function ChatsTab({ userId }: { userId: string }) {
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatPartner | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}/chat-partners`);
      if (res.ok) { const d = await res.json(); setPartners(d.data ?? []); }
      setLoading(false);
    })();
  }, [userId]);

  if (selected) return <ChatConversation userId={userId} partner={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={partners.length === 0}>
        <div className="rounded-lg border border-border overflow-hidden">
          {partners.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/20 transition-colors text-left last:border-0">
              <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0">
                <Image src={p.avatarurl} alt={p.username} fill className="object-cover" unoptimized sizes="40px" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{p.username}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{p.lastTime ? fmt(p.lastTime) : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{p.lastMsg || "Media"}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </TableWrap>
    </div>
  );
}

// ─── Followers tab ───────────────────────────────────────────────────────────

function FollowersTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Follower[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("followers");
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addErr, setAddErr] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/followers?page=${page}&limit=${LIMIT}&type=${type}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page, type]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!addInput.trim()) return;
    setAddLoading(true); setAddErr("");
    const body = type === "followers"
      ? { follower_id: addInput.trim(), following_id: userId }
      : { follower_id: userId, following_id: addInput.trim() };
    const res = await fetch(`/api/users/${userId}/followers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setAddLoading(false);
    if (res.ok) { setAddInput(""); load(); }
    else { const d = await res.json().catch(() => ({})); setAddErr(d.error ?? "Failed"); }
  }

  async function handleDelete(f: Follower) {
    const fid = f.follower_id ?? "", gid = f.following_id ?? "";
    if (!fid || !gid) return;
    await fetch(`/api/users/${userId}/followers?follower_id=${fid}&following_id=${gid}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        {["followers", "following"].map((t) => (
          <button key={t} onClick={() => { setType(t); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${type === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            {t}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <Input className="h-7 text-xs w-52" placeholder={type === "followers" ? "Follower user ID" : "Following user ID"}
            value={addInput} onChange={(e) => setAddInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button size="sm" variant="secondary" onClick={handleAdd} disabled={addLoading || !addInput.trim()}>
            {addLoading ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          </Button>
        </div>
      </div>
      {addErr && <p className="text-xs text-red-400">{addErr}</p>}
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">{type === "followers" ? "Follower" : "Following"}</th>
                <th className="px-4 py-2 text-left font-medium">Since</th>
                <th className="px-4 py-2 text-right font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const otherId = type === "followers" ? f.follower_id : f.following_id;
                return (
                  <tr key={f.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">
                      {otherId ? <Link href={`/users/${otherId}`} className="hover:underline text-blue-400">{shortId(otherId)}</Link> : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(f.created_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(f)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Blocked tab ─────────────────────────────────────────────────────────────

function BlockedTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<BlockedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/blocked?page=${page}&limit=${LIMIT}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Blocked User</th>
                <th className="px-4 py-2 text-left font-medium">IP Address</th>
                <th className="px-4 py-2 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">
                    {b.blocked_id ? <Link href={`/users/${b.blocked_id}`} className="hover:underline text-blue-400">{shortId(b.blocked_id)}</Link> : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{b.ip_address ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Notifications tab ───────────────────────────────────────────────────────

function NotificationsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<UserNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/notifications?page=${page}&limit=${LIMIT}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Title</th>
                <th className="px-4 py-2 text-left font-medium">Message</th>
                <th className="px-4 py-2 text-left font-medium">Read</th>
                <th className="px-4 py-2 text-left font-medium">Sent</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{n.type}</td>
                  <td className="px-4 py-2 text-xs font-medium max-w-[150px] truncate">{n.title}</td>
                  <td className="px-4 py-2 text-xs max-w-[200px] truncate">{n.message}</td>
                  <td className="px-4 py-2 text-xs">{n.is_read ? <span className="text-green-400">Yes</span> : "No"}</td>
                  <td className="px-4 py-2 text-xs">{n.sent ? <span className="text-green-400">Yes</span> : "No"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(n.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Transactions tab ────────────────────────────────────────────────────────

function UserTransactionsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/transactions?page=${page}&limit=${LIMIT}&type=${type}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page, type]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {[["all", "All"], ["RAZORPAY_MONEY_ADD", "Deposits"], ["WITHDRAWAL", "Withdrawals"]].map(([val, label]) => (
          <button key={val} onClick={() => { setType(val); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${type === val ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            {label}
          </button>
        ))}
      </div>
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(tx.created_at)}</td>
                  <td className="px-4 py-2 text-xs">{tx.transaction_type}</td>
                  <td className={`px-4 py-2 text-right text-xs font-medium ${Number(tx.amount) < 0 ? "text-red-400" : "text-green-400"}`}>{rupees(tx.amount)}</td>
                  <td className="px-4 py-2"><StatusBadge status={tx.payment_status} /></td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {tx.old_balance != null ? rupees(tx.old_balance) : "—"} → {tx.new_balance != null ? rupees(tx.new_balance) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Feedback tab ────────────────────────────────────────────────────────────

const FB_CAT_COLOR: Record<string, string> = {
  feedback: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  idea: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  bug: "bg-red-500/15 text-red-400 border-red-500/30",
  feature_request: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function FeedbackTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<UserFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/feedback?page=${page}&limit=${LIMIT}`);
    if (res.ok) { const d = await res.json(); setRows(d.data ?? []); setTotal(d.count ?? 0); }
    setLoading(false);
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  async function handleFeedbackDelete(id: string) {
    if (!confirm("Delete this feedback?")) return;
    const res = await fetch(`/api/users/${userId}/feedback?feedbackId=${id}`, { method: "DELETE" });
    if (res.ok) { setRows(r => r.filter(f => f.id !== id)); setTotal(t => t - 1); }
    else alert("Delete failed");
  }

  return (
    <div className="space-y-3">
      <TableWrap loading={loading} empty={rows.length === 0}>
        <div className="space-y-2">
          {rows.map((fb) => (
            <div key={fb.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${FB_CAT_COLOR[fb.category] ?? FB_CAT_COLOR.other}`}>
                    {fb.category.replace("_", " ")}
                  </span>
                  <span className="font-medium text-sm">{fb.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(fb.created_at)}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleFeedbackDelete(fb.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{fb.message}</p>
              <p className="text-xs text-muted-foreground/50 font-mono">{fb.id}</p>
            </div>
          ))}
        </div>
      </TableWrap>
      <Pager page={page} total={total} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

// ─── Admin Notes tab ──────────────────────────────────────────────────────────

type DeviceItem = {
  brand?: string; model?: string; manufacturer?: string; os_version?: string;
  sdk_int?: number; device_id?: string; timestamp?: string;
  screen_resolution?: { width: number; height: number };
};
type LocationItem = { latitude?: number; longitude?: number; accuracy?: number; timestamp?: string };
type AppItem = { app_name?: string; package_name?: string; version?: string; added_at?: string };
type ContactItem = { name?: string; phone?: string };

function AdminNotesTab({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<AdminNotes | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [phone, setPhone] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [appSearch, setAppSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/adminnotes`);
    if (res.ok) {
      const d = await res.json();
      if (d === null) { setNotFound(true); }
      else { setNotes(d); setPhone(d.phone_number ?? ""); setInternalNotes(d.internal_notes ?? ""); }
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveErr("");
    const res = await fetch(`/api/users/${userId}/adminnotes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone.trim() || null, internal_notes: internalNotes.trim() || null }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveErr(d.error ?? "Save failed"); }
    else { await load(); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  if (notFound || !notes) return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <ClipboardList className="size-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No admin notes recorded yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Device, location and app data will appear when the user opens the app.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manual Fields</p>
        <div className="space-y-1">
          <Label className="text-xs">Phone Number</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Internal Notes</Label>
          <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Private admin notes..." rows={4} />
        </div>
        {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-3 animate-spin mr-2" />}Save
        </Button>
      </div>
    </div>
  );

  const devices = (notes.device_info ?? []) as DeviceItem[];
  const locations = (notes.locations_app_open ?? []) as LocationItem[];
  const apps = (notes.installed_apps ?? []) as AppItem[];
  const contacts = (notes.contacts ?? []) as ContactItem[];
  const vpn = (notes.vpn_detection ?? []) as Record<string, unknown>[];
  const banHistory = (notes.ban_history ?? []) as Record<string, unknown>[];

  const filteredApps = appSearch.trim()
    ? apps.filter(a => a.app_name?.toLowerCase().includes(appSearch.toLowerCase()) || a.package_name?.toLowerCase().includes(appSearch.toLowerCase()))
    : apps;

  return (
    <div className="space-y-5">
      {/* Phone + internal notes */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin-Editable Fields</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Phone Number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </div>
          {notes.contacts_last_synced && (
            <div className="space-y-1">
              <Label className="text-xs">Contacts last synced</Label>
              <p className="text-sm text-muted-foreground py-2">{fmt(notes.contacts_last_synced)}</p>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Internal Notes</Label>
          <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Private admin notes about this user..." rows={4} />
        </div>
        {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-3 animate-spin mr-2" />}Save Changes
        </Button>
      </div>

      {/* Devices */}
      {devices.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Smartphone className="size-3" />Devices ({devices.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {devices.map((d, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <p className="font-medium text-sm">{d.brand ?? "Unknown"} {d.model ?? ""}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  {d.manufacturer && <span>Mfr: {d.manufacturer}</span>}
                  {d.os_version && <span>OS: {d.os_version}</span>}
                  {d.sdk_int != null && <span>SDK: {d.sdk_int}</span>}
                  {d.screen_resolution && <span>Screen: {d.screen_resolution.width}×{d.screen_resolution.height}</span>}
                  {d.timestamp && <span className="col-span-2">Seen: {fmt(d.timestamp)}</span>}
                  {d.device_id && <span className="col-span-2 font-mono truncate text-[10px]">ID: {d.device_id}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="size-3" />App-Open Locations ({locations.length})
          </p>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-card text-muted-foreground">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Latitude</th>
                  <th className="px-3 py-2 text-left">Longitude</th>
                  <th className="px-3 py-2 text-left">Accuracy (m)</th>
                  <th className="px-3 py-2 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono">{loc.latitude?.toFixed(7)}</td>
                    <td className="px-3 py-2 font-mono">{loc.longitude?.toFixed(7)}</td>
                    <td className="px-3 py-2">{loc.accuracy != null ? loc.accuracy.toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{loc.timestamp ? fmt(loc.timestamp) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Installed Apps */}
      {apps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Package className="size-3" />Installed Apps ({apps.length})
          </p>
          <Input value={appSearch} onChange={e => setAppSearch(e.target.value)} placeholder="Search apps or package names..." className="h-8 text-xs" />
          <div className="rounded-lg border border-border max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 text-left">App</th>
                  <th className="px-3 py-2 text-left">Package</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Added</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{app.app_name ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{app.package_name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{app.version ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{app.added_at ? fmtDate(app.added_at) : "—"}</td>
                  </tr>
                ))}
                {filteredApps.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No apps match</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contacts */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacts ({contacts.length})</p>
          <div className="rounded-lg border border-border max-h-52 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2">{c.name ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VPN Detection */}
      {vpn.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">VPN Detection ({vpn.length})</p>
          <pre className="text-xs bg-muted/30 rounded-lg border border-border p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(vpn, null, 2)}</pre>
        </div>
      )}

      {/* Ban History */}
      {banHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-400/80 uppercase tracking-wide">Ban History ({banHistory.length})</p>
          <pre className="text-xs bg-red-500/5 rounded-lg border border-red-500/20 p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(banHistory, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Locations map tab ──────────────────────────────────────────────────────────

function LocationsMapTab({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<AdminNotes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}/adminnotes`)
      .then((r) => r.json())
      .then((d) => setNotes(d ?? null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground text-sm py-8"><Loader2 className="size-4 animate-spin" />Loading locations…</div>;

  const raw = (notes?.locations_app_open ?? []) as { latitude?: number; longitude?: number; lat?: number; lng?: number; accuracy?: number; timestamp?: string }[];
  const valid = raw.filter((l) => (l.latitude != null && l.longitude != null) || (l.lat != null && l.lng != null));

  if (valid.length === 0) {
    return <div className="text-muted-foreground text-sm py-8 text-center">No location data recorded for this user.</div>;
  }

  // Sort ascending by timestamp so latest is last
  const sorted = [...valid].sort((a, b) => {
    if (!a.timestamp) return -1;
    if (!b.timestamp) return 1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const points = sorted.map((l, i) => ({
    lat: (l.latitude ?? l.lat)!,
    lng: (l.longitude ?? l.lng)!,
    accuracy: l.accuracy,
    timestamp: l.timestamp,
    isLatest: i === sorted.length - 1,
  }));

  const latest = sorted[sorted.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{points.length}</span> location{points.length !== 1 ? "s" : ""} recorded
        </p>
        {latest.timestamp && (
          <span className="text-xs text-muted-foreground">Last seen: {fmt(latest.timestamp)}</span>
        )}
      </div>
      <div className="rounded-lg overflow-hidden border border-border">
        <LocationsLeafletMap points={points} />
      </div>
      <div className="text-xs text-muted-foreground flex gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full bg-orange-500"/> Most recent location</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full bg-blue-500"/> Previous locations</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) { setProfile(await res.json()); }
    else { setError("User not found"); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (error || !profile) return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="size-4 mr-2" /> Back</Button>
      <p className="text-red-400">{error || "Unknown error"}</p>
    </div>
  );

  const { sensitive } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-1"><ArrowLeft className="size-4" /></Button>
        <div className="relative size-16 rounded-full overflow-hidden bg-muted shrink-0">
          <Image src={sensitive.avatarurl} alt={sensitive.username} fill className="object-cover" sizes="64px" unoptimized />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-bold">{sensitive.username}</h1>
            {sensitive.is_bluetick && <Shield className="size-4 text-blue-400" />}
            {sensitive.is_redtick && <Shield className="size-4 text-red-400" />}
            {sensitive.is_banned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                <Ban className="size-3" /> Banned
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{sensitive.name} · {sensitive.email}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{sensitive.id}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><User className="size-3 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="posts"><MessageSquare className="size-3 mr-1.5" />Posts</TabsTrigger>
          <TabsTrigger value="comments"><MessageCircle className="size-3 mr-1.5" />Comments</TabsTrigger>
          <TabsTrigger value="chats"><MessageSquare className="size-3 mr-1.5" />Chats</TabsTrigger>
          <TabsTrigger value="followers"><Users className="size-3 mr-1.5" />Followers</TabsTrigger>
          <TabsTrigger value="blocked"><UserX className="size-3 mr-1.5" />Blocked</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="size-3 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="transactions"><CreditCard className="size-3 mr-1.5" />Transactions</TabsTrigger>
          <TabsTrigger value="feedback"><FileText className="size-3 mr-1.5" />Feedback</TabsTrigger>
          <TabsTrigger value="adminnotes"><ClipboardList className="size-3 mr-1.5" />Admin Notes</TabsTrigger>
          <TabsTrigger value="map"><MapPin className="size-3 mr-1.5" />Locations Map</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab profile={profile} onRefresh={load} /></TabsContent>
        <TabsContent value="posts" className="mt-4"><PostsTab userId={id} /></TabsContent>
        <TabsContent value="comments" className="mt-4"><CommentsTab userId={id} /></TabsContent>
        <TabsContent value="chats" className="mt-4"><ChatsTab userId={id} /></TabsContent>
        <TabsContent value="followers" className="mt-4"><FollowersTab userId={id} /></TabsContent>
        <TabsContent value="blocked" className="mt-4"><BlockedTab userId={id} /></TabsContent>
        <TabsContent value="notifications" className="mt-4"><NotificationsTab userId={id} /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><UserTransactionsTab userId={id} /></TabsContent>
        <TabsContent value="feedback" className="mt-4"><FeedbackTab userId={id} /></TabsContent>
        <TabsContent value="adminnotes" className="mt-4"><AdminNotesTab userId={id} /></TabsContent>
        <TabsContent value="map" className="mt-4"><LocationsMapTab userId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
