"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tournament } from "@/lib/supabase";

type TournamentResultRow = {
  id: string;
  tournament_id: string;
  host_id: string;
  host_remarks: string | null;
  results: unknown;
  created_at: string;
  updated_at: string;
};

type PayoutPreviewItem = {
  registrar_user_id: string;
  registrar_name: string;
  slot_number: number;
  team_name: string | null;
  rank: number;
  amount: number;
};

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

function shortId(id: string) {
  return id.slice(0, 8);
}

function fmtValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function TournamentResultsPage() {
  const [rows, setRows] = useState<Tournament[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedResult, setSelectedResult] = useState<TournamentResultRow | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [payoutPreview, setPayoutPreview] = useState<PayoutPreviewItem[]>([]);
  const [confirmVerifyOpen, setConfirmVerifyOpen] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/tournament-results?page=${page}&limit=${LIMIT}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to load tournament results");
      setLoading(false);
      return;
    }

    setRows((data.data ?? []) as Tournament[]);
    setTotal(data.count ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.ceil(total / LIMIT);

  const openTournamentDetails = async (item: Tournament) => {
    setSelectedTournament(item);
    setSelectedResult(null);
    setResultError("");
    setResultLoading(true);

    try {
      const res = await fetch(`/api/tournament-results/${item.id}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResultError(data.error ?? "Failed to load tournament result");
        return;
      }

      setSelectedResult((data.data ?? null) as TournamentResultRow | null);
      setPayoutPreview((data.payout_preview ?? []) as PayoutPreviewItem[]);
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResultLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedTournament) return;
    setVerifying(true);

    try {
      const res = await fetch(`/api/tournament-results/${selectedTournament.id}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Error: ${data.error ?? "Failed to verify"}`);
        return;
      }

      const data = await res.json().catch(() => ({}));

      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedTournament.id
            ? { ...r, result_verified: true, payout_status: "paid" }
            : r
        )
      );
      setSelectedTournament((prev) =>
        prev ? { ...prev, result_verified: true, payout_status: "paid" } : prev
      );
      setPayoutPreview((data.payout_preview ?? []) as PayoutPreviewItem[]);
      setConfirmVerifyOpen(false);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setVerifying(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournament Results</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Results submitted but not verified yet.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
        </Button>
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
          No pending tournament result verifications.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Tournament</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Slots</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Organiser</th>
                <th className="px-4 py-3 text-left font-medium">Results</th>
                <th className="px-4 py-3 text-left font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/60 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => openTournamentDetails(item)}
                >
                  <td className="px-4 py-3">{item.tournament_name}</td>
                  <td className="px-4 py-3 capitalize">{item.type}</td>
                  <td className="px-4 py-3">{item.categories}</td>
                  <td className="px-4 py-3 text-right">{item.totalslots - item.slotsleft}/{item.totalslots}</td>
                  <td className="px-4 py-3">{fmtDate(item.tournament_datetime)}</td>
                  <td className="px-4 py-3">{item.organiser_name || "-"}</td>
                  <td className="px-4 py-3">
                    {item.results_submitted ? (
                      <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                        submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-400">
                        pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.result_verified ? (
                      <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                        verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                        not verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} / {pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedTournament}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTournament(null);
            setSelectedResult(null);
            setResultError("");
            setResultLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTournament?.tournament_name}</DialogTitle>
            <DialogDescription>
              Tournament ID: {selectedTournament && shortId(selectedTournament.id)}
            </DialogDescription>
          </DialogHeader>

          {selectedTournament && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Tournament Table Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    ["id", selectedTournament.id],
                    ["tournament_name", selectedTournament.tournament_name],
                    ["description", selectedTournament.description],
                    ["categories", selectedTournament.categories],
                    ["type", selectedTournament.type],
                    ["maptype", selectedTournament.maptype],
                    ["totalslots", selectedTournament.totalslots],
                    ["slotsleft", selectedTournament.slotsleft],
                    ["tournament_datetime", fmtDate(selectedTournament.tournament_datetime)],
                    ["entryfee", selectedTournament.entryfee],
                    ["prizepool", selectedTournament.prizepool],
                    ["image_url", selectedTournament.image_url],
                    ["prizedistribution", selectedTournament.prizedistribution],
                    ["roomid", selectedTournament.roomid],
                    ["roompass", selectedTournament.roompass],
                    ["stream_url", selectedTournament.stream_url],
                    ["is_big_tournament", selectedTournament.is_big_tournament],
                    ["results_submitted", selectedTournament.results_submitted],
                    ["payout_status", selectedTournament.payout_status],
                    ["moderators", selectedTournament.moderators],
                    ["banner_url", selectedTournament.banner_url],
                    ["support_contact", selectedTournament.support_contact],
                    ["revive_allowed", selectedTournament.revive_allowed],
                    ["created_at", fmtDate(selectedTournament.created_at)],
                    ["updated_at", fmtDate(selectedTournament.updated_at)],
                    ["per_kill", selectedTournament.per_kill],
                    ["registration_allowed", selectedTournament.registration_allowed],
                    ["organiser_id", selectedTournament.organiser_id],
                    ["organiser_name", selectedTournament.organiser_name],
                    ["organiser_contact", selectedTournament.organiser_contact],
                    ["organiser_commission", selectedTournament.organiser_commission],
                    ["result_verified", selectedTournament.result_verified],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground break-all">{String(label)}</p>
                      {typeof value === "object" && value !== null ? (
                        <pre className="mt-1 text-xs whitespace-pre-wrap break-all">{fmtValue(value)}</pre>
                      ) : (
                        <p className="mt-1 font-medium break-all">{fmtValue(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Tournament Result (tournament_results)</h3>

                {resultLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading result...
                  </div>
                ) : resultError ? (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {resultError}
                  </div>
                ) : selectedResult ? (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">id</p>
                      <p className="mt-1 font-medium break-all">{selectedResult.id}</p>
                    </div>
                    <div className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">tournament_id</p>
                      <p className="mt-1 font-medium break-all">{selectedResult.tournament_id}</p>
                    </div>
                    <div className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">host_id</p>
                      <p className="mt-1 font-medium break-all">{selectedResult.host_id}</p>
                    </div>
                    <div className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">host_remarks</p>
                      <p className="mt-1 font-medium break-all">{fmtValue(selectedResult.host_remarks)}</p>
                    </div>
                    <div className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">results (jsonb)</p>
                      <pre className="mt-1 text-xs whitespace-pre-wrap break-all">{fmtValue(selectedResult.results)}</pre>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-md border border-border/50 p-2">
                        <p className="text-xs text-muted-foreground">created_at</p>
                        <p className="mt-1 font-medium break-all">{fmtDate(selectedResult.created_at)}</p>
                      </div>
                      <div className="rounded-md border border-border/50 p-2">
                        <p className="text-xs text-muted-foreground">updated_at</p>
                        <p className="mt-1 font-medium break-all">{fmtDate(selectedResult.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    No row found in tournament_results for this tournament.
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!selectedTournament.result_verified && selectedTournament.results_submitted && (
                <Button
                  onClick={() => setConfirmVerifyOpen(true)}
                  disabled={verifying}
                  className="w-full"
                  size="lg"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Result"
                  )}
                </Button>
              )}

              {selectedTournament.result_verified && (
                <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-400">
                  ✓ This tournament result has already been verified.
                </div>
              )}

              <Dialog open={confirmVerifyOpen} onOpenChange={setConfirmVerifyOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Verify Result and Credit Wallets</DialogTitle>
                    <DialogDescription>
                      Only registrar wallets will receive prize money after verification.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    {payoutPreview.length === 0 ? (
                      <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        No prize payouts will be credited for this tournament.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payoutPreview.map((item) => (
                          <div
                            key={`${item.registrar_user_id}-${item.rank}-${item.slot_number}`}
                            className="rounded-md border border-border/60 px-3 py-2 text-sm"
                          >
                            <div className="font-medium text-foreground">
                              {item.registrar_name}
                            </div>
                            <div className="text-muted-foreground text-xs mt-1">
                              Rank #{item.rank} • Slot {item.slot_number}
                              {item.team_name ? ` • ${item.team_name}` : ""}
                            </div>
                            <div className="text-green-400 font-semibold mt-1">
                              ₹{Number(item.amount).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmVerifyOpen(false)}
                        disabled={verifying}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleVerify} disabled={verifying}>
                        {verifying ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Confirm Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
