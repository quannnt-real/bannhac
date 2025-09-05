import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Heart, Filter, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import { useAppContext } from '../App';
import SearchBar from '../components/SearchBar';
import SongCard from '../components/SongCard';
import FilterPanel from '../components/FilterPanel';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
// Import optimized hooks
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';

const HomePage = () => {
  const navigate = useNavigate();
  const { songs, setSongs, favorites, toggleFavorite, isFavorite, types, setTypes, topics, setTopics, isOffline, setIsOffline } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    sorts: [] // Array of sort objects: [{ field: 'chord', order: 'asc' }, { field: 'title', order: 'desc' }, ...]
  });
  const [filters, setFilters] = useState({
    type_ids: [],
    topic_ids: []
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });
  const [allSongs, setAllSongs] = useState([]);

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

  // Optimized fetch function with caching
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build API URL with search and sort parameters
      const params = new URLSearchParams({
        all: 'true' // Lấy tất cả bài hát
      });

      if (searchTerm?.trim()) {
        params.append('search', searchTerm);
      }

      const apiUrl = `/api/songs?${params}`;
      console.log('📡 Fetching from proxy:', apiUrl);

      // Gọi API qua proxy thay vì trực tiếp
      const songsRes = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      const songsData = await songsRes.json();

      if (songsData.success) {
        setSongs(songsData.data);
        setAllSongs(songsData.data);
        
        // Tạo types và topics từ songs data - optimized with Map
        const typesMap = new Map();
        const topicsMap = new Map();
        
        songsData.data.forEach(song => {
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
        
        // Không cần pagination khi lấy all=true
        setPagination({
          current_page: 1,
          per_page: songsData.data.length,
          total_items: songsData.data.length,
          total_pages: 1,
          has_next: false,
          has_prev: false
        });
        
        // Save to localStorage for offline access
        localStorage.setItem('songs_data', JSON.stringify(songsData.data));
        localStorage.setItem('types_data', JSON.stringify(uniqueTypes));
        localStorage.setItem('topics_data', JSON.stringify(uniqueTopics));
      }

      setIsOffline(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsOffline(true);
      
      // Load from localStorage if offline
      const savedSongs = localStorage.getItem('songs_data');
      const savedTypes = localStorage.getItem('types_data');
      const savedTopics = localStorage.getItem('topics_data');
      
      if (savedSongs) {
        const songsData = JSON.parse(savedSongs);
        setSongs(songsData);
        setAllSongs(songsData);
      }
      if (savedTypes) setTypes(JSON.parse(savedTypes));
      if (savedTopics) setTopics(JSON.parse(savedTopics));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, setSongs, setTypes, setTopics, setIsOffline]);

  // Debounced effect for API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchData();
    }, searchTerm ? 500 : 0); // Debounce search

    return () => clearTimeout(debounceTimer);
  }, [fetchData, searchTerm]);

  // Client-side filtering và sorting với useMemo cho performance
  const filteredSongs = useMemo(() => {
    let filtered = allSongs.filter(song => {
      // Filter by type
      if (filters.type_ids.length > 0 && !filters.type_ids.includes(song.type_id)) {
        return false;
      }
      
      // Filter by topic  
      if (filters.topic_ids.length > 0 && !filters.topic_ids.includes(song.topic_id)) {
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
  }, [allSongs, filters, sortConfig]);

  // Search suggestions based on current data - optimized
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const suggestions = new Set();
    
    // Limit search to first 100 songs for performance
    filteredSongs.slice(0, 100).forEach(song => {
      if (song.title.toLowerCase().includes(term)) {
        suggestions.add(song.title);
      }
      if (song.first_lyric && song.first_lyric.toLowerCase().includes(term)) {
        const words = song.first_lyric.split(' ').filter(word => 
          word.toLowerCase().includes(term) && word.length > 2
        );
        words.forEach(word => suggestions.add(word));
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [searchTerm, filteredSongs]);

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
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://htnguonsong.com/dist/img/brand/Logo_app.png" 
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
        <div className="mb-6">
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
    </div>
  );
};

export default HomePage;