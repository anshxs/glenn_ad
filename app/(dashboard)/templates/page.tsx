"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Plus, Pencil, Trash2, Loader2, LayoutTemplate,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TournamentTemplate } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "BATTLE_ROYALE",  label: "Battle Royale" },
  { value: "SURVIVAL",       label: "Survival" },
  { value: "LW LOST",        label: "LW Lost" },
  { value: "CLASH_SQUAD",    label: "Clash Squad" },
  { value: "LONE_WOLF",      label: "Lone Wolf" },
  { value: "CS/LW 1V1",      label: "CS/LW 1v1" },
  { value: "CS/LW 2V2",      label: "CS/LW 2v2" },
  { value: "CUSTOM_1V1",     label: "1v1 Custom" },
  { value: "CUSTOM_2V2",     label: "2v2 Custom" },
  { value: "ONLY_HEADSHOT",  label: "Only Headshot" },
  { value: "CUSTOM_4V4",     label: "4v4 Custom" },
  { value: "GUN_PRO",        label: "GunPro" },
  { value: "ONLY_FIST",      label: "Only Fist" },
  { value: "FEATURED",       label: "Featured" },
  { value: "FREE",           label: "Free" },
];

const TYPE_OPTIONS: { value: "solo" | "duo" | "squad"; label: string }[] = [
  { value: "solo",  label: "Solo" },
  { value: "duo",   label: "Duo" },
  { value: "squad", label: "Squad" },
];

const EMPTY_FORM = {
  type: "solo" as "solo" | "duo" | "squad",
  tournament_name: "",
  description: "",
  categories: "",
  maptype: "",
  totalslots: "100",
  entryfee: "0",
  prizepool: "0",
  image_url: "",
  prizedistribution: "",
  is_big_tournament: false,
  banner_url: "",
  moderators: "",
  support_contact: "",
  revive_allowed: true,
  per_kill: "0",
};

type FormState = typeof EMPTY_FORM;

// ─── Helper: parse jsonb textarea ─────────────────────────────────────────────

