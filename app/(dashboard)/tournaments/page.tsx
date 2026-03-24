"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Loader2, Trophy, ChevronDown, ChevronUp,
  LayoutTemplate, PenLine, Lock, Unlock, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { Tournament, TournamentTemplate } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "BATTLE_ROYALE", label: "Battle Royale" },
  { value: "SURVIVAL",      label: "Survival" },
  { value: "LW LOST",       label: "LW Lost" },
  { value: "CLASH_SQUAD",   label: "Clash Squad" },
  { value: "LONE_WOLF",     label: "Lone Wolf" },
  { value: "CS/LW 1V1",    label: "CS/LW 1v1" },
  { value: "CS/LW 2V2",    label: "CS/LW 2v2" },
  { value: "CUSTOM_1V1",   label: "1v1 Custom" },
  { value: "CUSTOM_2V2",   label: "2v2 Custom" },
  { value: "ONLY_HEADSHOT",label: "Only Headshot" },
  { value: "CUSTOM_4V4",   label: "4v4 Custom" },
  { value: "GUN_PRO",      label: "GunPro" },
  { value: "ONLY_FIST",    label: "Only Fist" },
  { value: "FEATURED",     label: "Featured" },
  { value: "FREE",         label: "Free" },
];

const TYPE_OPTIONS: { value: "solo" | "duo" | "squad"; label: string }[] = [
  { value: "solo",  label: "Solo" },
  { value: "duo",   label: "Duo" },
  { value: "squad", label: "Squad" },
];

const EMPTY_FORM = {
  // From template / basic info
  tournament_name: "",
  type: "solo" as "solo" | "duo" | "squad",
  categories: "",
  description: "",
  maptype: "",
  totalslots: "100",
  entryfee: "0",
  prizepool: "0",
  per_kill: "0",
  image_url: "",
  banner_url: "",
  prizedistribution: "",
  is_big_tournament: false,
  moderators: "",
  support_contact: "",
  revive_allowed: true,
  // Tournament-specific fields
  tournament_datetime: "",
  roomid: "",
  roompass: "",
  stream_url: "",
  registration_allowed: true,
  organiser_name: "",
  organiser_contact: "",
  organiser_commission: "0",
};

