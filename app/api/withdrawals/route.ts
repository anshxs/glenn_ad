import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/withdrawals?page=1&limit=50&status=
export async function GET(request: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50"));
  const status = url.searchParams.get("status") ?? "";
  const from = (page - 1) * limit;

  const sb = createAdminClient();
  let query = sb
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("transaction_type", "WITHDRAWAL")
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status) query = query.eq("payment_status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, limit });
}
