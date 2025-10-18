// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://htnguonsong.com' // Backend API server
  : ''; // Empty string sẽ sử dụng proxy trong development

export const API_ENDPOINTS = {
  SONGS: `${API_BASE_URL}/api/songs`,
  SONGS_COUNT: `${API_BASE_URL}/api/songs/count`,
  SONGS_SYNC: `${API_BASE_URL}/api/songs/sync`,
  SONG_VIEW: `${API_BASE_URL}/api/songs/view`,
  // Thêm các endpoint khác nếu cần
};

// Helper function để build API URL với params
export const buildApiUrl = (endpoint, params = {}) => {
  let url;
  
  // Nếu endpoint là relative URL và trong development, sử dụng current origin
  if (endpoint.startsWith('/') && process.env.NODE_ENV === 'development') {
    url = new URL(endpoint, window.location.origin);
  } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    // Endpoint đã có protocol
    url = new URL(endpoint);
  } else {
    // Fallback: sử dụng current origin
    url = new URL(endpoint, window.location.origin);
  }
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Import offline manager
import { offlineManager } from './offlineManager';

// Fetch wrapper với offline support và timeout
export const apiCall = async (url, options = {}) => {
  const isOnline = navigator.onLine;
  const timeout = options.timeout || 10000; // Default 10 seconds timeout
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Try online request first if online
    if (isOnline) {
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...options.headers
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`[ApiConfig] HTTP error! status: ${response.status} for ${url}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache successful responses for offline use
      if (options.cacheKey) {
        await cacheApiResponse(options.cacheKey, data);
      }
      
      return data;
    } else {
      clearTimeout(timeoutId);
      
      // Offline - try to get cached data
      if (options.cacheKey) {
        const cachedData = await getCachedApiResponse(options.cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      throw new Error('No internet connection and no cached data available');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort error (timeout)
    if (error.name === 'AbortError') {
      error = new Error(`Request timeout after ${timeout}ms`);
    }
    
    // If online request fails, try cache as fallback
    if (isOnline && options.cacheKey) {
      const cachedData = await getCachedApiResponse(options.cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    console.error(`[ApiConfig] Request failed for ${url}:`, error);
    throw error;
  }
};

// Cache API responses
const cacheApiResponse = async (key, data) => {
  try {
    await offlineManager.init();
    // Use a simple approach to cache API responses
    localStorage.setItem(`api_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    // Error caching API response
  }
};

// Get cached API responses
const getCachedApiResponse = async (key) => {
  try {
    const cached = localStorage.getItem(`api_cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    // Error getting cached API response
  }
  return null;
};

// Enhanced API calls with offline support
// export const fetchSongs = async (params = {}) => {
//   const url = buildApiUrl(API_ENDPOINTS.SONGS, params);
  
//   try {
//     const data = await apiCall(url, { cacheKey: 'songs' });
    
//     // Cache songs in IndexedDB for offline access
//     if (data && Array.isArray(data)) {
//       await offlineManager.cacheSongs(data);
//     }
    
//     return data;
//   } catch (error) {
//     // Try to get cached songs if API fails
//     const cachedSongs = await offlineManager.getCachedSongs();
//     if (cachedSongs && cachedSongs.length > 0) {
//       return cachedSongs;
//     }
//     throw error;
//   }
// };

export const fetchSongById = async (id) => {
  try {
    // First check if we have cached song detail with lyrics
    const cachedDetail = await offlineManager.getCachedSongDetails(parseInt(id));
    
    if (cachedDetail && (cachedDetail.lyric || cachedDetail.lyrics)) {
      // Have cached detail - return immediately for fast UX
      // Check for updates in background (non-blocking)
      if (navigator.onLine) {
        // Background update check - don't await, don't block
        (async () => {
          try {
            const syncUrl = buildApiUrl(`${API_ENDPOINTS.SONGS_SYNC}`, { 
              ids: id.toString(), 
              full: 'true' 
            });
            
            const syncResponse = await apiCall(syncUrl);
            if (syncResponse.success && syncResponse.data.length > 0) {
              const onlineData = syncResponse.data[0];
              
              // Compare timestamps
              const onlineTime = new Date(onlineData.updated_date || 0).getTime();
              const cachedTime = new Date(cachedDetail.updated_date || 0).getTime();
              
              if (onlineTime > cachedTime) {
                // Update cache silently in background
                await offlineManager.cacheSongDetails(onlineData);
                
                // Dispatch event to notify UI about the update
                window.dispatchEvent(new CustomEvent('songUpdated', {
                  detail: { songId: id, updatedData: onlineData }
                }));
              }
            }
          } catch (error) {
            // Silent fail - cache is already returned
            console.debug(`[fetchSongById] Background update check failed for song ${id}:`, error);
          }
        })();
      }
      
      // Return cached data immediately (non-blocking)
      return cachedDetail;
    }
    
    // Need to fetch from API (no cache or no lyrics)
    const syncUrl = buildApiUrl(`${API_ENDPOINTS.SONGS_SYNC}`, { 
      ids: id.toString(), 
      full: 'true' 
    });
    
    const syncResponse = await apiCall(syncUrl);
    if (syncResponse.success && syncResponse.data.length > 0) {
      const songDetail = syncResponse.data[0];
      
      // Cache the detail
      await offlineManager.cacheSongDetails(songDetail);
      
      return songDetail;
    }
    
    // Fallback to cached detail (even if incomplete)
    if (cachedDetail) {
      return cachedDetail;
    }
    
    // Last resort: try cached song from list
    const cachedSong = await offlineManager.getCachedSong(parseInt(id));
    if (cachedSong) {
      return cachedSong;
    }
    
    throw new Error(`Song ${id} not found`);
    
  } catch (error) {
    // Final fallback attempts
    try {
      const cachedDetail = await offlineManager.getCachedSongDetails(parseInt(id));
      if (cachedDetail) return cachedDetail;
      
      const cachedSong = await offlineManager.getCachedSong(parseInt(id));
      if (cachedSong) return cachedSong;
    } catch (fallbackError) {
      // Fallback failed
    }
    
    throw error;
  }
};
