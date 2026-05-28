export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const classSnap = await adminDb.collection("classes").doc(id).get();
    if (!classSnap.exists) return badRequest("Class not found");

    // Clear classId from all members and the admin
    const members = await adminDb.collection("users").where("classId", "==", id).get();
    const batch = adminDb.batch();
    members.docs.forEach(d => batch.update(d.ref, { classId: null }));
    batch.delete(adminDb.collection("classes").doc(id));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
