// Offline Manager Settings Component
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Database, Download, Trash2, RefreshCw } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { useCacheManager } from './CacheManager';
import DonateInfo from './DonateInfo';

const OfflineManagerPanel = ({ onClose }) => {
  const { offlineManager, isOffline } = useOffline();
  const { updateCache, clearAllCaches, preloadResources, loading } = useCacheManager();
  const [cacheStats, setCacheStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
      await offlineManager.ensureInitialized();
      const songs = await offlineManager.getCachedSongs();
      
      setCacheStats({
        songs: songs.length
      });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    
    // Notify sync start
    window.dispatchEvent(new CustomEvent('syncNotification', {
      detail: { type: 'sync_start' }
    }));
    
    try {
      // Step 1: Update static resources cache AND preload critical resources
      console.log('[OfflineManagerPanel] Starting cache update and preload...');
      
      const [cacheResult, preloadResult] = await Promise.all([
        updateCache(),
        preloadResources()
      ]);
      
      console.log('[OfflineManagerPanel] Cache update result:', cacheResult);
      console.log('[OfflineManagerPanel] Preload result:', preloadResult);
      
      // Check if cache operations failed
      if (cacheResult && !cacheResult.success) {
        console.warn('[OfflineManagerPanel] Cache update failed:', cacheResult.error);
      }
      
      if (preloadResult && !preloadResult.success) {
        console.warn('[OfflineManagerPanel] Preload failed:', preloadResult.error);
      }
      
      // Step 2: Sync data
      const result = await offlineManager.performSmartSync('manual');
      await loadCacheStats();
      
      // Notify sync complete
      window.dispatchEvent(new CustomEvent('syncNotification', {
        detail: { 
          type: 'sync_complete', 
          syncResult: result 
        }
      }));
      
      // Only dispatch offlineSyncComplete if there are actual changes
      // This prevents unnecessary reloads in HomePage and SongDetailPage
      if (result.newSongs > 0 || result.updatedSongs > 0) {
        window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
          detail: { 
            newSongs: result.newSongs || 0, 
            updatedSongs: result.updatedSongs || 0,
            manualSync: true
          }
        }));
      }
      
      // Show success message with details
      let successMessage = 'Cập nhật thành công!';
      
      if (preloadResult && preloadResult.cached && preloadResult.total) {
        successMessage += ` Đã cache ${preloadResult.cached}/${preloadResult.total} tài nguyên.`;
      }
      
      if (cacheResult && cacheResult.method === 'fallback') {
        successMessage += ' (Chế độ fallback)';
      }
      
    } catch (error) {
      console.error('[OfflineManagerPanel] Sync failed:', error);
      
      // More specific error message
      let errorMessage = 'Có lỗi khi cập nhật. ';
      
      if (error.message?.includes('Service Worker')) {
        errorMessage += 'Vui lòng tải lại trang và thử lại.';
      } else if (error.message?.includes('Cache API not supported')) {
        errorMessage += 'Trình duyệt không hỗ trợ cache offline (development mode).';
      } else if (error.message?.includes('network')) {
        errorMessage += 'Kiểm tra kết nối mạng và thử lại.';
      } else {
        errorMessage += 'Vui lòng thử lại sau.';
      }
      
      alert(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu và cache? App sẽ tự động tải lại với dữ liệu mới nhất.')) {
      try {
        // Show clearing notification
        window.dispatchEvent(new CustomEvent('syncNotification', {
          detail: { type: 'clearing_data' }
        }));

        // Clear everything: IndexedDB + Cache Storage + Service Worker
        const clearCacheResult = await clearAllCaches();
        await offlineManager.clearAllData();
        
        console.log('[OfflineManagerPanel] Cache clear result:', clearCacheResult);
        
        // Clear Service Worker registration
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }
        
        // Clear all browser storage
        if (window.localStorage) {
          window.localStorage.clear();
        }
        if (window.sessionStorage) {
          window.sessionStorage.clear();
        }
        
        // Notify data cleared
        window.dispatchEvent(new CustomEvent('syncNotification', {
          detail: { type: 'data_cleared' }
        }));
        
        // Force reload with cache busting
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('refresh', Date.now());
        window.location.replace(currentUrl.toString());
      } catch (error) {
        console.error('Error clearing data:', error);
        
        // Show specific error message
        let errorMessage = 'Có lỗi khi xóa dữ liệu. ';
        if (error.message?.includes('Cache API not supported')) {
          errorMessage += 'Trình duyệt không hỗ trợ cache (development mode). Trang sẽ tự động tải lại.';
        } else {
          errorMessage += 'Trang sẽ tự động tải lại.';
        }
        
        alert(errorMessage);
        
        // Fallback: simple reload
        window.location.reload(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database size={20} />
              Cập nhật dữ liệu bài hát
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Song Data Only */}
          {cacheStats && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Download size={16} />
                Dữ liệu bài hát
              </h4>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-600">{cacheStats.songs}</span>
                  <div className="text-sm text-green-700 mt-1">bài hát đã tải</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button 
              onClick={handleSyncNow} 
              disabled={syncing || isOffline}
              className="w-full"
            >
              <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang cập nhật...' : 'Cập nhật'}
            </Button>

            <Button 
              onClick={handleClearAllData} 
              variant="destructive"
              className="w-full"
            >
              <Trash2 size={16} className="mr-2" />
              Xóa dữ liệu
            </Button>
          </div>

          {/* Donate Information */}
          <DonateInfo variant="full" className="mt-4" />
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineManagerPanel;
