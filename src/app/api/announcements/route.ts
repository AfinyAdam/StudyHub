export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);
    const snap = await adminDb.collection("announcements").orderBy("createdAt", "desc").get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "admin") return forbidden("Only admins can post announcements");
    const body = await req.json();
    if (!body.title || !body.body) return badRequest("title and body are required");
    const ref = await adminDb.collection("announcements").add({
      title:     body.title,
      body:      body.body,
      pinned:    body.pinned ?? false,
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