type FormState = typeof EMPTY_FORM;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonbField(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  if (!t) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function toLocalDatetimeValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tournamentStatus(t: Tournament): "upcoming" | "ongoing" | "completed" {
  if (t.results_submitted) return "completed";
  const now = Date.now();
  const dt = new Date(t.tournament_datetime).getTime();
  return dt > now ? "upcoming" : "ongoing";
}

const statusColors: Record<string, string> = {
  upcoming:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ongoing:   "bg-green-500/15 text-green-400 border-green-500/30",
  completed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

// ─── Tournament Row ───────────────────────────────────────────────────────────

function TournamentRow({
  item, onEdit, onDelete,
}: { item: Tournament; onEdit: (t: Tournament) => void; onDelete: (t: Tournament) => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = tournamentStatus(item);
  const catLabel = CATEGORY_OPTIONS.find((c) => c.value === item.categories)?.label ?? item.categories;
  const filled = item.totalslots - item.slotsleft;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{item.tournament_name}</span>
            {item.is_big_tournament && <Badge className="text-[10px] py-0 px-1.5">Featured</Badge>}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusColors[status]} capitalize`}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">{item.type}</Badge>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{catLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(item.tournament_datetime).toLocaleString()} ·{" "}
              {filled}/{item.totalslots} slots · ₹{item.entryfee} entry · ₹{item.prizepool} prize
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
          {item.description && <div className="col-span-2"><span className="font-medium text-foreground">Description: </span>{item.description}</div>}
          {item.maptype && <div><span className="font-medium text-foreground">Map: </span>{item.maptype}</div>}
          <div><span className="font-medium text-foreground">Per Kill: </span>₹{item.per_kill}</div>
          <div><span className="font-medium text-foreground">Revive: </span>{item.revive_allowed ? "Yes" : "No"}</div>
          <div><span className="font-medium text-foreground">Registration: </span>{item.registration_allowed ? <Unlock className="inline size-3 text-green-400" /> : <Lock className="inline size-3 text-red-400" />} {item.registration_allowed ? "Open" : "Closed"}</div>
          <div><span className="font-medium text-foreground">Results: </span>{item.results_submitted ? "Submitted" : "Pending"}</div>
          {item.roomid && <div><span className="font-medium text-foreground">Room ID: </span>{item.roomid}</div>}
          {item.roompass && <div><span className="font-medium text-foreground">Room Pass: </span>{item.roompass}</div>}
          {item.stream_url && <div className="col-span-2 truncate"><span className="font-medium text-foreground">Stream: </span>{item.stream_url}</div>}
          {item.support_contact && <div><span className="font-medium text-foreground">Support: </span>{item.support_contact}</div>}
          {item.organiser_name && <div><span className="font-medium text-foreground">Organiser: </span>{item.organiser_name}</div>}
          {item.organiser_contact && <div><span className="font-medium text-foreground">Organiser Contact: </span>{item.organiser_contact}</div>}
          {Number(item.organiser_commission) > 0 && <div><span className="font-medium text-foreground">Commission: </span>₹{item.organiser_commission}</div>}
          {item.prizedistribution && (
            <div className="col-span-2"><span className="font-medium text-foreground">Prize Dist: </span><code className="text-xs">{JSON.stringify(item.prizedistribution)}</code></div>
          )}
          {item.moderators && (
            <div className="col-span-2"><span className="font-medium text-foreground">Moderators: </span><code className="text-xs">{JSON.stringify(item.moderators)}</code></div>
          )}
          <div className="col-span-2 text-[10px] text-muted-foreground/50 mt-1">ID: {item.id}</div>
        </div>
      )}
    </div>
  );
}

// ─── Form Section Wrapper ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">{title}</p>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Full({ children }: { children: React.ReactNode }) {
  return <div className="col-span-2">{children}</div>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [deleting, setDeleting] = useState<Tournament | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("__manual__");
  const [showRoomPass, setShowRoomPass] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to load tournaments");
      setItems(await res.json());
    } catch {
      setError("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d: TournamentTemplate[]) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchItems]);

  function setField(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    if (templateId === "__manual__") return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((prev) => ({
      ...prev,
      tournament_name: tpl.tournament_name,
      type: tpl.type,
      categories: tpl.categories,
      description: tpl.description ?? "",
      maptype: tpl.maptype ?? "",
      totalslots: String(tpl.totalslots),
      entryfee: String(tpl.entryfee),
      prizepool: String(tpl.prizepool),
      per_kill: String(tpl.per_kill),
      image_url: tpl.image_url ?? "",
      banner_url: tpl.banner_url ?? "",
      prizedistribution: tpl.prizedistribution ? JSON.stringify(tpl.prizedistribution, null, 2) : "",
      is_big_tournament: tpl.is_big_tournament,
      moderators: tpl.moderators ? JSON.stringify(tpl.moderators, null, 2) : "",
      support_contact: tpl.support_contact ?? "",
      revive_allowed: tpl.revive_allowed,
    }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedTemplateId("__manual__");
    setFormError("");
    setShowRoomPass(false);
    setDialogOpen(true);
  }

  function openEdit(item: Tournament) {
    setEditing(item);
    setSelectedTemplateId("__manual__");
    setForm({
      tournament_name: item.tournament_name,
      type: item.type,
      categories: item.categories,
      description: item.description ?? "",
      maptype: item.maptype ?? "",
      totalslots: String(item.totalslots),
      entryfee: String(item.entryfee),
      prizepool: String(item.prizepool),
      per_kill: String(item.per_kill),
      image_url: item.image_url ?? "",
      banner_url: item.banner_url ?? "",
      prizedistribution: item.prizedistribution ? JSON.stringify(item.prizedistribution, null, 2) : "",
      is_big_tournament: item.is_big_tournament,
      moderators: item.moderators ? JSON.stringify(item.moderators, null, 2) : "",
      support_contact: item.support_contact ?? "",
      revive_allowed: item.revive_allowed,
      tournament_datetime: toLocalDatetimeValue(item.tournament_datetime),
      roomid: item.roomid ?? "",
      roompass: item.roompass ?? "",
      stream_url: item.stream_url ?? "",
      registration_allowed: item.registration_allowed,
      organiser_name: item.organiser_name ?? "",
      organiser_contact: item.organiser_contact ?? "",
      organiser_commission: String(item.organiser_commission),
    });
    setFormError("");
    setShowRoomPass(false);
    setDialogOpen(true);
  }

  function openDelete(item: Tournament) {
    setDeleting(item);
    setDeleteDialogOpen(true);
  }

  function handleSave() {
    if (!form.tournament_name.trim()) { setFormError("Tournament name is required."); return; }
    if (!form.categories) { setFormError("Category is required."); return; }
    if (!form.tournament_datetime) { setFormError("Tournament date & time is required."); return; }
    if (!form.totalslots || Number(form.totalslots) <= 0) { setFormError("Total slots must be > 0."); return; }

    const prizedistribution = form.prizedistribution.trim() ? parseJsonbField(form.prizedistribution) : null;
    const moderators = form.moderators.trim() ? parseJsonbField(form.moderators) : null;
    if (form.prizedistribution.trim() && prizedistribution === null) { setFormError("Prize distribution must be valid JSON or empty."); return; }
    if (form.moderators.trim() && moderators === null) { setFormError("Moderators must be valid JSON or empty."); return; }

    setFormError("");
    startTransition(async () => {
      try {
        const url = editing ? `/api/tournaments/${editing.id}` : "/api/tournaments";
        const dtIso = new Date(form.tournament_datetime).toISOString();
        const slots = Number(form.totalslots);
        const res = await fetch(url, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournament_name: form.tournament_name.trim(),
            type: form.type,
            categories: form.categories,
            description: form.description.trim() || null,
            maptype: form.maptype.trim() || null,
            totalslots: slots,
            slotsleft: editing ? undefined : slots,
            tournament_datetime: dtIso,
            entryfee: Number(form.entryfee),
            prizepool: Number(form.prizepool),
            per_kill: Number(form.per_kill),
            image_url: form.image_url.trim() || null,
            banner_url: form.banner_url.trim() || null,
            prizedistribution,
            is_big_tournament: form.is_big_tournament,
            moderators,
            support_contact: form.support_contact.trim() || null,
            revive_allowed: form.revive_allowed,
            roomid: form.roomid.trim() || null,
            roompass: form.roompass.trim() || null,
            stream_url: form.stream_url.trim() || null,
            registration_allowed: form.registration_allowed,
            organiser_name: form.organiser_name.trim() || null,
            organiser_contact: form.organiser_contact.trim() || null,
            organiser_commission: Number(form.organiser_commission),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDialogOpen(false);
        fetchItems();
      } catch (e) {
        setFormError(String(e));
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tournaments/${deleting.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error("Delete failed");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchItems();
      } catch (e) {
        setError(String(e));
      }
    });
  }

  // ─── Group tournaments by status ──────────────────────────────────────────
  const upcoming  = items.filter((t) => tournamentStatus(t) === "upcoming");
  const ongoing   = items.filter((t) => tournamentStatus(t) === "ongoing");
  const completed = items.filter((t) => tournamentStatus(t) === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage all tournaments.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />New Tournament
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Trophy className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No tournaments yet</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Create the first one</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Ongoing",   count: ongoing.length,   color: "text-green-400" },
              { label: "Upcoming",  count: upcoming.length,  color: "text-blue-400" },
              { label: "Completed", count: completed.length, color: "text-zinc-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Ongoing */}
          {ongoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">Ongoing · {ongoing.length}</p>
              {ongoing.map((t) => <TournamentRow key={t.id} item={t} onEdit={openEdit} onDelete={openDelete} />)}
            </div>
          )}
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Upcoming · {upcoming.length}</p>
              {upcoming.map((t) => <TournamentRow key={t.id} item={t} onEdit={openEdit} onDelete={openDelete} />)}
            </div>
          )}
          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Completed · {completed.length}</p>
              {completed.map((t) => <TournamentRow key={t.id} item={t} onEdit={openEdit} onDelete={openDelete} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tournament" : "New Tournament"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update tournament details." : "Create a tournament manually or load a template to pre-fill fields."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-1">
            {/* Template Selector — only shown when creating */}
            {!editing && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Start from template</span>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">
                      <span className="flex items-center gap-2">
                        <PenLine className="size-3.5" />Create manually
                      </span>
                    </SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.tournament_name}
                        <span className="ml-2 text-xs text-muted-foreground capitalize">({tpl.type} · {tpl.categories})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId !== "__manual__" && (
                  <p className="text-xs text-green-400">
                    ✓ Template fields pre-filled. Fill in the schedule & room details below.
                  </p>
                )}
              </div>
            )}

            {/* ── Section 1: Basic Info ────────────────────────────────────── */}
            <Section title="Basic Info">
              <Full>
                <div className="space-y-1.5">
                  <Label>Tournament Name *</Label>
                  <Input value={form.tournament_name} onChange={(e) => setField("tournament_name", e.target.value)} placeholder="e.g. Solo Battle Royale #1" />
                </div>
              </Full>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.categories} onValueChange={(v) => setField("categories", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Map Type</Label>
                <Input value={form.maptype} onChange={(e) => setField("maptype", e.target.value)} placeholder="e.g. Bermuda, Kalahari…" />
              </div>
              <Full>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Short description…" />
                </div>
              </Full>
            </Section>

            {/* ── Section 2: Schedule & Slots ──────────────────────────────── */}
            <Section title="Schedule & Slots">
              <Full>
                <div className="space-y-1.5">
                  <Label>Date & Time *</Label>
                  <Input type="datetime-local" value={form.tournament_datetime} onChange={(e) => setField("tournament_datetime", e.target.value)} />
                </div>
              </Full>
              <div className="space-y-1.5">
                <Label>Total Slots *</Label>
                <Input type="number" min={1} value={form.totalslots} onChange={(e) => setField("totalslots", e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch id="registration_allowed" checked={form.registration_allowed} onCheckedChange={(v) => setField("registration_allowed", v)} />
                <Label htmlFor="registration_allowed" className="cursor-pointer">Registration Open</Label>
              </div>
            </Section>

            {/* ── Section 3: Financials ────────────────────────────────────── */}
            <Section title="Financials">
              <div className="space-y-1.5">
                <Label>Entry Fee (₹)</Label>
                <Input type="number" min={0} step="0.01" value={form.entryfee} onChange={(e) => setField("entryfee", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prize Pool (₹)</Label>
                <Input type="number" min={0} step="0.01" value={form.prizepool} onChange={(e) => setField("prizepool", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Per Kill (₹)</Label>
                <Input type="number" min={0} value={form.per_kill} onChange={(e) => setField("per_kill", e.target.value)} />
              </div>
              <Full>
                <div className="space-y-1.5">
                  <Label>Prize Distribution (JSON)</Label>
                  <Textarea rows={2} value={form.prizedistribution} onChange={(e) => setField("prizedistribution", e.target.value)} placeholder='{"1st": 500, "2nd": 200}' className="font-mono text-xs" />
                </div>
              </Full>
            </Section>

            {/* ── Section 4: Room Details ──────────────────────────────────── */}
            <Section title="Room Details">
              <div className="space-y-1.5">
                <Label>Room ID</Label>
                <Input value={form.roomid} onChange={(e) => setField("roomid", e.target.value)} placeholder="Room ID…" />
              </div>
              <div className="space-y-1.5">
                <Label>Room Password</Label>
                <div className="relative">
                  <Input
                    type={showRoomPass ? "text" : "password"}
                    value={form.roompass}
                    onChange={(e) => setField("roompass", e.target.value)}
                    placeholder="Password…"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowRoomPass((v) => !v)}
                  >
                    {showRoomPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
              <Full>
                <div className="space-y-1.5">
                  <Label>Stream URL</Label>
                  <Input value={form.stream_url} onChange={(e) => setField("stream_url", e.target.value)} placeholder="https://youtube.com/live/…" />
                </div>
              </Full>
            </Section>

            {/* ── Section 5: Media ─────────────────────────────────────────── */}
            <Section title="Media">
              <Full>
                <div className="space-y-1.5">
                  <Label>Image URL</Label>
                  <Input value={form.image_url} onChange={(e) => setField("image_url", e.target.value)} placeholder="https://…" />
                </div>
              </Full>
              <Full>
                <div className="space-y-1.5">
                  <Label>Banner URL</Label>
                  <Input value={form.banner_url} onChange={(e) => setField("banner_url", e.target.value)} placeholder="https://…" />
                </div>
              </Full>
            </Section>

            {/* ── Section 6: Settings ──────────────────────────────────────── */}
            <Section title="Settings">
              <div className="space-y-1.5">
                <Label>Support Contact</Label>
                <Input value={form.support_contact} onChange={(e) => setField("support_contact", e.target.value)} placeholder="@discord or phone…" />
              </div>
              <Full>
                <div className="space-y-1.5">
                  <Label>Moderators (JSON)</Label>
                  <Textarea rows={2} value={form.moderators} onChange={(e) => setField("moderators", e.target.value)} placeholder='[{"name":"Mod1","uid":"12345"}]' className="font-mono text-xs" />
                </div>
              </Full>
              <div className="flex items-center gap-3">
                <Switch id="is_big_tournament" checked={form.is_big_tournament} onCheckedChange={(v) => setField("is_big_tournament", v)} />
                <Label htmlFor="is_big_tournament" className="cursor-pointer">Featured / Big Tournament</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="revive_allowed" checked={form.revive_allowed} onCheckedChange={(v) => setField("revive_allowed", v)} />
                <Label htmlFor="revive_allowed" className="cursor-pointer">Revive Allowed</Label>
              </div>
            </Section>

            {/* ── Section 7: Organiser ─────────────────────────────────────── */}
            <Section title="Organiser (optional)">
              <div className="space-y-1.5">
                <Label>Organiser Name</Label>
                <Input value={form.organiser_name} onChange={(e) => setField("organiser_name", e.target.value)} placeholder="Name…" />
              </div>
              <div className="space-y-1.5">
                <Label>Organiser Contact</Label>
                <Input value={form.organiser_contact} onChange={(e) => setField("organiser_contact", e.target.value)} placeholder="Contact…" />
              </div>
              <div className="space-y-1.5">
                <Label>Commission (₹)</Label>
                <Input type="number" min={0} step="0.01" value={form.organiser_commission} onChange={(e) => setField("organiser_commission", e.target.value)} />
              </div>
            </Section>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleting?.tournament_name}</span>?
              This will also delete all participant and results data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
