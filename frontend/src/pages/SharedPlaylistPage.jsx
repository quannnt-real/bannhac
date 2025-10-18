import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Music, Share2, Plus, Loader2, Edit3, X, Search } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { usePageTitle, createPageTitle } from '../hooks/usePageTitle';
import SongCard from '../components/SongCard';
import SharePanel from '../components/SharePanel';
import MissingSongAlert from '../components/MissingSongAlert';
import { storeKeys, retrieveKeys } from '../utils/keyStorage';
import { offlineManager } from '../utils/offlineManager';

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
  const [missingSongIds, setMissingSongIds] = useState([]); // Store IDs of songs that don't exist
  
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
      return {};
    }
  }, [keysParam]);

  useEffect(() => {
    const fetchPlaylistSongs = async () => {
      if (songIds.length === 0) {
        setError('DS Bài hát trống hoặc URL không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load songs from IndexedDB
        await offlineManager.init();
        
        // Bước 1: Kiểm tra cache cho từng bài
        const cachedSongs = [];
        const missingSongIds = [];
        
        for (const songId of songIds) {
          try {
            const song = await offlineManager.getCachedSongDetails(songId);
            if (song) {
              cachedSongs.push(song);
            } else {
              missingSongIds.push(songId);
            }
          } catch (error) {
            missingSongIds.push(songId);
          }
        }
        
        // Bước 2: Hiển thị các bài có sẵn trước (nếu có)
        if (cachedSongs.length > 0) {
          const orderedCached = songIds
            .map(id => cachedSongs.find(s => s.id === id))
            .filter(Boolean);
          
          setPlaylistSongs(orderedCached);
          setLoading(false); // Đã có dữ liệu để hiển thị
          
          // Merge URL keys với localStorage keys (URL keys ưu tiên)
          try {
            const savedKeys = localStorage.getItem('playlist_song_keys');
            let mergedKeys = { ...sharedKeys };
            
            if (savedKeys) {
              const localStorageKeys = JSON.parse(savedKeys);
              mergedKeys = { ...localStorageKeys, ...sharedKeys };
            }
            
            setSongKeys(mergedKeys);
          } catch (keyError) {
            setSongKeys(sharedKeys);
          }
        }
        
        // Bước 3: Tải các bài thiếu (nếu có)
        if (missingSongIds.length > 0) {
          
          if (!navigator.onLine) {
            // Không có mạng
            setError(`Không có kết nối mạng. Chỉ hiển thị ${cachedSongs.length}/${songIds.length} bài đã lưu.`);
            setMissingSongIds(missingSongIds);
            setLoading(false);
            return;
          }
          
          // Có mạng → Tải các bài thiếu
          try {
            const { fetchSongById } = await import('../utils/apiConfig');
            
            console.log(`[SharedPlaylistPage] Tải ${missingSongIds.length} bài thiếu:`, missingSongIds);
            
            // Tải song song (nhanh hơn)
            const fetchPromises = missingSongIds.map(songId => 
              fetchSongById(songId)
                .catch(error => {
                  console.warn(`[SharedPlaylistPage] Không thể tải bài ${songId}:`, error);
                  return null; // Trả về null nếu lỗi
                })
            );
            
            const results = await Promise.allSettled(fetchPromises);
            
            // Xử lý kết quả
            const newSongs = [];
            const failedSongIds = [];
            
            results.forEach((result, index) => {
              const songId = missingSongIds[index];
              
              if (result.status === 'fulfilled' && result.value) {
                newSongs.push(result.value);
              } else {
                failedSongIds.push(songId);
              }
            });
            
            console.log(`[SharedPlaylistPage] Kết quả: ${newSongs.length} thành công, ${failedSongIds.length} thất bại`);
            
            // Cập nhật danh sách (có sẵn + mới tải)
            const allSongs = [...cachedSongs, ...newSongs];
            const orderedSongs = songIds
              .map(id => allSongs.find(s => s.id === id))
              .filter(Boolean);
            
            setPlaylistSongs(orderedSongs);
            
            // Lưu danh sách bài lỗi để hiển thị MissingSongAlert
            if (failedSongIds.length > 0) {
              setMissingSongIds(failedSongIds);
            }
            
            // Merge keys
            try {
              const savedKeys = localStorage.getItem('playlist_song_keys');
              let mergedKeys = { ...sharedKeys };
              
              if (savedKeys) {
                const localStorageKeys = JSON.parse(savedKeys);
                mergedKeys = { ...localStorageKeys, ...sharedKeys };
              }
              
              setSongKeys(mergedKeys);
            } catch (keyError) {
              setSongKeys(sharedKeys);
            }
            
            // Hiển thị thông báo nếu có bài lỗi
            if (failedSongIds.length > 0) {
              setError(`Tìm thấy ${orderedSongs.length}/${songIds.length} bài hát. ${failedSongIds.length} bài không tồn tại.`);
            } else if (orderedSongs.length < songIds.length) {
              setError(`Chỉ tìm thấy ${orderedSongs.length}/${songIds.length} bài hát`);
            } else {
              setError(null);
            }
            
            // fetchSongById() đã tải đầy đủ lyrics (với full=true) cho từng bài
            // Không cần background sync metadata nữa
            
          } catch (fetchError) {
            console.error('[SharedPlaylistPage] Error fetching missing songs:', fetchError);
            setError('Không thể tải một số bài hát. Vui lòng thử lại.');
          }
        } else {
          // Tất cả bài đều có trong cache
          setError(null);
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error('[SharedPlaylistPage] Error in fetchPlaylistSongs:', error);
        setError('Lỗi khi tải dữ liệu từ IndexedDB');
        setPlaylistSongs([]);
        setLoading(false);
      }
    };

    fetchPlaylistSongs();
  }, [songIds.join(','), keysParam]);

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
        // Load all songs from IndexedDB
        await offlineManager.init();
        const songs = await offlineManager.getCachedSongs();
        
        if (Array.isArray(songs) && songs.length > 0) {
          setAllSongs(songs);
        } else {
          setAllSongs([]);
        }
      } catch (error) {
        setAllSongs([]);
      }
    };

    // Only load when needed
    if (editMode || showAddPanel) {
      loadAllSongs();
    }
  }, [editMode, showAddPanel]);

  // Auto-update share URL when songKeys change (if SharePanel is open)
  useEffect(() => {
    if (showSharePanel && playlistSongs.length > 0) {
      // Regenerate share URL with current songKeys
      try {
        const songIds = playlistSongs.map(song => song.id).join(',');
        let shareUrl = `${window.location.origin}/playlist?songs=${songIds}`;
        
        // Include current date from URL if exists
        const currentDate = searchParams.get('date');
        if (currentDate) {
          shareUrl += `&date=${currentDate}`;
        }
        
        // Only include keys if there are custom keys set
        const hasCustomKeys = Object.keys(songKeys || {}).some(songId => {
          const song = playlistSongs.find(s => s.id.toString() === songId);
          return song && songKeys[songId] && songKeys[songId] !== song.key_chord;
        });
        
        if (hasCustomKeys) {
          const relevantKeys = {};
          Object.keys(songKeys || {}).forEach(songId => {
            const song = playlistSongs.find(s => s.id.toString() === songId);
            if (song && songKeys[songId] && songKeys[songId] !== song.key_chord) {
              relevantKeys[songId] = songKeys[songId];
            }
          });
          
          if (Object.keys(relevantKeys).length > 0) {
            const encodedKeys = storeKeys(relevantKeys);
            shareUrl += `&keys=${encodedKeys}`;
          }
        }
        
        // Update share URLs if they changed
        if (shareUrl !== currentShareUrl) {
          setShareUrl(shareUrl);
          setCurrentShareUrl(shareUrl);
        }
      } catch (error) {
      }
    }
  }, [songKeys, showSharePanel, playlistSongs, searchParams, currentShareUrl]);

  // Listen for sync completion events to update allSongs
  useEffect(() => {
    const handleSyncComplete = async (event) => {
      try {
        // Refresh allSongs data after successful sync
        const updatedSongs = await offlineManager.getCachedSongs();
        if (updatedSongs.length > 0) {
          setAllSongs(updatedSongs);
        }
      } catch (updateError) {
        console.error('Error updating allSongs after sync:', updateError);
      }
    };

    window.addEventListener('offlineSyncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offlineSyncComplete', handleSyncComplete);
    };
  }, []);

  // Listen for background song updates from fetchSongById
  useEffect(() => {
    const handleSongUpdated = async (event) => {
      const { songId, updatedData } = event.detail;
      
      console.log('[SharedPlaylistPage] Song updated in background:', songId);
      
      // Update the song in playlistSongs if it exists
      setPlaylistSongs(prevSongs => 
        prevSongs.map(song => 
          song.id === parseInt(songId) ? { ...song, ...updatedData } : song
        )
      );
      
      // Also update in allSongs if it exists
      setAllSongs(prevSongs => 
        prevSongs.map(song => 
          song.id === parseInt(songId) ? { ...song, ...updatedData } : song
        )
      );
    };

    window.addEventListener('songUpdated', handleSongUpdated);
    
    return () => {
      window.removeEventListener('songUpdated', handleSongUpdated);
    };
  }, []);

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
      return;
    }

    // Truyền playlist context khi navigate sang SongDetailPage
    const playlistSongIds = playlistSongs.map(s => s.id);
    const currentIndex = playlistSongs.findIndex(s => s.id === song.id);
    
    if (currentIndex === -1) {
      return;
    }

    try {
      // Include song keys in the navigation params with safety check
      const keysToShare = songKeys || {};
      const encodedKeys = storeKeys(keysToShare);
      
      navigate(`/song/${song.id}?playlist=${playlistSongIds.join(',')}&index=${currentIndex}&from=shared&keys=${encodedKeys}`);
    } catch (error) {
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
      alert(`Đã thêm ${addedCount} bài hát vào danh sách thờ phượng!`);
    } else {
      alert('Tất cả bài hát đã có trong danh sách thờ phượng!');
    }
  };

  const handleSharePlaylist = () => {
    // Nút chia sẻ đã ẩn khi trống, không cần check thêm
    try {
      const songIds = playlistSongs.map(song => song.id).join(',');
      
      // Include song keys in share URL if any custom keys are set
      let shareUrl = `${window.location.origin}/playlist?songs=${songIds}`;
      
      // Include current date from URL if exists
      const currentDate = searchParams.get('date');
      if (currentDate) {
        shareUrl += `&date=${currentDate}`;
      }
      
      // Only include keys if there are custom keys set
      const hasCustomKeys = Object.keys(songKeys || {}).some(songId => {
        const song = playlistSongs.find(s => s.id.toString() === songId);
        return song && songKeys[songId] && songKeys[songId] !== song.key_chord;
      });
      
      if (hasCustomKeys) {
        // Only include keys for songs that have custom keys different from original
        const relevantKeys = {};
        Object.keys(songKeys || {}).forEach(songId => {
          const song = playlistSongs.find(s => s.id.toString() === songId);
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
          }
        }
      }
      
      // Set the share URL and show the share panel
      setShareUrl(shareUrl);
      setCurrentShareUrl(shareUrl);
      setShowSharePanel(true);
    } catch (error) {
      alert('Không thể chuẩn bị chia sẻ DS Bài hát. Vui lòng thử lại.');
    }
  };

  const handleShareUrlUpdate = useCallback((newUrl) => {
    setCurrentShareUrl(newUrl);
  }, []);

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
    alert('DS Bài hát đã được cập nhật! URL mới đã sẵn sàng để chia sẻ.');
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
      return;
    }
    
    try {
      setSongKeys(prev => {
        const updated = {
          ...prev,
          [songId]: newKey
        };
        
        // Also save to localStorage to sync with PlaylistPage
        // This ensures that if user adds song to favorites, the key changes persist
        try {
          const savedKeys = localStorage.getItem('playlist_song_keys');
          let existingKeys = {};
          
          if (savedKeys) {
            existingKeys = JSON.parse(savedKeys);
          }
          
          const syncedKeys = {
            ...existingKeys,
            [songId]: newKey
          };
          
          localStorage.setItem('playlist_song_keys', JSON.stringify(syncedKeys));
        } catch (storageError) {
        }
        
        return updated;
      });
    } catch (error) {
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 mb-2">Đang tải danh sách bài hát...</p>
          <p className="text-sm text-gray-500">Đang tải dữ liệu từ IndexedDB</p>
        </div>
      </div>
    );
  }

  // Chỉ hiển thị error page nếu không có bài hát nào và có lỗi nghiêm trọng
  if (error && playlistSongs.length === 0 && missingSongIds.length === 0) {
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40 ios-safe-top-sticky">
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
          
          {/* Hiển thị thông báo cho các bài hát không tồn tại */}
          {missingSongIds.length > 0 && missingSongIds.map((songId) => (
            <div key={`missing-${songId}`} className="relative">
              <MissingSongAlert songId={songId} />
            </div>
          ))}
        </div>

        {playlistSongs.length === 0 && missingSongIds.length === 0 && !loading && (
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
                    <SongCard
                      key={song.id}
                      variant="mini"
                      song={song}
                      showFavorite={false}
                      actionButton={
                        <Button
                          onClick={() => handleAddSong(song)}
                          size="sm"
                          className="shrink-0 w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full"
                          title="Thêm bài hát vào playlist"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                    />
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
