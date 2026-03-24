"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronLeft, ChevronRight, Shield, Ban, Wifi, WifiOff, Verified } from "lucide-react";
import type { SensitiveUserdata } from "@/lib/supabase";

type UserRow = Pick<
  SensitiveUserdata,
  "id" | "username" | "email" | "name" | "avatarurl" | "is_banned" | "is_bluetick" | "is_redtick" | "isonline" | "created_at" | "rank" | "earnings" | "followercount" | "followingcount"
>;

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (query) params.set("search", query);
    const res = await fetch(`/api/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total} registered users
        </p>
      </div>

      {/* search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <Input
          placeholder="Search username, email, name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
        <Button type="submit" size="sm" variant="secondary">
          <Search className="size-4" />
        </Button>
      </form>

      {/* list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No users found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Followers</th>
                <th className="px-4 py-3 text-right font-medium">Earnings</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                      <div className="relative size-9 rounded-full overflow-hidden bg-muted shrink-0">
                        {u.avatarurl ? (
                          <Image src={u.avatarurl} alt={u.username} fill className="object-cover" sizes="36px" unoptimized />
                        ) : (
                          <div className="size-full flex items-center justify-center text-xs text-muted-foreground">{u.username[0]?.toUpperCase()}</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium group-hover:text-foreground text-sm">{u.username}</span>
                          {u.is_bluetick && <Verified className="size-3 text-blue-400" />}
                          {u.is_redtick && <Verified className="size-3 text-red-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                          <Ban className="size-3" /> Banned
                        </span>
                      ) : u.isonline ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
                          <Wifi className="size-3" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          <WifiOff className="size-3" /> Offline
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{u.followercount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs">₹{u.earnings?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

