import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

// PATCH /api/withdrawals/[id] — update status, reference, redeem_code
export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { payment_status, payment_reference, redeem_code } = body;

  const validStatuses = ["pending", "verified", "completed", "failed", "refunded", "cancelled"];
  if (payment_status && !validStatuses.includes(payment_status)) {
    return NextResponse.json({ error: "Invalid payment_status" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payment_status !== undefined) update.payment_status = payment_status;
  if (payment_reference !== undefined) update.payment_reference = payment_reference || null;
  if (redeem_code !== undefined) update.redeem_code = redeem_code || null;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("transactions")
    .update(update)
    .eq("id", id)
    .eq("transaction_type", "WITHDRAWAL") // safety guard
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
