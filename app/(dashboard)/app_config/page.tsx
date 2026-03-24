"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save, AlertTriangle, Smartphone, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppConfig } from "@/lib/supabase";

export default function AppConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    maintenance_mode: false,
    maintenance_message: "",
    minimum_version: "1.0.0",
    download_url: "",
  });

  async function fetchConfig() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/app-config");
      if (!res.ok) throw new Error("Failed to load config");
      const data: AppConfig = await res.json();
      setConfig(data);
      setForm({
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message ?? "",
        minimum_version: data.minimum_version,
        download_url: data.download_url ?? "",
      });
    } catch {
      setError("Failed to load app config");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchConfig(); }, []);

  function handleSave() {
    setSuccess(false);
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/app-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maintenance_mode: form.maintenance_mode,
            maintenance_message: form.maintenance_message || null,
            minimum_version: form.minimum_version,
            download_url: form.download_url || null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: AppConfig = await res.json();
        setConfig(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Config</h1>
          <p className="text-muted-foreground text-sm mt-1">Global configuration for the mobile app.</p>
        </div>
        {config?.updated_at && (
          <p className="text-xs text-muted-foreground shrink-0 pt-1">
            Last updated {new Date(config.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-500">✓ Config saved successfully</p>}

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <CardTitle className="text-base">Maintenance Mode</CardTitle>
            </div>
            {form.maintenance_mode && (
              <Badge variant="destructive" className="text-xs">ACTIVE</Badge>
            )}
          </div>
          <CardDescription>
            When enabled, users will see a maintenance screen and cannot use the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.maintenance_mode}
              onCheckedChange={(v) => setForm((f) => ({ ...f, maintenance_mode: v }))}
              id="maintenance-toggle"
            />
            <Label htmlFor="maintenance-toggle" className="font-normal">
              {form.maintenance_mode ? "Maintenance mode is ON" : "Maintenance mode is OFF"}
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label>Maintenance message</Label>
            <Textarea
              placeholder="We're down for scheduled maintenance. Back soon!"
              value={form.maintenance_message}
              onChange={(e) => setForm((f) => ({ ...f, maintenance_message: e.target.value }))}
              rows={2}
              disabled={!form.maintenance_mode}
            />
            <p className="text-xs text-muted-foreground">Shown to users when maintenance mode is active.</p>
          </div>
        </CardContent>
      </Card>

      {/* Versioning */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Version Control</CardTitle>
          </div>
          <CardDescription>Force users on older versions to update.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Minimum required version *</Label>
            <Input
              placeholder="1.0.0"
              value={form.minimum_version}
              onChange={(e) => setForm((f) => ({ ...f, minimum_version: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Users with app versions below this will be prompted to update.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download URL */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Download URL</CardTitle>
          </div>
          <CardDescription>Link shown to users who need to update the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Download / Store URL</Label>
            <Input
              placeholder="https://play.google.com/store/apps/… or https://apps.apple.com/…"
              value={form.download_url}
              onChange={(e) => setForm((f) => ({ ...f, download_url: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isPending || !form.minimum_version}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Config
        </Button>
      </div>
    </div>
  );
}
