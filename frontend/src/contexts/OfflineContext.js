// Global Offline Context Provider
import React, { createContext, useContext, useState, useEffect } from 'react';
import { offlineManager } from '../utils/offlineManager';
import { networkManager } from '../utils/networkManager';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState(null);

  useEffect(() => {
    const updateConnectionInfo = () => {
      const info = networkManager.getConnectionInfo();
      setConnectionInfo(info);
      setIsOnline(info.isOnline);
    };

    const handleOnline = () => {
      updateConnectionInfo();
    };

    const handleOffline = () => {
      updateConnectionInfo();
    };

    // Set up event listeners - chỉ giữ lại online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize
    updateConnectionInfo();
    offlineManager.init();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setSyncPreference = (preference) => {
    networkManager.setSyncPreference(preference);
    const info = networkManager.getConnectionInfo();
    setConnectionInfo(info);
  };

  const value = {
    isOnline,
    isOffline: !isOnline,
    connectionInfo,
    setSyncPreference,
    offlineManager,
    networkManager
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export default OfflineProvider;
