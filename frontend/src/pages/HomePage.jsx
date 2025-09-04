import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Heart, Filter, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import { useAppContext } from '../App';
import SearchBar from '../components/SearchBar';
import SongCard from '../components/SongCard';
import FilterPanel from '../components/FilterPanel';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const HomePage = () => {
  const navigate = useNavigate();
  const { songs, setSongs, favorites, toggleFavorite, isFavorite, types, setTypes, topics, setTopics, isOffline, setIsOffline } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    primary: { field: '', order: 'asc' },
    secondary: { field: '', order: 'asc' }
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  // Fetch songs from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Build API URL with search and sort parameters
        const params = new URLSearchParams({
          per_page: pagination.per_page.toString(),
          page: pagination.current_page.toString()
        });

        if (searchTerm.trim()) {
          params.append('search', searchTerm);
        }

        if (sortConfig.primary.field) {
          params.append('sort_by', sortConfig.primary.field);
          params.append('sort_order', sortConfig.primary.order);
          
          if (sortConfig.secondary.field) {
            params.append('sort_by_2', sortConfig.secondary.field);
            params.append('sort_order_2', sortConfig.secondary.order);
          }
        }

        const [songsRes, typesRes, topicsRes] = await Promise.all([
          fetch(`https://htnguonsong.com/api/songs?${params}`),
          fetch('https://htnguonsong.com/api/songs/types'),
          fetch('https://htnguonsong.com/api/songs/topics')
        ]);

        const [songsData, typesData, topicsData] = await Promise.all([
          songsRes.json(),
          typesRes.json(),
          topicsRes.json()
        ]);

        if (songsData.success) {
          setSongs(songsData.data);
          setPagination(songsData.pagination);
          // Save to localStorage for offline access
          localStorage.setItem('songs_data', JSON.stringify(songsData.data));
          localStorage.setItem('pagination_data', JSON.stringify(songsData.pagination));
        }

        if (typesData.success) {
          setTypes(typesData.data);
          localStorage.setItem('types_data', JSON.stringify(typesData.data));
        }

        if (topicsData.success) {
          setTopics(topicsData.data);
          localStorage.setItem('topics_data', JSON.stringify(topicsData.data));
        }

        setIsOffline(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsOffline(true);
        
        // Load from localStorage if offline
        const savedSongs = localStorage.getItem('songs_data');
        const savedTypes = localStorage.getItem('types_data');
        const savedTopics = localStorage.getItem('topics_data');
        const savedPagination = localStorage.getItem('pagination_data');
        
        if (savedSongs) setSongs(JSON.parse(savedSongs));
        if (savedTypes) setTypes(JSON.parse(savedTypes));
        if (savedTopics) setTopics(JSON.parse(savedTopics));
        if (savedPagination) setPagination(JSON.parse(savedPagination));
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchData();
    }, searchTerm ? 500 : 0); // Debounce search

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, sortConfig, pagination.current_page]);

  // Filtered songs (for offline search)
  const filteredSongs = useMemo(() => {
    if (!isOffline) return songs; // Use API results when online
    
    let filtered = songs;

    // Search filter (only when offline)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(term) ||
        song.first_lyric.toLowerCase().includes(term) ||
        (song.chorus && song.chorus.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [songs, searchTerm, isOffline]);

  // Generate search suggestions based on existing data
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const suggestions = new Set();
    const term = searchTerm.toLowerCase();
    
    // Add matching topic names that have songs
    const topicsWithSongs = new Set(songs.map(song => song.topic_name).filter(Boolean));
    topics.forEach(topic => {
      if (topicsWithSongs.has(topic.topic_name) && 
          topic.topic_name.toLowerCase().includes(term)) {
        suggestions.add(topic.topic_name);
      }
    });
    
    // Add matching type names
    types.forEach(type => {
      if (type.type_name.toLowerCase().includes(term)) {
        suggestions.add(type.type_name);
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [searchTerm, songs, topics, types]);

  const handleSongPlay = (song) => {
    navigate(`/song/${song.id}`);
  };

  const handleSearchSuggestion = (suggestion) => {
    setSearchTerm(suggestion);
  };

  const clearSort = () => {
    setSortConfig({
      primary: { field: '', order: 'asc' },
      secondary: { field: '', order: 'asc' }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Hợp Âm Thánh Ca</h1>
                <p className="text-sm text-gray-600">Nguồn: htnguonsong.com</p>
              </div>
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
                onClick={() => navigate('/playlist')}
                variant="outline"
                className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Heart className="h-4 w-4" />
                Yêu thích ({favorites.length})
              </Button>
            </div>
          </div>
          
          <SearchBar
            onSearch={setSearchTerm}
            suggestions={searchSuggestions}
            onSuggestionClick={handleSearchSuggestion}
          />

          {/* Active filters display */}
          {(sortConfig.primary.field || sortConfig.secondary.field) && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-600">Sắp xếp:</span>
              {sortConfig.primary.field && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {sortConfig.primary.field === 'key_chord' ? 'Hợp âm' :
                   sortConfig.primary.field === 'type_name' ? 'Thể loại' :
                   sortConfig.primary.field === 'topic_name' ? 'Chủ đề' :
                   sortConfig.primary.field === 'title' ? 'Tên bài hát' : sortConfig.primary.field}
                  {' '}({sortConfig.primary.order === 'asc' ? 'A→Z' : 'Z→A'})
                </Badge>
              )}
              {sortConfig.secondary.field && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  + {sortConfig.secondary.field === 'key_chord' ? 'Hợp âm' :
                     sortConfig.secondary.field === 'type_name' ? 'Thể loại' :
                     sortConfig.secondary.field === 'topic_name' ? 'Chủ đề' :
                     sortConfig.secondary.field === 'title' ? 'Tên bài hát' : sortConfig.secondary.field}
                  {' '}({sortConfig.secondary.order === 'asc' ? 'A→Z' : 'Z→A'})
                </Badge>
              )}
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
      <main className="container mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <p className="text-gray-600">
            {loading ? (
              'Đang tải...'
            ) : (
              <>
                Tìm thấy <span className="font-semibold text-blue-600">
                  {isOffline ? filteredSongs.length : pagination.total_items}
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

        {/* Songs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPlay={handleSongPlay}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite(song.id)}
            />
          ))}
        </div>

        {filteredSongs.length === 0 && (
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
        onClearSort={clearSort}
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