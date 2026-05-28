export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const [classSnap, userSnap2] = await Promise.all([
      adminDb.collection("classes").get(),
      adminDb.collection("users").get(),
    ]);

    const users = userSnap2.docs.map(d => ({ uid: d.id, ...d.data() } as any));

    const classes = classSnap.docs.map(d => {
      const cls     = { id: d.id, ...d.data() } as any;
      const members = users.filter((u: any) => u.classId === cls.id);
      const admin   = users.find((u: any) => u.uid === cls.adminUid);
      return {
        ...cls,
        studentCount: members.filter((u: any) => u.role === "student").length,
        adminName:    admin?.displayName || admin?.email || "Unknown",
      };
    });

    classes.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json(classes);
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
