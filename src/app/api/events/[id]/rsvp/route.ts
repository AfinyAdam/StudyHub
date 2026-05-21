export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAuth(req);
    const { id } = await params;
    const snap = await adminDb.collection("eventRSVPs").where("eventId", "==", id).get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id: eventId } = await params;
    // Prevent duplicate RSVPs
    const existing = await adminDb.collection("eventRSVPs")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .get();
    if (!existing.empty) {
      return NextResponse.json({ id: existing.docs[0].id }, { status: 200 });
    }
    const ref = await adminDb.collection("eventRSVPs").add({
      userId: uid, eventId, rsvpedAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id: eventId } = await params;
    const snap = await adminDb.collection("eventRSVPs")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .get();
    if (snap.empty) return NextResponse.json({ success: true });
    await Promise.all(snap.docs.map(d => d.ref.delete()));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
