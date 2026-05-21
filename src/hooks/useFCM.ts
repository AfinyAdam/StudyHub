"use client";

import { useEffect } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import app, { db } from "@/lib/firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function useFCM(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !VAPID_KEY) return;

    (async () => {
      try {
        const supported = await isSupported();
        if (!supported) return;

        // Register the service worker
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, {
          vapidKey:        VAPID_KEY,
          serviceWorkerRegistration: reg,
        });

        if (!token) return;

        // Save token to Firestore (arrayUnion avoids duplicates)
        await updateDoc(doc(db, "users", userId), {
          fcmTokens: arrayUnion(token),
        });
      } catch (err) {
        console.error("FCM setup failed:", err);
      }
    })();
  }, [userId]);
}
