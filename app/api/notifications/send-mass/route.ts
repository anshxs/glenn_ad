import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const ONESIGNAL_API = "https://onesignal.com/api/v1/notifications";
const BATCH_SIZE = 2000;

type Filters = {
  earnings_min?: number;
  earnings_max?: number;
  is_online?: boolean;
  is_bluetick?: boolean;
  is_redtick?: boolean;
  is_banned?: boolean;
  joined_after?: string;
  joined_before?: string;
  has_ffuid?: boolean;
  rank_max?: number;
  winrate_min?: number;
  notifications_enabled?: boolean;
};

type NotifPayload = {
  title: string;
  body: string;
  url?: string;
  large_icon?: string;
  big_picture?: string;
  small_icon?: string;
  android_channel_id?: string;
  collapse_id?: string;
  priority?: number;
  ios_badge_count?: number;
  data?: Record<string, unknown>;
};

async function buildPlayerIds(filters: Filters): Promise<{ playerIds: string[]; totalMatched: number }> {
  const sb = createAdminClient();

  // Build the sensitive_userdata query
  let query = sb.from("sensitive_userdata").select("id");

  if (filters.earnings_min != null) query = query.gte("earnings", filters.earnings_min);
  if (filters.earnings_max != null) query = query.lte("earnings", filters.earnings_max);
  if (filters.is_online != null) query = query.eq("isonline", filters.is_online);
  if (filters.is_bluetick != null) query = query.eq("is_bluetick", filters.is_bluetick);
  if (filters.is_redtick != null) query = query.eq("is_redtick", filters.is_redtick);
  if (filters.is_banned != null) query = query.eq("is_banned", filters.is_banned);
  if (filters.joined_after) query = query.gte("created_at", filters.joined_after);
  if (filters.joined_before) query = query.lte("created_at", filters.joined_before);
  if (filters.has_ffuid === true) query = query.not("ffuid", "is", null);
  if (filters.has_ffuid === false) query = query.is("ffuid", null);
  if (filters.rank_max != null) query = query.lte("rank", filters.rank_max);
  if (filters.winrate_min != null) query = query.gte("winrate", filters.winrate_min);

  const { data: users, error } = await query;
  if (error || !users) return { playerIds: [], totalMatched: 0 };

  const userIds = users.map((u: { id: string }) => u.id);
  if (userIds.length === 0) return { playerIds: [], totalMatched: 0 };

  // Fetch notification settings for matched users
  let notifQuery = sb
    .from("notifications")
    .select("onesignal_player_id")
    .in("user_id", userIds)
    .not("onesignal_player_id", "is", null);

  if (filters.notifications_enabled != null) {
    notifQuery = notifQuery.eq("is_notifications_enabled", filters.notifications_enabled);
  }

  const { data: notifs, error: notifErr } = await notifQuery;
  if (notifErr || !notifs) return { playerIds: [], totalMatched: userIds.length };

  const playerIds = notifs
    .map((n: { onesignal_player_id: string | null }) => n.onesignal_player_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  return { playerIds, totalMatched: userIds.length };
}

async function sendBatch(playerIds: string[], notif: NotifPayload): Promise<{ id: string; recipients: number }> {
  const payload: Record<string, unknown> = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: notif.title.trim() },
    contents: { en: notif.body.trim() },
  };

  if (notif.url?.trim()) payload.url = notif.url.trim();
  if (notif.large_icon?.trim()) payload.large_icon = notif.large_icon.trim();
  if (notif.big_picture?.trim()) payload.big_picture = notif.big_picture.trim();
  if (notif.small_icon?.trim()) payload.small_icon = notif.small_icon.trim();
  if (notif.android_channel_id?.trim()) payload.android_channel_id = notif.android_channel_id.trim();
  if (notif.collapse_id?.trim()) payload.collapse_id = notif.collapse_id.trim();
  if (notif.priority != null) payload.priority = Number(notif.priority) || 10;
  if (notif.ios_badge_count != null) {
    payload.ios_badgeType = "SetTo";
    payload.ios_badgeCount = Number(notif.ios_badge_count);
  }
  if (notif.data && typeof notif.data === "object") payload.data = notif.data;

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
    const errMsg = Array.isArray(d.errors) ? (d.errors as string[])[0] : String(d.errors ?? "OneSignal error");
    throw new Error(errMsg);
  }

  return { id: String(d.id ?? ""), recipients: Number(d.recipients ?? playerIds.length) };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    // Preview mode: just return count without sending
    preview_only,
    // Filters
    filters = {},
    // Notification content
    title, body: msgBody, url, large_icon, big_picture, small_icon,
    android_channel_id, collapse_id, priority, ios_badge_count, data,
  } = body as {
    preview_only?: boolean;
    filters?: Filters;
    title?: string;
    body?: string;
    url?: string;
    large_icon?: string;
    big_picture?: string;
    small_icon?: string;
    android_channel_id?: string;
    collapse_id?: string;
    priority?: number;
    ios_badge_count?: number;
    data?: Record<string, unknown>;
  };

  const { playerIds, totalMatched } = await buildPlayerIds(filters as Filters);

  if (preview_only) {
    return NextResponse.json({ total_matched: totalMatched, has_player_id: playerIds.length });
  }

  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!msgBody?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });

  if (playerIds.length === 0) {
    return NextResponse.json({ sent: 0, skipped: totalMatched, batches: 0 });
  }

  const notif: NotifPayload = {
    title: title.trim(),
    body: msgBody.trim(),
    url, large_icon, big_picture, small_icon,
    android_channel_id, collapse_id,
    priority: priority != null ? Number(priority) : undefined,
    ios_badge_count: ios_badge_count != null ? Number(ios_badge_count) : undefined,
    data,
  };

  // Split into batches of BATCH_SIZE
  const batches: string[][] = [];
  for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
    batches.push(playerIds.slice(i, i + BATCH_SIZE));
  }

  let totalRecipients = 0;
  const batchResults: Array<{ id: string; recipients: number }> = [];

  for (const batch of batches) {
    try {
      const result = await sendBatch(batch, notif);
      totalRecipients += result.recipients;
      batchResults.push(result);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Batch send failed", sent: totalRecipients, batches: batchResults.length },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    sent: totalRecipients,
    skipped: totalMatched - playerIds.length,
    batches: batches.length,
    batch_ids: batchResults.map(b => b.id),
  });
}
