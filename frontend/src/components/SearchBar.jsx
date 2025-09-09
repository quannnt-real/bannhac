import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const SearchBar = forwardRef(({ onSearch, suggestions = [], onSuggestionClick }, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select(); // Select all text when focused via shortcut
    },
    clear: () => {
      setSearchTerm('');
      setShowSuggestions(false);
      onSearch('');
    }
  }));

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]); // Removed onSearch from deps - it should be stable from parent useCallback

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    onSuggestionClick?.(suggestion);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    onSearch('');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-5 w-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Tìm kiếm theo tên bài hát, lời đầu, điệp khúc..."
          value={searchTerm}
          onChange={handleInputChange}
          className="pl-10 pr-10 py-3 text-lg border-2 border-blue-200 focus:border-blue-400 rounded-xl bg-white/90 backdrop-blur-sm"
          onFocus={() => setShowSuggestions(searchTerm.length > 0)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking on them
            setTimeout(() => setShowSuggestions(false), 200);
          }}
        />
        {searchTerm && (
          <Button
            onClick={clearSearch}
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-blue-100 max-h-60 overflow-y-auto z-50">
          <div className="p-2">
            <p className="text-sm text-gray-500 mb-2 px-2">Gợi ý tìm kiếm:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;