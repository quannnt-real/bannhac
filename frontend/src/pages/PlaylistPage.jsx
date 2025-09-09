import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Music, Trash2, Share2, Edit3, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { usePageTitle, createPageTitle } from '../hooks/usePageTitle';
import SongCard from '../components/SongCard';
import SharePanel from '../components/SharePanel';
import { storeKeys } from '../utils/keyStorage';

const PlaylistPage = () => {
  // Set page title
  usePageTitle(createPageTitle('Danh sách bài hát buổi thờ phượng'));
  
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite, setFavorites } = useAppContext();
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedFavorites, setOrderedFavorites] = useState([]);
  const [songKeys, setSongKeys] = useState({}); // Store custom keys for each song
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [displayDate, setDisplayDate] = useState(''); // Store formatted date for display

  // Load ordered favorites from localStorage on mount or when favorites change
  useEffect(() => {
    if (favorites.length === 0) {
      setOrderedFavorites([]);
      return;
    }

    // Kiểm tra xem có đang ở chế độ reorder không
    if (isReorderMode) {
      return; // Không làm gì khi đang reorder
    }

    const savedOrder = localStorage.getItem('favorites_order');
    
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        
        // Tạo ordered list dựa trên saved order
        const ordered = [];
        const favoritesMap = new Map(favorites.map(song => [song.id, song]));
        
        // Thêm songs theo thứ tự đã lưu
        orderIds.forEach(id => {
          if (favoritesMap.has(id)) {
            ordered.push(favoritesMap.get(id));
            favoritesMap.delete(id);
          }
        });
        
        // Thêm các songs mới (chưa có trong order) vào cuối
        favoritesMap.forEach(song => ordered.push(song));
        
        // Always set the ordered list - let React optimize re-renders
        setOrderedFavorites(ordered);
        
      } catch (error) {
        console.error('Error loading favorites order:', error);
        setOrderedFavorites([...favorites]);
      }
    } else {
      // No saved order, use favorites as-is
      setOrderedFavorites([...favorites]);
    }
  }, [favorites, isReorderMode]); // Safe dependencies only

  // Handle date parameter for display (not document title)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    if (dateParam) {
      try {
        const date = new Date(dateParam);
        const options = { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        };
        const formattedDate = date.toLocaleDateString('vi-VN', options);
        setDisplayDate(formattedDate);
        
      } catch (error) {
        console.error('Error parsing date parameter:', error);
        setDisplayDate('');
      }
    } else {
      setDisplayDate('');
    }
  }, []);

  // Load saved song keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem('playlist_song_keys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys);
        setSongKeys(parsedKeys);
      } catch (error) {
        console.error('Error loading saved song keys:', error);
        // Clear corrupted data
        localStorage.removeItem('playlist_song_keys');
      }
    }
    
    // Cleanup function (optional, for edge cases)
    return () => {
      // Any cleanup if needed
    };
  }, []);

  // Function to save order to localStorage - memoized to prevent re-creation
  const saveOrder = useCallback((newOrder) => {
    const orderIds = newOrder.map(song => song.id);
    localStorage.setItem('favorites_order', JSON.stringify(orderIds));
  }, []);

  // Function to save song keys to localStorage
  const saveSongKeys = useCallback((keys) => {
    localStorage.setItem('playlist_song_keys', JSON.stringify(keys));
  }, []);

  // Function to update song key
  const updateSongKey = useCallback((songId, newKey) => {
    setSongKeys(prev => {
      const updated = { ...prev, [songId]: newKey };
      saveSongKeys(updated);
      return updated;
    });
  }, [saveSongKeys]);

  const handleSongPlay = (song) => {
    // Use current display list for playlist context
    const currentList = orderedFavorites; // Remove redundant logic
    const favoriteSongIds = currentList.map(s => s.id);
    const currentIndex = currentList.findIndex(s => s.id === song.id);
    
    // Safety check
    if (currentIndex === -1) {
      console.warn('Song not found in current playlist');
      return;
    }
    
    // Include song keys in the navigation params
    try {
      const keysToEncode = songKeys || {};
      const encodedKeys = storeKeys(keysToEncode);
      
      navigate(`/song/${song.id}?playlist=${favoriteSongIds.join(',')}&index=${currentIndex}&from=favorites&keys=${encodedKeys}`);
    } catch (error) {
      console.error('Error navigating to song:', error);
      // Fallback without keys
      navigate(`/song/${song.id}?playlist=${favoriteSongIds.join(',')}&index=${currentIndex}&from=favorites`);
    }
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newOrder = [...orderedFavorites];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      
      setOrderedFavorites(newOrder);
      saveOrder(newOrder); // Lưu thứ tự mới
    }
  };

  const handleMoveDown = (index) => {
    if (index < orderedFavorites.length - 1) {
      const newOrder = [...orderedFavorites];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      
      setOrderedFavorites(newOrder);
      saveOrder(newOrder); // Lưu thứ tự mới
    }
  };

  const toggleReorderMode = () => {
    const newReorderMode = !isReorderMode;
    setIsReorderMode(newReorderMode);
    
    if (!newReorderMode) {
      // Khi thoát reorder mode, lưu thứ tự hiện tại
      saveOrder(orderedFavorites);
    }
  };

  // Debug function to check localStorage (chỉ chạy 1 lần khi mount)
  // Debug functionality removed for production

  const clearAllFavorites = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả bài hát?')) {
      
      // Clear all songs from favorites
      orderedFavorites.forEach(song => toggleFavorite(song));
      
      // Clear local state
      setOrderedFavorites([]);
      
      // Clear localStorage
      localStorage.removeItem('favoritesOrder');
      localStorage.removeItem('songFavorites');
    }
  };

  const handleSharePlaylist = () => {
    if (orderedFavorites.length === 0) {
      alert('Danh sách Thờ phượng trống! Hãy thêm bài hát trước khi chia sẻ.');
      return;
    }

    try {
      const songIds = orderedFavorites.map(song => song.id).join(',');
      
      // Include song keys in share URL if any custom keys are set
      let shareUrl = `${window.location.origin}/playlist?songs=${songIds}`;
      
      // Only include keys if there are custom keys set
      const hasCustomKeys = Object.keys(songKeys || {}).some(songId => {
        const song = orderedFavorites.find(s => s.id.toString() === songId);
        return song && songKeys[songId] && songKeys[songId] !== song.key_chord;
      });
      
      if (hasCustomKeys) {
        // Only include keys for songs that have custom keys different from original
        const relevantKeys = {};
        Object.keys(songKeys || {}).forEach(songId => {
          const song = orderedFavorites.find(s => s.id.toString() === songId);
          if (song && songKeys[songId] && songKeys[songId] !== song.key_chord) {
            relevantKeys[songId] = songKeys[songId];
          }
        });
        
        if (Object.keys(relevantKeys).length > 0) {
          try {
            // Tạo URL đẹp hơn - không encode các ký tự cơ bản
            const encodedKeys = storeKeys(relevantKeys);
            
            shareUrl += `&keys=${encodedKeys}`;
          } catch (error) {
            console.warn('Error encoding keys, sharing without keys:', error);
          }
        }
      }
      
      // Set the share URL and show the share panel
      setShareUrl(shareUrl);
      setCurrentShareUrl(shareUrl);
      setShowSharePanel(true);
    } catch (error) {
      console.error('Error preparing share:', error);
      alert('Không thể chuẩn bị chia sẻ playlist. Vui lòng thử lại.');
    }
  };

  const handleShareUrlUpdate = (newUrl) => {
    setCurrentShareUrl(newUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-xl">
                  <Heart className="h-6 w-6 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Bài hát Chủ nhật
                    {displayDate && (
                      <span className="block text-lg text-blue-600 mt-1">
                        ngày {displayDate}
                      </span>
                    )}
                    {isReorderMode && <span className="text-blue-600 ml-2">(Chế độ sắp xếp)</span>}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {orderedFavorites.length} bài hát trong danh sách
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {orderedFavorites.length > 0 && (
                <>
                  {/* Desktop: Show reorder button */}
                  <div className="hidden sm:block">
                    <Button
                      onClick={toggleReorderMode}
                      variant={isReorderMode ? "default" : "outline"}
                      className={`flex items-center gap-2 ${
                        isReorderMode 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>{isReorderMode ? 'Xong' : 'Sắp xếp'}</span>
                    </Button>
                  </div>
                  
                  {/* Mobile: Show only reorder button when not in reorder mode */}
                  <div className="block sm:hidden">
                    {!isReorderMode && (
                      <Button
                        onClick={toggleReorderMode}
                        variant="outline"
                        className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleSharePlaylist}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Chia sẻ</span>
                  </Button>
                  <Button
                    onClick={clearAllFavorites}
                    variant="outline"
                    className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Xóa tất cả</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`container mx-auto px-4 py-6 ${isReorderMode ? 'pb-24 sm:pb-6' : ''}`}>
        {orderedFavorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Heart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-600 mb-2">
                Chưa có danh sách bài hát cho buổi thờ phượng
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Hãy thêm những bài hát bạn vào danh sách để chơi cho buổi thờ phượng này
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Music className="h-4 w-4 mr-2" />
                Khám phá bài hát
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Reorder mode instructions */}
            {isReorderMode && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Chế độ sắp xếp được bật</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Sử dụng các mũi tên lên/xuống trên mỗi bài hát để thay đổi thứ tự. 
                      Nhấn "Xong" để hoàn tất sắp xếp.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Key controls explanation - Only show when not in reorder mode and has songs */}
            {!isReorderMode && orderedFavorites.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">Chỉnh hợp âm chủ</h4>
                    <p className="text-sm text-green-600 mt-1">
                      Sử dụng thanh điều khiển tone: <strong>--</strong> (giảm 1 cung), <strong>−</strong> (giảm 1/2 cung), 
                      <strong>+</strong> (tăng 1/2 cung), <strong>++</strong> (tăng 1 cung). 
                      Tone gốc sẽ có chữ "gốc" hiển thị bên dưới.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Songs display */}
            <div className={isReorderMode ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"}>
              {orderedFavorites.map((song, index) => (
                <div key={`${song.id}-${index}`} className="relative">
                  {isReorderMode && (
                    <>
                      {/* Position number - moved to top right to avoid overlap */}
                      <div className="absolute -top-2 -left-2 z-10 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md border-2 border-white">
                        {index + 1}
                      </div>
                      
                      {/* Move controls - Desktop */}
                      <div className="hidden sm:flex absolute -top-2 -right-2 z-10 gap-1">
                        <Button
                          onClick={() => handleMoveUp(index)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white shadow-md hover:bg-blue-50 border-blue-200"
                          disabled={index === 0}
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          onClick={() => handleMoveDown(index)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white shadow-md hover:bg-blue-50 border-blue-200"
                          disabled={index === orderedFavorites.length - 1}
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>

                      {/* Move controls - Mobile */}
                      <div className="sm:hidden absolute top-2 right-2 z-10 flex flex-col gap-1">
                        <Button
                          onClick={() => handleMoveUp(index)}
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 bg-white shadow-md hover:bg-blue-50 border-blue-200"
                          disabled={index === 0}
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="h-3 w-3 text-blue-600" />
                        </Button>
                        <Button
                          onClick={() => handleMoveDown(index)}
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 bg-white shadow-md hover:bg-blue-50 border-blue-200"
                          disabled={index === orderedFavorites.length - 1}
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {/* Non-reorder mode: Show number badge in corner */}
                  {!isReorderMode && (
                    <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                      {index + 1}
                    </div>
                  )}
                  
                  <SongCard
                    song={song}
                    onPlay={handleSongPlay}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isFavorite(song.id)}
                    showKeyControls={!isReorderMode}
                    currentKey={songKeys && song?.id ? songKeys[song.id] : null}
                    onKeyChange={updateSongKey}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Mobile: Sticky "Xong" button at bottom */}
      {isReorderMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 sm:hidden">
          <div className="container mx-auto">
            <Button
              onClick={toggleReorderMode}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg font-medium"
            >
              <Edit3 className="h-5 w-5 mr-2" />
              Xong
            </Button>
          </div>
        </div>
      )}

      {/* Add padding bottom when in reorder mode on mobile to prevent content being hidden */}
      {isReorderMode && <div className="sm:hidden h-20" />}

      {/* Share Panel */}
      <SharePanel
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
        shareUrl={shareUrl}
        onUpdateShareUrl={handleShareUrlUpdate}
      />
    </div>
  );
};

export default PlaylistPage;