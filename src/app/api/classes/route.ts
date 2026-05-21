import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase(); // e.g. "A3B9KZ"
}

// GET — return the class the current user belongs to / manages
export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const classId  = userSnap.data()?.classId;
    if (!classId) return NextResponse.json(null);
    const classSnap = await adminDb.collection("classes").doc(classId).get();
    if (!classSnap.exists) return NextResponse.json(null);
    return NextResponse.json({ id: classSnap.id, ...classSnap.data() });
  } catch {
    return unauthorized();
  }
}

// POST — admin creates a new class (sets their own classId)
export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (userData?.role !== "admin") return forbidden("Only admins can create a class");
    if (userData?.classId)         return badRequest("You already manage a class");

    const body = await req.json();
    if (!body.name || !body.major) return badRequest("name and major are required");

    // Ensure join code is unique
    let joinCode = body.joinCode?.toUpperCase() || generateJoinCode();
    const existing = await adminDb.collection("classes").where("joinCode", "==", joinCode).get();
    if (!existing.empty) joinCode = generateJoinCode();

    const ref = await adminDb.collection("classes").add({
      name:      body.name,
      major:     body.major,
      joinCode,
      adminUid:  uid,
      createdAt: new Date().toISOString(),
    });

    // Assign classId to the admin
    await adminDb.collection("users").doc(uid).update({ classId: ref.id });

    return NextResponse.json({ id: ref.id, joinCode }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    if (e.message === "Bad Request")  return badRequest();
    return serverError();
  }
}
