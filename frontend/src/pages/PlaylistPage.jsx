import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Music, Trash2, Share2, Edit3, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import SongCard from '../components/SongCard';

const PlaylistPage = () => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite, setFavorites } = useAppContext();
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedFavorites, setOrderedFavorites] = useState([]);

  // Load ordered favorites from localStorage on mount or when favorites change
  useEffect(() => {
    console.log('Favorites changed:', favorites.length, 'songs');
    
    if (favorites.length === 0) {
      setOrderedFavorites([]);
      return;
    }

    const savedOrder = localStorage.getItem('favoritesOrder');
    
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        console.log('Saved order found:', orderIds);
        
        // Reorder favorites based on saved order
        const orderedList = [];
        const remainingSongs = [...favorites];
        
        // Add songs in saved order
        orderIds.forEach(id => {
          const song = remainingSongs.find(s => s.id === id);
          if (song) {
            orderedList.push(song);
            const index = remainingSongs.findIndex(s => s.id === id);
            if (index > -1) remainingSongs.splice(index, 1);
          }
        });
        
        // Add any new songs that weren't in the saved order
        orderedList.push(...remainingSongs);
        
        console.log('Final ordered list:', orderedList.length, 'songs');
        setOrderedFavorites(orderedList);
        
        // Update the global favorites to match the order if needed
        if (orderedList.length === favorites.length && setFavorites) {
          const needsReorder = orderedList.some((song, index) => 
            favorites[index]?.id !== song.id
          );
          
          if (needsReorder) {
            console.log('Updating global favorites with saved order');
            setFavorites(orderedList);
          }
        }
        
      } catch (error) {
        console.error('Error parsing saved order:', error);
        setOrderedFavorites(favorites);
        localStorage.removeItem('favoritesOrder'); // Remove corrupted data
      }
    } else {
      console.log('No saved order found, using default order');
      setOrderedFavorites(favorites);
    }
  }, [favorites, setFavorites]);

  // Save order to localStorage whenever orderedFavorites changes
  useEffect(() => {
    if (orderedFavorites.length > 0) {
      const orderIds = orderedFavorites.map(song => song.id);
      localStorage.setItem('favoritesOrder', JSON.stringify(orderIds));
      console.log('Saved order to localStorage:', orderIds);
    } else {
      localStorage.removeItem('favoritesOrder');
      console.log('Removed order from localStorage');
    }
  }, [orderedFavorites]);

  const handleSongPlay = (song) => {
    // Use current display list for playlist context
    const currentList = isReorderMode ? orderedFavorites : orderedFavorites;
    const favoriteSongIds = currentList.map(s => s.id);
    const currentIndex = currentList.findIndex(s => s.id === song.id);
    
    navigate(`/song/${song.id}?playlist=${favoriteSongIds.join(',')}&index=${currentIndex}&from=favorites`);
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newOrder = [...orderedFavorites];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      
      setOrderedFavorites(newOrder);
      // Update the global favorites with the new order
      if (setFavorites) {
        setFavorites(newOrder);
      }
    }
  };

  const handleMoveDown = (index) => {
    if (index < orderedFavorites.length - 1) {
      const newOrder = [...orderedFavorites];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      
      setOrderedFavorites(newOrder);
      // Update the global favorites with the new order
      if (setFavorites) {
        setFavorites(newOrder);
      }
    }
  };

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
    
    // Debug: Log current state
    if (!isReorderMode) {
      console.log('Entering reorder mode');
      console.log('Current orderedFavorites:', orderedFavorites.map(s => ({id: s.id, title: s.title})));
    }
  };

  // Debug function to check localStorage
  const checkLocalStorage = () => {
    const favorites = localStorage.getItem('songFavorites');
    const order = localStorage.getItem('favoritesOrder');
    console.log('=== LocalStorage Debug ===');
    console.log('Favorites:', favorites ? JSON.parse(favorites).length + ' songs' : 'none');
    console.log('Order:', order ? JSON.parse(order) : 'none');
    console.log('Current orderedFavorites:', orderedFavorites.length, 'songs');
  };

  // Call debug on component mount
  useEffect(() => {
    checkLocalStorage();
  }, []);

  const clearAllFavorites = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả bài hát?')) {
      console.log('Clearing all favorites...');
      
      // Clear all songs from favorites
      orderedFavorites.forEach(song => toggleFavorite(song));
      
      // Clear local state
      setOrderedFavorites([]);
      
      // Clear localStorage
      localStorage.removeItem('favoritesOrder');
      localStorage.removeItem('songFavorites');
      
      console.log('All favorites cleared');
    }
  };

  const handleSharePlaylist = async () => {
    if (orderedFavorites.length === 0) {
      alert('Danh sách Thờ phượng trống! Hãy thêm bài hát trước khi chia sẻ.');
      return;
    }

    const songIds = orderedFavorites.map(song => song.id).join(',');
    const shareUrl = `${window.location.origin}/playlist?songs=${songIds}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Danh sách bài hát cho buổi thờ phượng',
          text: 'Xem Danh sách bài hát cho buổi thờ phượng!',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link playlist đã được copy vào clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback manual copy
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link playlist đã được copy!');
    }
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

            {/* Songs display */}
            <div className={isReorderMode ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"}>
              {orderedFavorites.map((song, index) => (
                <div key={`${song.id}-${index}`} className="relative">
                  {isReorderMode && (
                    <>
                      {/* Position number */}
                      <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
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
                  
                  <SongCard
                    song={song}
                    onPlay={handleSongPlay}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isFavorite(song.id)}
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
    </div>
  );
};

export default PlaylistPage;