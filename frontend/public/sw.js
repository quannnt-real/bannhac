// Service Worker with enhanced deep linking support
const CACHE_VERSION = new Date().toISOString().slice(0,10);
const STATIC_CACHE = `my-heart-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `my-heart-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/Logo_app.png',
  '/logo192.png',
  '/logo512.png'
];

// Install - immediate activation
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.map(name => {
          if (name.startsWith('my-heart-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE) {
            return caches.delete(name);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Enhanced fetch handler with SPA routing support
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests (including deep links)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve cached index.html for SPA routing
          return caches.match('/index.html').then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback response
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head><title>My Heart - Loading...</title></head>
              <body>
                <div style="text-align:center;padding:50px;">
                  <h1>My Heart Belong to Jesus</h1>
                  <p>Loading...</p>
                  <script>window.location.href = '/';</script>
                </div>
              </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Handle other requests (API, assets)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle deep links and URL navigation
self.addEventListener('message', event => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data?.type === 'NAVIGATE_TO') {
    const url = event.data.url;
    console.log('[SW] Handling navigation to:', url);
    
    // Focus existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          console.log('[SW] Found clients:', clientList.length);
          
          // Try to focus existing PWA window
          for (const client of clientList) {
            if (client.url.includes(location.origin)) {
              console.log('[SW] Focusing existing client and navigating');
              return client.focus().then(() => {
                client.postMessage({
                  type: 'NAVIGATE_TO_URL',
                  url: url
                });
              });
            }
          }
          
          // No existing window, open new one
          console.log('[SW] Opening new window');
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
        .catch(err => console.error('[SW] Navigation error:', err))
    );
  }
  
  if (event.data?.type === 'CURRENT_PAGE') {
    console.log('[SW] Client informed current page:', event.data.path);
  }
  
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
});

// Enhanced notification click handling for deep links
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification);
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.registration.scope).href;
  
  console.log('[SW] Target URL from notification:', targetUrl);
  console.log('[SW] Full URL:', fullUrl);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        console.log('[SW] Found clients:', clientList.length);
        
        // First, check if there's already a window with the exact URL
        for (const client of clientList) {
          if (client.url === fullUrl) {
            console.log('[SW] Exact URL match found, focusing');
            return client.focus();
          }
        }
        
        // Check for any app window to navigate
        const appClients = clientList.filter(client => 
          client.url.includes(self.location.origin)
        );
        
        if (appClients.length > 0) {
          const client = appClients[0];
          console.log('[SW] Focusing existing app client and navigating');
          return client.focus().then(() => {
            // Send navigation message
            client.postMessage({
              type: 'NAVIGATE_TO',
              url: targetUrl,
              source: 'notification-click'
            });
            return client;
          });
        }
        
        // No existing app window, open new one
        console.log('[SW] Opening new window');
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
      .catch(err => {
        console.error('[SW] Notification click error:', err);
        // Fallback: try to open window anyway
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

console.log('[SW] Service Worker loaded with deep linking support');
