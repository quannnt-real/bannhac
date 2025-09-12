import React, { useCallback, useMemo, useState } from 'react';
import { Heart, Music, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getAvailableKeys, getNextKey, getPrevKey, getNextWholeToneKey, getPrevWholeToneKey } from '../utils/chordUtils';

// Memoized SongCard component for better performance
const SongCard = React.memo(({ 
  song, 
  onPlay, 
  onToggleFavorite, 
  isFavorite = false, 
  showKeyControls = false,
  currentKey,
  onKeyChange 
}) => {
  // Validate required props
  if (!song) {
    return null;
  }

  if (typeof song.id === 'undefined') {
    return null;
  }

  // Add safety checks for song object
  if (!song || !song.id) {
    return null;
  }

  // Memoized click handlers to prevent unnecessary re-renders
  const handlePlayClick = useCallback(() => {
    if (onPlay) {
      onPlay(song);
    }
  }, [song, onPlay]);

  const handleFavoriteClick = useCallback((e) => {
    e.stopPropagation(); // Prevent event bubbling
    if (onToggleFavorite) {
      onToggleFavorite(song);
    }
  }, [song, onToggleFavorite]);

  // Key transpose handlers - Add safety checks
  const displayKey = currentKey || song?.key_chord || 'C';
  
  // Memoize availableKeys to prevent recreation
  const availableKeys = useMemo(() => 
    getAvailableKeys(song?.key_chord), [song?.key_chord]
  );
  
  // Optimize event handlers with early returns
  const handleKeyUp = useCallback((e) => {
    e.stopPropagation();
    
    if (!song?.id || !onKeyChange || !availableKeys) {
      return;
    }
    
    // Chuyển 1/2 cung (1 semitone)
    const newKey = getNextKey(displayKey, availableKeys);
    if (newKey && newKey !== displayKey) {
      onKeyChange(song.id, newKey);
    }
  }, [displayKey, availableKeys, onKeyChange, song?.id]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    
    if (!song?.id || !onKeyChange || !availableKeys) {
      return;
    }
    
    // Chuyển 1/2 cung (1 semitone)
    const newKey = getPrevKey(displayKey, availableKeys);
    if (newKey && newKey !== displayKey) {
      onKeyChange(song.id, newKey);
    }
  }, [displayKey, availableKeys, onKeyChange, song?.id]);

  // Thêm handlers cho whole tone (1 cung)
  const handleKeyUpWholeTone = useCallback((e) => {
    e.stopPropagation();
    
    if (!song?.id || !onKeyChange || !availableKeys) {
      return;
    }
    
    // Chuyển 1 cung (2 semitones)
    const newKey = getNextWholeToneKey(displayKey, availableKeys);
    if (newKey && newKey !== displayKey) {
      onKeyChange(song.id, newKey);
    }
  }, [displayKey, availableKeys, onKeyChange, song?.id]);

  const handleKeyDownWholeTone = useCallback((e) => {
    e.stopPropagation();
    
    if (!song?.id || !onKeyChange || !availableKeys) {
      return;
    }
    
    // Chuyển 1 cung (2 semitones)
    const newKey = getPrevWholeToneKey(displayKey, availableKeys);
    if (newKey && newKey !== displayKey) {
      onKeyChange(song.id, newKey);
    }
  }, [displayKey, availableKeys, onKeyChange, song?.id]);

  // Memoize computed values
  const isKeyModified = useMemo(() => 
    displayKey !== (song?.key_chord || 'C'), [displayKey, song?.key_chord]
  );

  // Simplify badges memoization - only depend on data, not handlers
  const badges = useMemo(() => (
    <div className="flex items-center gap-3 mt-2 flex-wrap">
      {/* Badge cho key hiện tại */}
      <div className="flex items-center gap-2">
        {song?.type_name && (
          <Badge variant="secondary" className="text-gray-600">
            {song.type_name}
          </Badge>
        )}
        {song?.topic_name && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            {song.topic_name}
          </Badge>
        )}
      </div>
    </div>
  ), [song?.type_name, song?.topic_name]);

  // Key controls riêng biệt với thiết kế đẹp hơn
  const keyControls = useMemo(() => {
    if (!showKeyControls) return null;
    
    return (
      <div className="mt-3">
        <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/50 shadow-sm">
          <div className="flex items-center gap-2">
            {/* -- : Giảm 1 cung */}
            <Button
              onClick={handleKeyDownWholeTone}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-200 rounded-lg text-blue-700 font-bold text-sm transition-all duration-200 hover:scale-110"
              title="Giảm 1 cung"
            >
              --
            </Button>
            
            {/* - : Giảm 1/2 cung */}
            <Button
              onClick={handleKeyDown}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-200 rounded-lg text-blue-700 font-bold text-xl transition-all duration-200 hover:scale-110"
              title="Giảm 1/2 cung"
            >
              −
            </Button>
            
            {/* Key hiện tại với thiết kế đẹp */}
            <div className="mx-3 relative">
              <div className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
                isKeyModified 
                  ? 'bg-white border-blue-400 shadow-md' 
                  : 'bg-gray-50 border-gray-300 shadow-sm'
              }`}>
                <div className="text-center">
                  <span className={`font-bold text-lg ${
                    isKeyModified ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {displayKey}
                  </span>
                  {!isKeyModified && (
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      gốc
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* + : Tăng 1/2 cung */}
            <Button
              onClick={handleKeyUp}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-200 rounded-lg text-blue-700 font-bold text-xl transition-all duration-200 hover:scale-110"
              title="Tăng 1/2 cung"
            >
              +
            </Button>
            
            {/* ++ : Tăng 1 cung */}
            <Button
              onClick={handleKeyUpWholeTone}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-200 rounded-lg text-blue-700 font-bold text-sm transition-all duration-200 hover:scale-110"
              title="Tăng 1 cung"
            >
              ++
            </Button>
          </div>
        </div>
      </div>
    );
  }, [showKeyControls, displayKey, isKeyModified]); // Remove function dependencies to prevent unnecessary re-renders

  // Helper function to format date safely
  const formatDate = useMemo(() => {
    if (!song?.created_date) return '';
    
    try {
      return new Date(song.created_date).toLocaleDateString('vi-VN');
    } catch (error) {
      return 'N/A';
    }
  }, [song?.created_date]);

  // Memoized tempo and date display
  const footerInfo = useMemo(() => (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      {song?.tempo && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {song.tempo} BPM
        </span>
      )}
      {formatDate && (
        <span className="flex items-center gap-1">
          <Music className="h-3 w-3" />
          {formatDate}
        </span>
      )}
    </div>
  ), [song?.tempo, formatDate]);

  // Memoize song content to prevent re-renders
  const songContent = useMemo(() => (
    <div className="space-y-2 text-sm text-gray-600 mt-3">
      {song?.first_lyric && (
        <p className="line-clamp-2 leading-relaxed">
          <span className="font-medium text-gray-700">Lời đầu:</span> {song.first_lyric}
        </p>
      )}
      {song?.chorus && (
        <p className="line-clamp-2 leading-relaxed">
          <span className="font-medium text-gray-700">Điệp khúc:</span> {song.chorus}
        </p>
      )}
    </div>
  ), [song?.first_lyric, song?.chorus]);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-blue-100 hover:border-blue-200 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Title and Heart Button Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 
              className="font-semibold text-lg text-gray-800 group-hover:text-blue-600 cursor-pointer transition-colors truncate"
              onClick={handlePlayClick}
              title={song?.title || 'Untitled'} // Add fallback
            >
              {song?.title || 'Untitled'}
            </h3>
          </div>
          <Button
            onClick={handleFavoriteClick}
            variant="ghost"
            size="sm"
            className={`p-2 shrink-0 ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'} transition-colors`}
            aria-label={isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        
        {/* Badges Row */}
        {badges}
        
        {/* Key Controls Row */}
        {keyControls}
        
        {songContent}
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          {footerInfo}
          <Button
            onClick={handlePlayClick}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            disabled={!onPlay} // Disable if no handler
          >
            Xem chi tiết
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// Add display name for better debugging
SongCard.displayName = 'SongCard';

export default SongCard;