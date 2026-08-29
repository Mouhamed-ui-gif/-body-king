/* سيد الجسد — Service Worker (متوفر دون إنترنت + إشعارات دفع) */
const VERSION = "bodyking-v1.7.0";
const CORE = ["/", "/index.html", "/css/styles.css", "/js/utils.js", "/js/api.js", "/js/views.js", "/js/workout.js", "/js/app.js", "/img/favicon.png", "/img/hero.jpg", "/img/icon-512.png", "/manifest.webmanifest", "/shared.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      if (res.ok && e.request.method === "GET") caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("/index.html")))
  );
});

/* ---------- Push notifications ---------- */
self.addEventListener("push", (e) => {
  let d = { title: "سيد الجسد", body: "", url: "/" };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body || "",
      icon: "/img/icon-512.png",
      badge: "/img/favicon.png",
      data: { url: d.url || "/" },
      lang: "ar",
      dir: "rtl",
      tag: "bodyking"
    })
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cl) => {
      for (const c of cl) {
        if ("focus" in c) { c.focus(); if (new URL(c.url).pathname !== url) c.navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});