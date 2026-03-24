import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();

  const [sensitive, pub, wallet, notifSettings] = await Promise.all([
    sb.from("sensitive_userdata").select("*").eq("id", id).single(),
    sb.from("public_userdata").select("*").eq("id", id).single(),
    sb.from("wallets").select("*").eq("user_id", id).single(),
    sb.from("notifications").select("*").eq("user_id", id).single(),
  ]);

  if (sensitive.error) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    sensitive: sensitive.data,
    public: pub.data ?? null,
    wallet: wallet.data ?? null,
    notifSettings: notifSettings.data ?? null,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // All admin-editable fields
  const allowed = [
    "is_banned", "ban_reason", "banned_until", "is_bluetick", "is_redtick",
    "rank", "earnings", "name", "ffuid", "ffname", "yturl", "instaurl", "bio",
    "kills", "death", "winrate", "followercount", "followingcount",
    "tournmentsplayed", "tournamentswon", "ff_creation_date", "ff_level",
    "otherurls", "squad",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data, error } = await sb.from("sensitive_userdata").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
