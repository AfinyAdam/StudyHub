export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("adminRequests").where("uid", "==", uid).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json(docs);
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
