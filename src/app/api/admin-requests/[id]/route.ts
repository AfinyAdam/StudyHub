export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/api-auth";

// PATCH — superadmin approves or rejects a request
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }   = await params;
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const { action, rejectionNote } = await req.json();
    if (!["approve", "reject"].includes(action)) return badRequest("action must be approve or reject");

    const reqSnap = await adminDb.collection("adminRequests").doc(id).get();
    if (!reqSnap.exists) return badRequest("Request not found");

    const requestData = reqSnap.data()!;
    const newStatus   = action === "approve" ? "approved" : "rejected";

    const update: Record<string, any> = {
      status:     newStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: uid,
    };
    if (action === "reject" && rejectionNote?.trim()) {
      update.rejectionNote = rejectionNote.trim();
    }

    await adminDb.collection("adminRequests").doc(id).update(update);

    if (action === "approve") {
      await adminDb.collection("users").doc(requestData.uid).update({ role: "admin" });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}

// DELETE — applicant cancels their own pending request
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uid    = await verifyAuth(req);
    const snap   = await adminDb.collection("adminRequests").doc(id).get();
    if (!snap.exists) return notFound();
    const data = snap.data()!;
    if (data.uid !== uid) return forbidden("Not your request");
    if (data.status !== "pending") return badRequest("Only pending requests can be cancelled");
    await adminDb.collection("adminRequests").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
