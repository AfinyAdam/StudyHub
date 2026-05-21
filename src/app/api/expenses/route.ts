export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("expenses").where("userId", "==", uid).get();
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.expenseDate.localeCompare(a.expenseDate));
    return NextResponse.json(data);
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const body = await req.json();
    if (!body.amountUSD || !body.category || !body.expenseDate)
      return badRequest("amountUSD, category, expenseDate are required");
    if (body.amountUSD <= 0) return badRequest("amountUSD must be positive");
    const ref = await adminDb.collection("expenses").add({
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
