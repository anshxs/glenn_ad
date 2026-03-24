"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Announcement, AnnouncementWithImage } from "@/lib/supabase";

// ─── Text Announcements ───────────────────────────────────────────────────────

function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ message: "", onclick: "", display: false });

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch {
      setError("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ message: "", onclick: "", display: false });
    setDialogOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({ message: item.message, onclick: item.onclick ?? "", display: item.display });
    setDialogOpen(true);
  }

  function openDelete(item: Announcement) {
    setDeleting(item);
    setDeleteDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const url = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
        const res = await fetch(url, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: form.message, onclick: form.onclick || null, display: form.display }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDialogOpen(false);
        fetchItems();
      } catch (e) { setError(String(e)); }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/announcements/${deleting.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error("Delete failed");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchItems();
      } catch (e) { setError(String(e)); }
    });
  }

  async function toggleDisplay(item: Announcement) {
    await fetch(`/api/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display: !item.display }),
    });
    fetchItems();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} announcement{items.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate}><Plus className="size-4" />Add Announcement</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <AlignLeft className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No announcements yet</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Create one</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-foreground leading-snug">{item.message}</p>
                {item.onclick && <p className="text-xs text-muted-foreground truncate">→ {item.onclick}</p>}
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch checked={item.display} onCheckedChange={() => toggleDisplay(item)} aria-label="Toggle display" />
                  {item.display
                    ? <Badge className="text-xs py-0 px-1.5">Live</Badge>
                    : <Badge variant="secondary" className="text-xs py-0 px-1.5">Hidden</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openDelete(item)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
            <DialogDescription>{editing ? "Update the announcement." : "Create a new text announcement."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea placeholder="Enter message…" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>On-click URL / action</Label>
              <Input placeholder="https://… or deep link (optional)" value={form.onclick} onChange={(e) => setForm((f) => ({ ...f, onclick: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.display} onCheckedChange={(v) => setForm((f) => ({ ...f, display: v }))} id="disp1" />
              <Label htmlFor="disp1">Show to users immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.message}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>This will permanently delete the announcement. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Image Announcements ──────────────────────────────────────────────────────

function AnnouncementsWithImageTab() {
  const [items, setItems] = useState<AnnouncementWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementWithImage | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementWithImage | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ message: "", image_url: "", onclick: "", display: false });

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/announcements-with-image");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch {
      setError("Failed to load image announcements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ message: "", image_url: "", onclick: "", display: false });
    setDialogOpen(true);
  }

  function openEdit(item: AnnouncementWithImage) {
    setEditing(item);
    setForm({ message: item.message, image_url: item.image_url, onclick: item.onclick ?? "", display: item.display });
    setDialogOpen(true);
  }

  function openDelete(item: AnnouncementWithImage) {
    setDeleting(item);
    setDeleteDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const url = editing ? `/api/announcements-with-image/${editing.id}` : "/api/announcements-with-image";
        const res = await fetch(url, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: form.message, image_url: form.image_url, onclick: form.onclick || null, display: form.display }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDialogOpen(false);
        fetchItems();
      } catch (e) { setError(String(e)); }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/announcements-with-image/${deleting.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error("Delete failed");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchItems();
      } catch (e) { setError(String(e)); }
    });
  }

  async function toggleDisplay(item: AnnouncementWithImage) {
    await fetch(`/api/announcements-with-image/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display: !item.display }),
    });
    fetchItems();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} announcement{items.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate}><Plus className="size-4" />Add with Image</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No image announcements yet</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Create one</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-lg border border-border bg-card px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image_url} alt="" className="h-14 w-20 rounded-md object-cover border border-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-foreground leading-snug">{item.message}</p>
                {item.onclick && <p className="text-xs text-muted-foreground truncate">→ {item.onclick}</p>}
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch checked={item.display} onCheckedChange={() => toggleDisplay(item)} aria-label="Toggle display" />
                  {item.display
                    ? <Badge className="text-xs py-0 px-1.5">Live</Badge>
                    : <Badge variant="secondary" className="text-xs py-0 px-1.5">Hidden</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openDelete(item)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Image Announcement" : "New Image Announcement"}</DialogTitle>
            <DialogDescription>{editing ? "Update the announcement." : "Create an announcement with an image."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea placeholder="Enter message…" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL *</Label>
              <Input placeholder="https://…" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
              {form.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-full rounded-md object-cover border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>On-click URL / action</Label>
              <Input placeholder="https://… or deep link (optional)" value={form.onclick} onChange={(e) => setForm((f) => ({ ...f, onclick: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.display} onCheckedChange={(v) => setForm((f) => ({ ...f, display: v }))} id="disp2" />
              <Label htmlFor="disp2">Show to users immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.message || !form.image_url}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>This will permanently delete the announcement. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "image" ? "image" : "text";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(searchParams.get("tab") === "image" ? "image" : "text");
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage announcements shown to users in the app.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="text"><AlignLeft className="size-3.5 mr-1.5" />Text</TabsTrigger>
          <TabsTrigger value="image"><ImageIcon className="size-3.5 mr-1.5" />With Image</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-4"><AnnouncementsTab /></TabsContent>
        <TabsContent value="image" className="mt-4"><AnnouncementsWithImageTab /></TabsContent>
      </Tabs>
    </div>
  );
}
