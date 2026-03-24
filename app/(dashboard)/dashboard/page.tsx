"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlignLeft,
  BadgeCheck,
  Bell,
  CreditCard,
  FileWarning,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardStats = {
  users: {
    total: number;
    addedToday: number;
    onlineNow: number;
    banned: number;
  };
  community: {
    totalPosts: number;
    postsToday: number;
  };
  tournaments: {
    total: number;
    upcoming: number;
    registrationOpen: number;
    big: number;
    resultsSubmitted: number;
    pendingVerification: number;
    verified: number;
  };
  organisers: {
    total: number;
    pendingRequests: number;
    pendingTransactions: number;
  };
  finance: {
    pendingWithdrawals: number;
  };
  feedback: {
    total: number;
  };
  textAnnouncements: { total: number; live: number };
  imageAnnouncements: { total: number; live: number };
  generatedAt: string;
};

type LegacyDashboardStats = {
  totalUsers?: number;
  usersAddedToday?: number;
  totalCommunityPosts?: number;
  textAnnouncements?: { total?: number; live?: number };
  imageAnnouncements?: { total?: number; live?: number };
  generatedAt?: string;
};

function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStats(raw: DashboardStats | LegacyDashboardStats): DashboardStats {
  const legacy = raw as LegacyDashboardStats;
  const grouped = raw as Partial<DashboardStats>;

  return {
    users: {
      total: grouped.users?.total ?? legacy.totalUsers ?? 0,
      addedToday: grouped.users?.addedToday ?? legacy.usersAddedToday ?? 0,
      onlineNow: grouped.users?.onlineNow ?? 0,
      banned: grouped.users?.banned ?? 0,
    },
    community: {
      totalPosts: grouped.community?.totalPosts ?? legacy.totalCommunityPosts ?? 0,
      postsToday: grouped.community?.postsToday ?? 0,
    },
    tournaments: {
      total: grouped.tournaments?.total ?? 0,
      upcoming: grouped.tournaments?.upcoming ?? 0,
      registrationOpen: grouped.tournaments?.registrationOpen ?? 0,
      big: grouped.tournaments?.big ?? 0,
      resultsSubmitted: grouped.tournaments?.resultsSubmitted ?? 0,
      pendingVerification: grouped.tournaments?.pendingVerification ?? 0,
      verified: grouped.tournaments?.verified ?? 0,
    },
    organisers: {
      total: grouped.organisers?.total ?? 0,
      pendingRequests: grouped.organisers?.pendingRequests ?? 0,
      pendingTransactions: grouped.organisers?.pendingTransactions ?? 0,
    },
    finance: {
      pendingWithdrawals: grouped.finance?.pendingWithdrawals ?? 0,
    },
    feedback: {
      total: grouped.feedback?.total ?? 0,
    },
    textAnnouncements: {
      total: grouped.textAnnouncements?.total ?? legacy.textAnnouncements?.total ?? 0,
      live: grouped.textAnnouncements?.live ?? legacy.textAnnouncements?.live ?? 0,
    },
    imageAnnouncements: {
      total: grouped.imageAnnouncements?.total ?? legacy.imageAnnouncements?.total ?? 0,
      live: grouped.imageAnnouncements?.live ?? legacy.imageAnnouncements?.live ?? 0,
    },
    generatedAt: grouped.generatedAt ?? legacy.generatedAt ?? new Date().toISOString(),
  };
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="text-3xl">{fmtNumber(value)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to load dashboard stats");
        return;
      }

      setStats(normalizeStats(data as DashboardStats | LegacyDashboardStats));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Live platform stats and announcement shortcuts.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Users"
              value={stats.users.total}
              description="All registered users till now"
              icon={<Users className="size-4" />}
            />
            <StatCard
              title="Users Added Today"
              value={stats.users.addedToday}
              description="New users created since 00:00"
              icon={<UserPlus className="size-4" />}
            />
            <StatCard
              title="Users Online Now"
              value={stats.users.onlineNow}
              description="Current online users"
              icon={<UserCheck className="size-4" />}
            />
            <StatCard
              title="Banned Users"
              value={stats.users.banned}
              description="Users currently banned"
              icon={<Shield className="size-4" />}
            />
            <StatCard
              title="Community Posts"
              value={stats.community.totalPosts}
              description="Total posts in community_messages"
              icon={<MessageSquare className="size-4" />}
            />
            <StatCard
              title="Posts Added Today"
              value={stats.community.postsToday}
              description="Community posts created today"
              icon={<MessageSquare className="size-4" />}
            />
            <StatCard
              title="Total Tournaments"
              value={stats.tournaments.total}
              description="All tournaments"
              icon={<Trophy className="size-4" />}
            />
            <StatCard
              title="Upcoming Tournaments"
              value={stats.tournaments.upcoming}
              description="Tournaments with future datetime"
              icon={<Trophy className="size-4" />}
            />
            <StatCard
              title="Open Registrations"
              value={stats.tournaments.registrationOpen}
              description="Tournaments allowing registration"
              icon={<BadgeCheck className="size-4" />}
            />
            <StatCard
              title="Big Tournaments"
              value={stats.tournaments.big}
              description="Marked as big tournaments"
              icon={<Trophy className="size-4" />}
            />
            <StatCard
              title="Results Submitted"
              value={stats.tournaments.resultsSubmitted}
              description="Tournaments with submitted results"
              icon={<BadgeCheck className="size-4" />}
            />
            <StatCard
              title="Pending Result Verification"
              value={stats.tournaments.pendingVerification}
              description="Submitted but not verified"
              icon={<FileWarning className="size-4" />}
            />
            <StatCard
              title="Verified Results"
              value={stats.tournaments.verified}
              description="Result-verified tournaments"
              icon={<BadgeCheck className="size-4" />}
            />
            <StatCard
              title="Total Organisers"
              value={stats.organisers.total}
              description="Organisers onboarded"
              icon={<Shield className="size-4" />}
            />
            <StatCard
              title="Pending Organiser Requests"
              value={stats.organisers.pendingRequests}
              description="New organiser approvals pending"
              icon={<FileWarning className="size-4" />}
            />
            <StatCard
              title="Pending Organiser Transactions"
              value={stats.organisers.pendingTransactions}
              description="Organiser transactions awaiting action"
              icon={<CreditCard className="size-4" />}
            />
            <StatCard
              title="Pending Withdrawals"
              value={stats.finance.pendingWithdrawals}
              description="Withdrawal requests pending"
              icon={<CreditCard className="size-4" />}
            />
            <StatCard
              title="Total Feedback"
              value={stats.feedback.total}
              description="Items in user feedback"
              icon={<Bell className="size-4" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2"><AlignLeft className="size-4" />Small Announcements (Text)</CardDescription>
                <CardTitle className="text-2xl">{fmtNumber(stats.textAnnouncements.total)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Live: {fmtNumber(stats.textAnnouncements.live)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/announcements?tab=text">Manage Text</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/announcements?tab=text">Add Text Announcement</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/notify">Send Push Notification</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2"><ImageIcon className="size-4" />Announcements With Image</CardDescription>
                <CardTitle className="text-2xl">{fmtNumber(stats.imageAnnouncements.total)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Live: {fmtNumber(stats.imageAnnouncements.live)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/announcements?tab=image">Manage Image Announcements</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/announcements?tab=image">Add Announcement With Image</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/community">Open Community Moderation</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/tournament-results">Review Pending Results</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/organiser-requests">Review Organiser Requests</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/organiser-transactions">Review Organiser Transactions</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/transactions">Review Withdrawals</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Last updated: {fmtDateTime(stats.generatedAt)}</p>
        </>
      ) : null}
    </div>
  );
}
