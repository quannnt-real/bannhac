import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Import, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const ImportPanel = ({ isOpen, onClose }) => {
  const [importCode, setImportCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateAndParseCode = (code) => {
    try {
      // Clear any previous error
      setError('');
      
      if (!code.trim()) {
        throw new Error('Vui lòng nhập mã PWA');
      }

      // Parse the code - it should be in format: songs=1,2,3&keys={"1":"D"}&date=2025-09-07
      const params = new URLSearchParams(code);
      
      // Check if songs parameter exists
      const songs = params.get('songs');
      if (!songs) {
        throw new Error('Mã PWA không hợp lệ: thiếu danh sách bài hát');
      }

      // Validate songs format (should be comma-separated numbers)
      const songIds = songs.split(',').map(id => {
        const num = parseInt(id.trim());
        if (isNaN(num) || num <= 0) {
          throw new Error(`ID bài hát không hợp lệ: ${id}`);
        }
        return num;
      });

      if (songIds.length === 0) {
        throw new Error('Danh sách bài hát trống');
      }

      // Validate keys parameter if exists
      let keys = {};
      const keysParam = params.get('keys');
      if (keysParam) {
        try {
          keys = JSON.parse(keysParam);
          if (typeof keys !== 'object' || Array.isArray(keys)) {
            throw new Error('Định dạng keys không hợp lệ');
          }
        } catch (e) {
          throw new Error('Định dạng keys không hợp lệ: ' + e.message);
        }
      }

      // Validate date parameter if exists
      let date = null;
      const dateParam = params.get('date');
      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Định dạng ngày không hợp lệ');
        }
        date = dateParam;
      }

      return {
        songs: songIds,
        keys,
        date,
        valid: true
      };

    } catch (error) {
      setError(error.message);
      return { valid: false, error: error.message };
    }
  };

  const handleImport = async () => {
    const parseResult = validateAndParseCode(importCode);
    
    if (!parseResult.valid) {
      return; // Error already set in validateAndParseCode
    }

    setIsLoading(true);
    
    try {
      // Build the playlist URL
      let playlistUrl = `/playlist?songs=${parseResult.songs.join(',')}`;
      
      // Add keys if they exist
      if (Object.keys(parseResult.keys).length > 0) {
        const keysJson = JSON.stringify(parseResult.keys);
        playlistUrl += `&keys=${keysJson}`;
      }
      
      // Add date if it exists
      if (parseResult.date) {
        playlistUrl += `&date=${parseResult.date}`;
      }

      // Close the panel
      onClose();
      
      // Navigate to the playlist
      navigate(playlistUrl);
      
    } catch (error) {
      setError('Lỗi khi mở playlist: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setImportCode(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleImport();
    }
  };

  const handleClose = () => {
    setImportCode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <Import className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Nhập Mã PWA</h3>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">
              Dán mã PWA từ người khác chia sẻ để mở playlist bài hát thờ phượng
            </div>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mã PWA
            </label>
            <textarea
              value={importCode}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ví dụ: songs=13,14,198&keys={&quot;13&quot;:&quot;D&quot;}&date=2025-09-07"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleImport}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              disabled={isLoading || !importCode.trim()}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang mở...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mở Playlist
                </>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Nhấn Enter hoặc nút "Mở Playlist" để chuyển đến playlist
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportPanel;
