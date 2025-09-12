// Offline Manager Settings Component
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Database, Download, Trash2, Wifi, WifiOff, Settings } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import DonateInfo from './DonateInfo';

const OfflineManagerPanel = ({ onClose }) => {
  const { isOnline, isOffline, connectionInfo, setSyncPreference, offlineManager, networkManager } = useOffline();
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
      const result = await offlineManager.performSmartSync('manual');
      await loadCacheStats();
      
      // Notify sync complete
      window.dispatchEvent(new CustomEvent('syncNotification', {
        detail: { type: 'sync_complete', syncResult: result }
      }));
    } catch (error) {
      alert('Có lỗi khi cập nhật. Vui lòng thử lại.');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu offline? App sẽ tự động tải lại và đồng bộ dữ liệu mới.')) {
      try {
        // Clear everything: IndexedDB, Cache Storage, Service Worker
        await offlineManager.clearAllData();
        
        // Clear Cache Storage
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear Service Worker
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }
        
        // Notify data cleared
        window.dispatchEvent(new CustomEvent('syncNotification', {
          detail: { type: 'data_cleared' }
        }));
        
        // Auto reload - no need to ask user to exit manually
        window.location.reload();
      } catch (error) {
      }
    }
  };

  const getConnectionStatus = () => {
    if (isOnline) {
      return { text: 'Đã kết nối', color: 'bg-green-500', icon: Wifi };
    } else {
      return { text: 'Offline', color: 'bg-red-500', icon: WifiOff };
    }
  };

  const handleSyncPreferenceChange = (preference) => {
    setSyncPreference(preference);
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database size={20} />
              Quản lý Offline
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <ConnectionIcon size={16} />
              <span className="font-medium">Trạng thái kết nối</span>
            </div>
            <div className="text-right">
              <Badge className={connectionStatus.color}>
                {connectionStatus.text}
              </Badge>
              {connectionInfo && (
                <div className="text-xs text-gray-500 mt-1">
                  {connectionInfo.connectionName}
                </div>
              )}
            </div>
          </div>

          {/* Sync Preferences */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Settings size={16} />
              Cài đặt đồng bộ
            </h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="syncPreference"
                  value="always"
                  checked={connectionInfo?.syncPreference === 'always'}
                  onChange={(e) => handleSyncPreferenceChange(e.target.value)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-sm">Luôn đồng bộ</div>
                  <div className="text-xs text-gray-600">Sync với WiFi và 4G/5G</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="syncPreference"
                  value="wifi-only"
                  checked={connectionInfo?.syncPreference === 'wifi-only'}
                  onChange={(e) => handleSyncPreferenceChange(e.target.value)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-sm">Chỉ khi có WiFi</div>
                  <div className="text-xs text-gray-600">Tiết kiệm data 4G/5G</div>
                </div>
              </label>
            </div>
          </div>

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
              disabled={syncing || isOffline || (connectionInfo?.syncPreference === 'wifi-only' && connectionInfo?.connectionType !== 'wifi')}
              className="w-full"
            >
              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
              {connectionInfo?.syncPreference === 'wifi-only' && connectionInfo?.connectionType !== 'wifi' && (
                <span className="ml-2 text-xs opacity-75">(Cần WiFi)</span>
              )}
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
