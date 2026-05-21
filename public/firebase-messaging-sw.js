importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyBBlQ1zrMwS2mXnrHok-HZkBVpJb02TYR4",
  authDomain:        "unilife-b24c6.firebaseapp.com",
  projectId:         "unilife-b24c6",
  storageBucket:     "unilife-b24c6.firebasestorage.app",
  messagingSenderId: "532960959815",
  appId:             "1:532960959815:web:8306126b3d20a63d9e0062",
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? "UniLife", {
    body:  body  ?? "",
    icon:  icon  ?? "/favicon.ico",
    badge: "/favicon.ico",
    tag:   payload.data?.taskId ?? "unilife-deadline",
    data:  { url: "/tasks" },
  });
});

// Open /tasks when notification is clicked
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return client.navigate("/tasks");
        }
      }
      return clients.openWindow("/tasks");
    })
  );
});
