import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();

  // Get all messages where this user is sender or receiver
  const [sent, received] = await Promise.all([
    sb.from("directmsgs").select("receiver_id, text, created_at").eq("sender_id", id).order("created_at", { ascending: false }),
    sb.from("directmsgs").select("sender_id, text, created_at").eq("receiver_id", id).order("created_at", { ascending: false }),
  ]);

  // Build map of partnerId → last message & time
  const partnerMap = new Map<string, { lastMsg: string; lastTime: string }>();

  for (const m of sent.data ?? []) {
    const pid = m.receiver_id;
    if (!partnerMap.has(pid) || m.created_at > (partnerMap.get(pid)?.lastTime ?? "")) {
      partnerMap.set(pid, { lastMsg: m.text ?? "", lastTime: m.created_at ?? "" });
    }
  }
  for (const m of received.data ?? []) {
    const pid = m.sender_id;
    if (!partnerMap.has(pid) || m.created_at > (partnerMap.get(pid)?.lastTime ?? "")) {
      partnerMap.set(pid, { lastMsg: m.text ?? "", lastTime: m.created_at ?? "" });
    }
  }

  if (partnerMap.size === 0) return NextResponse.json({ data: [] });

  const partnerIds = [...partnerMap.keys()];
  const { data: users } = await sb
    .from("sensitive_userdata")
    .select("id, username, avatarurl")
    .in("id", partnerIds);

  const result = (users ?? []).map((u) => ({
    ...u,
    lastMsg: partnerMap.get(u.id)?.lastMsg ?? "",
    lastTime: partnerMap.get(u.id)?.lastTime ?? "",
  })).sort((a, b) => (b.lastTime > a.lastTime ? 1 : -1));

  return NextResponse.json({ data: result });
}
