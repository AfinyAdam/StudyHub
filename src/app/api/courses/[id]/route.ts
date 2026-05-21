export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, notFound, serverError } from "@/lib/api-auth";

async function getCourse(id: string) {
  const snap = await adminDb.collection("courses").doc(id).get();
  return snap.exists ? snap : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid      = await verifyAuth(req);
    const { id }   = await params;
    const snap     = await getCourse(id);
    if (!snap) return notFound();

    const data     = snap.data()!;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const isAdmin  = userSnap.data()?.role === "admin";

    // Official courses: only the admin who created it can edit
    if (data.isOfficial && !isAdmin) return forbidden("Official courses cannot be edited by students");
    if (data.isOfficial && isAdmin && data.createdBy !== uid) return forbidden("Only the creating admin can edit this course");
    // Personal courses: only the owner can edit
    if (!data.isOfficial && data.userId !== uid) return forbidden();

    const body = await req.json();
    delete body.userId; delete body.id; delete body.isOfficial; delete body.createdBy;
    await adminDb.collection("courses").doc(id).update(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden") return forbidden();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid      = await verifyAuth(req);
    const { id }   = await params;
    const snap     = await getCourse(id);
    if (!snap) return notFound();

    const data     = snap.data()!;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const isAdmin  = userSnap.data()?.role === "admin";

    if (data.isOfficial && !isAdmin) return forbidden("Official courses cannot be deleted by students");
    if (data.isOfficial && isAdmin && data.createdBy !== uid) return forbidden("Only the creating admin can delete this course");
    if (!data.isOfficial && data.userId !== uid) return forbidden();

    await adminDb.collection("courses").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden") return forbidden();
    return serverError();
  }
}
