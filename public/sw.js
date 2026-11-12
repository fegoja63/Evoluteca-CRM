// Service worker de Evoluteca CRM: solo avisos push. No guarda páginas en
// caché (el CRM siempre muestra datos frescos del servidor).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch { datos = { cuerpo: event.data && event.data.text() }; }
  const titulo = datos.titulo || "Evoluteca CRM";
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.cuerpo || "",
    icon: "/iconos/icono-192.png",
    badge: "/iconos/icono-96.png",
    tag: datos.etiqueta || undefined,
    data: { url: datos.url || "/dashboard" },
    lang: "es",
  }));
});

// Al tocar el aviso: si el CRM ya está abierto, se enfoca y navega; si no, se abre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if (new URL(v.url).origin === self.location.origin) {
        await v.focus();
        if ("navigate" in v) await v.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
