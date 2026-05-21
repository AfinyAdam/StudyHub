export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("focusNotes").where("userId", "==", uid).get();
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
    return NextResponse.json(data);
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    const now  = new Date().toISOString();
    const ref  = await adminDb.collection("focusNotes").add({
      ...body,
      userId:    uid,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
