import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, serverError } from "@/lib/api-auth";

// GET — returns official courses for the admin's class only
export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Admins only");

    const classId = userData?.classId;
    if (!classId) return NextResponse.json([]);

    const snap = await adminDb.collection("courses")
      .where("isOfficial", "==", true)
      .where("classId", "==", classId)
      .get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
