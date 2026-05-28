export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const [userSnap2, classSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("classes").get(),
    ]);
    const classMap: Record<string, string> = {};
    classSnap.docs.forEach(d => { classMap[d.id] = (d.data() as any).name; });
    const docs = userSnap2.docs.map(d => {
      const u = { uid: d.id, ...d.data() } as any;
      u.className = u.classId ? (classMap[u.classId] ?? "Unknown class") : null;
      return u;
    });
    docs.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json(docs);
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}

// PATCH — superadmin can change any user's role
export async function PATCH(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const { targetUid, role } = await req.json();
    if (!targetUid || !["student", "admin", "superadmin"].includes(role))
      return badRequest("targetUid and valid role required");
    if (targetUid === uid) return badRequest("Cannot change your own role here");

    await adminDb.collection("users").doc(targetUid).update({ role });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
