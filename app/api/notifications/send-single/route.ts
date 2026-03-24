import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const ONESIGNAL_API = "https://onesignal.com/api/v1/notifications";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    player_id, title, body: msgBody,
    url, large_icon, big_picture, small_icon,
    android_channel_id, collapse_id, priority,
    ios_badge_count, data,
  } = body as Record<string, unknown>;

  if (!player_id || typeof player_id !== "string") {
    return NextResponse.json({ error: "player_id is required" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!msgBody || typeof msgBody !== "string" || !msgBody.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_player_ids: [player_id],
    headings: { en: title.trim() },
    contents: { en: (msgBody as string).trim() },
  };

  if (url && typeof url === "string" && url.trim()) payload.url = url.trim();
  if (large_icon && typeof large_icon === "string" && large_icon.trim()) payload.large_icon = large_icon.trim();
  if (big_picture && typeof big_picture === "string" && big_picture.trim()) payload.big_picture = big_picture.trim();
  if (small_icon && typeof small_icon === "string" && small_icon.trim()) payload.small_icon = small_icon.trim();
  if (android_channel_id && typeof android_channel_id === "string" && android_channel_id.trim()) payload.android_channel_id = android_channel_id.trim();
  if (collapse_id && typeof collapse_id === "string" && collapse_id.trim()) payload.collapse_id = collapse_id.trim();
  if (priority != null) payload.priority = Number(priority) || 10;
  if (ios_badge_count != null) {
    payload.ios_badgeType = "SetTo";
    payload.ios_badgeCount = Number(ios_badge_count);
  }
  if (data && typeof data === "object") payload.data = data;

  const res = await fetch(ONESIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const d = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = Array.isArray(d.errors) ? (d.errors as string[])[0] : (d.errors ?? "OneSignal error");
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }

  return NextResponse.json({ id: d.id, recipients: d.recipients });
}
