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
import { useLyricsLayout } from '../hooks/useLyricsLayout';
import { useOffline } from '../contexts/OfflineContext';
import { retrieveKeys, cleanupOldKeys, storeKeys } from '../utils/keyStorage';
import '../components/LyricsDisplay.css';
import YouTubePlayer from '../components/YouTubePlayer';


const SongDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useAppContext();
  const { isOffline } = useOffline();
  
  // Lyrics column layout for desktop/landscape
  const { shouldUseColumns, lyricsRef } = useLyricsLayout();
  
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
  const [error, setError] = useState(null); // Add error state
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

  // Debug server configuration for YouTube embeds
  const debugServerConfig = () => {
    const hostname = window.location.hostname;
    const isMobileDomain = hostname.startsWith('m.') || hostname.includes('mobile');
    const config = {
      protocol: window.location.protocol,
      hostname: hostname,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      isMobileDomain: isMobileDomain,
      isProduction: window.location.protocol === 'https:' && 
                    !hostname.includes('localhost') && 
                    !hostname.includes('127.0.0.1'),
      embedStrategy: isMobileDomain ? 'nocookie-first' : 'standard-first',
      commonIssues: isMobileDomain ? [
        'Mobile subdomains often blocked by YouTube',
        'Try opening in desktop browser',
        'Some videos restrict mobile embeds'
      ] : [
        'Check CSP headers',
        'Verify HTTPS certificate',
        'Check X-Frame-Options'
      ]
    };
    
    return config;
  };

  // Extract media information from various sources
  const getMediaInfo = (url) => {
    if (!url) return null;
    
    const normalizedUrl = url.trim().toLowerCase();
    
    // YouTube patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/
    ];
    
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        // Determine the best embed URL based on environment
        const hostname = window.location.hostname;
        const isProduction = window.location.protocol === 'https:' && 
                            !hostname.includes('localhost') && 
                            !hostname.includes('127.0.0.1');
        
        // Check if it's a mobile subdomain (often has issues with YouTube embeds)
        const isMobileDomain = hostname.startsWith('m.') || hostname.includes('mobile');
        
        // For mobile domains, prefer nocookie and add additional parameters
        const baseParams = isMobileDomain 
          ? 'enablejsapi=1&rel=0&modestbranding=1&playsinline=1&fs=1&controls=1'
          : 'enablejsapi=1&rel=0&modestbranding=1&playsinline=1';
        
        const embedParams = isProduction 
          ? baseParams + '&origin=' + encodeURIComponent(window.location.origin) + '&widget_referrer=' + encodeURIComponent(window.location.origin)
          : baseParams;
        
        // For mobile domains, default to nocookie to avoid embed restrictions
        const primaryDomain = isMobileDomain ? 'www.youtube-nocookie.com' : 'www.youtube.com';
        const fallbackDomain = isMobileDomain ? 'www.youtube.com' : 'www.youtube-nocookie.com';
        
        return {
          type: 'youtube',
          id: match[1],
          embedUrl: `https://${primaryDomain}/embed/${match[1]}?${embedParams}`,
          nocookieUrl: `https://${fallbackDomain}/embed/${match[1]}?${embedParams}`,
          thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
          originalUrl: url,
          isProduction,
          isMobileDomain,
          hostname,
          // Alternative viewing methods
          alternatives: {
            watchUrl: `https://www.youtube.com/watch?v=${match[1]}`,
            mobileUrl: `https://m.youtube.com/watch?v=${match[1]}`,
            appUrl: `youtube://watch?v=${match[1]}`,
            shortUrl: `https://youtu.be/${match[1]}`,
            thumbnail: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
            audioUrl: `https://www.youtube.com/watch?v=${match[1]}&t=0s`, // For audio focus
          }
        };
      }
    }
    
    // Google Drive patterns
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of drivePatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          type: 'google-drive',
          id: match[1],
          embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
          originalUrl: url
        };
      }
    }
    
    // Direct video/audio file patterns
    if (normalizedUrl.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)(\?.*)?$/)) {
      return {
        type: 'video',
        embedUrl: url,
        originalUrl: url
      };
    }
    
    if (normalizedUrl.match(/\.(mp3|wav|flac|aac|m4a|ogg|wma)(\?.*)?$/)) {
      return {
        type: 'audio',
        embedUrl: url,
        originalUrl: url
      };
    }
    
    // Other video hosting services
    if (normalizedUrl.includes('vimeo.com')) {
      const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
      if (vimeoMatch) {
        return {
          type: 'vimeo',
          id: vimeoMatch[1],
          embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
          originalUrl: url
        };
      }
    }
    
    // Facebook video
    if (normalizedUrl.includes('facebook.com') && normalizedUrl.includes('video')) {
      return {
        type: 'facebook',
        embedUrl: url,
        originalUrl: url
      };
    }
    
    // Fallback for other URLs - treat as generic web content
    if (normalizedUrl.startsWith('http')) {
      return {
        type: 'web',
        embedUrl: url,
        originalUrl: url
      };
    }
    
    return null;
  };

  const mediaInfo = getMediaInfo(song?.link_song);
  const embedUrl = mediaInfo?.embedUrl || null;

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
          
          // Trigger background sync if online to check for updates
          if (navigator.onLine) {
            offlineManager.performSmartSync('background').then(syncResult => {
              if (syncResult.success && (syncResult.newSongs > 0 || syncResult.updatedSongs > 0)) {
                // Check if current song was updated
                const currentSongId = parseInt(id);
                offlineManager.getCachedSong(currentSongId).then(updatedSong => {
                  if (updatedSong && updatedSong.updated_date !== finalSongData.updated_date) {
                    // Song was updated, trigger lyrics sync for this specific song
                    offlineManager.performFullLyricsSync(null, [currentSongId]).then(lyricsResult => {
                      if (lyricsResult.success && lyricsResult.syncedCount > 0) {
                        // Reload the updated song detail
                        offlineManager.getCachedSongDetail(currentSongId).then(newSongDetail => {
                          if (newSongDetail) {
                            setSong(newSongDetail);
                            setCurrentKey(newSongDetail.key_chord || 'C');
                          }
                        });
                      }
                    });
                  }
                });
              }
            }).catch(error => {
              console.warn('Sync nền thất bại trong SongDetailPage:', error);
            });
          }
        } else {
          // Không có dữ liệu → hướng dẫn user về trang chủ, không set error
          // setError('Không tìm thấy bài hát trong dữ liệu offline. Vui lòng đồng bộ dữ liệu trước.');
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
          // Small delay to ensure data is fully synced
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh song detail from IndexedDB
          const updatedSongDetail = await offlineManager.getCachedSongDetail(currentSongId);
          
          if (updatedSongDetail && (updatedSongDetail.lyric || updatedSongDetail.lyrics) && 
              (updatedSongDetail.lyric?.trim() !== '' || updatedSongDetail.lyrics?.trim() !== '')) {
            
            // Check if data actually changed before updating
            if (!song || 
                song.lyric !== updatedSongDetail.lyric || 
                song.lyrics !== updatedSongDetail.lyrics ||
                song.updated_date !== updatedSongDetail.updated_date) {
              
              setSong(updatedSongDetail);
              setError(null); // Clear any previous errors about missing lyrics
            } 
          } else {
            // Try basic song metadata if no detailed lyrics
            const basicSong = await offlineManager.getCachedSong(currentSongId);
            if (basicSong && (!song || basicSong.updated_date !== song.updated_date)) {
              setSong(basicSong);
              
              // If this was a manual sync and lyrics are still missing, show appropriate message
              if (event.detail?.manualSync && navigator.onLine) {
                setError('Lời bài hát đang được tải. Vui lòng đợi trong giây lát...');
              }
            }
          }
        }
      } catch (updateError) {
        console.error('[SongDetailPage] Lỗi khi làm mới bài hát sau sync:', updateError);
      }
    };

    window.addEventListener('offlineSyncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offlineSyncComplete', handleSyncComplete);
    };
  }, [id, song?.lyric, song?.updated_date]); // More specific dependencies

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
    } else {
      // Clear parsed lyrics if no lyric data
      setParsedLyrics([]);
    }
  }, [song?.lyric, song?.id]); // More specific dependencies

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

  // Group lyrics into verses for better column layout
  const groupLyricsIntoVerses = (lyrics) => {
    const verses = [];
    let currentVerse = [];
    
    lyrics.forEach((line, index) => {
      if (line.type === 'section') {
        // End current verse and start new one
        if (currentVerse.length > 0) {
          verses.push(currentVerse);
          currentVerse = [];
        }
        currentVerse.push({ ...line, index });
      } else if (line.type === 'empty' && currentVerse.length > 2) {
        // End verse on empty line if verse has enough content
        currentVerse.push({ ...line, index });
        verses.push(currentVerse);
        currentVerse = [];
      } else {
        currentVerse.push({ ...line, index });
      }
    });
    
    // Add remaining lines
    if (currentVerse.length > 0) {
      verses.push(currentVerse);
    }
    
    return verses;
  };

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

      // For inline chords, we need to reconstruct the original text
      // The parser removed backticks and separated text from inline chords
      let displayText = '';
      
      if (line.text && line.inlineChordText) {
        // Reconstruct: find where the backticks were and put inline chords back
        // If text has pattern like "Intro:  (x2)", insert inline chords in the middle
        const textParts = line.text.split(/\s{2,}/); // Split on multiple spaces
        if (textParts.length >= 2) {
          displayText = `${textParts[0]} ${line.inlineChordText} ${textParts.slice(1).join(' ')}`;
        } else {
          displayText = `${line.text} ${line.inlineChordText}`;
        }
      } else if (line.inlineChordText) {
        displayText = line.inlineChordText;
      } else {
        displayText = line.text || '';
      }
      
      // Simple regex to find and replace chord patterns
      displayText = displayText.replace(/\[([^\]]+)\]/g, (match, chord) => {
        // Apply transposition if needed
        let transposedChord = chord;
        if (song?.key_chord && currentKey !== song.key_chord) {
          try {
            transposedChord = transposeChord(chord, song.key_chord, currentKey);
          } catch (error) {
            transposedChord = chord;
          }
        }
        
        // Format chord with superscript
        const formattedChord = transposedChord.replace(/([A-G])(#|b)/g, (match, note, accidental) => {
          return `${note}<sup>${accidental}</sup>`;
        });
        
        return `<span class="pwa-inline-chord">${formattedChord}</span>`;
      });
      
      return (
        <div key={index} className="pwa-style">
          <div className="chord-lyric-line">
            <span 
              className="pwa-lyric" 
              dangerouslySetInnerHTML={{ __html: displayText }}
            />
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

        // Create hopamchuan-style display with inline chords
        const lineText = line.text;
        const lineElements = [];
        let lastPos = 0;

        // Process each chord position
        transposedChords.forEach((chordInfo, index) => {
          const chordPos = chordInfo.position;
          
          // Add text before this chord
          if (lastPos < chordPos) {
            const textBefore = lineText.substring(lastPos, chordPos);
            lineElements.push(
              <span key={`text-${index}`} className="pwa-lyric">
                {textBefore}
              </span>
            );
          }
          
          // Get the character at chord position for inline display
          const charAtPos = lineText[chordPos] || '';
          
          // Check if this is consecutive chord (no meaningful text between this and previous chord)
          // FIXED: Only treat as consecutive if PREVIOUS iteration explicitly consumed up to this position
          // AND there's truly no text content (just whitespace)
          let isConsecutiveChord = false;
          let isPreviousToConsecutive = false;
          
          if (index > 0) {
            const textBetween = lineText.substring(lastPos, chordPos);
            // Only consider consecutive if text is pure whitespace (spaces, tabs, etc.)
            // NOT if it's just empty because previous iteration consumed text up to this position
            // Check: if textBetween is not empty AND it's all whitespace
            isConsecutiveChord = textBetween.length > 0 && textBetween.trim() === '';
          }
          
          // Calculate dynamic spacing based on actual chord box widths
          let dynamicSpacing = 0;
          
          // Check if NEXT chord needs minimum spacing based on PHYSICAL WIDTH, not text length
          if (index < transposedChords.length - 1) {
            const nextChordPos = transposedChords[index + 1].position;
            const nextChord = transposedChords[index + 1];
            
            // Calculate chord box widths (padding + border + text)
            // Each chord box has: 6px padding each side + 1px border each side = 14px fixed
            // Plus ~8px per character for the chord text
            const currentChordBoxWidth = 14 + (chordInfo.chord.length * 8);
            const nextChordBoxWidth = 14 + (nextChord.chord.length * 8);
            
            // Text segment from current chord to next chord (including first char)
            const textSegment = lineText.substring(chordPos, nextChordPos);
            // Estimated text width: ~8px per character
            const textWidth = textSegment.length * 8;
            
            // Minimum space needed to prevent chord boxes from overlapping:
            // We need at least half of current chord box + gap + half of next chord box
            // This ensures chord boxes have clear visual separation
            const minSpaceNeeded = (currentChordBoxWidth * 0.6) + 20 + (nextChordBoxWidth * 0.6);
            
            // If available text width is less than needed, add extra spacing
            if (textWidth < minSpaceNeeded) {
              isPreviousToConsecutive = true;
              dynamicSpacing = Math.ceil(minSpaceNeeded - textWidth);
            }
          }
          
          // For truly consecutive chords (no text at all), ensure spacing
          if (isConsecutiveChord && dynamicSpacing === 0) {
            const chordLength = chordInfo.chord.length;
            let nextChordLength = chordLength;
            if (index < transposedChords.length - 1) {
              nextChordLength = transposedChords[index + 1].chord.length;
            }
            const longestChord = Math.max(chordLength, nextChordLength);
            dynamicSpacing = 20 + (longestChord * 8);
          }
          
          // For consecutive chords: don't display the whitespace character, but add proper spacing
          // This prevents text duplication while maintaining visual separation
          const shouldDisplayChar = !isConsecutiveChord || (charAtPos && charAtPos.trim() !== '');
          const displayChar = shouldDisplayChar ? charAtPos : '';
          
          // For consecutive chords: add a spacer span first, then the chord above it
          if (isConsecutiveChord) {
            // Add invisible spacer with the chord positioned above it
            // Use non-breaking space to maintain line height and proper positioning
            lineElements.push(
              <span 
                key={`chord-${index}`} 
                className="pwa-lyric consecutive-chord"
                style={{ 
                  position: 'relative',
                  visibility: 'visible' // Ensure span is visible (though content might be invisible)
                }}
              >
                <span className="pwa-chord-inline">
                  <i>[</i>
                  <span className="pwa-chord">
                    <span dangerouslySetInnerHTML={{ __html: formatChord(chordInfo.chord) }}></span>
                  </span>
                  <i>]</i>
                </span>
                <span style={{ opacity: 0, userSelect: 'none' }}>&nbsp;</span>
              </span>
            );
            // Always advance position to skip the whitespace/empty character
            lastPos = chordPos + 1;
          } else {
            // Normal chord with character
            // FIXED: Create wrapper for chord + ALL text until next chord, then apply spacing to wrapper
            
            // Get all text from this chord to the next chord (or end)
            let textSegment = displayChar; // Start with first character
            let segmentEnd = chordPos + 1;
            
            if (isPreviousToConsecutive && index < transposedChords.length - 1) {
              // Include all text up to (but NOT including) next chord position
              // This ensures the next chord's first character is NOT consumed here
              const nextChordPos = transposedChords[index + 1].position;
              textSegment = lineText.substring(chordPos, nextChordPos);
              // Set segmentEnd to nextChordPos so that lastPos skips to it
              // BUT the next chord will still render its own first character
              segmentEnd = nextChordPos;
            }
            
            const chordElement = (
              <span 
                key={`chord-${index}`} 
                className={`pwa-lyric ${isPreviousToConsecutive ? 'previous-to-consecutive' : ''}`}
                style={{ 
                  position: 'relative',
                  marginRight: isPreviousToConsecutive ? `${dynamicSpacing}px` : undefined
                }}
              >
                <span className="pwa-chord-inline">
                  <i>[</i>
                  <span className="pwa-chord">
                    <span dangerouslySetInnerHTML={{ __html: formatChord(chordInfo.chord) }}></span>
                  </span>
                  <i>]</i>
                </span>
                {textSegment}
              </span>
            );
            
            lineElements.push(chordElement);
            // Advance position to end of text segment
            lastPos = segmentEnd;
          }
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
          <p className="text-gray-600 mb-2">
            {isLoadingSong ? 'Đang tải bài hát...' : 'Chưa có dữ liệu bài hát'}
          </p>
          {!isLoadingSong && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Vui lòng quay lại trang chủ để tải dữ liệu bài hát
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-2"
                variant="outline"
              >
                Quay lại trang chủ
              </Button>
            </>
          )}
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40 ios-safe-top-sticky">
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

              {/* Media Player Button */}
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
                  title={
                    isOffline 
                      ? 'Không thể phát media khi offline' 
                      : mediaInfo?.type === 'youtube'
                        ? 'Xem video hướng dẫn (YouTube)'
                        : mediaInfo?.type === 'audio' 
                          ? 'Phát audio hướng dẫn'
                          : 'Phát video hướng dẫn'
                  }
                >
                  {mediaInfo?.type === 'audio' ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M9 12h.01M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Compact Video Player Panel */}
      {showVideoPlayer && song?.link_song && (
        <div className="bg-black border-b border-gray-200 sticky top-[60px] z-30 flex justify-center">
          <div className="w-full max-w-[600px] px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium truncate flex-1 mr-3">
                {song.title} - {mediaInfo?.type === 'audio' ? 'Audio' : 'Video'} hướng dẫn
                {mediaInfo?.type && (
                  <span className="ml-2 text-xs text-gray-300 uppercase">
                    ({mediaInfo.type === 'youtube' ? 'YouTube Player' : 
                      mediaInfo.type === 'google-drive' ? 'Google Drive' : 
                      mediaInfo.type === 'vimeo' ? 'Vimeo' :
                      mediaInfo.type === 'audio' ? 'Audio' :
                      mediaInfo.type === 'video' ? 'Video' :
                      mediaInfo.type})
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => window.open(song.link_song, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                  title={`Mở trong tab mới`}
                >
                  {mediaInfo?.type === 'youtube' ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m18 13 6-6-6-6"/>
                      <path d="M2 5h12"/>
                      <path d="M2 19h12"/>
                    </svg>
                  )}
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
            
            {/* Offline Warning */}
            {isOffline ? (
              <div className="bg-orange-900/80 border border-orange-700 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-orange-300 font-medium">Đang ngoại tuyến</span>
                </div>
                <p className="text-orange-200 text-sm">
                  Không thể tải nội dung media khi offline. Vui lòng kiểm tra kết nối internet và thử lại.
                </p>
                <Button
                  onClick={() => window.open(song.link_song, '_blank')}
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-orange-800 border-orange-600 text-orange-200 hover:bg-orange-700"
                >
                  Mở link gốc
                </Button>
              </div>
            ) : (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                {/* Media Player based on type */}
                {mediaInfo?.type === 'audio' ? (
                  <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                    <audio 
                      controls 
                      className="w-full max-w-md"
                      preload="metadata"
                    >
                      <source src={embedUrl} />
                      Trình duyệt không hỗ trợ phát audio.
                    </audio>
                  </div>
                ) : mediaInfo?.type === 'video' ? (
                  <video 
                    controls 
                    className="w-full h-full"
                    preload="metadata"
                  >
                    <source src={embedUrl} />
                    Trình duyệt không hỗ trợ phát video.
                  </video>
                ) : embedUrl ? (
                  <div className="aspect-video relative">
                    {/* YouTube Direct Video Player */}
                    {mediaInfo?.type === 'youtube' ? (
                      <div className="w-full h-full bg-gray-900 relative rounded-lg overflow-hidden">
                        {/* Using new YouTube Internal API Player */}
                        <YouTubePlayer 
                          videoId={mediaInfo.id}
                          title={song.title}
                          thumbnailUrl={mediaInfo.thumbnailUrl}
                          alternatives={mediaInfo.alternatives}
                          isMobileDomain={mediaInfo.isMobileDomain}
                        />
                      </div>
                    ) : (
                      // Other media types - keep iframe for non-YouTube
                      <iframe
                        src={embedUrl}
                        title={`${song.title} - ${mediaInfo?.type === 'audio' ? 'Audio' : 'Video'} hướng dẫn`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-gray-800 text-gray-300">
                    <div className="text-center max-w-sm px-4">
                      <svg className="h-12 w-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <p className="text-sm mb-2 font-medium">Định dạng link không được hỗ trợ</p>
                      <p className="text-xs text-gray-400 mb-3">
                        Chúng tôi hỗ trợ: YouTube, Google Drive, Vimeo, file MP4/MP3 trực tiếp
                      </p>
                      <Button
                        onClick={() => window.open(song.link_song, '_blank')}
                        variant="outline"
                        size="sm"
                        className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      >
                        Mở link gốc
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  '--line-height': `${lyricFontSize + chordFontSize + 16}px`,
                  '--chord-padding': `${Math.max(1, Math.round(chordFontSize * 0.15))}px ${Math.max(4, Math.round(chordFontSize * 0.4))}px`
                }}
              >
                <div 
                  key={`song-${id}`} 
                  ref={lyricsRef}
                  className={`leading-relaxed lyrics-content ${shouldUseColumns ? 'column-layout' : ''}`}
                >
                  {shouldUseColumns ? (
                    // Column layout: group into verses
                    groupLyricsIntoVerses(parsedLyrics).map((verse, verseIndex) => (
                      <div key={verseIndex} className="verse-block">
                        {verse.map((line) => renderLyricLine(line, line.index))}
                      </div>
                    ))
                  ) : (
                    // Regular layout: render lines directly
                    parsedLyrics.map((line, index) => renderLyricLine(line, index))
                  )}
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