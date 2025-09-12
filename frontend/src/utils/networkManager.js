// Network Connection Manager
class NetworkManager {
  constructor() {
    this.connectionType = 'unknown';
    this.isOnline = navigator.onLine;
    this.syncPreference = this.loadSyncPreference();
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.detectConnectionType();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.connectionType = 'offline';
    });

    // Detect initial connection type
    this.detectConnectionType();
  }

  detectConnectionType() {
    if (!this.isOnline) {
      this.connectionType = 'offline';
      return;
    }

    // Check if Network Information API is available
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        // Map connection types
        const type = connection.effectiveType || connection.type || 'unknown';
        
        // Classify connection types
        if (['wifi', 'ethernet'].includes(type) || connection.type === 'wifi') {
          this.connectionType = 'wifi';
        } else if (['4g', '3g', '2g', 'slow-2g'].includes(type) || 
                   ['cellular', 'mobile'].includes(connection.type)) {
          this.connectionType = 'mobile';
        } else {
          // Default to wifi if we can't determine (safer for sync)
          this.connectionType = 'wifi';
        }

        // Listen for connection changes
        connection.addEventListener('change', () => {
          this.detectConnectionType();
        });
        
        return;
      }
    }

    // Fallback: assume wifi if online but can't detect type
    this.connectionType = this.isOnline ? 'wifi' : 'offline';
  }

  loadSyncPreference() {
    const saved = localStorage.getItem('syncPreference');
    // Default to 'always' (sync on both wifi and mobile)
    return saved || 'always';
  }

  saveSyncPreference(preference) {
    this.syncPreference = preference;
    localStorage.setItem('syncPreference', preference);
  }

  setSyncPreference(preference) {
    if (['always', 'wifi-only'].includes(preference)) {
      this.saveSyncPreference(preference);
    }
  }

  shouldSync() {
    if (!this.isOnline) {
      return false;
    }

    switch (this.syncPreference) {
      case 'wifi-only':
        return this.connectionType === 'wifi';
      case 'always':
      default:
        return true; // Sync on both wifi and mobile
    }
  }

  getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      syncPreference: this.syncPreference,
      canSync: this.shouldSync(),
      connectionName: this.getConnectionDisplayName()
    };
  }

  getConnectionDisplayName() {
    switch (this.connectionType) {
      case 'wifi': return 'WiFi';
      case 'mobile': return '4G/5G';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  }

  // Get data usage estimate for sync
  estimateDataUsage(syncQueueLength = 0) {
    // Estimate based on typical sync operations
    const avgSyncItemSize = 2; // KB per sync item
    const overhead = 0.5; // KB overhead per request
    
    return {
      estimatedKB: (syncQueueLength * avgSyncItemSize) + overhead,
      formatted: this.formatDataSize((syncQueueLength * avgSyncItemSize) + overhead)
    };
  }

  formatDataSize(kb) {
    if (kb < 1) return `${Math.round(kb * 1000)} B`;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}

// Export singleton
export const networkManager = new NetworkManager();
export default networkManager;
