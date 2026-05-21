export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, badRequest, forbidden, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid  = await verifyAuth(req);
    const snap = await adminDb.collection("courses").where("userId", "==", uid).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(data);
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const isAdmin  = userSnap.data()?.role === "admin";
    const body     = await req.json();
    if (!body.name || !body.code) return badRequest("name and code are required");

    const payload: Record<string, unknown> = {
      ...body,
      createdAt: new Date().toISOString(),
    };

    if (isAdmin && body.isOfficial) {
      // Official course: scoped to admin's class
      const classId = userSnap.data()?.classId;
      if (!classId) return badRequest("Create your class first before adding official courses");
      payload.isOfficial = true;
      payload.createdBy  = uid;
      payload.classId    = classId;
      delete payload.userId;
    } else {
      payload.userId     = uid;
      payload.isOfficial = false;
    }

    const ref = await adminDb.collection("courses").add(payload);
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
