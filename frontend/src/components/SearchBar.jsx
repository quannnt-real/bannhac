import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Optimized SearchBar component with enhanced features
const SearchBar = React.memo(({ 
  onSearch, 
  suggestions = [], 
  onSuggestionClick, 
  placeholder = "Tìm kiếm bài hát, lời bài hát, thể loại...",
  showRecentSearches = true,
  showTrendingSearches = true 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bannhac_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(true);
    onSearch(value);
  }, [onSearch]);

  // Handle search submission
  const handleSubmit = useCallback((searchTerm) => {
    const term = searchTerm || inputValue;
    if (!term.trim()) return;

    // Add to recent searches
    const newRecentSearches = [
      term.trim(),
      ...recentSearches.filter(item => item !== term.trim())
    ].slice(0, 5); // Keep only 5 recent searches

    setRecentSearches(newRecentSearches);
    localStorage.setItem('bannhac_recent_searches', JSON.stringify(newRecentSearches));

    setShowSuggestions(false);
    inputRef.current?.blur();
    onSearch(term);
  }, [inputValue, recentSearches, onSearch]);

  // Handle form submission
  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      handleSubmit(suggestions[selectedSuggestionIndex]);
    } else {
      handleSubmit();
    }
  }, [selectedSuggestionIndex, suggestions, handleSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions) return;

    const allSuggestions = [
      ...suggestions,
      ...recentSearches.filter(item => 
        item.toLowerCase().includes(inputValue.toLowerCase()) && 
        !suggestions.includes(item)
      )
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (selectedSuggestionIndex >= 0 && allSuggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          setInputValue(allSuggestions[selectedSuggestionIndex]);
        }
        break;
    }
  }, [showSuggestions, suggestions, recentSearches, inputValue, selectedSuggestionIndex]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion);
    handleSubmit(suggestion);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  }, [handleSubmit, onSuggestionClick]);

  // Clear search
  const clearSearch = useCallback(() => {
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('bannhac_recent_searches');
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized suggestions list
  const suggestionsList = useMemo(() => {
    const filteredRecentSearches = showRecentSearches 
      ? recentSearches.filter(item => 
          item.toLowerCase().includes(inputValue.toLowerCase()) && 
          !suggestions.includes(item)
        )
      : [];

    return [
      ...suggestions.slice(0, 5),
      ...filteredRecentSearches.slice(0, 3)
    ];
  }, [suggestions, recentSearches, inputValue, showRecentSearches]);

  // Trending searches (mock data - could be from API)
  const trendingSearches = useMemo(() => [
    'Tình yêu', 'Chúa Giêsu', 'Lòng biết ơn', 'Cầu nguyện', 'Hy vọng'
  ], []);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleFormSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-10 pr-10 py-3 text-lg border-2 border-blue-200 focus:border-blue-400 rounded-xl bg-white/80 backdrop-blur-sm"
            aria-label="Tìm kiếm bài hát"
            autoComplete="off"
          />
          {inputValue && (
            <Button
              type="button"
              onClick={clearSearch}
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (inputValue || recentSearches.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {/* Current suggestions */}
          {suggestionsList.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2">Gợi ý</div>
              {suggestionsList.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    index === selectedSuggestionIndex
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{suggestion}</span>
                    {recentSearches.includes(suggestion) && (
                      <Clock className="h-3 w-3 text-gray-400 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent searches when no input */}
          {!inputValue && recentSearches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-medium text-gray-500">Tìm kiếm gần đây</div>
                <Button
                  onClick={clearRecentSearches}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-gray-600 p-1"
                >
                  Xóa
                </Button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSuggestionClick(search)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    index + suggestions.length === selectedSuggestionIndex
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{search}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Trending searches */}
          {!inputValue && showTrendingSearches && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Xu hướng
              </div>
              {trendingSearches.map((trending, index) => (
                <button
                  key={`trending-${index}`}
                  onClick={() => handleSuggestionClick(trending)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-50 text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    <span className="truncate">{trending}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;