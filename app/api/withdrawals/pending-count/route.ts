import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// GET /api/withdrawals/pending-count — used by sidebar badge
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 });

  const sb = createAdminClient();
  const { count, error } = await sb
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("transaction_type", "WITHDRAWAL")
    .eq("payment_status", "pending");

  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: count ?? 0 });
}
