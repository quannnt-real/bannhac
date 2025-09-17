// IndexedDB utilities for offline data management
class OfflineDatabase {
  constructor() {
    this.dbName = 'BanNhacOfflineDB';
    this.version = 2; // Tăng version để thêm songDetails store
    this.db = null;
    this.stores = {
      songs: 'songs',           // Song list (metadata only)  
      songDetails: 'songDetails', // Song details (with lyrics)
      favorites: 'favorites',
      playlists: 'playlists',
      images: 'images',
      syncQueue: 'syncQueue',
      syncInfo: 'syncInfo'      // Track sync status
    };
    // Sync state tracking to prevent duplicates
    this.smartSyncInProgress = false;
    this.lyricsSyncInProgress = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Songs store (list metadata)
        if (!db.objectStoreNames.contains(this.stores.songs)) {
          const songsStore = db.createObjectStore(this.stores.songs, { keyPath: 'id' });
          songsStore.createIndex('title', 'title', { unique: false });
          songsStore.createIndex('author', 'author', { unique: false });
          songsStore.createIndex('type_id', 'type_id', { unique: false });
          songsStore.createIndex('updated_at', 'updated_at', { unique: false });
        }
        
        // Song Details store (full data with lyrics)
        if (!db.objectStoreNames.contains(this.stores.songDetails)) {
          const songDetailsStore = db.createObjectStore(this.stores.songDetails, { keyPath: 'id' });
          songDetailsStore.createIndex('updated_at', 'updated_at', { unique: false });
        }
        
        // Favorites store
        if (!db.objectStoreNames.contains(this.stores.favorites)) {
          db.createObjectStore(this.stores.favorites, { keyPath: 'id' });
        }
        
        // Playlists store
        if (!db.objectStoreNames.contains(this.stores.playlists)) {
          const playlistsStore = db.createObjectStore(this.stores.playlists, { keyPath: 'id' });
          playlistsStore.createIndex('name', 'name', { unique: false });
          playlistsStore.createIndex('created_at', 'created_at', { unique: false });
        }
        
        // Images store (for caching images as blobs)
        if (!db.objectStoreNames.contains(this.stores.images)) {
          db.createObjectStore(this.stores.images, { keyPath: 'url' });
        }
        
        // Sync queue for offline operations
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
          const syncStore = db.createObjectStore(this.stores.syncQueue, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Sync info store (track last sync, counts, etc)
        if (!db.objectStoreNames.contains(this.stores.syncInfo)) {
          db.createObjectStore(this.stores.syncInfo, { keyPath: 'key' });
        }
      };
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async putMany(storeName, dataArray) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = dataArray.length;
      
      if (total === 0) {
        resolve([]);
        return;
      }
      
      const results = [];
      
      dataArray.forEach((data, index) => {
        const request = store.put(data);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          results[index] = request.result;
          completed++;
          if (completed === total) {
            resolve(results);
          }
        };
      });
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addToSyncQueue(operation) {
    const syncItem = {
      ...operation,
      timestamp: Date.now()
    };
    return await this.put(this.stores.syncQueue, syncItem);
  }

  async getSyncQueue() {
    return await this.getAll(this.stores.syncQueue);
  }

  async clearSyncQueue() {
    return await this.clear(this.stores.syncQueue);
  }
}

// Offline Manager class
class OfflineManager {
  constructor() {
    this.db = new OfflineDatabase();
    this.isInitialized = false;
    this.syncInProgress = false;
  }

  async init() {
    if (!this.isInitialized) {
      await this.db.init();
      this.isInitialized = true;
      
      // Listen for online events to sync data
      window.addEventListener('online', () => this.handleOnlineEvent());
    }
  }

