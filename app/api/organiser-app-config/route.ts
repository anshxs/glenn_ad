import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("organiser_app_config")
    .select("id, maintenance_mode, maintenance_message, minimum_version, download_url, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    data ?? {
      id: 1,
      maintenance_mode: false,
      maintenance_message: null,
      minimum_version: "1.0.0",
      download_url: null,
      updated_at: null,
    },
  );
}

export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { maintenance_mode, maintenance_message, minimum_version, download_url } =
    body;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (maintenance_mode !== undefined) {
    update.maintenance_mode = maintenance_mode;
  }
  if (maintenance_message !== undefined) {
    update.maintenance_message = maintenance_message || null;
  }
  if (minimum_version !== undefined) {
    update.minimum_version = String(minimum_version || "1.0.0").trim() || "1.0.0";
  }
  if (download_url !== undefined) {
    update.download_url = download_url || null;
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("organiser_app_config")
    .upsert(
      {
        id: 1,
        ...update,
      },
      { onConflict: "id" },
    )
    .select("id, maintenance_mode, maintenance_message, minimum_version, download_url, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
