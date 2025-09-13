// Enhanced Service Worker with comprehensive offline support
const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `bannhac-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bannhac-dynamic-${CACHE_VERSION}`;
const API_CACHE = `bannhac-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `bannhac-images-${CACHE_VERSION}`;

// Essential static assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Logo_app.png',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
  '/sw.js'
];

// Fallback assets to ensure offline functionality
const FALLBACK_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Critical resources that should be cached on first load
const CRITICAL_RESOURCES = [
  '/static/css/',
  '/static/js/',
  '/static/media/'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/songs/,
  /\/api\/types/,
  /\/api\/topics/
];

// Install - cache static assets and discover critical resources
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    Promise.all([
      // Cache essential static assets with fallback handling
      caches.open(STATIC_CACHE).then(async cache => {
        try {
          await cache.addAll(STATIC_ASSETS);
          console.log('[SW] Static assets cached successfully');
        } catch (error) {
          console.warn('[SW] Failed to cache some static assets, trying fallbacks:', error);
          // Try to cache fallback assets individually
          for (const asset of FALLBACK_ASSETS) {
            try {
              await cache.add(asset);
            } catch (err) {
              console.warn(`[SW] Failed to cache fallback asset: ${asset}`, err);
            }
          }
        }
      }),
      // Initialize other caches
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE),
      caches.open(IMAGE_CACHE),
      // Discover and cache critical resources
      discoverCriticalResources()
    ]).then(() => {
      console.log('[SW] Installation complete, skipping waiting');
      self.skipWaiting();
    }).catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Discover and cache critical JS/CSS resources
async function discoverCriticalResources() {
  try {
    console.log('[SW] Discovering critical resources...');
    // Force reload HTML to get latest content
    const response = await fetch('/index.html', { cache: 'reload' });
    const html = await response.text();
    
    // Extract JS and CSS files from HTML
    const jsFiles = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
    const cssFiles = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match => match[1]);
    
    const criticalFiles = [...jsFiles, ...cssFiles].filter(file => 
      file.startsWith('/static/') || file.startsWith('./static/')
    );
    
    console.log('[SW] Found critical files:', criticalFiles);
    
    // Cache critical files with force reload
    if (criticalFiles.length > 0) {
      const cache = await caches.open(STATIC_CACHE);
      let cachedCount = 0;
      for (const file of criticalFiles) {
        try {
          // Force reload each file to bypass cache
          const fileResponse = await fetch(file, { cache: 'reload' });
          if (fileResponse.ok) {
            await cache.put(file, fileResponse);
            cachedCount++;
            console.log(`[SW] Cached critical resource: ${file}`);
          }
        } catch (error) {
          console.warn(`[SW] Failed to cache critical resource: ${file}`, error);
        }
      }
      console.log(`[SW] Successfully cached ${cachedCount}/${criticalFiles.length} critical resources`);
    }
  } catch (error) {
    console.warn('[SW] Failed to discover critical resources:', error);
  }
}

// Activate - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(names => {
        console.log('[SW] Existing caches:', names);
        return Promise.all(
          names.map(name => {
            if (name.includes('bannhac-') && !name.includes(CACHE_VERSION)) {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] Activation complete');
      })
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

  console.log(`[SW] Fetching: ${url.pathname}`);

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

  // Handle static assets (JS, CSS, fonts, etc.)
  if (url.pathname.startsWith('/static/') || STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Default handling for other requests
  event.respondWith(handleDefaultRequest(request));
});

// Navigation request handler
async function handleNavigationRequest(request) {
  console.log(`[SW] Handling navigation: ${request.url}`);
  
  try {
    console.log('[SW] Trying network for navigation...');
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      console.log('[SW] Network navigation successful, caching...');
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network navigation failed, trying cache...', error);
  }
  
  // Serve cached index.html for SPA routing
  const cachedResponse = await caches.match('/index.html');
  if (cachedResponse) {
    console.log('[SW] Serving cached index.html for navigation');
    return cachedResponse;
  }
  
  // Try to get index.html from any cache
  const allCaches = await caches.keys();
  for (const cacheName of allCaches) {
    const cache = await caches.open(cacheName);
    const response = await cache.match('/index.html');
    if (response) {
      console.log(`[SW] Found index.html in cache: ${cacheName}`);
      return response;
    }
  }
  
  console.log('[SW] No cached index.html found, returning offline page');
  // Fallback offline page
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bản Nhạc - Offline</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: #f5f5f5;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        .offline-message { color: #666; margin-bottom: 20px; line-height: 1.5; }
        .retry-button { 
          background: #007AFF; color: white; border: none; padding: 12px 24px; 
          border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px;
        }
        .retry-button:hover { background: #0056b3; }
        .status { margin-top: 20px; font-size: 14px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="offline-icon">🎵</div>
        <h1>Bản Nhạc</h1>
        <p class="offline-message">
          Ứng dụng không thể tải được vì chưa có dữ liệu cache. 
          Vui lòng kết nối mạng và tải lại trang.
        </p>
        <button class="retry-button" onclick="window.location.reload()">Thử lại</button>
        <button class="retry-button" onclick="window.location.href='/'">Về trang chủ</button>
        <div class="status" id="status">Đang kiểm tra kết nối...</div>
      </div>
      
      <script>
        function updateStatus() {
          const status = document.getElementById('status');
          if (navigator.onLine) {
            status.textContent = 'Đã có mạng - có thể thử lại';
            status.style.color = '#28a745';
          } else {
            status.textContent = 'Không có mạng';
            status.style.color = '#dc3545';
          }
        }
        
        updateStatus();
        window.addEventListener('online', () => {
          updateStatus();
          setTimeout(() => window.location.reload(), 1000);
        });
        window.addEventListener('offline', updateStatus);
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

// Static asset handler - cache-first with fallback
async function handleStaticAssetRequest(request) {
  console.log(`[SW] Handling static asset: ${request.url}`);
  
  // Try cache first
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log(`[SW] Serving from cache: ${request.url}`);
    return cachedResponse;
  }
  
  // Try network and cache response
  try {
    console.log(`[SW] Fetching from network: ${request.url}`);
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      console.log(`[SW] Caching network response: ${request.url}`);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn(`[SW] Failed to fetch static asset: ${request.url}`, error);
  }
  
  // For critical resources, return a minimal fallback
  if (request.url.includes('.js')) {
    console.log(`[SW] Returning JS fallback for: ${request.url}`);
    return new Response('console.warn("Script not available offline");', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  if (request.url.includes('.css')) {
    console.log(`[SW] Returning CSS fallback for: ${request.url}`);
    return new Response('/* Styles not available offline */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  console.log(`[SW] No fallback available for: ${request.url}`);
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
  
  if (event.data?.type === 'CACHE_UPDATE') {
    event.waitUntil(handleCacheUpdate());
    return;
  }
  
  if (event.data?.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(clearAllCaches());
    return;
  }
  
  if (event.data?.type === 'PRELOAD_CRITICAL_RESOURCES') {
    event.waitUntil(preloadCriticalResources());
    return;
  }
  
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

// Cache management functions
async function handleCacheUpdate() {
  try {
    // Force clear ALL caches to ensure fresh content
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] All caches cleared for fresh update');
    
    // Discover and cache new critical resources
    await discoverCriticalResources();
    
    // Notify clients about cache update completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATE_COMPLETE',
        success: true
      });
    });
  } catch (error) {
    console.error('[SW] Cache update failed:', error);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATE_COMPLETE',
        success: false,
        error: error.message
      });
    });
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHES_CLEARED',
        success: true
      });
    });
  } catch (error) {
    console.error('[SW] Clear caches failed:', error);
  }
}

// async function clearOldCaches() {
//   const cacheNames = await caches.keys();
//   return Promise.all(
//     cacheNames.map(name => {
//       if (name.includes('bannhac-') && !name.includes(CACHE_VERSION)) {
//         return caches.delete(name);
//       }
//     })
//   );
// }

// // Preload critical resources for offline functionality
// async function preloadCriticalResources() {
//   try {
//     console.log('[SW] Starting critical resource preload...');
    
//     // Force reload and cache main HTML
//     const cache = await caches.open(STATIC_CACHE);
    
//     // Cache main HTML and discover resources
//     const indexResponse = await fetch('/index.html', { cache: 'reload' });
//     if (indexResponse.ok) {
//       await cache.put('/index.html', indexResponse.clone());
//       const html = await indexResponse.text();
      
//       // Extract all static resources
//       const jsFiles = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
//       const cssFiles = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match => match[1]);
//       const allResources = [...jsFiles, ...cssFiles, ...STATIC_ASSETS];
      
//       console.log('[SW] Found resources to preload:', allResources);
      
//       // Cache all resources
//       let successCount = 0;
//       for (const resource of allResources) {
//         try {
//           const response = await fetch(resource, { cache: 'reload' });
//           if (response.ok) {
//             await cache.put(resource, response);
//             successCount++;
//             console.log(`[SW] Cached: ${resource}`);
//           }
//         } catch (error) {
//           console.warn(`[SW] Failed to cache: ${resource}`, error);
//         }
//       }
      
//       console.log(`[SW] Preload complete: ${successCount}/${allResources.length} resources cached`);
      
//       // Notify clients
//       const clients = await self.clients.matchAll();
//       clients.forEach(client => {
//         client.postMessage({
//           type: 'PRELOAD_COMPLETE',
//           success: true,
//           cached: successCount,
//           total: allResources.length
//         });
//       });
//     }
//   } catch (error) {
//     console.error('[SW] Preload failed:', error);
    
//     const clients = await self.clients.matchAll();
//     clients.forEach(client => {
//       client.postMessage({
//         type: 'PRELOAD_COMPLETE',
//         success: false,
//         error: error.message
//       });
//     });
//   }
// }

async function preloadCriticalResources() {
  try {
    // Force reload and cache index.html
    const cache = await caches.open(STATIC_CACHE);
    
    // Cache bust index.html to get latest version
    const indexResponse = await fetch('/index.html?cache-bust=' + Date.now());
    if (indexResponse.ok) {
      await cache.put('/index.html', indexResponse.clone());
      
      // Extract and cache critical resources from new HTML
      const html = await indexResponse.text();
      
      const jsFiles = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
      const cssFiles = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match => match[1]);
      
      const criticalFiles = [...jsFiles, ...cssFiles].filter(file => 
        file.startsWith('/static/') || file.startsWith('./static/')
      );
      
      // Cache critical files with cache busting
      for (const file of criticalFiles) {
        try {
          const response = await fetch(file + '?cache-bust=' + Date.now());
          if (response.ok) {
            await cache.put(file, response);
          }
        } catch (error) {
          console.warn(`[SW] Failed to preload: ${file}`, error);
        }
      }
    }
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PRELOAD_COMPLETE',
        success: true
      });
    });
  } catch (error) {
    console.error('[SW] Preload failed:', error);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PRELOAD_COMPLETE',
        success: false,
        error: error.message
      });
    });
  }
}