  // Utility methods
  getDynamicBatchSize() {
    // Get connection info from network manager
    const connectionInfo = window.networkManager?.getConnectionInfo() || { connectionType: 'wifi' };
    
    // Get device performance hint
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = navigator.deviceMemory || 4; // GB, fallback to 4GB
    
    // Calculate dynamic batch size
    let batchSize = 10; // default
    
    switch (connectionInfo.connectionType) {
      case 'wifi':
        if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
          batchSize = 50; // High-end device
        } else if (deviceMemory >= 4 && hardwareConcurrency >= 4) {
          batchSize = 30; // Mid-range device
        } else {
          batchSize = 20; // Low-end device
        }
        break;
      case '4g':
      case 'lte':
        batchSize = deviceMemory >= 4 ? 20 : 15;
        break;
      case '3g':
        batchSize = 10;
        break;
      case '2g':
      case 'slow-2g':
        batchSize = 5;
        break;
      default:
        batchSize = 20; // Unknown connection
    }
    
    return batchSize;
  }

  async handleOnlineEvent() {
    // Import network manager to check sync preference
    try {
      const { networkManager } = await import('./networkManager');
      
      // Wait a moment for connection to stabilize
      setTimeout(() => {
        if (networkManager.shouldSync()) {
          this.syncWhenOnline();
        }
      }, 1000);
    } catch (error) {
      // Fallback: always sync
      this.syncWhenOnline();
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // Songs management
  async cacheSongs(songs) {
    await this.ensureInitialized();
    
    // Use putMany for batch insert/update - more efficient than individual puts
    return await this.db.putMany(this.db.stores.songs, songs);
  }

  async getCachedSongs() {
    await this.ensureInitialized();
    return await this.db.getAll(this.db.stores.songs);
  }

  async getCachedSong(id) {
    await this.ensureInitialized();
    return await this.db.get(this.db.stores.songs, id);
  }

  // Song Details management (with lyrics)
  async cacheSongDetails(songDetails) {
    await this.ensureInitialized();
    if (Array.isArray(songDetails)) {
      return await this.db.putMany(this.db.stores.songDetails, songDetails);
    } else {
      return await this.db.put(this.db.stores.songDetails, songDetails);
    }
  }

  async getCachedSongDetail(id) {
    // Alias for backward compatibility
    return await this.getCachedSongDetails(id);
  }

  async getCachedSongDetails(id) {
    await this.ensureInitialized();
    return await this.db.get(this.db.stores.songDetails, id);
  }

  async getAllCachedSongDetails() {
    await this.ensureInitialized();
    return await this.db.getAll(this.db.stores.songDetails);
  }

  // Sync info management
  async setSyncInfo(key, data) {
    await this.ensureInitialized();
    return await this.db.put(this.db.stores.syncInfo, { key, ...data, timestamp: Date.now() });
  }

  async getSyncInfo(key) {
    await this.ensureInitialized();
    return await this.db.get(this.db.stores.syncInfo, key);
  }

  async clearSyncInfo(key) {
    await this.ensureInitialized();
    return await this.db.delete(this.db.stores.syncInfo, key);
  }

  async deleteSongDetail(id) {
    await this.ensureInitialized();
    return await this.db.delete(this.db.stores.songDetails, id);
  }

  // Favorites management
  async cacheFavorites(favorites) {
    await this.ensureInitialized();
    return await this.db.putMany(this.db.stores.favorites, favorites);
  }

  async getCachedFavorites() {
    await this.ensureInitialized();
    return await this.db.getAll(this.db.stores.favorites);
  }

  async addFavoriteOffline(song) {
    await this.ensureInitialized();
    await this.db.put(this.db.stores.favorites, song);
    
    // Add to sync queue if offline
    if (!navigator.onLine) {
      await this.db.addToSyncQueue({
        operation: 'ADD_FAVORITE',
        data: song
      });
    }
  }

  async removeFavoriteOffline(songId) {
    await this.ensureInitialized();
    await this.db.delete(this.db.stores.favorites, songId);
    
    // Add to sync queue if offline
    if (!navigator.onLine) {
      await this.db.addToSyncQueue({
        operation: 'REMOVE_FAVORITE',
        data: { id: songId }
      });
    }
  }

  // Sync functionality with network awareness
  async syncWhenOnline() {
    if (this.syncInProgress) {
      return { success: true, reason: 'already_in_progress' };
    }

    // Check network conditions
    try {
      const { networkManager } = await import('./networkManager');
      
      if (!networkManager.shouldSync()) {
        return { success: false, reason: 'network_conditions_not_met' };
      }
    } catch (error) {
      // Could not check network conditions, proceeding with sync
    }

    // Use smart sync instead of the old sync logic
    return await this.performSmartSync();
  }

  // Utility methods
  async getSyncQueue() {
    await this.ensureInitialized();
    return await this.db.getSyncQueue();
  }

  // Smart sync methods
  async checkSyncNeeded() {
    try {
      await this.ensureInitialized();
      
      // Get last sync info
      const lastSyncInfo = await this.getSyncInfo('lastSync');
      const cachedSongs = await this.getCachedSongs();
      
      // Get count from API
      const { API_ENDPOINTS, buildApiUrl, apiCall } = await import('./apiConfig');
      const countUrl = buildApiUrl(API_ENDPOINTS.SONGS_COUNT);
      const countResponse = await apiCall(countUrl);
      
      if (!countResponse.success) {
        return { needed: false, reason: 'api_unavailable' };
      }
      
      const serverCount = countResponse.data.total_count;
      const serverLastUpdated = countResponse.data.last_updated;
      const cachedCount = cachedSongs.length;
      
      // Check if sync needed
      const syncNeeded = 
        !lastSyncInfo || 
        cachedCount !== serverCount ||
        (lastSyncInfo.lastUpdated !== serverLastUpdated);
      
      return {
        needed: syncNeeded,
        reason: !lastSyncInfo ? 'first_sync' : 
                cachedCount !== serverCount ? 'count_mismatch' : 
                'data_updated',
        serverInfo: {
          count: serverCount,
          lastUpdated: serverLastUpdated
        },
        localInfo: {
          count: cachedCount,
          lastSync: lastSyncInfo?.timestamp,
          lastUpdated: lastSyncInfo?.lastUpdated
        }
      };
    } catch (error) {
      return { needed: false, reason: 'error', error: error.message };
    }
  }

  async performSmartSync(context = 'manual') {
    // Prevent duplicate syncs
    if (this.smartSyncInProgress) {
      return { success: true, reason: 'already_in_progress' };
    }

    try {
      this.smartSyncInProgress = true;
      
      const syncCheck = await this.checkSyncNeeded();
      
      // For manual sync, always proceed to ensure user gets latest data
      // For auto sync, proceed only if needed
      if (!syncCheck.needed && context !== 'manual') {
        return { success: true, reason: 'not_needed', ...syncCheck };
      }
      
      // Perform sync
      const { API_ENDPOINTS, buildApiUrl, apiCall } = await import('./apiConfig');
      
      // Get cached songs to determine if this is first time sync
      const cachedSongs = await this.getCachedSongs();
      const isFirstTime = cachedSongs.length === 0;
      
      // Get last sync info for incremental sync
      const lastSyncInfo = await this.getSyncInfo('lastSync');
      const params = {};
      
      // For automatic sync, use incremental sync if available
      if (context !== 'manual' && lastSyncInfo && syncCheck.reason === 'data_updated' && !isFirstTime) {
        params.since = lastSyncInfo.lastUpdated;
      }
      
      const syncUrl = buildApiUrl(API_ENDPOINTS.SONGS_SYNC, params);
      const syncResponse = await apiCall(syncUrl);
      
      if (!syncResponse.success) {
        throw new Error('Sync API failed');
      }
      
      const songs = syncResponse.data;
      
      // Phân biệt giữa bài hát mới và bài hát được cập nhật
      let newSongs = 0;
      let updatedSongs = 0;
      
      if (songs.length > 0) {
        // Nếu là lần đầu tiên (Trường hợp 1), tất cả đều là bài mới
        if (isFirstTime) {
          newSongs = songs.length;
          updatedSongs = 0;
        } else {
          // Trường hợp 2,4,5,6: Phân biệt thêm mới vs cập nhật
          const cachedSongMap = new Map();
          cachedSongs.forEach(song => {
            cachedSongMap.set(song.id, {
              updated_date: song.updated_date,
              created_date: song.created_date
            });
          });
          
          for (const song of songs) {
            const cachedVersion = cachedSongMap.get(song.id);
            
            if (!cachedVersion) {
              // Bài hát chưa có trong cache
              const isNewSong = song.created_date === song.updated_date;
              if (isNewSong) {
                newSongs++;
              } else {
                // Bài hát đã tồn tại trên server nhưng chưa có trong cache local
                updatedSongs++;
              }
            } else {
              // Bài hát đã có trong cache - kiểm tra thời gian cập nhật
              if (song.updated_date !== cachedVersion.updated_date) {
                updatedSongs++;
              }
              // Nếu updated_date giống nhau thì không cần làm gì (không sync)
            }
          }
        }
        
        // Cache songs intelligently - only update what changed
        if (songs.length > 0) {
          if (isFirstTime) {
            // First time: cache all
            await this.cacheSongs(songs);
          } else {
            // Incremental update: only cache changed songs
            const cachedSongMap = new Map();
            cachedSongs.forEach(song => {
              cachedSongMap.set(song.id, song.updated_date);
            });
            
            const songsToUpdate = [];
            // Không xóa songDetails ở đây vì performSmartSync chỉ sync metadata
            // songDetails sẽ được xử lý bởi performFullLyricsSync sau đó
            
            for (const song of songs) {
              const cachedUpdatedDate = cachedSongMap.get(song.id);
              
              if (!cachedUpdatedDate || song.updated_date !== cachedUpdatedDate) {
                // Song is new or updated - need to cache metadata
                songsToUpdate.push(song);
              }
            }
            
            // Cache only changed songs metadata
            if (songsToUpdate.length > 0) {
              await this.cacheSongs(songsToUpdate);
            }
          }
        }
      }
      
      // Update sync info
      await this.setSyncInfo('lastSync', {
        lastUpdated: syncCheck.serverInfo.lastUpdated,
        count: syncCheck.serverInfo.count,
        syncedCount: songs.length,
        newSongs,
        updatedSongs,
        syncType: syncCheck.reason,
        isFirstTime
      });
      
      return {
        success: true,
        syncedSongs: songs.length,
        newSongs,
        updatedSongs,
        isFirstTime,
        syncType: syncCheck.reason,
        serverInfo: syncCheck.serverInfo,
        reason: songs.length === 0 ? (context === 'manual' ? 'manual_completed' : 'no_changes') : 'sync_completed',
        isManualSync: context === 'manual' // Flag to help notification logic
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Reset sync flag
      this.smartSyncInProgress = false;
    }
  }

  async performFullLyricsSync(progressCallback, forceRefreshIds = null) {
    // Prevent duplicate syncs
    if (this.lyricsSyncInProgress) {
      return { success: true, syncedCount: 0, reason: 'already_in_progress' };
    }

    try {
      this.lyricsSyncInProgress = true;
      
      // Get all songs from cache
      const allSongs = await this.getCachedSongs();
      const totalSongs = allSongs.length;
      
      if (totalSongs === 0) {
        return { success: true, syncedCount: 0 };
      }
      
      // Get existing song details to avoid re-downloading unchanged songs
      const existingDetails = await this.getAllCachedSongDetails();
      const existingDetailsMap = new Map();
      existingDetails.forEach(detail => {
        existingDetailsMap.set(detail.id, {
          updated_date: detail.updated_date,
          cached_at: detail.cached_at
        });
      });
      
      // Filter songs that need lyrics (new songs or updated songs)
      let songsNeedingLyrics = allSongs.filter(song => {
        // Nếu có danh sách force refresh, luôn check những bài đó
        if (forceRefreshIds && forceRefreshIds.includes(song.id)) {
          return true;
        }
        
        const existingDetail = existingDetailsMap.get(song.id);
        
        if (!existingDetail) {
          // Bài hát mới, chưa có lyrics
          return true;
        }
        
        // Kiểm tra xem bài hát có được cập nhật không dựa vào metadata
        if (song.updated_date && existingDetail.updated_date) {
          return song.updated_date !== existingDetail.updated_date;
        }
        
        // Fallback: nếu không có updated_date, không tải lại
        return false;
      });
      
      if (songsNeedingLyrics.length === 0) {
        return { success: true, syncedCount: 0, reason: 'all_cached' };
      }
      
      // Dynamic batch size based on connection and device capability
      const batchSize = this.getDynamicBatchSize();
      let syncedCount = 0;
      
      const { API_ENDPOINTS, buildApiUrl, apiCall } = await import('./apiConfig');
      
      for (let i = 0; i < songsNeedingLyrics.length; i += batchSize) {
        const batch = songsNeedingLyrics.slice(i, i + batchSize);
        const batchIds = batch.map(s => s.id).join(',');
        
        try {
          const apiParams = { 
            ids: batchIds, 
            full: 'true'
          };
          
          // Only add force parameter if we're forcing refresh specific songs
          if (forceRefreshIds && batch.some(song => forceRefreshIds.includes(song.id))) {
            apiParams.force = Date.now(); // Cache busting only for forced songs
          }
          
          const syncUrl = buildApiUrl(API_ENDPOINTS.SONGS_SYNC, apiParams);
          
          const syncResponse = await apiCall(syncUrl);
          
          if (syncResponse.success && syncResponse.data.length > 0) {
            // Delete outdated lyrics before caching new data
            await Promise.all(batch.map(song => 
              this.db.delete(this.db.stores.songDetails, song.id)
            ));
            
            // Cache new song details from this batch
            await this.cacheSongDetails(syncResponse.data);
            syncedCount += syncResponse.data.length;
            
            // Progress callback
            if (progressCallback) {
              progressCallback({
                completed: i + batch.length,
                total: songsNeedingLyrics.length,
                currentBatch: syncResponse.data.length
              });
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          // Continue with next batch
        }
      }
      
      // Update sync info
      await this.setSyncInfo('fullLyricsSync', {
        completedAt: Date.now(),
        totalSongs: totalSongs,
        syncedCount: syncedCount,
        skippedCount: totalSongs - syncedCount
      });
      
      return {
        success: true,
        totalSongs,
        syncedCount,
        skippedCount: totalSongs - syncedCount
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Reset sync flag
      this.lyricsSyncInProgress = false;
    }
  }

  async clearAllData() {
    await this.ensureInitialized();
    console.log('[OfflineManager] Clearing all IndexedDB data...');
    
    // Check current data before clearing
    const beforeSongs = await this.getCachedSongs();
    const beforeDetails = await this.db.getAll(this.db.stores.songDetails);
    console.log('[OfflineManager] Before clear - Songs:', beforeSongs.length, 'Details:', beforeDetails.length);
    
    await Promise.all([
      this.db.clear(this.db.stores.songs),
      this.db.clear(this.db.stores.songDetails),
      this.db.clear(this.db.stores.favorites),
      this.db.clear(this.db.stores.playlists),
      this.db.clear(this.db.stores.images),
      this.db.clear(this.db.stores.syncQueue),
      this.db.clear(this.db.stores.syncInfo)  // Also clear sync info
    ]);
    
    // Verify data is cleared
    const afterSongs = await this.getCachedSongs();
    const afterDetails = await this.db.getAll(this.db.stores.songDetails);
    console.log('[OfflineManager] After clear - Songs:', afterSongs.length, 'Details:', afterDetails.length);
    
    if (afterSongs.length > 0 || afterDetails.length > 0) {
      console.error('[OfflineManager] WARNING: Data not fully cleared!');
    } else {
      console.log('[OfflineManager] All IndexedDB data cleared successfully');
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();
export default offlineManager;
