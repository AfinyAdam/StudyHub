export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

// GET — superadmin gets all requests
export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const status = req.nextUrl.searchParams.get("status");
    const snap   = await adminDb.collection("adminRequests").get();
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    if (status) docs = docs.filter(d => d.status === status);
    docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json(docs);
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}

// POST — authenticated user submits a class rep request
export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();

    // Block if a pending request already exists; approved users can't reapply either
    const existing = await adminDb.collection("adminRequests").where("uid", "==", uid).get();
    const hasPending  = existing.docs.some(d => d.data().status === "pending");
    const hasApproved = existing.docs.some(d => d.data().status === "approved");
    if (hasPending)  return badRequest("You already have a pending request");
    if (hasApproved) return badRequest("Your previous application was already approved");

    const { className, major, reason } = await req.json();
    if (!className?.trim() || !major?.trim() || !reason?.trim())
      return badRequest("className, major, and reason are required");

    await adminDb.collection("adminRequests").add({
      uid,
      displayName: userData?.displayName || "",
      email:       userData?.email || "",
      className:   className.trim(),
      major:       major.trim(),
      reason:      reason.trim(),
      status:      "pending",
      createdAt:   new Date().toISOString(),
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
