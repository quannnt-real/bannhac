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

  // Filtered and sorted songs
  const filteredSongs = useMemo(() => {
    let filtered = songs;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(term) ||
        song.first_lyric.toLowerCase().includes(term) ||
        (song.chorus && song.chorus.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    if (sortConfig.primary.field) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.primary.field] || '';
        const bVal = b[sortConfig.primary.field] || '';
        
        let primaryCompare = 0;
        if (aVal < bVal) primaryCompare = -1;
        if (aVal > bVal) primaryCompare = 1;
        
        if (sortConfig.primary.order === 'desc') primaryCompare *= -1;
        
        // Secondary sort if primary values are equal
        if (primaryCompare === 0 && sortConfig.secondary.field) {
          const aSecVal = a[sortConfig.secondary.field] || '';
          const bSecVal = b[sortConfig.secondary.field] || '';
          
          let secondaryCompare = 0;
          if (aSecVal < bSecVal) secondaryCompare = -1;
          if (aSecVal > bSecVal) secondaryCompare = 1;
          
          if (sortConfig.secondary.order === 'desc') secondaryCompare *= -1;
          return secondaryCompare;
        }
        
        return primaryCompare;
      });
    }

    return filtered;
  }, [songs, searchTerm, sortConfig]);

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
            Tìm thấy <span className="font-semibold text-blue-600">{filteredSongs.length}</span> bài hát
            {searchTerm && (
              <span> cho từ khóa "<span className="font-semibold">{searchTerm}</span>"</span>
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