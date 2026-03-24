"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Settings2,
  Users,
  MessageSquare,
  FileText,
  Trophy,
  CreditCard,
  LogOut,
  Shield,
  Bell,
  Star,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Notify", href: "/notify", icon: Bell },
  { title: "Tournaments", href: "/tournaments", icon: Trophy },
  { title: "Templates", href: "/templates", icon: FileText },
  { title: "Announcements", href: "/announcements", icon: Megaphone },
  { title: "App Config", href: "/app_config", icon: Settings2 },
  { title: "Update App", href: "/update-app", icon: Smartphone },
  { title: "Community", href: "/community", icon: MessageSquare },
  { title: "Organiser Requests", href: "/organiser-requests", icon: FileText },
  { title: "Organisers", href: "/organisers", icon: Shield },
  { title: "Organiser Transactions", href: "/organiser-transactions", icon: CreditCard },
  { title: "Tournament Results", href: "/tournament-results", icon: Trophy },
  { title: "Users", href: "/users", icon: Users },
  { title: "Transactions", href: "/transactions", icon: CreditCard },
  { title: "Feedback", href: "/feedback", icon: Star },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingOrganiserRequests, setPendingOrganiserRequests] = useState(0);
  const [pendingOrganiserTransactions, setPendingOrganiserTransactions] = useState(0);
  const [pendingTournamentResults, setPendingTournamentResults] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    fetch("/api/withdrawals/pending-count")
      .then((r) => r.json())
      .then((d) => setPendingWithdrawals(d.count ?? 0))
      .catch(() => {});
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setFeedbackCount(d.count ?? 0))
      .catch(() => {});
    fetch("/api/organiser-requests/pending-count")
      .then((r) => r.json())
      .then((d) => setPendingOrganiserRequests(d.count ?? 0))
      .catch(() => {});
    fetch("/api/organiser-transactions/pending-count")
      .then((r) => r.json())
      .then((d) => setPendingOrganiserTransactions(d.count ?? 0))
      .catch(() => {});
    fetch("/api/tournament-results/pending-count")
      .then((r) => r.json())
      .then((d) => setPendingTournamentResults(d.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-foreground" />
          <span className="font-bold text-base tracking-tight text-foreground">
            Glenn Admin
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const showBadge = item.href === "/transactions" && pendingWithdrawals > 0;
                const requestBadge =
                  item.href === "/organiser-requests" && pendingOrganiserRequests > 0;
                const organiserTransactionsBadge =
                  item.href === "/organiser-transactions" && pendingOrganiserTransactions > 0;
                const tournamentResultsBadge =
                  item.href === "/tournament-results" && pendingTournamentResults > 0;
                const feedbackBadge = item.href === "/feedback" && feedbackCount > 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
                          <span className="ml-auto flex items-center justify-center min-w-5 h-4 rounded-full bg-red-500 text-black text-[10px] font-bold px-1.5">
                            {pendingWithdrawals > 99 ? "99+" : pendingWithdrawals}
                          </span>
                        )}
                        {requestBadge && (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-red-500 px-1.5 h-4 text-[10px] font-bold text-black">
                            <span className="size-1.5 rounded-full bg-black" />
                            {pendingOrganiserRequests > 99 ? "99+" : pendingOrganiserRequests}
                          </span>
                        )}
                        {organiserTransactionsBadge && (
                          <span className="ml-auto flex items-center justify-center min-w-5 h-4 rounded-full bg-red-500 text-black text-[10px] font-bold px-1.5">
                            {pendingOrganiserTransactions > 99 ? "99+" : pendingOrganiserTransactions}
                          </span>
                        )}
                        {tournamentResultsBadge && (
                          <span className="ml-auto flex items-center justify-center min-w-5 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold px-1.5">
                            {pendingTournamentResults > 99 ? "99+" : pendingTournamentResults}
                          </span>
                        )}
                        {feedbackBadge && (
                          <span className="ml-auto flex items-center justify-center min-w-5 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold px-1.5">
                            {feedbackCount > 999 ? "999+" : feedbackCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
