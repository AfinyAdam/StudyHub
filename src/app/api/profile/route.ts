import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return NextResponse.json(null);
    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch {
    return unauthorized();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    // Prevent escalating role from client
    delete body.role;
    delete body.uid;
    await adminDb.collection("users").doc(uid).update(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
