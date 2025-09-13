// Background Preloader for critical resources
class BackgroundPreloader {
  constructor() {
    this.isPreloading = false;
    this.preloadQueue = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Wait for service worker to be ready
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
    
    this.initialized = true;
    
    // Start preloading on next tick to avoid blocking initial load
    setTimeout(() => this.startBackgroundPreload(), 2000);
  }

  async startBackgroundPreload() {
    if (this.isPreloading) return;
    
    try {
      this.isPreloading = true;
      
      // Only preload if online and on WiFi (to save mobile data)
      if (!navigator.onLine) return;
      
      // Check connection type if available
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection && connection.effectiveType && !['wifi', '4g'].includes(connection.effectiveType)) {
        console.log('[Preloader] Skipping preload on slow connection');
        return;
      }
      
      await this.preloadCriticalResources();
      await this.checkAndPreloadMissingAssets();
      
    } catch (error) {
      console.warn('[Preloader] Background preload failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  async preloadCriticalResources() {
    // Send message to service worker to preload
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRELOAD_CRITICAL_RESOURCES'
      });
    }
  }

  async checkAndPreloadMissingAssets() {
    if (!('caches' in window)) return;

    try {
      // Get current HTML to extract asset URLs
      const response = await fetch(window.location.href);
      const html = await response.text();
      
      // Extract all static assets
      const assets = this.extractAssetsFromHTML(html);
      
      // Check which assets are missing from cache
      const missingAssets = await this.findMissingAssets(assets);
      
      if (missingAssets.length > 0) {
        console.log(`[Preloader] Found ${missingAssets.length} missing assets, preloading...`);
        await this.preloadAssets(missingAssets);
      }
      
    } catch (error) {
      console.warn('[Preloader] Failed to check missing assets:', error);
    }
  }

  extractAssetsFromHTML(html) {
    const assets = [];
    
    // Extract JS files
    const jsMatches = html.matchAll(/<script[^>]+src="([^"]+)"/g);
    for (const match of jsMatches) {
      assets.push(match[1]);
    }
    
    // Extract CSS files
    const cssMatches = html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g);
    for (const match of cssMatches) {
      assets.push(match[1]);
    }
    
    // Extract preload links
    const preloadMatches = html.matchAll(/<link[^>]+rel="preload"[^>]+href="([^"]+)"/g);
    for (const match of preloadMatches) {
      assets.push(match[1]);
    }
    
    // Filter to only include static assets
    return assets.filter(asset => 
      asset.startsWith('/static/') || 
      asset.startsWith('./static/') ||
      asset.includes('/static/')
    );
  }

  async findMissingAssets(assets) {
    const cacheNames = await caches.keys();
    const staticCacheName = cacheNames.find(name => name.includes('static'));
    
    if (!staticCacheName) return assets; // No static cache, all assets are missing
    
    const cache = await caches.open(staticCacheName);
    const cachedRequests = await cache.keys();
    const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);
    
    return assets.filter(asset => {
      const assetPath = asset.startsWith('/') ? asset : '/' + asset;
      return !cachedUrls.includes(assetPath);
    });
  }

  async preloadAssets(assets) {
    const batchSize = 3; // Preload in small batches to avoid overwhelming
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(asset => this.preloadAsset(asset))
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async preloadAsset(assetUrl) {
    try {
      // Fetch the asset
      const response = await fetch(assetUrl);
      
      if (response.ok) {
        // Cache the asset
        const cacheNames = await caches.keys();
        const staticCacheName = cacheNames.find(name => name.includes('static'));
        
        if (staticCacheName) {
          const cache = await caches.open(staticCacheName);
          await cache.put(assetUrl, response);
        }
      }
    } catch (error) {
      console.warn(`[Preloader] Failed to preload ${assetUrl}:`, error);
    }
  }

  // Check if preload should run based on user preferences
  shouldPreload() {
    // Check if user has disabled automatic preloading
    const preloadDisabled = localStorage.getItem('disable-preload') === 'true';
    if (preloadDisabled) return false;
    
    // Check connection type
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      // Don't preload on slow connections
      if (['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
        return false;
      }
      
      // Check data saver mode
      if (connection.saveData) {
        return false;
      }
    }
    
    return navigator.onLine;
  }

  // Manual trigger for preload
  async forcePreload() {
    if (this.isPreloading) {
      console.log('[Preloader] Preload already in progress');
      return;
    }
    
    await this.startBackgroundPreload();
  }

  // Stop preloading
  stop() {
    this.isPreloading = false;
  }
}

// Create singleton instance
const backgroundPreloader = new BackgroundPreloader();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    backgroundPreloader.init();
  });
} else {
  backgroundPreloader.init();
}

export default backgroundPreloader;
