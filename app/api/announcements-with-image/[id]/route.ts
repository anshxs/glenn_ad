import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

// PATCH /api/announcements-with-image/[id] — update
export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { message, image_url, onclick, display } = body;

  const update: Record<string, unknown> = {};
  if (message !== undefined) update.message = message;
  if (image_url !== undefined) update.image_url = image_url;
  if (onclick !== undefined) update.onclick = onclick || null;
  if (display !== undefined) update.display = display;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("announcements_with_image")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/announcements-with-image/[id] — delete
export async function DELETE(_: Request, { params }: Params) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();
  const { error } = await sb
    .from("announcements_with_image")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
