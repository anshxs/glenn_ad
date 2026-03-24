import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

// PATCH /api/templates/[id] — update template
export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "type", "tournament_name", "description", "categories", "maptype",
    "totalslots", "entryfee", "prizepool", "image_url", "prizedistribution",
    "is_big_tournament", "banner_url", "moderators", "support_contact",
    "revive_allowed", "per_kill",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (["entryfee", "prizepool", "totalslots", "per_kill"].includes(key)) {
        update[key] = Number(body[key]);
      } else if (["description", "maptype", "image_url", "banner_url", "support_contact"].includes(key)) {
        update[key] = body[key] || null;
      } else {
        update[key] = body[key];
      }
    }
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tournament_templates")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/templates/[id] — delete template
export async function DELETE(_: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();
  const { error } = await sb.from("tournament_templates").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
