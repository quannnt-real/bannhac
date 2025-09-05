import { useState, useEffect, useCallback, useRef } from 'react';

// Enhanced debounced search hook with performance optimizations
export const useOptimizedSearch = (songs, searchDelay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(songs);
  const timeoutRef = useRef(null);
  const searchCacheRef = useRef(new Map());

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, searchDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchTerm, searchDelay]);

  // Optimized search function with caching
  const performSearch = useCallback((term, songsData) => {
    if (!term.trim()) {
      return songsData;
    }

    // Check cache first
    const cacheKey = `${term.toLowerCase()}_${songsData.length}`;
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey);
    }

    const termLower = term.toLowerCase();
    const results = [];
    const scoreMap = new Map();

    // Enhanced search with scoring for better relevance
    songsData.forEach(song => {
      let score = 0;
      const titleLower = song.title.toLowerCase();
      const firstLyricLower = song.first_lyric ? song.first_lyric.toLowerCase() : '';
      const chorusLower = song.chorus ? song.chorus.toLowerCase() : '';

      // Title matches get highest score
      if (titleLower.includes(termLower)) {
        score += titleLower.indexOf(termLower) === 0 ? 10 : 5; // Exact start match gets higher score
      }

      // First lyric matches
      if (firstLyricLower.includes(termLower)) {
        score += 3;
      }

      // Chorus matches
      if (chorusLower.includes(termLower)) {
        score += 2;
      }

      // Type and topic matches
      if (song.type_name && song.type_name.toLowerCase().includes(termLower)) {
        score += 1;
      }
      if (song.topic_name && song.topic_name.toLowerCase().includes(termLower)) {
        score += 1;
      }

      // Key chord matches
      if (song.key_chord && song.key_chord.toLowerCase().includes(termLower)) {
        score += 1;
      }

      if (score > 0) {
        scoreMap.set(song.id, score);
        results.push(song);
      }
    });

    // Sort by score (descending)
    results.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

    // Cache the results (limit cache size to prevent memory issues)
    if (searchCacheRef.current.size > 50) {
      const oldestKey = searchCacheRef.current.keys().next().value;
      searchCacheRef.current.delete(oldestKey);
    }
    searchCacheRef.current.set(cacheKey, results);

    return results;
  }, []);

  // Update search results when debounced term or songs change
  useEffect(() => {
    const results = performSearch(debouncedTerm, songs);
    setSearchResults(results);
  }, [debouncedTerm, songs, performSearch]);

  // Search suggestions with intelligent ranking
  const searchSuggestions = useCallback((partialTerm) => {
    if (!partialTerm.trim() || partialTerm.length < 2) {
      return [];
    }

    const term = partialTerm.toLowerCase();
    const suggestions = new Set();
    
    // Get suggestions from cached results if available
    const cacheKey = `${term}_${songs.length}`;
    const cachedResults = searchCacheRef.current.get(cacheKey) || songs;

    cachedResults.slice(0, 100).forEach(song => { // Limit to first 100 for performance
      // Priority: exact title matches
      if (song.title.toLowerCase().includes(term)) {
        suggestions.add(song.title);
      }

      // Add type and topic suggestions
      if (song.type_name && song.type_name.toLowerCase().includes(term)) {
        suggestions.add(song.type_name);
      }
      if (song.topic_name && song.topic_name.toLowerCase().includes(term)) {
        suggestions.add(song.topic_name);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }, [songs]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
    setSearchResults(songs);
  }, [songs]);

  // Clear cache when songs change significantly
  useEffect(() => {
    searchCacheRef.current.clear();
  }, [songs.length]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    isSearching,
    searchResults,
    searchSuggestions,
    clearSearch,
    hasResults: searchResults.length > 0,
    totalResults: searchResults.length
  };
};
