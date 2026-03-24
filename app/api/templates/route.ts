import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/templates — list all templates
export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournament_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/templates — create template
export async function POST(request: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    type,
    tournament_name,
    description,
    categories,
    maptype,
    totalslots,
    entryfee,
    prizepool,
    image_url,
    prizedistribution,
    is_big_tournament,
    banner_url,
    moderators,
    support_contact,
    revive_allowed,
    per_kill,
  } = body;

  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });
  if (!tournament_name) return NextResponse.json({ error: "tournament_name is required" }, { status: 400 });
  if (!categories) return NextResponse.json({ error: "categories is required" }, { status: 400 });
  if (totalslots == null) return NextResponse.json({ error: "totalslots is required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournament_templates")
    .insert({
      type,
      tournament_name,
      description: description || null,
      categories,
      maptype: maptype || null,
      totalslots: Number(totalslots),
      entryfee: Number(entryfee ?? 0),
      prizepool: Number(prizepool ?? 0),
      image_url: image_url || null,
      prizedistribution: prizedistribution || null,
      is_big_tournament: !!is_big_tournament,
      banner_url: banner_url || null,
      moderators: moderators || null,
      support_contact: support_contact || null,
      revive_allowed: revive_allowed !== false,
      per_kill: Number(per_kill ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
