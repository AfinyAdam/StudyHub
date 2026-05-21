import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const courseId = req.nextUrl.searchParams.get("courseId");
    let query: FirebaseFirestore.Query = adminDb.collection("attendance").where("userId", "==", uid);
    if (courseId) query = query.where("courseId", "==", courseId);
    const snap = await query.get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    if (!body.courseId || !body.date || !body.status) return badRequest("courseId, date and status are required");
    const ref = await adminDb.collection("attendance").add({
      ...body,
      userId:   uid,
      markedBy: uid,
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
