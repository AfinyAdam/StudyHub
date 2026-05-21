"use client";

import { useEffect, useRef } from "react";

export type NotifItem = {
  title: string;
  body:  string;
};

/**
 * Request notification permission and fire browser notifications for
 * tasks due today/tomorrow and events happening today.
 */
export function useNotifications(items: NotifItem[], enabled: boolean) {
  const firedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !items.length) return;
    if (!("Notification" in window)) return;

    const fire = () => {
      items.forEach(({ title, body }) => {
        const key = `${title}::${body}`;
        if (firedRef.current.has(key)) return;
        firedRef.current.add(key);
        new Notification(title, { body, icon: "/favicon.ico" });
      });
    };

    if (Notification.permission === "granted") {
      fire();
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then(p => {
        if (p === "granted") fire();
      });
    }
  }, [items, enabled]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
