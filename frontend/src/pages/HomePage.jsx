import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Music, Heart, Filter, ChevronUp, Wifi, WifiOff, Import, Download, RefreshCw } from 'lucide-react';
import { useAppContext } from '../App';
import SearchBar from '../components/SearchBar';
import SongCard from '../components/SongCard';
import FilterPanel from '../components/FilterPanel';
import ImportPanel from '../components/ImportPanel';
import OfflineManagerPanel from '../components/OfflineManagerPanel';
import ContactInfo from '../components/ContactInfo';
import { offlineManager } from '../utils/offlineManager';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
// Import optimized hooks
import { usePageTitle, createPageTitle } from '../hooks/usePageTitle';
import { useScrollSafeArea } from '../hooks/useScrollSafeArea';
import { API_ENDPOINTS, buildApiUrl, apiCall } from '../utils/apiConfig';
import { useNavigate, useLocation } from 'react-router-dom';

const HomePage = () => {
  // Set page title
  usePageTitle(createPageTitle('Danh sách bài hát'));
  
  // Dynamic safe area based on scroll
  const shouldUseSafeArea = useScrollSafeArea(20);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { songs, setSongs, favorites, toggleFavorite, isFavorite, types, setTypes, topics, setTopics, isOffline, setIsOffline } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const searchTermRef = useRef(searchTerm); // Ref to avoid dependency issues
  const searchBarRef = useRef(null); // Ref for SearchBar component
  
  // Update ref when searchTerm changes
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl+F (Windows) or Cmd+F (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault(); // Prevent browser's default find
        searchBarRef.current?.focus(); // Focus and select search input
      }
      
      // ESC to clear search
      if (event.key === 'Escape' && searchTerm) {
        searchBarRef.current?.clear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  const [showFilter, setShowFilter] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    sorts: [] // Array of sort objects: [{ field: 'chord', order: 'asc' }, { field: 'title', order: 'desc' }, ...]
  });
  const [filters, setFilters] = useState({
    type_ids: [],
    topic_ids: [],
    key_chords: []
  });
  const [allSongs, setAllSongs] = useState([]);
  
  // Cache for search results to improve performance
  const searchCache = useRef(new Map());
  const lastSearchTerm = useRef('');

  // Function to handle sort button clicks
  const handleSort = (field) => {
    setSortConfig(prevConfig => {
      const existingSorts = [...prevConfig.sorts];
      const existingIndex = existingSorts.findIndex(sort => sort.field === field);
      
      if (existingIndex !== -1) {
        // Nếu field đã tồn tại, đổi order
        existingSorts[existingIndex] = {
          ...existingSorts[existingIndex],
          order: existingSorts[existingIndex].order === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Nếu field chưa tồn tại, thêm vào cuối với order 'asc'
        existingSorts.push({ field, order: 'asc' });
      }
      
      return { sorts: existingSorts };
    });
  };

  // Function to remove a sort
  const removeSort = (field) => {
    setSortConfig(prevConfig => ({
      sorts: prevConfig.sorts.filter(sort => sort.field !== field)
    }));
  };

  // Function to clear all sorts
  const clearAllSorts = () => {
    setSortConfig({ sorts: [] });
  };

  // PWA Install functionality
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Network change listener - clear error when back online
  useEffect(() => {
    const handleOnline = async () => {
      if (error && songs.length === 0) {
        setError(null);
        setLoading(true);
        
        // Auto retry data fetch when back online
        try {
          const syncResult = await offlineManager.performSmartSync();
          if (syncResult.success && syncResult.syncedSongs > 0) {
            const cachedSongs = await offlineManager.getCachedSongs();
            if (cachedSongs.length > 0) {
              setSongs(cachedSongs);
              setAllSongs(cachedSongs);
              setError(null);
            }
          }
        } catch (retryError) {
          setError('Không thể tải dữ liệu bài hát, vui lòng thử lại.');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [error, songs.length, setSongs, setAllSongs]); // Dependencies cần thiết

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Function to check if a field is currently being sorted
  const getSortStatus = (field) => {
    const sort = sortConfig.sorts.find(s => s.field === field);
    if (!sort) return null;
    
    const index = sortConfig.sorts.findIndex(s => s.field === field);
    return {
      order: sort.order,
      priority: index + 1 // 1 = primary, 2 = secondary, etc.
    };
  };

  // Smart fetch function - ưu tiên cached data, chỉ báo lỗi khi thực sự cần thiết
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let finalData = null;

      // Kiểm tra xem có cached data không
      await offlineManager.ensureInitialized();
      const cachedSongs = await offlineManager.getCachedSongs();
      
      if (cachedSongs.length > 0) {
        // Có cached data → sử dụng ngay, không báo lỗi
        finalData = cachedSongs;
        
        // Nếu online, thực hiện background sync (không blocking UI)
        if (navigator.onLine) {
          offlineManager.performSmartSync('background').then(syncResult => {
            if (syncResult.success && syncResult.syncedSongs > 0) {
              // Refresh data nếu có updates
              offlineManager.getCachedSongs().then(updatedSongs => {
                if (updatedSongs.length > cachedSongs.length) {
                  setSongs(updatedSongs);
                  setAllSongs(updatedSongs);
                  
                  // Dispatch event for notification
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'background_sync_complete', 
                      newSongs: updatedSongs.length - cachedSongs.length
                    }
                  }));
                }
              });
            }
          }).catch(error => {
            console.warn('Background sync failed:', error);
          });
        }
      } else {
        // Không có cached data → cần tải từ đầu
        if (navigator.onLine) {
          const syncResult = await offlineManager.performSmartSync('initial');
          
          if (syncResult.success && syncResult.syncedSongs > 0) {
            // Get cached songs after initial sync
            const newCachedSongs = await offlineManager.getCachedSongs();
            finalData = newCachedSongs;
            
            // Start lyrics sync in background if we have songs
            if (newCachedSongs.length > 0) {
              // Start lyrics sync in background (don't wait)
              offlineManager.performFullLyricsSync((progress) => {
                // Progress callback
              }).then(result => {
                // Dispatch event for notification system
                if (result.success && result.totalSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      totalSongs: result.totalSongs,
                      syncedCount: result.syncedCount 
                    }
                  }));
                }
              });
            }
          } else {
            setError('Không thể tải dữ liệu bài hát từ server. Vui lòng thử lại.');
            return;
          }
        } else {
          setError('Chưa có dữ liệu cached và không có kết nối mạng. Vui lòng kết nối internet để tải dữ liệu lần đầu.');
          return;
        }
      }

      if (finalData && finalData.length > 0) {
        setSongs(finalData);
        setAllSongs(finalData);
        
        // Clear any previous errors
        setError(null);
        
        // Tạo types và topics từ songs data - optimized with Map
        const typesMap = new Map();
        const topicsMap = new Map();
        
        finalData.forEach(song => {
          // Collect unique types
          if (song.type_id && song.type_name) {
            typesMap.set(song.type_id, {
              id: song.type_id,
              name: song.type_name
            });
          }
          
          // Collect unique topics (chỉ khi có topic)
          if (song.topic_id && song.topic_name) {
            topicsMap.set(song.topic_id, {
              id: song.topic_id,
              name: song.topic_name
            });
          }
        });
        
        const uniqueTypes = Array.from(typesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        const uniqueTopics = Array.from(topicsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        // Set state cho types và topics
        setTypes(uniqueTypes);
        setTopics(uniqueTopics);
        
      } else {
        setError('Không có dữ liệu bài hát nào được tìm thấy.');
      }

    } catch (error) {
      console.error('[HomePage] Error in fetchData:', error);
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.');
      setSongs([]);
      setAllSongs([]);
      setTypes([]);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - không depend vào state setters

  // Manual sync function - chỉ chạy khi user nhấn "Đồng bộ ngay"
  const performManualSync = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    try {
      const syncResult = await offlineManager.performSmartSync();
    } catch (error) {
    }
  }, []);

  // Initial data fetch - chỉ gọi một lần khi component mount
  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array - chỉ chạy một lần

  // Listen for online/offline changes to refetch data if needed
  useEffect(() => {
    const handleOnline = () => {
      // Only refetch if we previously had an error and no songs
      if (error && songs.length === 0) {
        setError(''); // Clear previous error
        fetchData();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [error, fetchData]);

  // Listen for sync completion events to update UI and sync lyrics for new songs
  useEffect(() => {
    const handleSyncComplete = async (event) => {
      try {
        const { detail } = event;
        
        // Refresh songs data after successful sync
        const updatedSongs = await offlineManager.getCachedSongs();
        if (updatedSongs.length > 0) {
          setSongs(updatedSongs);
          setAllSongs(updatedSongs);
          
          // Update types and topics từ updatedSongs
          const typesMap = new Map();
          const topicsMap = new Map();
          
          updatedSongs.forEach(song => {
            // Collect unique types
            if (song.type_id && song.type_name) {
              typesMap.set(song.type_id, {
                id: song.type_id,
                name: song.type_name
              });
            }
            
            // Collect unique topics
            if (song.topic_id && song.topic_name) {
              topicsMap.set(song.topic_id, {
                id: song.topic_id,
                name: song.topic_name
              });
            }
          });
          
          const uniqueTypes = Array.from(typesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          const uniqueTopics = Array.from(topicsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          
          setTypes(uniqueTypes);
          setTopics(uniqueTopics);
          
          // Clear any previous errors
          setError(null);
          
          // Nếu có bài hát mới, sync lyrics cho chúng (trừ khi đã sync trong manual sync)
          if (detail && (detail.newSongs > 0 || detail.updatedSongs > 0) && !detail.lyricsAlreadySynced) {
            // Tạo danh sách các bài hát cần force refresh lyrics
            // Lấy tất cả bài hát có updated_date mới nhất để đảm bảo lyrics được cập nhật
            const recentlyUpdatedIds = updatedSongs
              .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
              .slice(0, detail.newSongs + detail.updatedSongs)
              .map(song => song.id);
            
            // Start lyrics sync in background for new/updated songs
            offlineManager.performFullLyricsSync((progress) => {
              // Optional: có thể thêm progress indicator sau
            }, recentlyUpdatedIds).then(result => {
              if (result.success && result.syncedCount > 0) {
                console.log(`Đã sync lyrics cho ${result.syncedCount} bài hát mới`);
                
                // Hiển thị thông báo hoàn tất
                if (detail.newSongs > 0 && detail.updatedSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Hoàn tất: Thêm ${detail.newSongs} và cập nhật ${detail.updatedSongs} bài hát`
                    }
                  }));
                } else if (detail.newSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Hoàn tất: Thêm ${detail.newSongs} bài hát mới`
                    }
                  }));
                } else if (detail.updatedSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Hoàn tất: Cập nhật ${detail.updatedSongs} bài hát`
                    }
                  }));
                }
              } else {
                console.log('Lyrics sync completed but no new lyrics were downloaded');
                
                // Vẫn hiển thị thông báo hoàn tất metadata
                if (detail.newSongs > 0 && detail.updatedSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Thêm ${detail.newSongs} và cập nhật ${detail.updatedSongs} bài hát`
                    }
                  }));
                } else if (detail.newSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Thêm ${detail.newSongs} bài hát mới`
                    }
                  }));
                } else if (detail.updatedSongs > 0) {
                  window.dispatchEvent(new CustomEvent('syncNotification', {
                    detail: { 
                      type: 'lyrics_sync_complete', 
                      message: `Cập nhật ${detail.updatedSongs} bài hát`
                    }
                  }));
                }
              }
            }).catch(error => {
              console.error('Error syncing lyrics for new songs:', error);
              
              // Vẫn hiển thị thông báo hoàn tất metadata ngay cả khi lyrics sync lỗi
              if (detail.newSongs > 0 && detail.updatedSongs > 0) {
                window.dispatchEvent(new CustomEvent('syncNotification', {
                  detail: { 
                    type: 'lyrics_sync_complete', 
                    message: `Thêm ${detail.newSongs} và cập nhật ${detail.updatedSongs} bài hát`
                  }
                }));
              } else if (detail.newSongs > 0) {
                window.dispatchEvent(new CustomEvent('syncNotification', {
                  detail: { 
                    type: 'lyrics_sync_complete', 
                    message: `Thêm ${detail.newSongs} bài hát mới`
                  }
                }));
              } else if (detail.updatedSongs > 0) {
                window.dispatchEvent(new CustomEvent('syncNotification', {
                  detail: { 
                    type: 'lyrics_sync_complete', 
                    message: `Cập nhật ${detail.updatedSongs} bài hát`
                  }
                }));
              }
            });
          } else if (detail && detail.lyricsAlreadySynced) {
            // Lyrics đã được sync trong manual sync, chỉ hiển thị thông báo hoàn tất
            console.log('Lyrics already synced in manual sync, skipping duplicate sync');
            
            if (detail.newSongs > 0 && detail.updatedSongs > 0) {
              window.dispatchEvent(new CustomEvent('syncNotification', {
                detail: { 
                  type: 'lyrics_sync_complete', 
                  message: `Hoàn tất: Thêm ${detail.newSongs} và cập nhật ${detail.updatedSongs} bài hát (đã bao gồm lời)`
                }
              }));
            } else if (detail.newSongs > 0) {
              window.dispatchEvent(new CustomEvent('syncNotification', {
                detail: { 
                  type: 'lyrics_sync_complete', 
                  message: `Hoàn tất: Thêm ${detail.newSongs} bài hát mới (đã bao gồm lời)`
                }
              }));
            } else if (detail.updatedSongs > 0) {
              window.dispatchEvent(new CustomEvent('syncNotification', {
                detail: { 
                  type: 'lyrics_sync_complete', 
                  message: `Hoàn tất: Cập nhật ${detail.updatedSongs} bài hát (đã bao gồm lời)`
                }
              }));
            }
          }
        }
      } catch (updateError) {
        console.error('Error updating data after sync:', updateError);
      }
    };

    window.addEventListener('offlineSyncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offlineSyncComplete', handleSyncComplete);
    };
  }, []); // Empty dependency array to prevent infinite loops

  // Utility function để normalize text cho tìm kiếm thông minh
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Enhanced search function that handles punctuation intelligently - with caching
  // Enhanced search function that handles punctuation intelligently - simplified and fixed
  const isTextMatch = useCallback((text, searchTerm) => {
    if (!text || !searchTerm) return false;
    
    const cacheKey = `${text}__${searchTerm}`;
    if (searchCache.current.has(cacheKey)) {
      return searchCache.current.get(cacheKey);
    }
    
    // Simple and effective approach - remove ALL punctuation completely
    const cleanText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove ALL punctuation completely (no space replacement)
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
    
    const cleanTerm = searchTerm
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove ALL punctuation completely (no space replacement)
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
    
    // Simple substring matching after cleaning
    const result = cleanText.includes(cleanTerm);
    
    // Cache the result (limit cache size to prevent memory issues)
    if (searchCache.current.size > 1000) {
      searchCache.current.clear();
    }
    searchCache.current.set(cacheKey, result);
    
    return result;
  }, []);

  // Client-side filtering và sorting với useMemo cho performance - improved with early termination
  const filteredSongs = useMemo(() => {
    // Clear search cache when search term changes significantly
    if (Math.abs(searchTerm.length - lastSearchTerm.current.length) > 3) {
      searchCache.current.clear();
    }
    lastSearchTerm.current = searchTerm;

    let filtered = allSongs.filter(song => {
      // Filter by search term - Early termination for better performance
      if (searchTerm?.trim()) {
        // Check title first (most likely to match)
        if (isTextMatch(song.title, searchTerm)) return true;
        // Then check first lyric
        if (isTextMatch(song.first_lyric, searchTerm)) return true;
        // Then chorus
        if (isTextMatch(song.chorus, searchTerm)) return true;
        // Finally full lyrics (most expensive)
        if (isTextMatch(song.lyrics, searchTerm)) return true;
        
        // If none match, exclude this song
        return false;
      }
      
      // Filter by type
      if (filters.type_ids.length > 0 && !filters.type_ids.includes(song.type_id)) {
        return false;
      }
      
      // Filter by topic  
      if (filters.topic_ids.length > 0 && !filters.topic_ids.includes(song.topic_id)) {
        return false;
      }
      
      // Filter by key chord
      if (filters.key_chords && filters.key_chords.length > 0 && !filters.key_chords.includes(song.key_chord)) {
        return false;
      }
      
      return true;
    });

    // Apply sorting
    if (sortConfig.sorts.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const sort of sortConfig.sorts) {
          let aValue = a[sort.field];
          let bValue = b[sort.field];
          
          // Handle different field types
          if (sort.field === 'title' || sort.field === 'type_name' || sort.field === 'topic_name') {
            aValue = (aValue || '').toString().toLowerCase();
            bValue = (bValue || '').toString().toLowerCase();
          } else if (sort.field === 'chord_key') {
            aValue = (aValue || '').toString().toLowerCase();
            bValue = (bValue || '').toString().toLowerCase();
          } else if (sort.field === 'id' || sort.field === 'type_id' || sort.field === 'topic_id') {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
          }
          
          let comparison = 0;
          if (aValue < bValue) {
            comparison = -1;
          } else if (aValue > bValue) {
            comparison = 1;
          }
          
          if (comparison !== 0) {
            return sort.order === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    return filtered;
  }, [allSongs, filters, sortConfig, searchTerm, isTextMatch]); // Added isTextMatch to deps

  // Extract unique chords from songs data
  const availableChords = useMemo(() => {
    const chordsSet = new Set();
    allSongs.forEach(song => {
      if (song.key_chord && song.key_chord.trim()) {
        chordsSet.add(song.key_chord.trim());
      }
    });
    
    // Convert to array and sort - prioritize common keys first
    const commonKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Dm', 'Em', 'Am', 'Bm', 'Cm', 'Fm', 'Gm'];
    const chords = Array.from(chordsSet);
    
    return chords.sort((a, b) => {
      const aIndex = commonKeys.indexOf(a);
      const bIndex = commonKeys.indexOf(b);
      
      // If both are common keys, sort by common key order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is common, a comes first
      if (aIndex !== -1 && bIndex === -1) {
        return -1;
      }
      // If only b is common, b comes first
      if (aIndex === -1 && bIndex !== -1) {
        return 1;
      }
      // If neither is common, sort alphabetically
      return a.localeCompare(b);
    });
  }, [allSongs]);

  // Search suggestions based on current data - optimized with smart matching and limited processing
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const suggestions = new Set();
    const maxSongsToProcess = 50; // Limit for better performance
    
    // Process only a subset of songs for suggestions
    const songsToProcess = allSongs.slice(0, maxSongsToProcess);
    
    songsToProcess.forEach(song => {
      // Early exit if we have enough suggestions
      if (suggestions.size >= 8) return;
      
      // Check title matches
      if (isTextMatch(song.title, searchTerm)) {
        suggestions.add(song.title);
        return; // Don't check other fields if title matches
      }
      
      // Check first lyric matches and extract phrases
      if (song.first_lyric && isTextMatch(song.first_lyric, searchTerm)) {
        // Extract phrases that contain the search term
        const sentences = song.first_lyric.split(/[.!?]+/).filter(s => s.trim().length > 0);
        sentences.forEach(sentence => {
          if (suggestions.size >= 8) return;
          if (isTextMatch(sentence.trim(), searchTerm) && sentence.trim().length <= 50) {
            suggestions.add(sentence.trim());
          }
        });
        
        // Also add individual meaningful words
        const words = song.first_lyric.split(/[\s,.-]+/).filter(word => 
          word.length > 2 && isTextMatch(word, searchTerm)
        );
        words.forEach(word => {
          if (suggestions.size >= 8) return;
          if (word.length <= 20) { // Avoid very long words
            suggestions.add(word);
          }
        });
      }
      
      // Check chorus matches (only if we still need more suggestions)
      if (suggestions.size < 8 && song.chorus && isTextMatch(song.chorus, searchTerm)) {
        const sentences = song.chorus.split(/[.!?]+/).filter(s => s.trim().length > 0);
        sentences.forEach(sentence => {
          if (suggestions.size >= 8) return;
          if (isTextMatch(sentence.trim(), searchTerm) && sentence.trim().length <= 50) {
            suggestions.add(sentence.trim());
          }
        });
      }
    });
    
    // Convert to array, prioritize shorter suggestions, and limit to 8
    return Array.from(suggestions)
      .sort((a, b) => a.length - b.length)
      .slice(0, 8);
  }, [searchTerm, allSongs, isTextMatch]); // Added isTextMatch to deps

  // Optimized handlers with useCallback
  const handleSongPlay = useCallback((song) => {
    navigate(`/song/${song.id}`);
  }, [navigate]);

  const handleSearchSuggestion = useCallback((suggestion) => {
    setSearchTerm(suggestion);
  }, []);

  const clearSort = useCallback(() => {
    clearAllSorts();
  }, []);

  // Optimized search handler
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className={`bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40 ios-safe-top-dynamic ${!shouldUseSafeArea ? 'at-top' : ''}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="/Logo_app.png" 
                alt="Hợp Âm Thánh Ca"
                className="h-12 object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                isOffline ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
              }`}>
                {isOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                {isOffline ? 'Offline' : 'Online'}
              </div>
              
              <Button
                onClick={() => setShowImportPanel(true)}
                variant="outline"
                className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50"
                title="Nhập mã PWA để mở playlist"
              >
                <Import className="h-4 w-4" />
                <span className="hidden sm:inline">Nhập mã</span>
              </Button>

              {/* PWA Install Button */}
              {showInstallPrompt && (
                <Button
                  onClick={handleInstallClick}
                  variant="outline"
                  className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  title="Cài đặt ứng dụng lên thiết bị"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Cài App</span>
                </Button>
              )}

              {/* Offline Sync Button */}
              <Button
                onClick={() => setShowOfflinePanel(true)}
                variant="outline"
                className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
                title="Đồng bộ dữ liệu WiFi/4G và offline"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Cập nhật</span>
              </Button>
              
              <Button
                onClick={() => navigate('/favorites')}
                variant="outline"
                className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Heart className="h-4 w-4" />
                Chủ nhật ({favorites.length})
              </Button>
            </div>
          </div>
          
          <SearchBar
            ref={searchBarRef}
            onSearch={handleSearch}
            suggestions={searchSuggestions}
            onSuggestionClick={handleSearchSuggestion}
          />

          {/* Active filters display */}
          {(sortConfig.sorts.length > 0) && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-600">Sắp xếp active:</span>
              {sortConfig.sorts.map((sort, index) => (
                <Badge key={sort.field} variant="outline" className={`${
                  index === 0 ? 'text-blue-600 border-blue-200' : 'text-green-600 border-green-200'
                }`}>
                  {index === 0 ? '' : '+ '}
                  {sort.field === 'key_chord' ? 'Hợp âm' :
                   sort.field === 'type_name' ? 'Thể loại' :
                   sort.field === 'topic_name' ? 'Chủ đề' :
                   sort.field === 'title' ? 'Tên bài hát' : sort.field}
                  {' '}({sort.order === 'asc' ? 'A→Z' : 'Z→A'})
                </Badge>
              ))}
              <Button
                onClick={clearSort}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                Xóa sắp xếp
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 pb-32">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
            <button 
              onClick={() => {setError(null); fetchData();}} 
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-gray-600">
              {loading ? (
                'Đang tải...'
              ) : (
                <>
                  Tìm thấy <span className="font-semibold text-blue-600">
                    {filteredSongs.length}
                  </span> / <span className="font-semibold text-gray-600">
                    {allSongs.length}
                  </span> bài hát
                  {searchTerm && (
                    <span> cho từ khóa "<span className="font-semibold">{searchTerm}</span>"</span>
                  )}
                  {isOffline && (
                    <span className="ml-2 text-orange-600 text-sm">(Chế độ offline)</span>
                  )}
                </>
              )}
            </p>
            {!loading && <ContactInfo />}
          </div>
          {!searchTerm && (
            <p className="hidden md:block text-gray-400 text-sm mt-1">
              💡 Mẹo: Nhấn <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F</kbd> (hoặc <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F</kbd>) để tìm kiếm nhanh
            </p>
          )}
        </div>

        {/* Songs grid - Optimized rendering */}
        {loading ? (
          // Enhanced loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-72 p-4">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                  </div>
                  <div className="mt-4 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSongs.map((song, index) => (
                <SongCard
                  key={song.id} // Use song.id as key instead of compound key for better performance
                  variant="homepage"
                  song={song}
                  onPlay={handleSongPlay}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite(song.id)}
                />
              ))}
            </div>
            
            {/* Total results indicator */}
            {!loading && filteredSongs.length > 0 && (
              <div className="text-center mt-8 py-4">
                <p className="text-gray-500">
                  Hiển thị {filteredSongs.length} / {allSongs.length} bài hát
                </p>
              </div>
            )}
          </>
        )}

        {!loading && filteredSongs.length === 0 && (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Không tìm thấy bài hát</h3>
            <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
          </div>
        )}
      </main>

      {/* Floating sort panel */}
      <FilterPanel
        show={showFilter}
        onClose={() => setShowFilter(false)}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        types={types}
        topics={topics}
        chords={availableChords}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Floating action button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowFilter(!showFilter)}
          className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg text-white flex items-center justify-center"
        >
          {showFilter ? <ChevronUp className="h-6 w-6" /> : <Filter className="h-6 w-6" />}
        </Button>
      </div>

      {/* Import Panel */}
      <ImportPanel
        isOpen={showImportPanel}
        onClose={() => setShowImportPanel(false)}
      />

      {/* Offline Manager Panel */}
      {showOfflinePanel && (
        <OfflineManagerPanel onClose={() => setShowOfflinePanel(false)} />
      )}
    </div>
  );
};

export default HomePage;