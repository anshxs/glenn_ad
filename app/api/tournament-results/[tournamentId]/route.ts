import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ tournamentId: string }> };

type TeamResult = {
  rank?: number;
  slot_number?: number;
  team_name?: string | null;
};

type PayoutPreviewItem = {
  registrar_user_id: string;
  registrar_name: string;
  slot_number: number;
  team_name: string | null;
  rank: number;
  amount: number;
};

function parsePrizeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function buildPayoutPreview(args: {
  results: unknown;
  prizeDistribution: Record<string, unknown> | null | undefined;
  participantRows: Array<{ participant_id: string; slot_number: number | null; team_name: string | null }>;
  registrarNameById?: Map<string, string>;
}) {
  const { results, prizeDistribution, participantRows, registrarNameById } = args;
  const preview: PayoutPreviewItem[] = [];

  const teams = Array.isArray((results as { teams?: unknown } | null)?.teams)
    ? (((results as { teams?: unknown }).teams as unknown[]) ?? [])
    : [];

  const participantBySlot = new Map<number, { participant_id: string; team_name: string | null }>();
  for (const row of participantRows) {
    const slot = Number(row.slot_number ?? 0);
    if (!slot || participantBySlot.has(slot)) continue;
    participantBySlot.set(slot, {
      participant_id: String(row.participant_id),
      team_name: row.team_name ?? null,
    });
  }

  for (const rawTeam of teams) {
    if (!rawTeam || typeof rawTeam !== "object") continue;
    const team = rawTeam as TeamResult;
    const rank = Number(team.rank ?? 0);
    const slotNumber = Number(team.slot_number ?? 0);
    if (!rank || !slotNumber) continue;

    const amount = parsePrizeAmount(prizeDistribution?.[String(rank)]);
    if (amount <= 0) continue;

    const registrar = participantBySlot.get(slotNumber);
    if (!registrar?.participant_id) continue;

    preview.push({
      registrar_user_id: registrar.participant_id,
      registrar_name:
        registrarNameById?.get(registrar.participant_id) ||
        registrar.team_name ||
        registrar.participant_id,
      slot_number: slotNumber,
      team_name: team.team_name ?? registrar.team_name ?? null,
      rank,
      amount,
    });
  }

  return preview;
}

// GET /api/tournament-results/[tournamentId]
// Returns tournament result record by tournament_id
export async function GET(_: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tournamentId } = await params;
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("tournament_results")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ data: null, payout_preview: [] });
  }

  const [{ data: tournament }, { data: participantRows }] = await Promise.all([
    sb
      .from("tournaments")
      .select("prizedistribution")
      .eq("id", tournamentId)
      .maybeSingle(),
    sb
      .from("tournament_participants")
      .select("participant_id, slot_number, team_name")
      .eq("tournament_id", tournamentId)
      .order("slot_number", { ascending: true }),
  ]);

  const registrarIds = ((participantRows ?? []) as Array<{ participant_id: string }>)
    .map((row) => row.participant_id)
    .filter(Boolean);

  let registrarNameById = new Map<string, string>();
  if (registrarIds.length > 0) {
    const { data: users } = await sb
      .from("sensitive_userdata")
      .select("id, name, username, ffname")
      .in("id", registrarIds);

    registrarNameById = new Map(
      ((users ?? []) as Array<{ id: string; name?: string | null; username?: string | null; ffname?: string | null }>).map((user) => [
        user.id,
        user.ffname || user.name || user.username || user.id,
      ])
    );
  }

  const payoutPreview = buildPayoutPreview({
    results: data.results,
    prizeDistribution: (tournament?.prizedistribution as Record<string, unknown> | null | undefined) ?? null,
    participantRows:
      (participantRows as Array<{ participant_id: string; slot_number: number | null; team_name: string | null }> | null) ?? [],
    registrarNameById,
  });

  return NextResponse.json({ data, payout_preview: payoutPreview });
}

