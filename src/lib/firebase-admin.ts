import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth: Auth      = new Proxy({} as Auth,      { get: (_, p) => getAuth(getAdminApp())[p as keyof Auth] });
export const adminDb:   Firestore = new Proxy({} as Firestore, { get: (_, p) => getFirestore(getAdminApp())[p as keyof Firestore] });
