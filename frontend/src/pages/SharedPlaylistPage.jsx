import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Music, Share2, Plus, Loader2, Edit3, X, Search } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { usePageTitle, createPageTitle } from '../hooks/usePageTitle';
import SongCard from '../components/SongCard';
import SharePanel from '../components/SharePanel';
import { storeKeys, retrieveKeys } from '../utils/keyStorage';

const SharedPlaylistPage = () => {
  // Set page title
  usePageTitle(createPageTitle('Playlist chia sẻ'));
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useAppContext();
  
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [songKeys, setSongKeys] = useState({}); // Store keys from URL
  const [displayDate, setDisplayDate] = useState(''); // Store formatted date for display
  
  // Add songs panel state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [allSongs, setAllSongs] = useState([]);
  const [addPanelSearch, setAddPanelSearch] = useState('');
  
  // Share panel state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  
  // Parse song IDs từ URL - thứ tự quan trọng
  const songsParam = searchParams.get('songs');
  const songIds = songsParam ? (() => {
    try {
      // Support both encoded and unencoded URLs
      let decodedSongs = songsParam;
      if (songsParam.includes('%2C')) {
        // URL is encoded, decode it
        decodedSongs = decodeURIComponent(songsParam);
      }
      
      const ids = decodedSongs.split(',').map(Number).filter(Boolean);
      return ids;
    } catch (error) {
      console.error('Error parsing songs parameter:', error);
      return [];
    }
  })() : [];
  
  // Parse song keys từ URL with enhanced safety checks
  const keysParam = searchParams.get('keys');
  const sharedKeys = useMemo(() => {
    if (!keysParam) return {};
    
    try {
      return retrieveKeys(keysParam);
    } catch (error) {
      console.error('Error retrieving shared keys:', error);
      return {};
    }
  }, [keysParam]);

  useEffect(() => {
    const fetchPlaylistSongs = async () => {
      if (songIds.length === 0) {
        setError('Playlist trống hoặc URL không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Kiểm tra dữ liệu trong localStorage trước
        const cachedSongs = localStorage.getItem('songs_data');
        
        if (cachedSongs) {
          try {
            const allSongs = JSON.parse(cachedSongs);
            
            // Validate allSongs is an array
            if (!Array.isArray(allSongs)) {
              throw new Error('Cached songs data is not an array');
            }
            
            // Filter và sắp xếp theo thứ tự trong URL
            const orderedSongs = [];
            songIds.forEach(id => {
              const song = allSongs.find(s => s && s.id === id);
              if (song) {
                orderedSongs.push(song);
              }
            });
            
            // Nếu tìm được đủ bài hát từ cache
            if (orderedSongs.length === songIds.length) {
              setPlaylistSongs(orderedSongs);
              setSongKeys(sharedKeys);
              setError(null);
              setLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing cached songs:', parseError);
            localStorage.removeItem('songs_data'); // Remove corrupted data
          }
        }
        
        // Nếu không có cache hoặc cache không đầy đủ, tải từ API
        const { API_ENDPOINTS, apiCall } = await import('../utils/apiConfig');
        
        try {
          // Thay vì lấy tất cả bài hát, gọi API cho từng bài cụ thể
          
          const songPromises = songIds.map(async (songId) => {
            try {
              const response = await apiCall(`${API_ENDPOINTS.SONG_VIEW}/${songId}`);
              
              if (response.success && response.data) {
                return response.data;
              } else {
                console.warn(`Failed to fetch song ${songId}:`, response);
                return null;
              }
            } catch (error) {
              console.error(`Error fetching song ${songId}:`, error);
              return null;
            }
          });
          
          // Đợi tất cả requests hoàn thành
          const songResults = await Promise.allSettled(songPromises);
          const validSongs = songResults
            .map(result => result.status === 'fulfilled' ? result.value : null)
            .filter(song => song !== null);
          
          
          
          if (validSongs.length > 0) {
            // Lưu vào localStorage cho lần sau (cập nhật cache)
            const existingCache = localStorage.getItem('songs_data');
            let allCachedSongs = [];
            
            if (existingCache) {
              try {
                allCachedSongs = JSON.parse(existingCache);
                if (!Array.isArray(allCachedSongs)) allCachedSongs = [];
              } catch (e) {
                allCachedSongs = [];
              }
            }
            
            // Merge new songs with existing cache
            validSongs.forEach(newSong => {
              const existingIndex = allCachedSongs.findIndex(song => song.id === newSong.id);
              if (existingIndex >= 0) {
                allCachedSongs[existingIndex] = newSong; // Update existing
              } else {
                allCachedSongs.push(newSong); // Add new
              }
            });
            
            localStorage.setItem('songs_data', JSON.stringify(allCachedSongs));
            
            // Sắp xếp theo thứ tự trong URL
            const orderedSongs = [];
            songIds.forEach(id => {
              const song = validSongs.find(s => s && s.id === id);
              if (song) {
                orderedSongs.push(song);
              }
            });
            
            setPlaylistSongs(orderedSongs);
            setSongKeys(sharedKeys);
            setError(orderedSongs.length === 0 ? 'Không tìm thấy bài hát nào' : null);
          } else {
            setError('Không thể tải được bài hát nào. Vui lòng kiểm tra kết nối mạng.');
            setPlaylistSongs([]);
          }
        } catch (apiError) {
          console.error('Error loading from API:', apiError);
          setError('Không thể tải dữ liệu bài hát. Vui lòng kiểm tra kết nối mạng và thử lại.');
          setPlaylistSongs([]);
        }
      } catch (error) {
        console.error('Error fetching playlist:', error);
        setError('Lỗi khi xử lý playlist');
        setPlaylistSongs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistSongs();
  }, [songIds.join(','), keysParam]); // Use join(',') instead of JSON.stringify for better performance

  // Handle date parameter for display
  useEffect(() => {
    const dateParam = searchParams.get('date');
    
    if (dateParam) {
      try {
        const date = new Date(dateParam);
        
        // Validate date
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        
        const options = { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'numeric', 
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
  }, [searchParams.get('date')]);

  // Load all songs for add panel
  useEffect(() => {
    const loadAllSongs = async () => {
      try {
        // Kiểm tra cache trước
        const cachedSongs = localStorage.getItem('songs_data');
        if (cachedSongs) {
          const songs = JSON.parse(cachedSongs);
          if (Array.isArray(songs)) {
            setAllSongs(songs);
            return; // Có cache rồi thì không cần tải từ API
          }
        }
        
        // Nếu không có cache, tải từ API (chỉ khi cần thiết)
        if (editMode || showAddPanel) {
          try {
            const { API_ENDPOINTS, apiCall } = await import('../utils/apiConfig');
            const response = await apiCall(API_ENDPOINTS.SONGS);
            
            if (response.success && Array.isArray(response.data)) {
              const songs = response.data;
              setAllSongs(songs);
              // Lưu vào cache để sử dụng sau
              localStorage.setItem('songs_data', JSON.stringify(songs));
            }
          } catch (apiError) {
            console.error('Error loading all songs from API:', apiError);
          }
        }
      } catch (error) {
        console.error('Error loading all songs:', error);
      }
    };

    loadAllSongs();
  }, [editMode, showAddPanel]); // Chỉ tải khi cần

  // Normalize text function for search
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Filter available songs (excluding already added songs)
  const availableSongs = useMemo(() => {
    const playlistSongIds = new Set(playlistSongs.map(s => s.id));
    
    let filtered = allSongs.filter(song => !playlistSongIds.has(song.id));

    // Apply search filter only
    if (addPanelSearch?.trim()) {
      const normalizedTerm = normalizeText(addPanelSearch);
      filtered = filtered.filter(song => {
        const matchTitle = normalizeText(song.title).includes(normalizedTerm);
        const matchFirstLyric = normalizeText(song.first_lyric).includes(normalizedTerm);
        const matchChorus = normalizeText(song.chorus).includes(normalizedTerm);
        const matchLyrics = normalizeText(song.lyrics).includes(normalizedTerm);
        
        return matchTitle || matchFirstLyric || matchChorus || matchLyrics;
      });
    }

    return filtered;
  }, [allSongs, playlistSongs, addPanelSearch]);

  // Add song to playlist handler
  const handleAddSong = (song) => {
    if (!song || playlistSongs.find(s => s.id === song.id)) {
      return; // Song already exists or invalid
    }
    
    setPlaylistSongs(prev => [...prev, song]);
  };

  // Remove song from playlist handler
  const handleRemoveSong = (songId) => {
    setPlaylistSongs(prev => prev.filter(song => song.id !== songId));
    // Also remove from songKeys if exists
    setSongKeys(prev => {
      const updated = { ...prev };
      delete updated[songId.toString()];
      return updated;
    });
  };

  // Toggle add panel
  const handleToggleAddPanel = () => {
    setShowAddPanel(!showAddPanel);
  };

  // Clear add panel search and filters
  const handleClearAddPanelSearch = () => {
    setAddPanelSearch('');
  };

  const handleSongPlay = (song) => {
    if (!song || !song.id) {
      console.warn('Invalid song data');
      return;
    }

    // Truyền playlist context khi navigate sang SongDetailPage
    const playlistSongIds = playlistSongs.map(s => s.id);
    const currentIndex = playlistSongs.findIndex(s => s.id === song.id);
    
    if (currentIndex === -1) {
      console.warn('Song not found in playlist');
      return;
    }

    try {
      // Include song keys in the navigation params with safety check
      const keysToShare = songKeys || {};
      const encodedKeys = storeKeys(keysToShare);
      
      navigate(`/song/${song.id}?playlist=${playlistSongIds.join(',')}&index=${currentIndex}&from=shared&keys=${encodedKeys}`);
    } catch (error) {
      console.error('Error navigating to song:', error);
      // Fallback without keys
      navigate(`/song/${song.id}?playlist=${playlistSongIds.join(',')}&index=${currentIndex}&from=shared`);
    }
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

  const handleSharePlaylist = () => {
    const currentUrl = window.location.href;
    
    // Set the share URL and show the share panel
    setShareUrl(currentUrl);
    setCurrentShareUrl(currentUrl);
    setShowSharePanel(true);
  };

  const handleShareUrlUpdate = (newUrl) => {
    setCurrentShareUrl(newUrl);
  };

  const handleEditPlaylist = () => {
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    // Tạo URL mới với thứ tự hiện tại
    const newSongIds = playlistSongs.map(song => song.id).join(',');
    let newUrl = `/playlist?songs=${newSongIds}`;
    
    // Include keys if any are set and different from original
    const hasCustomKeys = Object.keys(songKeys).some(songId => {
      const song = playlistSongs.find(s => s.id.toString() === songId);
      return song && songKeys[songId] && songKeys[songId] !== song.key_chord;
    });
    
    if (hasCustomKeys) {
      const relevantKeys = {};
      Object.keys(songKeys).forEach(songId => {
        const song = playlistSongs.find(s => s.id.toString() === songId);
        if (song && songKeys[songId] && songKeys[songId] !== song.key_chord) {
          relevantKeys[songId] = songKeys[songId];
        }
      });
      
      if (Object.keys(relevantKeys).length > 0) {
        // Encode JSON string properly for URL
        const encodedKeys = storeKeys(relevantKeys);
        
        newUrl += `&keys=${encodedKeys}`;
      }
    }
    
    // Update URL
    window.history.replaceState({}, '', newUrl);
    setEditMode(false);
    setShowAddPanel(false); // Close add panel when saving
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
    const songToRemove = playlistSongs[index];
    if (songToRemove) {
      handleRemoveSong(songToRemove.id);
    }
  };

  // Function to update song key in shared playlist
  const updateSongKey = (songId, newKey) => {
    if (!songId || !newKey || typeof newKey !== 'string') {
      console.warn('Invalid songId or newKey for updateSongKey');
      return;
    }
    
    try {
      setSongKeys(prev => {
        const updated = {
          ...prev,
          [songId]: newKey
        };
        return updated;
      });
    } catch (error) {
      console.error('Error updating song key:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 mb-2">Đang tải danh sách bài hát...</p>
          <p className="text-sm text-gray-500">Lần đầu mở có thể hơi lâu do cần tải dữ liệu từ server</p>
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
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Danh sách bài hát thờ phượng
                  </h1>
                  <p className="text-sm text-gray-600">
                    {displayDate && (
                      <span className="text-blue-600">
                        {displayDate + ' • '}  
                      </span>
                    )}
                     {playlistSongs.length} bài hát {editMode && '• Đang chỉnh sửa'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleToggleAddPanel}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      setShowAddPanel(false);
                    }}
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
        {/* Key controls explanation - Only show when not in edit mode and has songs */}
        {!editMode && playlistSongs.length > 0 && (
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
              
              {/* Position number - always show, positioned to avoid title overlap */}
              <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                {index + 1}
              </div>
              
              <SongCard
                song={song}
                onPlay={handleSongPlay}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite(song?.id)}
                showKeyControls={!editMode}
                currentKey={songKeys && song?.id ? songKeys[song.id] || song.key_chord : song.key_chord}
                onKeyChange={updateSongKey}
              />
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

      {/* Add Songs Panel */}
      {showAddPanel && editMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Thêm bài hát vào playlist</h3>
              <Button
                onClick={handleToggleAddPanel}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Section */}
            <div className="border-b border-gray-200 p-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm bài hát..."
                  value={addPanelSearch}
                  onChange={(e) => setAddPanelSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {addPanelSearch && (
                  <Button
                    onClick={handleClearAddPanelSearch}
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Available Songs List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Tìm thấy {availableSongs.length} bài hát có thể thêm
                </p>
              </div>

              {availableSongs.length === 0 ? (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {addPanelSearch
                      ? 'Không tìm thấy bài hát phù hợp'
                      : 'Tất cả bài hát đã có trong playlist'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {availableSongs.map((song) => (
                    <Card key={song.id} className="hover:shadow-md transition-shadow overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-800 truncate text-sm">
                              {song.title}
                            </h4>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {song.type_name && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  {song.type_name}
                                </Badge>
                              )}
                              {song.key_chord && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                  {song.key_chord}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Song Content */}
                            <div className="space-y-1 text-xs text-gray-600 mt-2">
                              {song.first_lyric && (
                                <p className="line-clamp-1">
                                  <span className="font-medium">Lời đầu:</span> {song.first_lyric}
                                </p>
                              )}
                              {song.chorus && (
                                <p className="line-clamp-1">
                                  <span className="font-medium">Điệp khúc:</span> {song.chorus}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleAddSong(song)}
                            size="sm"
                            className="shrink-0 w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full"
                            title="Thêm bài hát vào playlist"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Panel */}
      <SharePanel
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
        shareUrl={shareUrl}
        title="Chia sẻ Playlist"
        onUpdateShareUrl={handleShareUrlUpdate}
      />
    </div>
  );
};

export default SharedPlaylistPage;
