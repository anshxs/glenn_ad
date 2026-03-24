import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// GET /api/dashboard/stats
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();

  const [
    totalUsersRes,
    usersAddedTodayRes,
    onlineUsersRes,
    bannedUsersRes,
    totalCommunityPostsRes,
    communityPostsTodayRes,
    totalTournamentsRes,
    upcomingTournamentsRes,
    openRegistrationTournamentsRes,
    bigTournamentsRes,
    resultsSubmittedRes,
    pendingResultVerificationRes,
    verifiedResultsRes,
    totalOrganisersRes,
    pendingOrganiserRequestsRes,
    pendingOrganiserTransactionsRes,
    pendingWithdrawalsRes,
    totalFeedbackRes,
    totalTextAnnouncementsRes,
    liveTextAnnouncementsRes,
    totalImageAnnouncementsRes,
    liveImageAnnouncementsRes,
  ] = await Promise.all([
    sb.from("sensitive_userdata").select("id", { count: "exact", head: true }),
    sb
      .from("sensitive_userdata")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    sb.from("sensitive_userdata").select("id", { count: "exact", head: true }).eq("isonline", true),
    sb.from("sensitive_userdata").select("id", { count: "exact", head: true }).eq("is_banned", true),
    sb.from("community_messages").select("id", { count: "exact", head: true }),
    sb
      .from("community_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    sb.from("tournaments").select("id", { count: "exact", head: true }),
    sb.from("tournaments").select("id", { count: "exact", head: true }).gte("tournament_datetime", nowIso),
    sb.from("tournaments").select("id", { count: "exact", head: true }).eq("registration_allowed", true),
    sb.from("tournaments").select("id", { count: "exact", head: true }).eq("is_big_tournament", true),
    sb.from("tournaments").select("id", { count: "exact", head: true }).eq("results_submitted", true),
    sb
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("results_submitted", true)
      .eq("result_verified", false),
    sb.from("tournaments").select("id", { count: "exact", head: true }).eq("result_verified", true),
    sb.from("organisers").select("id", { count: "exact", head: true }),
    sb.from("organiser_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("organiser_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("transaction_type", "WITHDRAWAL")
      .eq("payment_status", "pending"),
    sb.from("user_feedback").select("id", { count: "exact", head: true }),
    sb.from("announcements").select("id", { count: "exact", head: true }),
    sb.from("announcements").select("id", { count: "exact", head: true }).eq("display", true),
    sb.from("announcements_with_image").select("id", { count: "exact", head: true }),
    sb.from("announcements_with_image").select("id", { count: "exact", head: true }).eq("display", true),
  ]);

  const firstError = [
    totalUsersRes.error,
    usersAddedTodayRes.error,
    onlineUsersRes.error,
    bannedUsersRes.error,
    totalCommunityPostsRes.error,
    communityPostsTodayRes.error,
    totalTournamentsRes.error,
    upcomingTournamentsRes.error,
    openRegistrationTournamentsRes.error,
    bigTournamentsRes.error,
    resultsSubmittedRes.error,
    pendingResultVerificationRes.error,
    verifiedResultsRes.error,
    totalOrganisersRes.error,
    pendingOrganiserRequestsRes.error,
    pendingOrganiserTransactionsRes.error,
    pendingWithdrawalsRes.error,
    totalFeedbackRes.error,
    totalTextAnnouncementsRes.error,
    liveTextAnnouncementsRes.error,
    totalImageAnnouncementsRes.error,
    liveImageAnnouncementsRes.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    users: {
      total: totalUsersRes.count ?? 0,
      addedToday: usersAddedTodayRes.count ?? 0,
      onlineNow: onlineUsersRes.count ?? 0,
      banned: bannedUsersRes.count ?? 0,
    },
    community: {
      totalPosts: totalCommunityPostsRes.count ?? 0,
      postsToday: communityPostsTodayRes.count ?? 0,
    },
    tournaments: {
      total: totalTournamentsRes.count ?? 0,
      upcoming: upcomingTournamentsRes.count ?? 0,
      registrationOpen: openRegistrationTournamentsRes.count ?? 0,
      big: bigTournamentsRes.count ?? 0,
      resultsSubmitted: resultsSubmittedRes.count ?? 0,
      pendingVerification: pendingResultVerificationRes.count ?? 0,
      verified: verifiedResultsRes.count ?? 0,
    },
    organisers: {
      total: totalOrganisersRes.count ?? 0,
      pendingRequests: pendingOrganiserRequestsRes.count ?? 0,
      pendingTransactions: pendingOrganiserTransactionsRes.count ?? 0,
    },
    finance: {
      pendingWithdrawals: pendingWithdrawalsRes.count ?? 0,
    },
    feedback: {
      total: totalFeedbackRes.count ?? 0,
    },
    textAnnouncements: {
      total: totalTextAnnouncementsRes.count ?? 0,
      live: liveTextAnnouncementsRes.count ?? 0,
    },
    imageAnnouncements: {
      total: totalImageAnnouncementsRes.count ?? 0,
      live: liveImageAnnouncementsRes.count ?? 0,
    },
    generatedAt: new Date().toISOString(),
  });
}
