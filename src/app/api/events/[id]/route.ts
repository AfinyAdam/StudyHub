export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, notFound, serverError } from "@/lib/api-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id } = await params;
    const snap = await adminDb.collection("events").doc(id).get();
    if (!snap.exists) return notFound();
    const eventData = snap.data();
    const userSnap  = await adminDb.collection("users").doc(uid).get();
    const isAdmin   = userSnap.data()?.role === "admin";
    const isCreator = eventData?.createdBy === uid;
    if (!isAdmin && !isCreator) return forbidden("You can only delete your own events");
    await adminDb.collection("events").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
