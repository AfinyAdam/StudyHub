export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const classId  = userSnap.data()?.classId;

    const snap = await adminDb.collection("events").get();
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // Return personal events + class-wide events for the user's class
    const filtered = all.filter(e =>
      e.createdBy === uid ||
      !e.classId  ||
      (classId && e.classId === classId)
    );
    filtered.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    return NextResponse.json(filtered);
  } catch {
    return unauthorized();
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.data();
    const body     = await req.json();
    if (!body.title || !body.eventDate) return badRequest("title and eventDate are required");

    const payload: any = {
      ...body,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    };

    if (body.isClassWide) {
      if (userData?.role !== "admin") return forbidden("Only class reps can post class-wide events");
      if (!userData?.classId) return badRequest("Set up your class first");
      payload.classId     = userData.classId;
      payload.isClassWide = true;
    } else {
      delete payload.classId;
      delete payload.isClassWide;
    }

    const ref = await adminDb.collection("events").add(payload);
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
