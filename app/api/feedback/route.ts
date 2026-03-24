import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const category = searchParams.get("category") ?? "";
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();

  // Build filtered query — no join since user_feedback FK points to auth.users, not sensitive_userdata
  let query = sb
    .from("user_feedback")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data: rows, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user info separately for the returned rows
  const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))];
  let userMap: Record<string, { id: string; username: string; avatarurl: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await sb
      .from("sensitive_userdata")
      .select("id, username, avatarurl, email")
      .in("id", userIds);
    for (const u of users ?? []) userMap[u.id] = u;
  }

  const data = (rows ?? []).map((r) => ({ ...r, user: userMap[r.user_id] ?? null }));

  // Category counts (separate query, no range filter)
  const { data: allCats } = await sb
    .from("user_feedback")
    .select("category");

  const category_counts: Record<string, number> = {};
  for (const row of allCats ?? []) {
    const cat = row.category as string;
    category_counts[cat] = (category_counts[cat] ?? 0) + 1;
  }

  return NextResponse.json({ data, count, page, limit, category_counts });
}
