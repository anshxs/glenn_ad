import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();

  // Fetch all comments for this message (both top-level and replies)
  const { data: allComments, error } = await sb
    .from("community_comments")
    .select("*")
    .eq("message_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!allComments || allComments.length === 0) return NextResponse.json({ data: [] });

  // Collect unique user IDs
  const userIds = [...new Set(allComments.map((c) => c.user_id))];
  const { data: users } = await sb
    .from("sensitive_userdata")
    .select("id, username, avatarurl")
    .in("id", userIds);
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  // Separate top-level and replies
  const topLevel = allComments.filter((c) => !c.parent_comment_id);
  const replies = allComments.filter((c) => !!c.parent_comment_id);

  // Nest replies under their parent
  const nest = topLevel.map((c) => ({
    ...c,
    author: userMap[c.user_id] ?? null,
    replies: replies
      .filter((r) => r.parent_comment_id === c.id)
      .map((r) => ({ ...r, author: userMap[r.user_id] ?? null })),
  }));

  return NextResponse.json({ data: nest });
}
