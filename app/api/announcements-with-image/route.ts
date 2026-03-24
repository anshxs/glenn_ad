import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/announcements-with-image — list all
export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("announcements_with_image")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/announcements-with-image — create
export async function POST(request: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message, image_url, onclick, display } = body;
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
  if (!image_url) return NextResponse.json({ error: "image_url is required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("announcements_with_image")
    .insert({ message, image_url, onclick: onclick || null, display: !!display })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
