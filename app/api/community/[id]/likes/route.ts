import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();

  const { data: likes, error } = await sb
    .from("community_likes")
    .select("user_id, created_at")
    .eq("message_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!likes || likes.length === 0) return NextResponse.json({ data: [] });

  const userIds = [...new Set(likes.map((l) => l.user_id))];
  const { data: users } = await sb
    .from("sensitive_userdata")
    .select("id, username, avatarurl")
    .in("id", userIds);

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
  const enriched = likes.map((l) => ({ ...l, user: userMap[l.user_id] ?? null }));

  return NextResponse.json({ data: enriched });
}
