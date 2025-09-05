import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Music, Share2, Plus, Loader2, Edit3 } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import SongCard from '../components/SongCard';

const SharedPlaylistPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useAppContext();
  
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Parse song IDs từ URL - thứ tự quan trọng
  const songIds = searchParams.get('songs')?.split(',').map(Number).filter(Boolean) || [];

  useEffect(() => {
    const fetchPlaylistSongs = async () => {
      if (songIds.length === 0) {
        setError('Playlist trống hoặc URL không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Giải pháp: Sử dụng dữ liệu từ localStorage thay vì gọi API (tránh CORS)
        const cachedSongs = localStorage.getItem('songs_data');
        
        if (cachedSongs) {
          console.log('Sử dụng dữ liệu từ localStorage...');
          const allSongs = JSON.parse(cachedSongs);
          console.log('Cached songs:', allSongs.length, 'songs');
          console.log('Looking for song IDs:', songIds);
          
          // Filter và sắp xếp theo thứ tự trong URL
          const orderedSongs = [];
          songIds.forEach(id => {
            const song = allSongs.find(s => s.id === id);
            if (song) {
              orderedSongs.push(song);
              console.log(`Found song ${id}:`, song.title);
            } else {
              console.log(`Song ${id} not found in cache`);
            }
          });
          
          console.log('Final ordered songs:', orderedSongs);
          setPlaylistSongs(orderedSongs);
          setError(orderedSongs.length === 0 ? 'Không tìm thấy bài hát nào trong cache. Hãy về trang chủ để tải dữ liệu.' : null);
        } else {
          // Không có dữ liệu cached
          console.log('Không có dữ liệu trong localStorage');
          setError('Không có dữ liệu bài hát. Vui lòng về trang chủ để tải dữ liệu trước.');
          setPlaylistSongs([]);
        }
      } catch (error) {
        console.error('Error processing playlist:', error);
        setError('Lỗi khi xử lý playlist');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistSongs();
  }, [songIds.join(',')]);

  const handleSongPlay = (song) => {
    // Truyền playlist context khi navigate sang SongDetailPage
    const playlistSongIds = playlistSongs.map(s => s.id);
    const currentIndex = playlistSongs.findIndex(s => s.id === song.id);
    
    navigate(`/song/${song.id}?playlist=${playlistSongIds.join(',')}&index=${currentIndex}&from=shared`);
  };

  const handleAddAllToFavorites = () => {
    let addedCount = 0;
    playlistSongs.forEach(song => {
      if (!isFavorite(song.id)) {
        toggleFavorite(song);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      alert(`Đã thêm ${addedCount} bài hát vào danh sách yêu thích!`);
    } else {
      alert('Tất cả bài hát đã có trong danh sách yêu thích!');
    }
  };

  const handleSharePlaylist = async () => {
    const currentUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Playlist bài hát',
          text: 'Xem playlist bài hát hay này!',
          url: currentUrl
        });
      } else {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link playlist đã được copy vào clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback manual copy
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link playlist đã được copy!');
    }
  };

  const handleEditPlaylist = () => {
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    // Tạo URL mới với thứ tự hiện tại
    const newSongIds = playlistSongs.map(song => song.id).join(',');
    const newUrl = `/playlist?songs=${newSongIds}`;
    
    // Update URL
    window.history.replaceState({}, '', newUrl);
    setEditMode(false);
    alert('Playlist đã được cập nhật! URL mới đã sẵn sàng để chia sẻ.');
  };

  // Drag & drop sẽ implement sau
  const moveUp = (index) => {
    if (index > 0) {
      const newSongs = [...playlistSongs];
      [newSongs[index], newSongs[index - 1]] = [newSongs[index - 1], newSongs[index]];
      setPlaylistSongs(newSongs);
    }
  };

  const moveDown = (index) => {
    if (index < playlistSongs.length - 1) {
      const newSongs = [...playlistSongs];
      [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
      setPlaylistSongs(newSongs);
    }
  };

  const removeSong = (index) => {
    const newSongs = playlistSongs.filter((_, i) => i !== index);
    setPlaylistSongs(newSongs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Đang tải playlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">{error}</h3>
          <Button onClick={() => navigate('/')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

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
                <div className="p-2 bg-blue-500 rounded-xl">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Playlist được chia sẻ</h1>
                  <p className="text-sm text-gray-600">
                    {playlistSongs.length} bài hát {editMode && '• Đang chỉnh sửa'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    Lưu
                  </Button>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleEditPlaylist}
                    variant="outline"
                    className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Chỉnh sửa</span>
                  </Button>
                  <Button
                    onClick={handleAddAllToFavorites}
                    variant="outline"
                    className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm tất cả</span>
                  </Button>
                  <Button
                    onClick={handleSharePlaylist}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Chia sẻ</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Songs grid - hiển thị theo thứ tự từ URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {playlistSongs.map((song, index) => (
            <div key={`${song.id}-${index}`} className="relative">
              {editMode && (
                <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                  <Button
                    onClick={() => moveUp(index)}
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 bg-white shadow-md"
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() => moveDown(index)}
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 bg-white shadow-md"
                    disabled={index === playlistSongs.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    onClick={() => removeSong(index)}
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 bg-white shadow-md text-red-500 hover:bg-red-50"
                  >
                    ×
                  </Button>
                </div>
              )}
              <div className="relative">
                {!editMode && (
                  <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                )}
                <SongCard
                  song={song}
                  onPlay={handleSongPlay}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite(song.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {playlistSongs.length === 0 && !loading && (
          <div className="text-center py-16">
            <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Playlist trống
            </h3>
            <p className="text-gray-500 mb-6">
              URL không hợp lệ hoặc không có bài hát nào được tìm thấy
            </p>
            <Button onClick={() => navigate('/')} className="bg-blue-500 hover:bg-blue-600 text-white">
              Về trang chủ
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedPlaylistPage;
