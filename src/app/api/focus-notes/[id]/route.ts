export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, notFound, serverError } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id } = await params;
    const snap = await adminDb.collection("focusNotes").doc(id).get();
    if (!snap.exists) return notFound();
    if (snap.data()?.userId !== uid) return forbidden();
    const body = await req.json();
    delete body.userId; delete body.id; delete body.createdAt;
    await adminDb.collection("focusNotes").doc(id).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id } = await params;
    const snap = await adminDb.collection("focusNotes").doc(id).get();
    if (!snap.exists) return notFound();
    if (snap.data()?.userId !== uid) return forbidden();
    await adminDb.collection("focusNotes").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
