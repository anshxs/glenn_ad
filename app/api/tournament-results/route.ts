import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/tournament-results?page=1&limit=20
// Returns tournaments with results_submitted=true and result_verified=false
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();
  const { data, error, count } = await sb
    .from("tournaments")
    .select("*", { count: "exact" })
    .eq("results_submitted", true)
    .eq("result_verified", false)
    .order("tournament_datetime", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
}
