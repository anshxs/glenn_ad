"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Organiser } from "@/lib/supabase";

type ColumnKey =
  | "name"
  | "glenn_id"
  | "user_id"
  | "contact_number"
  | "alternate_contact_number"
  | "hosted_count"
  | "balance"
  | "organiser_commission"
  | "onesignal_player_id"
  | "created_at"
  | "updated_at";

type ColumnMeta = {
  key: ColumnKey;
  label: string;
};

const ALL_COLUMNS: ColumnMeta[] = [
  { key: "name", label: "Name" },
  { key: "glenn_id", label: "Glenn ID" },
  { key: "user_id", label: "User ID" },
  { key: "contact_number", label: "Contact" },
  { key: "alternate_contact_number", label: "Alt Contact" },
  { key: "hosted_count", label: "Hosted" },
  { key: "balance", label: "Balance" },
  { key: "organiser_commission", label: "Commission %" },
  { key: "onesignal_player_id", label: "OneSignal" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

const DEFAULT_COLUMNS: ColumnKey[] = [
  "name",
  "glenn_id",
  "contact_number",
  "hosted_count",
  "balance",
  "organiser_commission",
  "updated_at",
];

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...`;
}

function renderCell(row: Organiser, key: ColumnKey) {
  switch (key) {
    case "name":
      return row.name;
    case "glenn_id":
      return row.glenn_id;
    case "user_id":
      return <span className="font-mono text-xs">{shortId(row.user_id)}</span>;
    case "contact_number":
      return row.contact_number;
    case "alternate_contact_number":
      return row.alternate_contact_number || "-";
    case "hosted_count":
      return row.hosted_count;
    case "balance":
      return `Rs ${Number(row.balance ?? 0).toFixed(2)}`;
    case "organiser_commission":
      return `${Number(row.organiser_commission ?? 0).toFixed(2)}%`;
    case "onesignal_player_id":
      return row.onesignal_player_id ? (
        <span className="font-mono text-xs">{shortId(row.onesignal_player_id)}</span>
      ) : (
        "-"
      );
    case "created_at":
      return fmtDate(row.created_at);
    case "updated_at":
      return fmtDate(row.updated_at);
    default:
      return "-";
  }
}

export default function OrganisersPage() {
  const [rows, setRows] = useState<Organiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const query = search.trim();
    const url = query
      ? `/api/organisers?search=${encodeURIComponent(query)}`
      : "/api/organisers";

    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Failed to load organisers");
      setLoading(false);
      return;
    }

    setRows((json.data ?? []) as Organiser[]);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleMeta = useMemo(
    () => ALL_COLUMNS.filter((item) => visibleColumns.includes(item.key)),
    [visibleColumns]
  );

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Table view with selectable columns. Click a row to open full organiser details.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              className="h-8 w-64 pl-8 text-xs"
              placeholder="Search by name, glenn id, contact, user id"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button size="sm" variant="secondary" type="submit">Apply</Button>
          {search && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setColumnsOpen((v) => !v)}
            className="h-8"
          >
            <Settings2 className="size-3.5" />
            Columns ({visibleColumns.length})
          </Button>

          {columnsOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-3 shadow-md">
              <p className="text-xs font-medium text-muted-foreground mb-2">Show/Hide Columns</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {ALL_COLUMNS.map((column) => (
                  <label key={column.key} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          No organisers found.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                {visibleMeta.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                  {visibleMeta.map((column) => (
                    <td key={column.key} className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/organisers/${row.id}`} className="block hover:underline">
                        {renderCell(row, column.key)}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
