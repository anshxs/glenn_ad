import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; otherId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, otherId } = await params;
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("directmsgs")
    .select("*")
    .or(
      `and(sender_id.eq.${id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${id})`
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
