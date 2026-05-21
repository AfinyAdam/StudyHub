import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

// POST — student joins a class using a join code
export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();

    if (userData?.classId) return badRequest("You are already in a class");

    const { code } = await req.json();
    if (!code) return badRequest("Join code is required");

    const snap = await adminDb.collection("classes").where("joinCode", "==", code.toUpperCase()).get();
    if (snap.empty) return NextResponse.json({ error: "Invalid join code" }, { status: 404 });

    const classDoc = snap.docs[0];
    await adminDb.collection("users").doc(uid).update({ classId: classDoc.id });

    return NextResponse.json({ id: classDoc.id, ...classDoc.data() });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Bad Request")  return badRequest();
    return serverError();
  }
}
