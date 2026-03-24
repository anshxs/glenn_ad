import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const status = (url.searchParams.get("status") ?? "pending").trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();

  let query = sb
    .from("organiser_transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const organiserIds = [...new Set(rows.map((item) => item.organiser_id).filter(Boolean))];

  let organiserMap: Record<string, { id: string; name: string; glenn_id: string; user_id: string }> = {};
  if (organiserIds.length > 0) {
    const { data: organisers } = await sb
      .from("organisers")
      .select("id, name, glenn_id, user_id")
      .in("user_id", organiserIds);

    organiserMap = Object.fromEntries(
      (organisers ?? []).map((item) => [item.user_id, item])
    );
  }

  const enriched = rows.map((item) => ({
    ...item,
    organiser: organiserMap[item.organiser_id] ?? null,
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0, page, limit, status: status || "all" });
}
