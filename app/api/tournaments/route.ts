import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/tournaments — list all tournaments, ordered by datetime desc
export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .order("tournament_datetime", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tournaments — create a new tournament
export async function POST(request: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    tournament_name,
    type,
    categories,
    description,
    maptype,
    totalslots,
    slotsleft,
    tournament_datetime,
    entryfee,
    prizepool,
    per_kill,
    image_url,
    banner_url,
    prizedistribution,
    is_big_tournament,
    moderators,
    support_contact,
    revive_allowed,
    roomid,
    roompass,
    stream_url,
    registration_allowed,
    organiser_id,
    organiser_name,
    organiser_contact,
    organiser_commission,
    result_verified,
  } = body;

  if (!tournament_name) return NextResponse.json({ error: "tournament_name is required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });
  if (!categories) return NextResponse.json({ error: "categories is required" }, { status: 400 });
  if (!tournament_datetime) return NextResponse.json({ error: "tournament_datetime is required" }, { status: 400 });
  if (totalslots == null) return NextResponse.json({ error: "totalslots is required" }, { status: 400 });

  const slots = Number(totalslots);
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournaments")
    .insert({
      tournament_name,
      type,
      categories,
      description: description || null,
      maptype: maptype || null,
      totalslots: slots,
      slotsleft: slotsleft != null ? Number(slotsleft) : slots,
      tournament_datetime,
      entryfee: Number(entryfee ?? 0),
      prizepool: Number(prizepool ?? 0),
      per_kill: Number(per_kill ?? 0),
      image_url: image_url || null,
      banner_url: banner_url || null,
      prizedistribution: prizedistribution || null,
      is_big_tournament: !!is_big_tournament,
      moderators: moderators || null,
      support_contact: support_contact || null,
      revive_allowed: revive_allowed !== false,
      roomid: roomid || null,
      roompass: roompass || null,
      stream_url: stream_url || null,
      registration_allowed: registration_allowed !== false,
      organiser_id: organiser_id || null,
      organiser_name: organiser_name || null,
      organiser_contact: organiser_contact || null,
      organiser_commission: Number(organiser_commission ?? 0),
      results_submitted: false,
      result_verified: !!result_verified,
      payout_status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
