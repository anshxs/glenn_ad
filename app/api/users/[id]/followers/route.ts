import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const type = searchParams.get("type") ?? "followers"; // "followers" | "following"
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sb = createAdminClient();

  let query;
  if (type === "following") {
    query = sb
      .from("followers")
      .select("*", { count: "exact" })
      .eq("follower_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);
  } else {
    query = sb
      .from("followers")
      .select("*", { count: "exact" })
      .eq("following_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, limit, type });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { follower_id, following_id } = body;
  if (!follower_id || !following_id) {
    return NextResponse.json({ error: "follower_id and following_id required" }, { status: 400 });
  }

  // Prevent duplicate
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("followers")
    .insert({ follower_id, following_id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  void id;
  const { searchParams } = new URL(request.url);
  const follower_id = searchParams.get("follower_id");
  const following_id = searchParams.get("following_id");
  if (!follower_id || !following_id) {
    return NextResponse.json({ error: "follower_id and following_id query params required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("followers")
    .delete()
    .eq("follower_id", follower_id)
    .eq("following_id", following_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