// POST /api/tournament-results/[tournamentId]
// Verify result + credit only registrar wallets according to prize distribution
export async function POST(_: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tournamentId } = await params;
  const sb = createAdminClient();

  const [{ data: tournament, error: tournamentError }, { data: resultRow, error: resultError }] =
    await Promise.all([
      sb
        .from("tournaments")
        .select("id, tournament_name, prizedistribution, result_verified, results_submitted, payout_status")
        .eq("id", tournamentId)
        .maybeSingle(),
      sb
        .from("tournament_results")
        .select("*")
        .eq("tournament_id", tournamentId)
        .maybeSingle(),
    ]);

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: tournamentError?.message ?? "Tournament not found" }, { status: 404 });
  }

  if (resultError || !resultRow) {
    return NextResponse.json({ error: resultError?.message ?? "Tournament result not found" }, { status: 404 });
  }

  if (!tournament.results_submitted) {
    return NextResponse.json({ error: "Results have not been submitted yet" }, { status: 400 });
  }

  if (tournament.result_verified) {
    return NextResponse.json({ error: "Result already verified" }, { status: 400 });
  }

  const { data: participantRows, error: participantError } = await sb
    .from("tournament_participants")
    .select("participant_id, slot_number, team_name")
    .eq("tournament_id", tournamentId)
    .order("slot_number", { ascending: true });

  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 500 });
  }

  const registrarIds = ((participantRows ?? []) as Array<{ participant_id: string }>)
    .map((row) => row.participant_id)
    .filter(Boolean);

  let registrarNameById = new Map<string, string>();
  if (registrarIds.length > 0) {
    const { data: users } = await sb
      .from("sensitive_userdata")
      .select("id, name, username, ffname")
      .in("id", registrarIds);

    registrarNameById = new Map(
      ((users ?? []) as Array<{ id: string; name?: string | null; username?: string | null; ffname?: string | null }>).map((user) => [
        user.id,
        user.ffname || user.name || user.username || user.id,
      ])
    );
  }

  const payoutPreview = buildPayoutPreview({
    results: resultRow.results,
    prizeDistribution: (tournament.prizedistribution as Record<string, unknown> | null | undefined) ?? null,
    participantRows:
      (participantRows as Array<{ participant_id: string; slot_number: number | null; team_name: string | null }> | null) ?? [],
    registrarNameById,
  });

  if (payoutPreview.length > 0) {
    const walletUserIds = payoutPreview.map((item) => item.registrar_user_id);
    const { data: wallets, error: walletError } = await sb
      .from("wallets")
      .select("id, user_id, balance")
      .in("user_id", walletUserIds);

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    const walletByUserId = new Map(
      ((wallets ?? []) as Array<{ id: string; user_id: string; balance: number }>).map((wallet) => [
        wallet.user_id,
        wallet,
      ])
    );

    for (const payout of payoutPreview) {
      const wallet = walletByUserId.get(payout.registrar_user_id);
      if (!wallet) {
        return NextResponse.json(
          { error: `Wallet not found for registrar ${payout.registrar_name}` },
          { status: 400 }
        );
      }
    }

    for (const payout of payoutPreview) {
      const wallet = walletByUserId.get(payout.registrar_user_id)!;
      const oldBalance = Number(wallet.balance ?? 0);
      const newBalance = oldBalance + payout.amount;

      const { error: updateWalletError } = await sb
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet.id);

      if (updateWalletError) {
        return NextResponse.json({ error: updateWalletError.message }, { status: 500 });
      }

      const { error: transactionError } = await sb.from("transactions").insert({
        user_id: payout.registrar_user_id,
        wallet_id: wallet.id,
        amount: payout.amount,
        transaction_type: "TOURNAMENT_PRIZE",
        payment_status: "completed",
        related_tournament_id: tournamentId,
        old_balance: oldBalance,
        new_balance: newBalance,
      });

      if (transactionError) {
        return NextResponse.json({ error: transactionError.message }, { status: 500 });
      }

      wallet.balance = newBalance;
    }
  }

  const { error: verifyError } = await sb
    .from("tournaments")
    .update({
      result_verified: true,
      payout_status: "paid",
    })
    .eq("id", tournamentId);

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    payout_preview: payoutPreview,
  });
}
