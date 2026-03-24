import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ tournamentId: string }> };

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

  return NextResponse.json({ data: data ?? null });
}
