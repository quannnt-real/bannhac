// Notification Topbar Component
import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, Download, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const NotificationTopbar = React.memo(({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setIsClosing(false);
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Animation duration
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'syncing':
        return <RefreshCw className="animate-spin" size={20} />;
      case 'sync_complete':
        return <CheckCircle size={20} />;
      case 'offline':
        return <WifiOff size={20} />;
      case 'online':
        return <Wifi size={20} />;
      case 'downloading':
        return <Download size={20} />;
      case 'latest_data':
        return <CheckCircle size={20} />;
      case 'sync_update':
        return <RefreshCw size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'syncing':
      case 'downloading':
      case 'update':
      case 'info':
        return 'bg-blue-500'; // Tailwind blue
      case 'sync_complete':
      case 'online':
      case 'latest_data':
      case 'sync_update': // Changed to green for successful updates
        return 'bg-green-500'; // Tailwind green
      case 'offline':
        return 'bg-red-500'; // Tailwind red
      default:
        return 'bg-gray-500'; // Tailwind gray
    }
  };

  if (!notification || !isVisible) return null;

  return (
    <>
      <div 
        className={`fixed top-0 left-0 right-0 z-[9999] transform transition-all duration-300 ease-in-out ${
          isClosing ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}
      >
        <div className={`${getNotificationColor(notification.type)} text-white px-4 py-2.5`}>
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="text-white flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <span className="font-medium text-sm leading-tight">
                {notification.message}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors ml-3 flex-shrink-0 p-1 rounded hover:bg-black hover:bg-opacity-20"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

// Add display name for debugging
NotificationTopbar.displayName = 'NotificationTopbar';

export default NotificationTopbar;
