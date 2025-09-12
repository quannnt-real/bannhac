// Hook for managing sync notifications
import { useState, useCallback, useRef, useEffect } from 'react';

export const useNotifications = () => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const notificationQueue = useRef([]);
  const currentNotificationRef = useRef(null);
  const lastNotificationRef = useRef(null);

  const showNotification = useCallback((type, message, data = {}) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      message,
      data,
      timestamp: Date.now()
    };

    // Prevent duplicate notifications (same type and message within 5 seconds)
    if (lastNotificationRef.current && 
        lastNotificationRef.current.type === type && 
        lastNotificationRef.current.message === message &&
        Date.now() - lastNotificationRef.current.timestamp < 5000) {
      return;
    }

    // Prevent showing same notification if currently displayed
    if (currentNotificationRef.current && 
        currentNotificationRef.current.type === type && 
        currentNotificationRef.current.message === message) {
      return;
    }

    // Add to queue
    notificationQueue.current.push(notification);
    
    // Show if no current notification
    if (!currentNotificationRef.current) {
      showNextNotification();
    }
  }, []);

  const showNextNotification = useCallback(() => {
    if (notificationQueue.current.length > 0) {
      const nextNotification = notificationQueue.current.shift();
      currentNotificationRef.current = nextNotification;
      lastNotificationRef.current = nextNotification;
      setCurrentNotification(nextNotification);
    } else {
      currentNotificationRef.current = null;
      setCurrentNotification(null);
    }
  }, []);

  const closeNotification = useCallback(() => {
    currentNotificationRef.current = null;
    setCurrentNotification(null);
    
    // Show next notification after a brief delay
    setTimeout(() => {
      showNextNotification();
    }, 100);
  }, [showNextNotification]);

  // Specific notification methods
  const showSyncingNotification = useCallback((message) => {
    showNotification('syncing', message);
  }, [showNotification]);

  const showSyncCompleteNotification = useCallback((songCount, isNewUser = false) => {
    const message = isNewUser 
      ? `Đã tải xong ${songCount} bài hát` 
      : `Đồng bộ hoàn tất - ${songCount} bài hát`;
    showNotification('sync_complete', message);
  }, [showNotification]);

  const showOfflineNotification = useCallback(() => {
    showNotification('offline', 'Đã mất kết nối internet');
  }, [showNotification]);

  const showOnlineNotification = useCallback(() => {
    showNotification('online', 'Đã kết nối internet');
  }, [showNotification]);

  const showUpdateNotification = useCallback((newSongs, updatedSongs) => {
    if (newSongs > 0 && updatedSongs > 0) {
      showNotification('sync_update', `Thêm ${newSongs} và cập nhật ${updatedSongs} bài hát`);
    } else if (newSongs > 0) {
      showNotification('sync_update', `Thêm ${newSongs} bài hát mới`);
    } else if (updatedSongs > 0) {
      showNotification('sync_update', `Cập nhật ${updatedSongs} bài hát`);
    }
  }, [showNotification]);

  return {
    currentNotification,
    closeNotification,
    showSyncingNotification,
    showSyncCompleteNotification,
    showOfflineNotification,
    showOnlineNotification,
    showUpdateNotification,
    showNotification
  };
};

export default useNotifications;
