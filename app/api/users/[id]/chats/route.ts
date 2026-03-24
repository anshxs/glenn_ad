import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const type = searchParams.get("type") ?? "sent"; // "sent" | "received"
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();
  const col = type === "received" ? "receiver_id" : "sender_id";

  const { data, error, count } = await sb
    .from("directmsgs")
    .select("*", { count: "exact" })
    .eq(col, id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, limit, type });
}
