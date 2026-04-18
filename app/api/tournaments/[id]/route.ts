import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

async function syncPendingOrganiserCommission(
  sb: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  tournamentName: string,
  organiserCommission: unknown
) {
  const amount = Number(organiserCommission ?? 0);
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;

  return sb
    .from("organiser_transactions")
    .update({
      amount: normalizedAmount,
      description: `Pending hosting commission for tournament: ${tournamentName}`,
    })
    .eq("tournament_id", tournamentId)
    .eq("type", "commission")
    .eq("status", "pending");
}

// GET /api/tournaments/[id] — get single tournament
export async function GET(_: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/tournaments/[id] — update tournament
export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const stringFields = ["tournament_name", "type", "categories", "description", "maptype",
    "image_url", "banner_url", "support_contact", "roomid", "roompass", "stream_url",
    "payout_status", "organiser_id", "organiser_name", "organiser_contact", "tournament_datetime"];
  const numericFields = ["totalslots", "slotsleft", "entryfee", "prizepool", "per_kill", "organiser_commission"];
  const boolFields = ["is_big_tournament", "revive_allowed", "registration_allowed", "results_submitted", "result_verified"];
  const nullableStrings = ["description", "maptype", "image_url", "banner_url", "support_contact",
    "roomid", "roompass", "stream_url", "organiser_id", "organiser_name", "organiser_contact"];
  const jsonbFields = ["prizedistribution", "moderators"];

  const update: Record<string, unknown> = {};
  for (const key of stringFields) {
    if (body[key] !== undefined) {
      update[key] = nullableStrings.includes(key) ? (body[key] || null) : body[key];
    }
  }
  for (const key of numericFields) {
    if (body[key] !== undefined) update[key] = Number(body[key]);
  }
  for (const key of boolFields) {
    if (body[key] !== undefined) update[key] = !!body[key];
  }
  for (const key of jsonbFields) {
    if (body[key] !== undefined) update[key] = body[key] || null;
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournaments")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: syncError } = await syncPendingOrganiserCommission(
    sb,
    id,
    String(data.tournament_name ?? ""),
    data.organiser_commission
  );

  if (syncError) {
    return NextResponse.json({ error: syncError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/tournaments/[id] — delete tournament
export async function DELETE(_: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();
  const { error } = await sb.from("tournaments").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
