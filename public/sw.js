/* Global service worker for displaying notification events. */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : undefined };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Čas na angličtinu", {
      body: payload.body || "Dej si pár minut procvičování slovíček.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "daily-vocabulary-reminder",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
