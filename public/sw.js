// Service worker for Easy Kitty Care push notifications.
// Runs in a separate context — no Next.js/React available here.

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Easy Kitty Care", {
      body: data.body ?? "",
      icon: data.icon ?? "/icon.svg",
      badge: "/icon.svg",
      tag: data.tag ?? "kitten-alert",
      renotify: true,
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
