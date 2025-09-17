// Sync Notification Manager Component
import { useEffect, useRef, useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { useNotificationContext } from './NotificationProvider';
import { offlineManager } from '../utils/offlineManager';

const SyncNotificationManager = () => {
  const { isOnline, isOffline } = useOffline();
  const {
    showSyncingNotification,
    showSyncCompleteNotification,
    showOfflineNotification,
    showOnlineNotification,
    showUpdateNotification,
    showNotification
  } = useNotificationContext(); // Changed from useNotifications to useNotificationContext

  const prevOnlineStatus = useRef(null); // Use null initially to detect first change
  const hasShownInitialSync = useRef(false);
  const appInitialized = useRef(false);

  // Common sync logic to avoid duplication
  const handleBackgroundSync = async (context = 'background') => {
    try {
      const syncResult = await offlineManager.performSmartSync(context);
      
      if (syncResult.success && (syncResult.newSongs > 0 || syncResult.updatedSongs > 0)) {
        // Không hiển thị thông báo số lượng bài hát ngay lập tức
        // Chỉ hiển thị thông báo đang cập nhật để user biết có gì đó đang xảy ra
        showSyncingNotification(`Đang cập nhật dữ liệu...`);
        
        // Phát event để HomePage cập nhật dữ liệu và bắt đầu lyrics sync
        window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
          detail: { 
            newSongs: syncResult.newSongs, 
            updatedSongs: syncResult.updatedSongs 
          }
        }));
      }
    } catch (error) {
      console.warn(`Background sync failed (${context}):`, error);
    }
  };

  // Helper function to show sync result notifications
  const showSyncResultNotification = (newCount, updatedCount, hasLyrics = false) => {
    const lyricsText = hasLyrics ? ' (bao gồm lời)' : '';
    
    if (newCount > 0 && updatedCount > 0) {
      showNotification('success', `Đã cập nhật ${newCount} bài mới và ${updatedCount} bài hát${lyricsText}`, 5000);
    } else if (newCount > 0) {
      showNotification('success', `Đã tải ${newCount} bài hát mới${lyricsText}`, 5000);
    } else if (updatedCount > 0) {
      showNotification('success', `Đã cập nhật ${updatedCount} bài hát${lyricsText}`, 5000);
    }
  };

  // Handle app initialization (Case 1: First load)
  useEffect(() => {
    const handleAppInitialization = async () => {
      if (appInitialized.current) return;
      appInitialized.current = true;

      try {
        await offlineManager.ensureInitialized();
        const cachedSongs = await offlineManager.getCachedSongs();
        
        // Wait for network status to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Case 1: First time load or after clearing data
        if (cachedSongs.length === 0 && isOnline) {
          showNotification('info', 'Đang đồng bộ dữ liệu lần đầu...', 60000);
          hasShownInitialSync.current = true;
          
          // Don't wait for sync here - the completion notification will be triggered
          // by the lyrics_sync_complete event from HomePage
        }
        // Case 5: App restart - check for updates
        else if (cachedSongs.length > 0 && isOnline) {
          // Delay to ensure smooth app startup
          setTimeout(() => handleBackgroundSync('app_restart'), 2000);
        }
      } catch (error) {
      }
    };

    // Delay to ensure all contexts are ready
    setTimeout(handleAppInitialization, 500);
  }, [showUpdateNotification]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleNetworkStatusChange = async () => {
      // Set initial status on first run
      if (prevOnlineStatus.current === null) {
        prevOnlineStatus.current = isOnline;
        return;
      }
      
      // Skip if app is not initialized yet
      if (!appInitialized.current) return;
      
      // Case 3: Going offline
      if (prevOnlineStatus.current && isOffline) {
        showOfflineNotification();
      }
      // Case 4: Coming back online
      else if (!prevOnlineStatus.current && isOnline) {
        showOnlineNotification();
        
        // Wait a moment for connection to stabilize
        setTimeout(() => handleBackgroundSync('network_restored'), 1500);
      }
      
      prevOnlineStatus.current = isOnline;
    };

    handleNetworkStatusChange();
  }, [isOnline, isOffline, showOnlineNotification, showOfflineNotification, showUpdateNotification]);

  // Listen for manual sync events from OfflineManagerPanel
  useEffect(() => {
    const handleManualSync = async (event) => {
      const { detail } = event;
      
      if (detail.type === 'sync_start') {
        showNotification('info', 'Đang cập nhật ứng dụng...', 60000);
      } else if (detail.type === 'sync_complete') {
        const { syncResult, lyricsResult } = detail;
        
        // Check if this is from OfflineManagerPanel (has syncResult) or HomePage (has message)
        if (detail.message && !syncResult) {
          // This is from HomePage - just show the message
          showNotification('success', detail.message, 5000);
          return;
        }
        
        // Validate syncResult exists (from OfflineManagerPanel)
        if (!syncResult) {
          console.error('[SyncNotificationManager] syncResult is undefined');
          showNotification('info', 'Cập nhật hoàn tất', 3000);
          return;
        }
        
        if (syncResult.success) {
          if (syncResult.isFirstTime) {
            hasShownInitialSync.current = true;
            // Không hiển thị thông báo ngay, chờ lyrics sync hoàn tất
            showSyncingNotification(`Đang tải dữ liệu...`);
            
            window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
              detail: { 
                newSongs: syncResult.newSongs, 
                updatedSongs: syncResult.updatedSongs 
              }
            }));
          } else if (syncResult.newSongs > 0 || syncResult.updatedSongs > 0) {
            const newCount = syncResult.newSongs;
            const updatedCount = syncResult.updatedSongs;
            
            // Check if lyrics were synced too
            const hasLyrics = lyricsResult && lyricsResult.success && lyricsResult.syncedCount > 0;
            
            showSyncResultNotification(newCount, updatedCount, hasLyrics);
          } else {
            // Kiểm tra lý do không có thay đổi
            if (syncResult.reason === 'not_needed') {
              showNotification('info', "Dữ liệu đã được cập nhật (không có thay đổi mới)", 3000);
            } else if (syncResult.reason === 'no_changes') {
              showNotification('info', "Không có dữ liệu mới từ server", 3000);
            } else if (syncResult.reason === 'manual_completed') {
              // Manual sync hoàn tất - sử dụng helper function có sẵn
              const newCount = syncResult.newSongs || 0;
              const updatedCount = syncResult.updatedSongs || 0;
              const hasLyrics = lyricsResult && lyricsResult.syncedCount > 0;
              
              if (newCount > 0 || updatedCount > 0) {
                // Có bài mới hoặc cập nhật - dùng helper function
                showSyncResultNotification(newCount, updatedCount, hasLyrics);
              } else if (hasLyrics) {
                // Chỉ có lyrics cập nhật
                showNotification('success', `Đã cập nhật lời cho ${lyricsResult.syncedCount} bài hát`, 3000);
              } else {
                // Không có gì thay đổi
                showNotification('success', "Đã kiểm tra - tất cả dữ liệu đã là mới nhất", 3000);
              }
            } else {
              showNotification('success', "Kiểm tra cập nhật hoàn tất", 3000);
            }
          }
        } else {
          // syncResult.success is false
          console.error('[SyncNotificationManager] Sync failed:', syncResult);
          showNotification('info', 'Có lỗi khi cập nhật dữ liệu', 3000);
        }
      } else if (detail.type === 'clearing_data') {
        showNotification('info', 'Đang xóa dữ liệu...', 10000);
      } else if (detail.type === 'data_cleared') {
        showNotification('success', 'Đã xóa toàn bộ dữ liệu. Đang tải lại...', 3000);
        hasShownInitialSync.current = false;
        appInitialized.current = false;
      } else if (detail.type === 'lyrics_sync_complete') {
        const { syncedCount, isFirstTime } = detail;
        
        if (isFirstTime && hasShownInitialSync.current) {
          showNotification('success', `Hoàn tất đồng bộ ${syncedCount} bài hát`, 5000);
          hasShownInitialSync.current = false;
        } else if (!isFirstTime && syncedCount > 0) {
          showNotification('success', `Đã tải lời ${syncedCount} bài hát`, 3000);
        }
      } else if (detail.type === 'homePageSuccess') {
        // Handle notifications from HomePage initial sync
        const { newCount, updatedCount } = detail;
        if (newCount > 0 || updatedCount > 0) {
          showSyncResultNotification(newCount, updatedCount, true);
        }
      }
    };

    window.addEventListener('syncNotification', handleManualSync);
    return () => window.removeEventListener('syncNotification', handleManualSync);
  }, [showSyncingNotification, showSyncCompleteNotification, showUpdateNotification, showNotification, showSyncResultNotification]);

  return null; // This component doesn't render anything
};

export default SyncNotificationManager;
