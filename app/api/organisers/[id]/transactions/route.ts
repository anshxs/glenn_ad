import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const status = (url.searchParams.get("status") ?? "all").trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();
  const { data: organiser } = await sb
    .from("organisers")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!organiser) {
    return NextResponse.json({ data: [], count: 0, page, limit });
  }

  let query = sb
    .from("organiser_transactions")
    .select("*", { count: "exact" })
    .eq("organiser_id", organiser.user_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
}
