export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("tasks")
      .where("userId", "==", uid)
      .orderBy("dueDate", "asc")
      .get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    if (!body.title || !body.dueDate) return badRequest("title and dueDate are required");
    const ref = await adminDb.collection("tasks").add({
      ...body,
      userId:    uid,
      status:    body.status ?? "pending",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
