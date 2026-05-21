import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("studyLogs").where("userId", "==", uid).get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    if (!body.courseId || !body.date || !body.hours)
      return badRequest("courseId, date, hours are required");
    if (body.hours <= 0 || body.hours > 24) return badRequest("hours must be between 0 and 24");
    const ref = await adminDb.collection("studyLogs").add({
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
