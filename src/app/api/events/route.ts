import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);
    const snap = await adminDb.collection("events").orderBy("eventDate", "asc").get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    // Only admins can create events — check role in Firestore
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "admin") return forbidden("Only admins can create events");
    const body = await req.json();
    if (!body.title || !body.eventDate) return badRequest("title and eventDate are required");
    const ref = await adminDb.collection("events").add({
      ...body,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden") return forbidden();
    return serverError();
  }
}
