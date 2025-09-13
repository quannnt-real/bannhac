// Cache Manager for handling static resource cache operations
import React, { useState, useEffect } from 'react';

class CacheManager {
  constructor() {
    this.serviceWorker = null;
    this.listeners = new Map();
  }

  async init() {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      
      if ('serviceWorker' in navigator && isSecureContext) {
        // Wait for service worker registration
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          this.serviceWorker = await navigator.serviceWorker.ready;
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
          
          console.log('[CacheManager] Service Worker initialized successfully');
        } else {
          console.warn('[CacheManager] Service Worker not registered');
          this.serviceWorker = null;
        }
      } else {
        console.warn('[CacheManager] Service Worker not supported or not in secure context');
        this.serviceWorker = null;
      }
    } catch (error) {
      console.warn('[CacheManager] Failed to initialize Service Worker:', error);
      this.serviceWorker = null;
    }
  }

  handleServiceWorkerMessage(event) {
    const { type } = event.data;
    
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => callback(event.data));
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  // Clear all caches and force reload
  async clearAllCaches() {
    try {
      if (!this.serviceWorker) {
        await this.init();
      }

      // Check if service worker is available
      if (!this.serviceWorker || !this.serviceWorker.active) {
        console.warn('[CacheManager] Service Worker not available, using fallback cache clear');
        return await this.fallbackClearCaches();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cache clear timeout'));
        }, 30000);

        this.on('CACHES_CLEARED', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        // Send message to service worker
        this.serviceWorker.active.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      });
    } catch (error) {
      console.warn('[CacheManager] Service Worker clear failed, using fallback:', error);
      return await this.fallbackClearCaches();
    }
  }

  // Fallback cache clear when Service Worker is not available
  async fallbackClearCaches() {
    try {
      if (!('caches' in window)) {
        return { success: true, message: 'Cache API not supported' };
      }

      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      return { success: true, method: 'fallback' };
    } catch (error) {
      console.error('[CacheManager] Fallback cache clear failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Update cache with latest resources
  async updateCache() {
    try {
      if (!this.serviceWorker) {
        await this.init();
      }

      // Check if service worker is available and active
      if (!this.serviceWorker || !this.serviceWorker.active) {
        console.warn('[CacheManager] Service Worker not available, using fallback cache update');
        return await this.fallbackCacheUpdate();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cache update timeout'));
        }, 60000);

        this.on('CACHE_UPDATE_COMPLETE', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        // Send message to service worker
        this.serviceWorker.active.postMessage({
          type: 'CACHE_UPDATE'
        });
      });
    } catch (error) {
      console.warn('[CacheManager] Service Worker update failed, using fallback:', error);
      return await this.fallbackCacheUpdate();
    }
  }

  // Fallback cache update when Service Worker is not available
  async fallbackCacheUpdate() {
    try {
      if (!('caches' in window)) {
        console.warn('[CacheManager] Cache API not supported in this environment');
        // For development mode without Cache API, just return success
        return {
          success: true,
          message: 'Cache update skipped (development mode)',
          updated: []
        };
      }

      // Clear old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.includes('bannhac-') && !name.includes('v1.1.0'))
          .map(name => caches.delete(name))
      );

      // Open new cache and cache essential resources
      const cache = await caches.open('bannhac-static-v1.1.0');
      
      // Cache essential files
      const essentialFiles = [
        '/index.html',
        '/manifest.json',
        '/favicon.ico'
      ];

      await Promise.allSettled(
        essentialFiles.map(file => cache.add(file).catch(err => 
          console.warn(`Failed to cache ${file}:`, err)
        ))
      );

      return { success: true, method: 'fallback' };
    } catch (error) {
      console.error('[CacheManager] Fallback cache update failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Preload critical resources for offline functionality
  async preloadCriticalResources() {
    try {
      if (!this.serviceWorker) {
        await this.init();
      }

      // Check if service worker is available and active
      if (!this.serviceWorker || !this.serviceWorker.active) {
        console.warn('[CacheManager] Service Worker not available, using fallback preload');
        return await this.fallbackPreloadResources();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Preload timeout'));
        }, 120000); // 2 minutes for preload

        this.on('PRELOAD_COMPLETE', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        // Send message to service worker
        this.serviceWorker.active.postMessage({
          type: 'PRELOAD_CRITICAL_RESOURCES'
        });
      });
    } catch (error) {
      console.warn('[CacheManager] Service Worker preload failed, using fallback:', error);
      return await this.fallbackPreloadResources();
    }
  }

  // Fallback preload when Service Worker is not available
  async fallbackPreloadResources() {
    try {
      if (!('caches' in window)) {
        console.warn('[CacheManager] Cache API not supported, skipping preload');
        return { success: true, message: 'Cache API not supported', method: 'fallback' };
      }

      const cache = await caches.open('bannhac-static-fallback');
      const resourcesToCache = [
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.ico'
      ];

      let cachedCount = 0;
      for (const resource of resourcesToCache) {
        try {
          await cache.add(resource);
          cachedCount++;
        } catch (error) {
          console.warn(`[CacheManager] Failed to cache resource: ${resource}`, error);
        }
      }

      return { 
        success: true, 
        method: 'fallback',
        cached: cachedCount,
        total: resourcesToCache.length 
      };
    } catch (error) {
      console.error('[CacheManager] Fallback preload failed:', error);
      return { success: false, error: error.message, method: 'fallback' };
    }
  }

  // Fallback preload when Service Worker is not available
  async fallbackPreload() {
    try {
      if (!('caches' in window)) {
        return { success: true, message: 'Cache API not supported' };
      }

      // Simple fallback - just ensure basic cache exists
      const cache = await caches.open('bannhac-static-v1.1.0');
      await cache.add('/index.html').catch(() => {});
      
      return { success: true, method: 'fallback' };
    } catch (error) {
      console.error('[CacheManager] Fallback preload failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cache statistics
  async getCacheStats() {
    if (!('caches' in window)) {
      return { totalSize: 0, cacheCount: 0, caches: [] };
    }

    try {
      const cacheNames = await caches.keys();
      const cacheStats = [];
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        let cacheSize = 0;

        // Estimate cache size (this is approximate)
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const clone = response.clone();
            const blob = await clone.blob();
            cacheSize += blob.size;
          }
        }

        cacheStats.push({
          name: cacheName,
          size: cacheSize,
          itemCount: keys.length
        });
        totalSize += cacheSize;
      }

      return {
        totalSize,
        cacheCount: cacheNames.length,
        caches: cacheStats
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalSize: 0, cacheCount: 0, caches: [] };
    }
  }

  // Check if app can work offline
  async checkOfflineCapability() {
    if (!('caches' in window)) {
      return { capable: false, reason: 'Cache API not supported' };
    }

    try {
      const cacheNames = await caches.keys();
      const hasStaticCache = cacheNames.some(name => name.includes('static'));
      
      if (!hasStaticCache) {
        return { capable: false, reason: 'No static cache found' };
      }

      // Check for essential files
      const staticCache = await caches.open(cacheNames.find(name => name.includes('static')));
      const cachedRequests = await staticCache.keys();
      const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);
      
      const essentialFiles = ['/index.html', '/manifest.json'];
      const hasEssentialFiles = essentialFiles.every(file => 
        cachedUrls.some(url => url === file || url.includes(file))
      );

      if (!hasEssentialFiles) {
        return { capable: false, reason: 'Essential files not cached' };
      }

      // Check for JS/CSS files
      const hasJsFiles = cachedUrls.some(url => url.includes('/static/js/'));
      const hasCssFiles = cachedUrls.some(url => url.includes('/static/css/'));

      if (!hasJsFiles || !hasCssFiles) {
        return { capable: false, reason: 'JS/CSS files not cached' };
      }

      return { capable: true, reason: 'All essential resources cached' };
    } catch (error) {
      console.error('Failed to check offline capability:', error);
      return { capable: false, reason: 'Error checking cache' };
    }
  }

  // Force update service worker
  async updateServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      
      // If there's a waiting service worker, activate it
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  // Format file size for display
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// React Hook for using CacheManager
export const useCacheManager = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [offlineCapable, setOfflineCapable] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cacheManager.init();
    loadCacheStats();
    checkOfflineCapability();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await cacheManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const checkOfflineCapability = async () => {
    try {
      const capability = await cacheManager.checkOfflineCapability();
      setOfflineCapable(capability);
    } catch (error) {
      console.error('Failed to check offline capability:', error);
    }
  };

  const clearAllCaches = async () => {
    setLoading(true);
    try {
      const result = await cacheManager.clearAllCaches();
      
      await loadCacheStats();
      await checkOfflineCapability();
      
      console.log('[CacheManager] Cache clear completed:', result);
      return result;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      // Return failure result instead of throwing
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateCache = async () => {
    setLoading(true);
    try {
      const result = await cacheManager.updateCache();
      
      await loadCacheStats();
      await checkOfflineCapability();
      
      console.log('[CacheManager] Cache update completed:', result);
      return result;
    } catch (error) {
      console.error('Failed to update cache:', error);
      // Return failure result instead of throwing
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const preloadResources = async () => {
    setLoading(true);
    try {
      const result = await cacheManager.preloadCriticalResources();
      await loadCacheStats();
      await checkOfflineCapability();
      
      console.log('[CacheManager] Preload completed:', result);
      return result;
    } catch (error) {
      console.error('Failed to preload resources:', error);
      // Return failure result instead of throwing
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    cacheStats,
    offlineCapable,
    loading,
    clearAllCaches,
    updateCache,
    preloadResources,
    refreshStats: loadCacheStats,
    formatSize: cacheManager.formatSize.bind(cacheManager)
  };
};

export default cacheManager;
