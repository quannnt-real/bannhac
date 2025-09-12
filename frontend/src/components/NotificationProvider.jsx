// Notification Provider for managing global notifications
import React, { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationTopbar from './NotificationTopbar';
import SyncNotificationManager from './SyncNotificationManager';

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const notificationMethods = useNotifications();

  return (
    <NotificationContext.Provider value={notificationMethods}>
      {/* Notification Manager - handles automatic sync notifications */}
      <SyncNotificationManager />
      
      {/* Topbar Notification Display */}
      <NotificationTopbar 
        notification={notificationMethods.currentNotification}
        onClose={notificationMethods.closeNotification}
      />
      
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
