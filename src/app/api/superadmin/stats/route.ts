export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, unauthorized, forbidden, serverError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const uid      = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.data()?.role !== "superadmin") return forbidden("Superadmin only");

    const [users, classes, requests] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("classes").get(),
      adminDb.collection("adminRequests").get(),
    ]);

    const userDocs = users.docs.map(d => d.data());
    const reqDocs  = requests.docs.map(d => d.data());

    return NextResponse.json({
      totalUsers:    userDocs.length,
      totalStudents: userDocs.filter(u => u.role === "student").length,
      totalAdmins:   userDocs.filter(u => u.role === "admin").length,
      totalClasses:  classes.size,
      pendingReqs:   reqDocs.filter(r => r.status === "pending").length,
      approvedReqs:  reqDocs.filter(r => r.status === "approved").length,
      rejectedReqs:  reqDocs.filter(r => r.status === "rejected").length,
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return unauthorized();
    if (e.message === "Forbidden")    return forbidden();
    return serverError();
  }
}
