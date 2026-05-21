import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

// GET — returns all users in the admin's class
export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Admins only");

    const classId = userData?.classId;
    if (!classId) return NextResponse.json([]); // no class yet

    const snap = await adminDb.collection("users").where("classId", "==", classId).get();
    return NextResponse.json(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}

// PATCH — admin promotes/demotes a user in their class
export async function PATCH(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Admins only");

    const body = await req.json();
    const { targetUid, action } = body;
    if (!targetUid) return badRequest("targetUid required");
    if (targetUid === uid) return forbidden("Cannot modify your own account");

    // Ensure target is in the same class
    const targetSnap = await adminDb.collection("users").doc(targetUid).get();
    if (targetSnap.data()?.classId !== userData?.classId) return forbidden("User is not in your class");

    if (action === "remove") {
      await adminDb.collection("users").doc(targetUid).update({ classId: null });
      return NextResponse.json({ success: true });
    }

    const { role } = body;
    if (!["student", "admin"].includes(role)) return badRequest("role (student|admin) required");
    await adminDb.collection("users").doc(targetUid).update({ role });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
