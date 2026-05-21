export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("grades").where("userId", "==", uid).get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    if (!body.courseId || !body.title || body.score == null || body.total == null)
      return badRequest("courseId, title, score, total are required");
    if (body.score > body.total) return badRequest("score cannot exceed total");
    const ref = await adminDb.collection("grades").add({
      ...body,
      userId:    uid,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