function parseJsonbField(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// ─── Expanding row for template details ───────────────────────────────────────

function TemplateRow({
  item,
  onEdit,
  onDelete,
}: {
  item: TournamentTemplate;
  onEdit: (item: TournamentTemplate) => void;
  onDelete: (item: TournamentTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === item.categories)?.label ?? item.categories;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {item.tournament_name}
            </span>
            {item.is_big_tournament && (
              <Badge className="text-xs py-0 px-1.5">Featured</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs py-0 px-1.5 capitalize">{item.type}</Badge>
            <Badge variant="secondary" className="text-xs py-0 px-1.5">{categoryLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {item.totalslots} slots · ₹{item.entryfee} entry · ₹{item.prizepool} prize
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
          {item.description && (
            <div className="col-span-2">
              <span className="font-medium text-foreground">Description: </span>
              {item.description}
            </div>
          )}
          {item.maptype && (
            <div><span className="font-medium text-foreground">Map: </span>{item.maptype}</div>
          )}
          <div><span className="font-medium text-foreground">Per Kill: </span>₹{item.per_kill}</div>
          <div>
            <span className="font-medium text-foreground">Revive: </span>
            {item.revive_allowed ? "Allowed" : "Not allowed"}
          </div>
          {item.support_contact && (
            <div><span className="font-medium text-foreground">Support: </span>{item.support_contact}</div>
          )}
          {item.image_url && (
            <div className="col-span-2 truncate">
              <span className="font-medium text-foreground">Image URL: </span>{item.image_url}
            </div>
          )}
          {item.banner_url && (
            <div className="col-span-2 truncate">
              <span className="font-medium text-foreground">Banner URL: </span>{item.banner_url}
            </div>
          )}
          {item.prizedistribution && (
            <div className="col-span-2">
              <span className="font-medium text-foreground">Prize Distribution: </span>
              <code className="text-xs">{JSON.stringify(item.prizedistribution)}</code>
            </div>
          )}
          {item.moderators && (
            <div className="col-span-2">
              <span className="font-medium text-foreground">Moderators: </span>
              <code className="text-xs">{JSON.stringify(item.moderators)}</code>
            </div>
          )}
          <div className="col-span-2 text-[10px] text-muted-foreground/60 mt-1">
            ID: {item.id} · Created: {new Date(item.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [items, setItems] = useState<TournamentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TournamentTemplate | null>(null);
  const [deleting, setDeleting] = useState<TournamentTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(item: TournamentTemplate) {
    setEditing(item);
    setForm({
      type: item.type,
      tournament_name: item.tournament_name,
      description: item.description ?? "",
      categories: item.categories,
      maptype: item.maptype ?? "",
      totalslots: String(item.totalslots),
      entryfee: String(item.entryfee),
      prizepool: String(item.prizepool),
      image_url: item.image_url ?? "",
      prizedistribution: item.prizedistribution ? JSON.stringify(item.prizedistribution, null, 2) : "",
      is_big_tournament: item.is_big_tournament,
      banner_url: item.banner_url ?? "",
      moderators: item.moderators ? JSON.stringify(item.moderators, null, 2) : "",
      support_contact: item.support_contact ?? "",
      revive_allowed: item.revive_allowed,
      per_kill: String(item.per_kill),
    });
    setFormError("");
    setDialogOpen(true);
  }

  function openDelete(item: TournamentTemplate) {
    setDeleting(item);
    setDeleteDialogOpen(true);
  }

  function set(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.tournament_name.trim()) { setFormError("Tournament name is required."); return; }
    if (!form.categories) { setFormError("Category is required."); return; }
    if (!form.totalslots || Number(form.totalslots) <= 0) { setFormError("Total slots must be > 0."); return; }

    const prizedistribution = form.prizedistribution.trim()
      ? parseJsonbField(form.prizedistribution)
      : null;
    const moderators = form.moderators.trim()
      ? parseJsonbField(form.moderators)
      : null;

    if (form.prizedistribution.trim() && prizedistribution === null) {
      setFormError("Prize distribution must be valid JSON or empty.");
      return;
    }
    if (form.moderators.trim() && moderators === null) {
      setFormError("Moderators must be valid JSON or empty.");
      return;
    }

    setFormError("");
    startTransition(async () => {
      try {
        const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
        const res = await fetch(url, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: form.type,
            tournament_name: form.tournament_name.trim(),
            description: form.description.trim() || null,
            categories: form.categories,
            maptype: form.maptype.trim() || null,
            totalslots: Number(form.totalslots),
            entryfee: Number(form.entryfee),
            prizepool: Number(form.prizepool),
            image_url: form.image_url.trim() || null,
            prizedistribution,
            is_big_tournament: form.is_big_tournament,
            banner_url: form.banner_url.trim() || null,
            moderators,
            support_contact: form.support_contact.trim() || null,
            revive_allowed: form.revive_allowed,
            per_kill: Number(form.per_kill),
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
        const res = await fetch(`/api/templates/${deleting.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error("Delete failed");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchItems();
      } catch (e) {
        setError(String(e));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournament Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reusable templates for creating tournaments quickly.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          New Template
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <LayoutTemplate className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No templates yet</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {items.length} template{items.length !== 1 ? "s" : ""}
          </p>
          {items.map((item) => (
            <TemplateRow
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Tournament Template"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the template fields below." : "Fill in the fields to create a reusable tournament template."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Tournament Name */}
            <div className="col-span-2 space-y-1.5">
              <Label>Tournament Name *</Label>
              <Input
                value={form.tournament_name}
                onChange={(e) => set("tournament_name", e.target.value)}
                placeholder="e.g. Solo Battle Royale #1"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categories} onValueChange={(v) => set("categories", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Slots */}
            <div className="space-y-1.5">
              <Label>Total Slots *</Label>
              <Input
                type="number"
                min={1}
                value={form.totalslots}
                onChange={(e) => set("totalslots", e.target.value)}
              />
            </div>

            {/* Map Type */}
            <div className="space-y-1.5">
              <Label>Map Type</Label>
              <Input
                value={form.maptype}
                onChange={(e) => set("maptype", e.target.value)}
                placeholder="e.g. Bermuda, Kalahari…"
              />
            </div>

            {/* Entry Fee */}
            <div className="space-y-1.5">
              <Label>Entry Fee (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.entryfee}
                onChange={(e) => set("entryfee", e.target.value)}
              />
            </div>

            {/* Prize Pool */}
            <div className="space-y-1.5">
              <Label>Prize Pool (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.prizepool}
                onChange={(e) => set("prizepool", e.target.value)}
              />
            </div>

            {/* Per Kill */}
            <div className="space-y-1.5">
              <Label>Per Kill (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.per_kill}
                onChange={(e) => set("per_kill", e.target.value)}
              />
            </div>

            {/* Support Contact */}
            <div className="space-y-1.5">
              <Label>Support Contact</Label>
              <Input
                value={form.support_contact}
                onChange={(e) => set("support_contact", e.target.value)}
                placeholder="e.g. @discord or phone number"
              />
            </div>

            {/* Description */}
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Short description for this template…"
              />
            </div>

            {/* Image URL */}
            <div className="col-span-2 space-y-1.5">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                placeholder="https://…"
              />
            </div>

            {/* Banner URL */}
            <div className="col-span-2 space-y-1.5">
              <Label>Banner URL</Label>
              <Input
                value={form.banner_url}
                onChange={(e) => set("banner_url", e.target.value)}
                placeholder="https://…"
              />
            </div>

            {/* Prize Distribution */}
            <div className="col-span-2 space-y-1.5">
              <Label>Prize Distribution (JSON)</Label>
              <Textarea
                rows={3}
                value={form.prizedistribution}
                onChange={(e) => set("prizedistribution", e.target.value)}
                placeholder={'{"1st": 500, "2nd": 200, "3rd": 100}'}
                className="font-mono text-xs"
              />
            </div>

            {/* Moderators */}
            <div className="col-span-2 space-y-1.5">
              <Label>Moderators (JSON)</Label>
              <Textarea
                rows={2}
                value={form.moderators}
                onChange={(e) => set("moderators", e.target.value)}
                placeholder={'[{"name": "Mod1", "uid": "12345"}]'}
                className="font-mono text-xs"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-3">
              <Switch
                id="is_big_tournament"
                checked={form.is_big_tournament}
                onCheckedChange={(v) => set("is_big_tournament", v)}
              />
              <Label htmlFor="is_big_tournament" className="cursor-pointer">
                Featured / Big Tournament
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="revive_allowed"
                checked={form.revive_allowed}
                onCheckedChange={(v) => set("revive_allowed", v)}
              />
              <Label htmlFor="revive_allowed" className="cursor-pointer">
                Revive Allowed
              </Label>
            </div>
          </div>

          {formError && <p className="text-sm text-destructive mt-1">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleting?.tournament_name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
