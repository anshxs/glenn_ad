"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OrganiserAppConfig } from "@/lib/supabase";

export default function UpdateAppPage() {
  const [config, setConfig] = useState<OrganiserAppConfig | null>(null);
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
      const res = await fetch("/api/organiser-app-config");
      if (!res.ok) {
        throw new Error("Failed to load organiser app config");
      }

      const data: OrganiserAppConfig = await res.json();
      setConfig(data);
      setForm({
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message ?? "",
        minimum_version: data.minimum_version ?? "1.0.0",
        download_url: data.download_url ?? "",
      });
    } catch {
      setError("Failed to load organiser app config");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfig();
  }, []);

  function handleSave() {
    setSuccess(false);
    setError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/organiser-app-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maintenance_mode: form.maintenance_mode,
            maintenance_message: form.maintenance_message || null,
            minimum_version: form.minimum_version.trim() || "1.0.0",
            download_url: form.download_url || null,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const updated: OrganiserAppConfig = await res.json();
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
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Update App</h1>
        </div>
        {config?.updated_at && (
          <p className="pt-1 text-xs text-muted-foreground">
            Last updated {new Date(config.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-500">✓ Organiser app config saved successfully</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-sky-500" />
            <CardTitle className="text-base">Organiser Updater Settings</CardTitle>
          </div>
          <CardDescription>
            These values stay in organiser config storage and can be changed from admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch
              id="organiser-maintenance"
              checked={form.maintenance_mode}
              onCheckedChange={(value) =>
                setForm((current) => ({ ...current, maintenance_mode: value }))
              }
            />
            <Label htmlFor="organiser-maintenance" className="font-normal">
              {form.maintenance_mode ? "Maintenance mode is ON" : "Maintenance mode is OFF"}
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Maintenance message</Label>
            <Textarea
              rows={2}
              value={form.maintenance_message}
              disabled={!form.maintenance_mode}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  maintenance_message: e.target.value,
                }))
              }
              placeholder="Organiser app is under maintenance. Please try again soon."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Direct APK URL</Label>
            <Input
              value={form.download_url}
              onChange={(e) =>
                setForm((current) => ({ ...current, download_url: e.target.value }))
              }
              placeholder="https://your-domain.com/downloads/glenn-organiser-latest.apk"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Minimum version label</Label>
            <Input
              value={form.minimum_version}
              onChange={(e) =>
                setForm((current) => ({ ...current, minimum_version: e.target.value }))
              }
              placeholder="1.0.0"
            />
            <p className="text-xs text-muted-foreground">
              Optional display value only. Real forced update is controlled by the backend build hash.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Organiser Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
