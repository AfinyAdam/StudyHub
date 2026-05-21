import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();
const db  = admin.firestore();
const fcm = admin.messaging();

export const sendDeadlineReminders = onSchedule(
  { schedule: "every day 08:00", timeZone: "Asia/Phnom_Penh" },
  async () => {
    const today    = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const todayStr    = today.toISOString().split("T")[0];

    // Get all non-completed tasks due today or tomorrow
    const tasksSnap = await db
      .collection("tasks")
      .where("status", "!=", "completed")
      .get();

    const relevant = tasksSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(t => t.dueDate === todayStr || t.dueDate === tomorrowStr);

    if (relevant.length === 0) return;

    // Group by userId
    const byUser: Record<string, any[]> = {};
    for (const task of relevant) {
      if (!byUser[task.userId]) byUser[task.userId] = [];
      byUser[task.userId].push(task);
    }

    // For each user, get their FCM tokens and send
    await Promise.all(
      Object.entries(byUser).map(async ([userId, tasks]) => {
        const userDoc = await db.collection("users").doc(userId).get();
        const tokens: string[] = userDoc.data()?.fcmTokens ?? [];
        if (tokens.length === 0) return;

        const todayTasks    = tasks.filter(t => t.dueDate === todayStr);
        const tomorrowTasks = tasks.filter(t => t.dueDate === tomorrowStr);

        let title: string;
        let body:  string;

        if (todayTasks.length > 0 && tomorrowTasks.length > 0) {
          title = `📚 ${todayTasks.length + tomorrowTasks.length} tasks need attention`;
          body  = `${todayTasks.length} due today · ${tomorrowTasks.length} due tomorrow`;
        } else if (todayTasks.length > 0) {
          title = todayTasks.length === 1
            ? `🔴 Due today: ${todayTasks[0].title}`
            : `🔴 ${todayTasks.length} tasks due today`;
          body  = todayTasks.length === 1
            ? `Don't forget to complete it!`
            : todayTasks.map((t: any) => t.title).join(", ");
        } else {
          title = tomorrowTasks.length === 1
            ? `🟡 Due tomorrow: ${tomorrowTasks[0].title}`
            : `🟡 ${tomorrowTasks.length} tasks due tomorrow`;
          body  = "Get ahead — complete them today!";
        }

        // Send to each token, remove invalid ones
        const results = await Promise.allSettled(
          tokens.map(token =>
            fcm.send({
              token,
              notification: { title, body },
              webpush: {
                notification: { icon: "/favicon.ico", badge: "/favicon.ico", tag: "unilife-deadline" },
                fcmOptions:   { link: "/tasks" },
              },
            })
          )
        );

        // Clean up invalid tokens
        const invalidTokens = tokens.filter((_, i) => results[i].status === "rejected");
        if (invalidTokens.length > 0) {
          const remaining = tokens.filter(t => !invalidTokens.includes(t));
          await db.collection("users").doc(userId).update({ fcmTokens: remaining });
        }
      })
    );
  }
);
