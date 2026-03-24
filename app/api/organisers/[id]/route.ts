import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = createAdminClient();

  const { data: organiser, error } = await sb
    .from("organisers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !organiser) {
    return NextResponse.json({ error: error?.message ?? "Organiser not found" }, { status: 404 });
  }

  const { data: user } = await sb
    .from("sensitive_userdata")
    .select("id, username, email, avatarurl, is_banned, is_bluetick, is_redtick, isonline")
    .eq("id", organiser.user_id)
    .maybeSingle();

  return NextResponse.json({ organiser, user: user ?? null });
}
