import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 });

  const sb = createAdminClient();
  const { count, error } = await sb
    .from("organiser_transactions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: count ?? 0 });
}
