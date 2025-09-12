// Sync Notification Manager Component
import { useEffect, useRef } from 'react';
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
          setTimeout(async () => {
            try {
              const syncResult = await offlineManager.performSmartSync('app_restart');
              
              if (syncResult.success) {
                if (syncResult.newSongs > 0 || syncResult.updatedSongs > 0) {
                  // Thay đổi thông báo để phản ánh rằng đang tải lyrics
                  if (syncResult.newSongs > 0 && syncResult.updatedSongs > 0) {
                    showSyncingNotification(`Đang tải ${syncResult.newSongs} bài mới và cập nhật ${syncResult.updatedSongs} bài...`);
                  } else if (syncResult.newSongs > 0) {
                    showSyncingNotification(`Đang tải ${syncResult.newSongs} bài hát mới...`);
                  } else if (syncResult.updatedSongs > 0) {
                    showSyncingNotification(`Đang cập nhật ${syncResult.updatedSongs} bài hát...`);
                  }
                  
                  // Phát event để HomePage cập nhật dữ liệu và bắt đầu lyrics sync
                  window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
                    detail: { 
                      newSongs: syncResult.newSongs, 
                      updatedSongs: syncResult.updatedSongs 
                    }
                  }));
                }
              }
            } catch (error) {
            }
          }, 2000);
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
        setTimeout(async () => {
            const syncResult = await offlineManager.performSmartSync('network_restored');
            
            if (syncResult.success) {
              if (syncResult.newSongs > 0 || syncResult.updatedSongs > 0) {
                // Thay đổi thông báo để phản ánh rằng đang tải lyrics
                if (syncResult.newSongs > 0 && syncResult.updatedSongs > 0) {
                  showSyncingNotification(`Đang tải ${syncResult.newSongs} bài mới và cập nhật ${syncResult.updatedSongs} bài...`);
                } else if (syncResult.newSongs > 0) {
                  showSyncingNotification(`Đang tải ${syncResult.newSongs} bài hát mới...`);
                } else if (syncResult.updatedSongs > 0) {
                  showSyncingNotification(`Đang cập nhật ${syncResult.updatedSongs} bài hát...`);
                }
                
                // Phát event để HomePage cập nhật dữ liệu và bắt đầu lyrics sync
                window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
                  detail: { 
                    newSongs: syncResult.newSongs, 
                    updatedSongs: syncResult.updatedSongs 
                  }
                }));
              }
            }
        }, 1500);
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
        // Case 2: Manual sync started
        // Only show syncing notification if needed
        showSyncingNotification("Đang đồng bộ qua WiFi...");
      } else if (detail.type === 'sync_complete') {
        const { syncResult } = detail;
        
        if (syncResult.success) {
          if (syncResult.isFirstTime) {
            // Don't show completion here - wait for lyrics sync
            hasShownInitialSync.current = true;
          } else if (syncResult.newSongs > 0 || syncResult.updatedSongs > 0) {
            // Thay đổi thông báo để phản ánh rằng đang tải lyrics
            if (syncResult.newSongs > 0 && syncResult.updatedSongs > 0) {
              showSyncingNotification(`Đang tải ${syncResult.newSongs} bài mới và cập nhật ${syncResult.updatedSongs} bài...`);
            } else if (syncResult.newSongs > 0) {
              showSyncingNotification(`Đang tải ${syncResult.newSongs} bài hát mới...`);
            } else if (syncResult.updatedSongs > 0) {
              showSyncingNotification(`Đang cập nhật ${syncResult.updatedSongs} bài hát...`);
            }
            
            // Phát event để HomePage cập nhật dữ liệu và bắt đầu lyrics sync
            window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
              detail: { 
                newSongs: syncResult.newSongs, 
                updatedSongs: syncResult.updatedSongs 
              }
            }));
          } else if (syncResult.reason === 'data_updated') {
            // Case 2: Manual sync with no new data - show "latest data" message
            showNotification('latest_data', 'Đang sử dụng dữ liệu mới nhất');
          }
        }
      } else if (detail.type === 'lyrics_sync_complete') {
        // Show completion notification after lyrics sync is done
        if (detail.message) {
          // Thông báo tùy chỉnh từ HomePage
          showNotification('sync_complete', detail.message);
        } else {
          // Thông báo mặc định cho initial sync
          const { totalSongs, syncedCount } = detail;
          showSyncCompleteNotification(totalSongs, true);
        }
      } else if (detail.type === 'data_cleared') {
        // Reset flags when data is cleared (Case 1b)
        hasShownInitialSync.current = false;
        appInitialized.current = false;
      }
    };

    window.addEventListener('syncNotification', handleManualSync);
    
    return () => {
      window.removeEventListener('syncNotification', handleManualSync);
    };
  }, [showSyncingNotification, showSyncCompleteNotification, showUpdateNotification, showNotification]);

  return null; // This component doesn't render anything
};

export default SyncNotificationManager;
