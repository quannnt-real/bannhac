import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Music2, ChevronLeft, ChevronRight, Settings, Play, X } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { parseLyrics, transposeChord, getAvailableKeys } from '../utils/chordUtils';
import { offlineManager } from '../utils/offlineManager';
import { usePageTitle, createPageTitle } from '../hooks/usePageTitle';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useOffline } from '../contexts/OfflineContext';
import { retrieveKeys, cleanupOldKeys, storeKeys } from '../utils/keyStorage';
import '../components/LyricsDisplay.css';

const SongDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useAppContext();
  const { isOffline } = useOffline();
  
  // Playlist navigation states
  const playlistParam = searchParams.get('playlist');
  const indexParam = searchParams.get('index');
  const fromParam = searchParams.get('from'); // 'favorites', 'shared', or null
  const keysParam = searchParams.get('keys'); // JSON string of song keys
  
  const playlistSongIds = playlistParam ? playlistParam.split(',').map(Number) : [];
  const currentPlaylistIndex = indexParam ? parseInt(indexParam) : -1;
  
  // Parse shared keys with safety checks
  const sharedKeys = useMemo(() => {
    if (!keysParam) return {};
    
    // Clean up old keys on component mount
    cleanupOldKeys();
    
    return retrieveKeys(keysParam);
  }, [keysParam]);

  // Extract all unique chords from parsed lyrics in order of appearance
  const extractUniqueChords = (parsedLyrics) => {
    const chordOrder = []; // Array to maintain order
    const chordSet = new Set(); // Set for uniqueness
    
    parsedLyrics.forEach(line => {
      if (line.type === 'lyric' && line.chords) {
        line.chords.forEach(chordInfo => {
          if (chordInfo.chord && !chordSet.has(chordInfo.chord)) {
            chordSet.add(chordInfo.chord);
            chordOrder.push(chordInfo.chord);
          }
        });
      } else if (line.type === 'inline-chords' && line.chords) {
        line.chords.forEach(chord => {
          if (chord && !chordSet.has(chord)) {
            chordSet.add(chord);
            chordOrder.push(chord);
          }
        });
      }
    });
    
    return chordOrder; // Return in order of appearance, not sorted
  };
  
  const [song, setSong] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [currentKey, setCurrentKey] = useState('C'); // Initialize with 'C' instead of empty string
  const [chordColor, setChordColor] = useState('#ef4444'); // Default red
  const [sectionColor, setSectionColor] = useState('#3b82f6'); // Default blue
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [currentFavoriteIndex, setCurrentFavoriteIndex] = useState(-1);
  const [baseFontSize, setBaseFontSize] = useState(18); // Base size for lyrics
  const [sectionFontSize, setSectionFontSize] = useState(13); // Independent section size
  const [swipeFeedback, setSwipeFeedback] = useState(null); // 'left', 'right', or null
  const [isNavigating, setIsNavigating] = useState(false); // Track navigation state
  const [preloadProgress, setPreloadProgress] = useState(0); // Track preload progress
  const [isLoadingSong, setIsLoadingSong] = useState(true); // Track song loading state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false); // Video player panel state

  // Calculate font sizes: lyrics and chords linked, section independent
  const lyricFontSize = baseFontSize;
  const chordFontSize = Math.round(baseFontSize * 0.78); // ~78% of lyric size (18->14, 17->13, etc.)

  // Set page title based on song
  usePageTitle(song ? createPageTitle(song.title) : createPageTitle('Chi tiết bài hát'));

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getYouTubeVideoId(song?.link_song);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : null;

  useEffect(() => {
    // Force clear all states when ID changes to prevent DOM reuse issues
    setIsLoadingSong(true);
    setSong(null);
    setParsedLyrics([]);
    setCurrentKey('C');
    setIsNavigating(false);
    setSwipeFeedback(null);
    
    const fetchSongDetail = async () => {
      try {
        let finalSongData = null;

        // Load from IndexedDB first (IndexedDB-only strategy)
        const cachedSongDetail = await offlineManager.getCachedSongDetail(parseInt(id));
        
        if (cachedSongDetail && (cachedSongDetail.lyric || cachedSongDetail.lyrics) && 
            (cachedSongDetail.lyric?.trim() !== '' || cachedSongDetail.lyrics?.trim() !== '')) {
          finalSongData = cachedSongDetail;
        } else {
          // Try basic song metadata if no detailed lyrics
          const basicSong = await offlineManager.getCachedSong(parseInt(id));
          if (basicSong) {
            finalSongData = basicSong;
          }
        }

        if (finalSongData) {
          setSong(finalSongData);
          setCurrentKey(finalSongData.key_chord || 'C');
        } else {
          setError('Không tìm thấy bài hát trong dữ liệu offline. Vui lòng đồng bộ dữ liệu trước.');
        }
      } catch (error) {
        setError('Lỗi khi tải dữ liệu bài hát từ IndexedDB.');
      } finally {
        setIsLoadingSong(false);
      }
    };

    fetchSongDetail();
  }, [id, navigate]);

  // Listen for sync completion events to refresh song details
  useEffect(() => {
    const handleSyncComplete = async (event) => {
      try {
        // Reload song details if this song might have been updated
        const currentSongId = parseInt(id);
        if (currentSongId) {
          // Refresh song detail from IndexedDB
          const updatedSongDetail = await offlineManager.getCachedSongDetail(currentSongId);
          
          if (updatedSongDetail && (updatedSongDetail.lyric || updatedSongDetail.lyrics) && 
              (updatedSongDetail.lyric?.trim() !== '' || updatedSongDetail.lyrics?.trim() !== '')) {
            setSong(updatedSongDetail);
            console.log(`Refreshed song detail for ID ${currentSongId} after sync`);
          } else {
            // Try basic song metadata if no detailed lyrics
            const basicSong = await offlineManager.getCachedSong(currentSongId);
            if (basicSong && (!song || basicSong.updated_date !== song.updated_date)) {
              setSong(basicSong);
              console.log(`Refreshed basic song data for ID ${currentSongId} after sync`);
            }
          }
        }
      } catch (updateError) {
        console.error('Error refreshing song after sync:', updateError);
      }
    };

    window.addEventListener('offlineSyncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offlineSyncComplete', handleSyncComplete);
    };
  }, [id, song]); // Include song to compare updated_date

  // Memoize để tránh re-render không cần thiết
  const memoizedPlaylistIds = useMemo(() => 
    playlistParam ? playlistParam.split(',').map(Number) : [], 
    [playlistParam]
  );

  // Load playlist songs nếu có playlist context
  useEffect(() => {
    if (memoizedPlaylistIds.length > 0) {
      const loadPlaylistSongs = async () => {
        try {
          // Load từ IndexedDB thay vì localStorage
          await offlineManager.init();
          const orderedPlaylistSongs = [];
          
          for (const songId of memoizedPlaylistIds) {
            try {
              const song = await offlineManager.getCachedSong(songId);
              if (song) {
                orderedPlaylistSongs.push(song);
              }
            } catch (error) {
            }
          }
          
          setPlaylistSongs(orderedPlaylistSongs);
        } catch (error) {
          
          // Fallback: sử dụng favorites từ context nếu đang ở favorites page
          if (fromParam === 'favorites') {
            const orderedPlaylistSongs = [];
            memoizedPlaylistIds.forEach(songId => {
              const favSong = favorites.find(s => s && s.id === songId);
              if (favSong) {
                orderedPlaylistSongs.push(favSong);
              }
            });
            setPlaylistSongs(orderedPlaylistSongs);
          }
        }
      };
      
      loadPlaylistSongs();
    }
  }, [memoizedPlaylistIds, favorites, fromParam]);

  useEffect(() => {
    if (song?.lyric) {
      setParsedLyrics(parseLyrics(song.lyric));
      // Data is already cached in IndexedDB by offlineManager, no need for localStorage
    }
  }, [song]);

  // Separate useEffect for handling initial key setting (no currentKey dependency)
  useEffect(() => {
    if (song?.id) {
      const songIdStr = song.id.toString();
      const sharedKey = sharedKeys && sharedKeys[songIdStr];
      
      if (sharedKey && sharedKey !== currentKey) {
        setCurrentKey(sharedKey);
      } else if (song.key_chord && !sharedKey && currentKey !== song.key_chord) {
        // Only set to original key if no shared key and current is different
        setCurrentKey(song.key_chord);
      }
    }
  }, [song?.id, song?.key_chord, keysParam]); // Removed JSON.stringify(sharedKeys) to prevent infinite loop

  useEffect(() => {
    // Find current song index in favorites for navigation
    const index = favorites.findIndex(fav => fav.id === parseInt(id));
    setCurrentFavoriteIndex(index);
  }, [favorites, id]);

  // Preload entire playlist for smooth navigation
  useEffect(() => {
    const preloadPlaylist = async () => {
      if (playlistSongs.length === 0) return;

      setPreloadProgress(0);
      
      // Batch preload all songs in playlist with offline support
      let completedCount = 0;
      const preloadPromises = playlistSongs.map(async (playlistSong, index) => {
        try {
          const data = await fetchSongById(playlistSong.id);
          // Data is automatically cached by fetchSongById
          
          completedCount++;
          setPreloadProgress(Math.round((completedCount / playlistSongs.length) * 100));
        } catch (error) {
          completedCount++;
          setPreloadProgress(Math.round((completedCount / playlistSongs.length) * 100));
        }
      });

      // Process preloading in small batches to avoid overwhelming the server
      const batchSize = 3;
      for (let i = 0; i < preloadPromises.length; i += batchSize) {
        const batch = preloadPromises.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        
        // Small delay between batches to be server-friendly
        if (i + batchSize < preloadPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setPreloadProgress(100);
    };

    // Start preloading after current song is loaded and with delay
    if (song && playlistSongs.length > 1) {
      const timer = setTimeout(preloadPlaylist, 2000);
      return () => clearTimeout(timer);
    }
  }, [playlistSongs, song]); // Remove currentPlaylistIndex to avoid re-preloading on every navigation

  const handleKeyChange = (newKey) => {
    setCurrentKey(newKey);
  };

  const transposeUp = () => {
    if (!song?.key_chord) {
      return;
    }
    
    try {
      const keys = getAvailableKeys(song.key_chord);
      if (!keys || keys.length === 0) return;
      
      const currentIndex = keys.findIndex(key => {
        // Find index by normalizing both current key and keys in list
        const normalizeForComparison = (k) => {
          if (!k) return '';
          const equivalents = {
            'D#m': 'Ebm', 'D#': 'Eb', 'G#m': 'Abm', 'G#': 'Ab', 
            'A#m': 'Bbm', 'A#': 'Bb', 'C#m': 'Dbm', 'C#': 'Db',
            'F#m': 'Gbm', 'F#': 'Gb', 'Ebm': 'Ebm', 'Eb': 'Eb',
            'Abm': 'Abm', 'Ab': 'Ab', 'Bbm': 'Bbm', 'Bb': 'Bb',
            'Dbm': 'Dbm', 'Db': 'Db', 'Gbm': 'Gbm', 'Gb': 'Gb'
          };
          return equivalents[k] || k;
        };
        return normalizeForComparison(key) === normalizeForComparison(currentKey);
      });
      
      if (currentIndex === -1) return;
      
      const nextIndex = (currentIndex + 1) % keys.length;
      let nextKey = keys[nextIndex];
      
      // Convert to sharp notation when going up
      const sharpEquivalents = {
        'Ebm': 'D#m', 'Abm': 'G#m', 'Bbm': 'A#m',
        'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
        'Dbm': 'C#m', 'Gbm': 'F#m',
        'Db': 'C#', 'Gb': 'F#'
      };
      nextKey = sharpEquivalents[nextKey] || nextKey;
      
      setCurrentKey(nextKey);
    } catch (error) {
    }
  };

  const transposeDown = () => {
    if (!song?.key_chord) {
      return;
    }
    
    try {
      const keys = getAvailableKeys(song.key_chord);
      if (!keys || keys.length === 0) return;
      
      const currentIndex = keys.findIndex(key => {
        const normalizeForComparison = (k) => {
          if (!k) return '';
          const equivalents = {
            'D#m': 'Ebm', 'D#': 'Eb', 'G#m': 'Abm', 'G#': 'Ab', 
            'A#m': 'Bbm', 'A#': 'Bb', 'C#m': 'Dbm', 'C#': 'Db',
            'F#m': 'Gbm', 'F#': 'Gb', 'Ebm': 'Ebm', 'Eb': 'Eb',
            'Abm': 'Abm', 'Ab': 'Ab', 'Bbm': 'Bbm', 'Bb': 'Bb',
            'Dbm': 'Dbm', 'Db': 'Db', 'Gbm': 'Gbm', 'Gb': 'Gb'
          };
          return equivalents[k] || k;
        };
        return normalizeForComparison(key) === normalizeForComparison(currentKey);
      });
      
      if (currentIndex === -1) return;
      
      const prevIndex = currentIndex === 0 ? keys.length - 1 : currentIndex - 1;
      const prevKey = keys[prevIndex];
      
      setCurrentKey(prevKey);
    } catch (error) {
    }
  };

  // Hàm chuyển tone theo 1 cung (2 semitones)
  const transposeByWholeTone = (direction) => {
    if (!song?.key_chord) {
      return;
    }
    
    try {
      const keys = getAvailableKeys(song.key_chord);
      if (!keys || keys.length === 0) return;
      
      const currentIndex = keys.findIndex(key => {
        const normalizeForComparison = (k) => {
          if (!k) return '';
          const equivalents = {
            'D#m': 'Ebm', 'D#': 'Eb', 'G#m': 'Abm', 'G#': 'Ab', 
            'A#m': 'Bbm', 'A#': 'Bb', 'C#m': 'Dbm', 'C#': 'Db',
            'F#m': 'Gbm', 'F#': 'Gb', 'Ebm': 'Ebm', 'Eb': 'Eb',
            'Abm': 'Abm', 'Ab': 'Ab', 'Bbm': 'Bbm', 'Bb': 'Bb',
            'Dbm': 'Dbm', 'Db': 'Db', 'Gbm': 'Gbm', 'Gb': 'Gb'
          };
          return equivalents[k] || k;
        };
        return normalizeForComparison(key) === normalizeForComparison(currentKey);
      });
      
      if (currentIndex === -1) return;
      
      // Chuyển 2 steps (1 cung) thay vì 1 step (1/2 cung)
      let targetIndex;
      if (direction > 0) {
        targetIndex = (currentIndex + 2) % keys.length;
      } else {
        targetIndex = currentIndex - 2;
        if (targetIndex < 0) targetIndex += keys.length;
      }
      
      let targetKey = keys[targetIndex];
      
      // Convert to appropriate notation
      if (direction > 0) {
        // Going up - prefer sharp notation
        const sharpEquivalents = {
          'Ebm': 'D#m', 'Abm': 'G#m', 'Bbm': 'A#m',
          'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
          'Dbm': 'C#m', 'Gbm': 'F#m',
          'Db': 'C#', 'Gb': 'F#'
        };
        targetKey = sharpEquivalents[targetKey] || targetKey;
      }
      
      setCurrentKey(targetKey);
    } catch (error) {
    }
  };

  const navigateToFavorite = (direction) => {
    if (!favorites || favorites.length === 0 || currentFavoriteIndex === -1) return;
  
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentFavoriteIndex > 0 ? currentFavoriteIndex - 1 : favorites.length - 1;
    } else {
      newIndex = currentFavoriteIndex < favorites.length - 1 ? currentFavoriteIndex + 1 : 0;
    }
    
    const nextSong = favorites[newIndex];
    if (nextSong && nextSong.id) {
      navigate(`/song/${nextSong.id}`);
    }
  };

  // Playlist navigation functions
  const navigateInPlaylist = (direction) => {
    if (!playlistSongs || playlistSongs.length === 0 || currentPlaylistIndex === -1) return;
  
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentPlaylistIndex > 0 ? currentPlaylistIndex - 1 : playlistSongs.length - 1;
    } else {
      newIndex = currentPlaylistIndex < playlistSongs.length - 1 ? currentPlaylistIndex + 1 : 0;
    }
    
    const nextSong = playlistSongs[newIndex];
    if (!nextSong || !nextSong.id) {
      return;
    }
    
    try {
      // Maintain playlist context when navigating
      const playlistIds = playlistSongs.map(s => s.id).join(',');
      let navUrl = `/song/${nextSong.id}?playlist=${playlistIds}&index=${newIndex}&from=${fromParam}`;
      
      // Re-encode keys properly for navigation
      if (Object.keys(sharedKeys).length > 0) {
        const encodedKeys = storeKeys(sharedKeys);
        navUrl += `&keys=${encodedKeys}`;
      }
      
      navigate(navUrl);
    } catch (error) {
    }
  };

  const goBackToPlaylist = () => {
    if (fromParam === 'favorites') {
      navigate('/favorites');
    } else if (fromParam === 'shared' && playlistParam) {
      // Include keys when going back to shared playlist
      let backUrl = `/playlist?songs=${playlistParam}`;
      if (Object.keys(sharedKeys).length > 0) {
        const encodedKeys = storeKeys(sharedKeys);
        backUrl += `&keys=${encodedKeys}`;
      }
      navigate(backUrl);
    } else {
      navigate('/');
    }
  };

  // Swipe gesture handlers
  const handleSwipeLeft = () => {
    // Prevent multiple rapid swipes
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    // Show visual feedback
    setSwipeFeedback('left');
    setTimeout(() => setSwipeFeedback(null), 300);
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    // Swipe left = next song
    try {
      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
        navigateInPlaylist('next');
      } else if (currentFavoriteIndex !== -1 && favorites.length > 1) {
        navigateToFavorite('next');
      }
    } finally {
      // Reset navigation state after a delay to prevent too rapid navigation
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  const handleSwipeRight = () => {
    // Prevent multiple rapid swipes
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    // Show visual feedback
    setSwipeFeedback('right');
    setTimeout(() => setSwipeFeedback(null), 300);
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    // Swipe right = previous song  
    try {
      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
        navigateInPlaylist('prev');
      } else if (currentFavoriteIndex !== -1 && favorites.length > 1) {
        navigateToFavorite('prev');
      }
    } finally {
      // Reset navigation state after a delay to prevent too rapid navigation
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  // Initialize swipe gesture với cài đặt tối ưu cho mobile
  const swipeRef = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    minSwipeDistance: 50, // Giảm khoảng cách tối thiểu để dễ kích hoạt hơn
    maxSwipeTime: 500     // Tăng thời gian để phù hợp với tốc độ vuốt thực tế
  });

  // Calculate unique chords from parsed lyrics with transposition
  const uniqueChords = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length === 0 || !song?.key_chord || !currentKey) {
      return [];
    }
    
    const originalChords = extractUniqueChords(parsedLyrics);
    
    // If current key is the same as original key, no transposition needed
    if (currentKey === song.key_chord) {
      return originalChords;
    }
    
    // Transpose all chords to current key
    return originalChords.map(chord => {
      try {
        return transposeChord(chord, song.key_chord, currentKey);
      } catch (error) {
        return chord;
      }
    }).sort();
  }, [parsedLyrics, song?.key_chord, currentKey]);

  const renderLyricLine = (line, index) => {
    if (line.type === 'section') {
      return (
        <div key={index} className="my-2 text-left">
          <Badge 
          variant="outline" 
          className="font-semibold rounded-md border capitalize"
          style={{ 
            backgroundColor: sectionColor + '10', 
            color: sectionColor,
            borderColor: sectionColor + '40',
            fontSize: `${lyricFontSize - 4}px`
          }}
            >
          {line.content}
          </Badge>
        </div>
      );
    }

    if (line.type === 'inline-chords') {
      // Transpose inline chords
      const transposedChords = line.chords.map(chord => {
        if (song?.key_chord && currentKey !== song.key_chord) {
          try {
            return transposeChord(chord, song.key_chord, currentKey);
          } catch (error) {
            return chord;
          }
        }
        return chord;
      });

      // Format chords with superscript for # and b
      const formatChord = (chord) => {
        return chord.replace(/([A-G])(#|b)/g, (match, note, accidental) => {
          return `${note}<sup>${accidental}</sup>`;
        });
      };

      return (
        <div key={index} className="mb-6 inline-chord-container">
          {/* Render text with inline chords */}
          <div className="lyric-text-with-inline-chords" style={{ fontSize: `${lyricFontSize}px` }}>
            {/* Display text first */}
            <span className="lyric-text-part">{line.text}</span>
            {/* Display chords inline after text */}
            <span className="inline-chords-part ml-4">
              {transposedChords.map((chord, idx) => (
                <span key={idx} className="inline-chord mr-2">
                  <span dangerouslySetInnerHTML={{ __html: formatChord(chord) }}></span>
                </span>
              ))}
            </span>
          </div>
        </div>
      );
    }

    if (line.type === 'lyric') {
      // Format chords with superscript for # and b
      const formatChord = (chord) => {
        return chord.replace(/([A-G])(#|b)/g, (match, note, accidental) => {
          return `${note}<sup>${accidental}</sup>`;
        });
      };

      // Sort chords by position for easier processing
      const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);
      
      // Use PWA-style chord display logic
      if (sortedChords.length > 0) {
        // Transpose all chords
        const transposedChords = sortedChords.map(chordInfo => ({
          ...chordInfo,
          chord: chordInfo.chord && song?.key_chord && currentKey !== song.key_chord 
            ? transposeChord(chordInfo.chord, song.key_chord, currentKey)
            : chordInfo.chord
        }));

        // Create PWA-style display with inline chords
        const lineText = line.text;
        const lineElements = [];
        let lastPos = 0;

        // Đảm bảo khoảng cách tối thiểu giữa các chord
        const adjustedChords = [];
        let lastAdjustedPos = 0;
        
        transposedChords.forEach((chordInfo, index) => {
          let adjustedPos = Math.max(chordInfo.position, lastAdjustedPos);
          
          // Đảm bảo khoảng cách tối thiểu 4 ký tự giữa các chord
          if (index > 0) {
            const minDistance = 4;
            const previousChordLength = adjustedChords[index - 1].chord ? 
              adjustedChords[index - 1].chord.length : 2;
            const requiredPos = lastAdjustedPos + minDistance + previousChordLength;
            adjustedPos = Math.max(adjustedPos, requiredPos);
          }
          
          adjustedChords.push({
            ...chordInfo,
            position: adjustedPos
          });
          
          lastAdjustedPos = adjustedPos;
        });

        // Process each chord position with adjusted positions
        adjustedChords.forEach((chordInfo, index) => {
          const chordPos = chordInfo.position;
          const originalPos = transposedChords[index].position;
          
          // Add text before this chord (sử dụng vị trí gốc)
          if (lastPos < originalPos) {
            const textBefore = lineText.substring(lastPos, originalPos);
            lineElements.push(
              <span key={`text-${index}`} className="pwa-lyric">
                {textBefore}
              </span>
            );
          }
          
          // Thêm khoảng trắng nếu chord bị đẩy xa hơn vị trí gốc
          if (chordPos > originalPos) {
            const extraSpaces = chordPos - originalPos;
            lineElements.push(
              <span key={`space-${index}`} className="pwa-lyric">
                {' '.repeat(extraSpaces)}
              </span>
            );
          }
          
          // Add chord inline at position
          lineElements.push(
            <span key={`pos-${index}`} className="pwa-lyric" style={{ position: 'relative' }}>
              <span className="pwa-chord-inline">
                <span className="pwa-chord">
                  <span dangerouslySetInnerHTML={{ __html: formatChord(chordInfo.chord) }}></span>
                </span>
              </span>
              {/* Add a zero-width character at chord position */}
              <i></i>
            </span>
          );
          
          lastPos = originalPos;
        });

        // Add remaining text after last chord
        if (lastPos < lineText.length) {
          const remainingText = lineText.substring(lastPos);
          lineElements.push(
            <span key="text-end" className="pwa-lyric">
              {remainingText}
            </span>
          );
        }

        return (
          <div key={index} className="pwa-style">
            <div className="chord-lyric-line">
              {lineElements}
            </div>
          </div>
        );
      } else {
        // Line with no chords
        return (
          <div key={index} className="pwa-style">
            <div className="chord-lyric-line text-only">
              <span className="pwa-lyric">{line.text}</span>
            </div>
          </div>
        );
      }
    }

    // Legacy fallback for old format - check if chords are too close together (spacing issue)
    if (line.type === 'lyric-legacy') {
      const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);
      const hasSpacingIssue = sortedChords.some((chord, index) => {
        if (index === sortedChords.length - 1) return false;
        const nextChord = sortedChords[index + 1];
        const distance = nextChord.position - chord.position;
        
        // If distance is less than 3 characters, we have spacing issue
        return distance <= 3;
      });

      // If chords are too close, use alternative layout
      if (hasSpacingIssue) {
        // Transpose all chords
        const transposedChords = sortedChords.map(chordInfo => ({
          ...chordInfo,
          chord: chordInfo.chord && song?.key_chord && currentKey !== song.key_chord 
            ? transposeChord(chordInfo.chord, song.key_chord, currentKey)
            : chordInfo.chord
        }));

        // Create chord-text pairs that stay together
        const chordTextPairs = [];
        let textIndex = 0;

        // Add text before first chord if any
        if (transposedChords.length > 0 && transposedChords[0].position > 0) {
          const textBefore = line.text.substring(0, transposedChords[0].position);
          if (textBefore.trim()) {
            chordTextPairs.push({
              chord: null,
              text: textBefore
            });
            textIndex = transposedChords[0].position;
          }
        }

        // Process each chord and its corresponding text
        transposedChords.forEach((chordInfo, chordIndex) => {
          const chordPos = chordInfo.position;
          
          // Determine text that belongs to this chord
          const nextChordPos = chordIndex < transposedChords.length - 1 
            ? transposedChords[chordIndex + 1].position 
            : line.text.length;
          
          // Get text from chord position to next chord (or end)
          const textForChord = line.text.substring(chordPos, nextChordPos);
          
          chordTextPairs.push({
            chord: chordInfo.chord,
            text: textForChord
          });
        });

        return (
          <div key={index} className="mb-4 spaced-lyric-container">
            <div className="chord-text-pairs">
              {chordTextPairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="chord-text-pair">
                  <div className="chord-above">
                    {pair.chord ? (
                      <span className="chord-item">
                        <span dangerouslySetInnerHTML={{ __html: formatChord(pair.chord) }}></span>
                      </span>
                    ) : (
                      <span className="chord-spacer">&nbsp;</span>
                    )}
                  </div>
                  <div className="text-below">
                    <span className="text-segment">{pair.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Original layout for well-spaced chords
      const result = [];
      let textIndex = 0;
      
      for (let chordIndex = 0; chordIndex < sortedChords.length; chordIndex++) {
        const chord = sortedChords[chordIndex];
        const chordPos = chord.position;
        
        // Add text before this chord (if any)
        if (textIndex < chordPos) {
          const textBefore = line.text.substring(textIndex, chordPos);
          result.push(
            <span key={`text-before-${chordIndex}`} className="lyric-text-segment">
              {textBefore}
            </span>
          );
        }
        
        // Transpose chord if needed
        const originalChord = chord.chord;
        const transposedChord = originalChord && song?.key_chord && currentKey !== song.key_chord 
          ? transposeChord(originalChord, song.key_chord, currentKey)
          : originalChord;

        // Determine the text that will be below this chord
        // Look for next chord or end of text
        const nextChordPos = chordIndex < sortedChords.length - 1 
          ? sortedChords[chordIndex + 1].position 
          : line.text.length;
        
        // Get text segment that will be under this chord
        const textUnderChord = line.text.substring(chordPos, Math.min(chordPos + 10, nextChordPos));
        const words = textUnderChord.split(' ');
        const firstWord = words[0] || '';
        
        // Create chord-text segment
        result.push(
          <span key={`chord-segment-${chordIndex}`} className="chord-segment">
            <span className="chord-label">
              <span dangerouslySetInnerHTML={{ __html: formatChord(transposedChord) }}></span>
            </span>
            <span className="lyric-word">
              {firstWord}
            </span>
          </span>
        );
        
        // Move text index past the first word
        textIndex = chordPos + firstWord.length;
        if (textIndex < line.text.length && line.text[textIndex] === ' ') {
          textIndex++; // Skip the space after the word
        }
      }
      
      // Add remaining text (if any)
      if (textIndex < line.text.length) {
        const remainingText = line.text.substring(textIndex);
        result.push(
          <span key="text-end" className="lyric-text-segment">
            {remainingText}
          </span>
        );
      }

      return (
        <div key={index} className="mb-4 lyric-container">
          {result}
        </div>
      );
    }

    return null;
  };

  if (isLoadingSong || !song) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="h-16 w-16 text-blue-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">
            {isLoadingSong ? 'Đang tải bài hát...' : 'Không tìm thấy bài hát'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={swipeRef} className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 relative">
      {/* Swipe Feedback Overlay */}
      {swipeFeedback && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className={`
            absolute transition-all duration-300 ease-out
            ${swipeFeedback === 'left' ? 'right-4' : 'left-4'}
          `}>
            <div className="bg-blue-500 text-white p-4 rounded-full shadow-lg transform animate-pulse">
              {swipeFeedback === 'left' ? (
                <ChevronRight className="h-6 w-6" />
              ) : (
                <ChevronLeft className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Header - Compact */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                onClick={() => {
                  // Ưu tiên quay lại playlist nếu có context
                  if (fromParam && playlistSongs.length > 0) {
                    goBackToPlaylist();
                  } else if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                variant="ghost"
                size="sm"
                className="p-1 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-gray-800 truncate uppercase">{song.title}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {/* Playlist navigation - Improved touch targets */}
              {((playlistSongs.length > 1 && currentPlaylistIndex !== -1) || 
                (currentFavoriteIndex !== -1 && favorites.length > 1 && !fromParam)) && (
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  <Button
                    onClick={() => {
                      // Add haptic feedback
                      if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(30);
                      }
                      
                      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
                        navigateInPlaylist('prev');
                      } else {
                        navigateToFavorite('prev');
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-600 px-2 min-w-[3rem] text-center font-medium">
                      {playlistSongs.length > 1 && currentPlaylistIndex !== -1 ? 
                        `${currentPlaylistIndex + 1}/${playlistSongs.length}` :
                        `${currentFavoriteIndex + 1}/${favorites.length}`
                      }
                    </span>
                    {/* Preload progress indicator */}
                    {preloadProgress > 0 && preloadProgress < 100 && playlistSongs.length > 1 && (
                      <div className="w-full bg-gray-200 rounded-full h-0.5 mt-1">
                        <div 
                          className="bg-blue-500 h-0.5 rounded-full transition-all duration-300" 
                          style={{ width: `${preloadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      // Add haptic feedback
                      if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(30);
                      }
                      
                      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
                        navigateInPlaylist('next');
                      } else {
                        navigateToFavorite('next');
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Video Player Button */}
              {song?.link_song && (
                <Button
                  onClick={() => {
                    // Add haptic feedback
                    if (window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(30);
                    }
                    setShowVideoPlayer(!showVideoPlayer);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${showVideoPlayer ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-500'}`}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Compact Video Player Panel */}
      {showVideoPlayer && song?.link_song && embedUrl && (
        <div className="bg-black border-b border-gray-200 sticky top-[60px] z-30 flex justify-center">
          <div className="w-full max-w-[600px] px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium truncate flex-1 mr-3">
                {song.title} - Video hướng dẫn
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => window.open(song.link_song, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                  title="Mở trên YouTube"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </Button>
                <Button
                  onClick={() => setShowVideoPlayer(false)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                title={`${song.title} - Video hướng dẫn`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - More space for lyrics */}
      <div className="container mx-auto px-4 py-2 pb-20">
        {/* Lyrics Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div 
                className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl md:rounded-2xl p-4 md:p-8"
                style={{
                  '--lyric-font-size': `${lyricFontSize}px`,
                  '--chord-font-size': `${chordFontSize}px`,
                  '--chord-color': chordColor,
                  '--chord-bg': chordColor + '15',
                  '--chord-border': chordColor + '30',
                  '--chord-top': `-${chordFontSize - 4}px`,
                  '--text-padding-top': `${chordFontSize}px`,
                  '--line-height': `${lyricFontSize + chordFontSize + 6}px`
                }}
              >
                <div key={`song-${id}`} className="leading-relaxed lyrics-content">
                  {parsedLyrics.map((line, index) => renderLyricLine(line, index))}
                </div>
              </div>
              
              {song.tempo && (
                <div className="text-center mt-4 md:mt-6 text-xs md:text-sm text-gray-500">
                  Tempo: {song.tempo} BPM
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Heart */}
            <Button
              onClick={() => toggleFavorite(song)}
              variant="ghost"
              size="sm"
              className={`p-2 ${isFavorite(song.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
            >
              <Heart className={`h-5 w-5 ${isFavorite(song.id) ? 'fill-current' : ''}`} />
            </Button>

            {/* Transpose Controls - Mới với logic 1 cung */}
            <div className="flex items-center gap-1">
              <Button
                onClick={() => {
                  // Logic mới: chuyển 1 cung (2 semitones) mặc định
                  transposeByWholeTone(-1);
                }}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-blue-100 text-base font-bold rounded-lg"
              >
                −−
              </Button>
              <Button
                onClick={transposeDown}
                variant="ghost"
                size="sm"
                className="h-10 w-8 p-0 hover:bg-blue-100 text-sm font-bold rounded-lg"
              >
                −
              </Button>
              
              <div className="flex flex-col items-center mx-2">
                <input
                  type="text"
                  value={currentKey || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value && value.length <= 6) {
                      setCurrentKey(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  className="bg-transparent border-0 outline-none font-bold text-lg text-center w-12 rounded"
                  style={{ color: chordColor }}
                  placeholder="Dm"
                />
                <span className="text-xs text-gray-500">
                  {currentKey === song?.key_chord ? 'gốc' : song?.key_chord}
                </span>
              </div>

              <Button
                onClick={transposeUp}
                variant="ghost"
                size="sm"
                className="h-10 w-8 p-0 hover:bg-blue-100 text-sm font-bold rounded-lg"
              >
                +
              </Button>
              <Button
                onClick={() => {
                  // Logic mới: chuyển 1 cung (2 semitones) mặc định
                  transposeByWholeTone(1);
                }}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-blue-100 text-base font-bold rounded-lg"
              >
                ++
              </Button>
            </div>

            {/* Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Settings className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 mb-4" align="end">
                <div className="space-y-4">
                  {/* Font Size controls */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Kích thước chữ</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Size:</span>
                      <Button
                        onClick={() => setBaseFontSize(Math.max(8, baseFontSize - 1))}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        -
                      </Button>
                      <span className="text-sm font-bold w-8 text-center">{baseFontSize}</span>
                      <Button
                        onClick={() => setBaseFontSize(Math.min(28, baseFontSize + 1))}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Unique Chords Display - Di chuyển vào settings */}
                  {uniqueChords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">
                        Hợp âm trong bài ({uniqueChords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueChords.map((chord, index) => {
                          const formatChord = (chordText) => {
                            return chordText.replace(/([A-G])(#|b)/g, (match, note, accidental) => {
                              return `${note}<sup>${accidental}</sup>`;
                            });
                          };
                          
                          return (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs font-semibold rounded border bg-white shadow-sm"
                              style={{
                                color: chordColor,
                                borderColor: chordColor + '40',
                                backgroundColor: 'white'
                              }}
                            >
                              <span dangerouslySetInnerHTML={{ __html: formatChord(chord) }}></span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Màu sắc</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-20">Hợp âm:</label>
                        <input
                          type="color"
                          value={chordColor}
                          onChange={(e) => setChordColor(e.target.value)}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-20">Khúc:</label>
                        <input
                          type="color"
                          value={sectionColor}
                          onChange={(e) => setSectionColor(e.target.value)}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailPage;