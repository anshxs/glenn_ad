import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();
  const { data, error, count } = await sb
    .from("community_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch author info for each message
  if (data && data.length > 0) {
    const ids = [...new Set(data.map((m) => m.user_id))];
    const { data: users } = await sb
      .from("sensitive_userdata")
      .select("id, username, avatarurl")
      .in("id", ids);
    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    const enriched = data.map((m) => ({ ...m, author: userMap[m.user_id] ?? null }));
    return NextResponse.json({ data: enriched, count, page, limit });
  }

  return NextResponse.json({ data: data ?? [], count, page, limit });
}
