export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, notFound, serverError } from "@/lib/api-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await verifyAuth(req);
    const { id } = await params;
    const snap = await adminDb.collection("studyLogs").doc(id).get();
    if (!snap.exists) return notFound();
    if (snap.data()?.userId !== uid) return forbidden();
    await adminDb.collection("studyLogs").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
