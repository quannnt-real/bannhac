// Enhanced Service Worker with comprehensive offline support
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `bannhac-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bannhac-dynamic-${CACHE_VERSION}`;
const API_CACHE = `bannhac-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `bannhac-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Logo_app.png',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/songs/,
  /\/api\/types/,
  /\/api\/topics/
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE),
      caches.open(IMAGE_CACHE)
    ]).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.map(name => {
          if (name.includes('bannhac-') && !name.includes(CACHE_VERSION)) {
            return caches.delete(name);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch handler with comprehensive caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and different origins
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.includes('/static/'))) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Default handling for other requests
  event.respondWith(handleDefaultRequest(request));
});

// Navigation request handler
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
  }
  
  // Serve cached index.html for SPA routing
  const cachedResponse = await caches.match('/index.html');
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback offline page
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bản Nhạc - Offline</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        .offline-message { color: #666; margin-bottom: 20px; }
        .retry-button { 
          background: #007AFF; color: white; border: none; padding: 12px 24px; 
          border-radius: 8px; cursor: pointer; font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">🎵</div>
      <h1>Bản Nhạc</h1>
      <p class="offline-message">Bạn đang offline. Ứng dụng sẽ tự động kết nối lại khi có mạng.</p>
      <button class="retry-button" onclick="window.location.reload()">Thử lại</button>
      <script>
        window.addEventListener('online', () => window.location.reload());
      </script>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// API request handler with cache-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
  }
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return new Response(JSON.stringify({ error: 'No cached data available' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Image request handler with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
  }
  
  // Return a placeholder image if no cache and network fails
  return new Response('', { status: 404 });
}

// Static asset handler - cache-first
async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
  }
  
  return new Response('', { status: 404 });
}

// Default request handler
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
  }
  
  const cachedResponse = await caches.match(request);
  return cachedResponse || new Response('', { status: 404 });
}

// Message handling for app communication
self.addEventListener('message', event => {
  
  if (event.data?.type === 'NAVIGATE_TO') {
    const url = event.data.url;
    
    // Focus existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          
          // Try to focus existing PWA window
          for (const client of clientList) {
            if (client.url.includes(location.origin)) {
              return client.focus().then(() => {
                client.postMessage({
                  type: 'NAVIGATE_TO_URL',
                  url: url
                });
              });
            }
          }
          
          // No existing window, open new one
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
        .catch(err => console.error('[SW] Navigation error:', err))
    );
  }
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync event handler
self.addEventListener('sync', event => {
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Background sync handler
async function handleBackgroundSync() {
  try {
    
    // Import dynamic import for offlineManager
    const offlineManagerModule = await import('/src/utils/offlineManager.js');
    const { offlineManager } = offlineManagerModule;
    
    await offlineManager.syncWhenOnline();
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    
    // Notify clients about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: false,
        error: error.message
      });
    });
    
    throw error; // Let the browser retry
  }
}

// Enhanced notification click handling for deep links
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.registration.scope).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        
        // First, check if there's already a window with the exact URL
        for (const client of clientList) {
          if (client.url === fullUrl) {
            return client.focus();
          }
        }
        
        // Check for any app window to navigate
        const appClients = clientList.filter(client => 
          client.url.includes(self.location.origin)
        );
        
        if (appClients.length > 0) {
          const client = appClients[0];
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

// Enhanced notification click handling for deep links
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.registration.scope).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        
        // First, check if there's already a window with the exact URL
        for (const client of clientList) {
          if (client.url === fullUrl) {
            return client.focus();
          }
        }
        
        // Check for any app window to navigate
        const appClients = clientList.filter(client => 
          client.url.includes(self.location.origin)
        );
        
        if (appClients.length > 0) {
          const client = appClients[0];
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
