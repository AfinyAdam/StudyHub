export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

// GET — returns attendance records for a course, scoped to admin's class
export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Admins only");

    const courseId = req.nextUrl.searchParams.get("courseId");
    if (!courseId) return badRequest("courseId is required");

    // Verify the course belongs to the admin's class
    const courseSnap = await adminDb.collection("courses").doc(courseId).get();
    if (!courseSnap.exists) return NextResponse.json([]);
    if (courseSnap.data()?.classId !== userData?.classId) return forbidden("Course is not in your class");

    const snap = await adminDb.collection("attendance").where("courseId", "==", courseId).get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}

// POST — admin marks attendance for a full class session
export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Admins only");

    const { courseId, date, records } = await req.json();
    if (!courseId || !date || !Array.isArray(records)) return badRequest("courseId, date, and records are required");

    // Verify the course belongs to the admin's class
    const courseSnap = await adminDb.collection("courses").doc(courseId).get();
    if (!courseSnap.exists) return badRequest("Course not found");
    if (courseSnap.data()?.classId !== userData?.classId) return forbidden("Course is not in your class");

    // Delete existing records for this course+date, then insert fresh ones
    const existing = await adminDb.collection("attendance")
      .where("courseId", "==", courseId)
      .where("date", "==", date)
      .get();
    const batch = adminDb.batch();
    existing.docs.forEach(d => batch.delete(d.ref));
    for (const { userId, status } of records) {
      if (!userId || !["present", "absent", "late"].includes(status)) continue;
      const ref = adminDb.collection("attendance").doc();
      batch.set(ref, { courseId, userId, date, status, markedBy: uid, createdAt: new Date().toISOString() });
    }
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
