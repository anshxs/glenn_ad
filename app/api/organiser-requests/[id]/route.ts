import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

type RequestRow = {
  id: string;
  user_id: string;
  glenn_id: string;
  name: string;
  contact_number: string;
  alternate_contact_number: string | null;
  address: string;
  aadhar_card_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  permanently_banned: boolean;
  can_reappeal: boolean;
};

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = String((body as { action?: string }).action ?? "").toLowerCase();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data: reqRow, error: reqError } = await sb
    .from("organiser_requests")
    .select("*")
    .eq("id", id)
    .single<RequestRow>();

  if (reqError || !reqRow) {
    return NextResponse.json({ error: reqError?.message ?? "Request not found" }, { status: 404 });
  }

  if (action === "approve") {
    const name = String((body as { name?: string }).name ?? reqRow.name).trim();
    const glennId = String((body as { glenn_id?: string }).glenn_id ?? reqRow.glenn_id).trim();
    const contactNumber = String(
      (body as { contact_number?: string }).contact_number ?? reqRow.contact_number
    ).trim();
    const alternateContactNumberRaw = String(
      (body as { alternate_contact_number?: string }).alternate_contact_number ??
        (reqRow.alternate_contact_number ?? "")
    ).trim();
    const address = String((body as { address?: string }).address ?? reqRow.address).trim();
    const aadharCardUrlRaw = String(
      (body as { aadhar_card_url?: string }).aadhar_card_url ?? (reqRow.aadhar_card_url ?? "")
    ).trim();

    if (!name || !glennId || !contactNumber || !address) {
      return NextResponse.json(
        { error: "name, glenn_id, contact_number and address are required" },
        { status: 400 }
      );
    }

    const alternateContactNumber = alternateContactNumberRaw || null;
    const aadharCardUrl = aadharCardUrlRaw || null;

    const { error: approveReqError } = await sb
      .from("organiser_requests")
      .update({
        status: "approved",
        rejection_reason: null,
        can_reappeal: false,
        permanently_banned: false,
        name,
        glenn_id: glennId,
        contact_number: contactNumber,
        alternate_contact_number: alternateContactNumber,
        address,
        aadhar_card_url: aadharCardUrl,
      })
      .eq("id", id);

    if (approveReqError) {
      return NextResponse.json({ error: approveReqError.message }, { status: 500 });
    }

    const { data: organiserData, error: organiserError } = await sb
      .from("organisers")
      .upsert(
        {
          user_id: reqRow.user_id,
          glenn_id: glennId,
          name,
          contact_number: contactNumber,
          alternate_contact_number: alternateContactNumber,
          address,
          aadhar_card_url: aadharCardUrl,
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (organiserError) {
      await sb
        .from("organiser_requests")
        .update({
          status: reqRow.status,
          rejection_reason: reqRow.rejection_reason,
          can_reappeal: reqRow.can_reappeal,
          permanently_banned: reqRow.permanently_banned,
        })
        .eq("id", id);

      return NextResponse.json({ error: organiserError.message }, { status: 500 });
    }

    const { data: updatedReq } = await sb
      .from("organiser_requests")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      request: updatedReq,
      organiser: organiserData,
    });
  }

  const rejectionReason = String(
    (body as { rejection_reason?: string }).rejection_reason ?? ""
  ).trim();
  const canReappeal = (body as { can_reappeal?: boolean }).can_reappeal === true;
  const permanentlyBanned =
    (body as { permanently_banned?: boolean }).permanently_banned === true;

  if (!rejectionReason) {
    return NextResponse.json({ error: "rejection_reason is required" }, { status: 400 });
  }

  const { data: updatedReq, error: rejectError } = await sb
    .from("organiser_requests")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      can_reappeal: canReappeal,
      permanently_banned: permanentlyBanned,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (rejectError) {
    return NextResponse.json({ error: rejectError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: updatedReq });
}
