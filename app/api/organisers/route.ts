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
  const search = (url.searchParams.get("search") ?? "").trim();

  const sb = createAdminClient();
  let query = sb
    .from("organisers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(500);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,glenn_id.ilike.%${search}%,contact_number.ilike.%${search}%,address.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}
