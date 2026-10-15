// Service Worker Le Terre - Web Push Notifications & Offline Support

self.addEventListener('install', () => {
  console.log('[SW] Service Worker Le Terre installé.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker Le Terre activé.');
  event.waitUntil(self.clients.claim());
});

// Écoute des événements Push en arrière-plan
self.addEventListener('push', (event) => {
  let data = {
    title: 'Le Terre Arena',
    body: 'Nouvelle mise à jour disponible !',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: '/dashboard' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/dashboard' },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir l\'application' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic sur une notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
