import React, { useCallback } from 'react';
import { Heart, Music, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// HomePageSongCard component for displaying songs on the home page
const HomePageSongCard = React.memo(({ 
  song, 
  onPlay, 
  onToggleFavorite, 
  isFavorite = false 
}) => {
  // Validate required props
  if (!song) {
    return null;
  }

  if (typeof song.id === 'undefined') {
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

  const handleTitleClick = useCallback(() => {
    if (onPlay) {
      onPlay(song);
    }
  }, [song, onPlay]);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-blue-100 hover:border-blue-200 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-md text-gray-800 group-hover:text-blue-600 cursor-pointer transition-colors truncate uppercase"
              onClick={handleTitleClick}
            >
              {song.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {song.key_chord}
              </Badge>
              <Badge variant="secondary" className="text-gray-600">
                {song.type_name}
              </Badge>
              {song.topic_name && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {song.topic_name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={handleFavoriteClick}
            variant="ghost"
            size="sm"
            className={`ml-2 p-2 ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'} transition-colors`}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p className="line-clamp-2 leading-relaxed">
            <span className="font-medium text-gray-700">Lời đầu:</span> {song.first_lyric}
          </p>
          {song.chorus && (
            <p className="line-clamp-2 leading-relaxed">
              <span className="font-medium text-gray-700">Điệp khúc:</span> {song.chorus}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {song.tempo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {song.tempo} BPM
              </span>
            )}
            <span className="flex items-center gap-1">
              <Music className="h-3 w-3" />
              {new Date(song.created_date).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <Button
            onClick={handlePlayClick}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Xem chi tiết
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

HomePageSongCard.displayName = 'HomePageSongCard';

export default HomePageSongCard;
