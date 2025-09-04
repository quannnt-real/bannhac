import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Music2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { parseLyrics, transposeChord, getAvailableKeys } from '../utils/chordUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SongDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite, isOffline } = useAppContext();
  
  const [song, setSong] = useState(null);
  const [currentKey, setCurrentKey] = useState('');
  const [chordColor, setChordColor] = useState('#ef4444'); // Default red
  const [sectionColor, setSectionColor] = useState('#3b82f6'); // Default blue
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [currentFavoriteIndex, setCurrentFavoriteIndex] = useState(-1);
  const [lyricFontSize, setLyricFontSize] = useState(18);
  const [chordFontSize, setChordFontSize] = useState(14);
  const [sectionFontSize, setSectionFontSize] = useState(16);

  const chordColors = [
    { name: 'Đỏ', value: '#ef4444' },
    { name: 'Xanh dương', value: '#3b82f6' },
    { name: 'Xanh lá', value: '#10b981' },
    { name: 'Tím', value: '#8b5cf6' },
    { name: 'Cam', value: '#f97316' },
    { name: 'Hồng', value: '#ec4899' },
    { name: 'Nâu', value: '#a3a3a3' }
  ];

  useEffect(() => {
    const fetchSongDetail = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/proxy/songs/view/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setSong(data.data);
          setCurrentKey(data.data.key_chord);
        } else {
          console.error('Failed to fetch song:', data);
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching song:', error);
        // Try to load from localStorage if offline
        const offlineData = localStorage.getItem(`song_${id}`);
        if (offlineData) {
          const songData = JSON.parse(offlineData);
          setSong(songData);
          setCurrentKey(songData.key_chord);
        } else {
          navigate('/');
        }
      }
    };

    fetchSongDetail();
  }, [id, navigate]);

  useEffect(() => {
    if (song?.lyric) {
      setParsedLyrics(parseLyrics(song.lyric));
      // Save to localStorage for offline access
      localStorage.setItem(`song_${song.id}`, JSON.stringify(song));
    }
  }, [song]);

  useEffect(() => {
    // Find current song index in favorites for navigation
    const index = favorites.findIndex(fav => fav.id === parseInt(id));
    setCurrentFavoriteIndex(index);
  }, [favorites, id]);

  const handleKeyChange = (newKey) => {
    setCurrentKey(newKey);
  };

  const transposeUp = () => {
    const keys = getAvailableKeys();
    const currentIndex = keys.indexOf(currentKey);
    const nextIndex = (currentIndex + 1) % keys.length;
    setCurrentKey(keys[nextIndex]);
  };

  const transposeDown = () => {
    const keys = getAvailableKeys();
    const currentIndex = keys.indexOf(currentKey);
    const prevIndex = currentIndex === 0 ? keys.length - 1 : currentIndex - 1;
    setCurrentKey(keys[prevIndex]);
  };

  const navigateToFavorite = (direction) => {
    if (currentFavoriteIndex === -1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentFavoriteIndex > 0 ? currentFavoriteIndex - 1 : favorites.length - 1;
    } else {
      newIndex = currentFavoriteIndex < favorites.length - 1 ? currentFavoriteIndex + 1 : 0;
    }
    
    const nextSong = favorites[newIndex];
    if (nextSong) {
      navigate(`/song/${nextSong.id}`);
    }
  };

  const renderLyricLine = (line, index) => {
    if (line.type === 'section') {
      return (
        <div key={index} className="my-8 text-center">
          <Badge 
            variant="outline" 
            className="px-6 py-3 font-bold rounded-full border-2"
            style={{ 
              backgroundColor: sectionColor + '15', 
              color: sectionColor,
              borderColor: sectionColor + '60',
              fontSize: `${sectionFontSize}px`
            }}
          >
            {line.content.toUpperCase()}
          </Badge>
        </div>
      );
    }

    if (line.type === 'lyric') {
      const words = line.text.split(' ').filter(word => word.trim());
      const result = [];
      let currentPos = 0;

      // Create a mapping of positions to chords
      const chordMap = new Map();
      line.chords.forEach(chord => {
        chordMap.set(chord.position, chord.chord);
      });

      words.forEach((word, idx) => {
        // Check if there's a chord at this position
        if (chordMap.has(currentPos)) {
          const originalChord = chordMap.get(currentPos);
          const transposedChord = song?.key_chord && currentKey !== song.key_chord 
            ? transposeChord(originalChord, song.key_chord, currentKey)
            : originalChord;

          result.push(
            <span key={`chord-${idx}`} className="relative inline-block mr-1" style={{ minWidth: '40px' }}>
              <span 
                className="absolute left-0 font-bold whitespace-nowrap px-2 py-1 rounded shadow-sm"
                style={{ 
                  color: chordColor,
                  backgroundColor: chordColor + '20',
                  fontSize: `${chordFontSize}px`,
                  top: `-${chordFontSize + 8}px`,
                  border: `1px solid ${chordColor}40`
                }}
              >
                {transposedChord}
              </span>
              <span 
                className="text-gray-800 font-medium"
                style={{ fontSize: `${lyricFontSize}px` }}
              >
                {word}
              </span>
            </span>
          );
        } else {
          result.push(
            <span 
              key={`word-${idx}`} 
              className="text-gray-800 font-medium mr-1"
              style={{ fontSize: `${lyricFontSize}px` }}
            >
              {word}
            </span>
          );
        }
        
        currentPos += word.length + 1; // +1 for space
      });

      return (
        <div 
          key={index} 
          className="py-3 text-left flex flex-wrap items-baseline"
          style={{ 
            minHeight: `${Math.max(lyricFontSize + chordFontSize + 16, 48)}px`,
            lineHeight: `${lyricFontSize + 8}px`
          }}
        >
          {result}
        </div>
      );
    }

    return null;
  };

  if (!song) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="h-16 w-16 text-blue-300 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải bài hát...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  // Handle back navigation, especially in offline mode
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{song.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Tone: {currentKey}
                  </Badge>
                  {song.type_name && (
                    <Badge variant="secondary">{song.type_name}</Badge>
                  )}
                  {song.topic_name && (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {song.topic_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Favorite navigation (only show if current song is in favorites) */}
              {currentFavoriteIndex !== -1 && favorites.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => navigateToFavorite('prev')}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 px-2">
                    {currentFavoriteIndex + 1}/{favorites.length}
                  </span>
                  <Button
                    onClick={() => navigateToFavorite('next')}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Button
                onClick={() => toggleFavorite(song)}
                variant="ghost"
                size="sm"
                className={`p-2 ${isFavorite(song.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
              >
                <Heart className={`h-5 w-5 ${isFavorite(song.id) ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Controls - Compact design */}
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            {/* Transpose controls */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Tone:</span>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                <Button
                  onClick={transposeDown}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-100"
                >
                  -
                </Button>
                <div className="flex items-center gap-1 px-3">
                  <span className="font-bold text-lg" style={{ color: chordColor }}>
                    {currentKey}
                  </span>
                  {currentKey === song?.key_chord && (
                    <span className="text-xs text-gray-500">(gốc)</span>
                  )}
                </div>
                <Button
                  onClick={transposeUp}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-100"
                >
                  +
                </Button>
              </div>
              <Button
                onClick={() => setCurrentKey(song?.key_chord || 'C')}
                variant="outline"
                size="sm"
                className="text-xs border-gray-300"
              >
                Reset
              </Button>
            </div>

            {/* Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Settings className="h-4 w-4 mr-1" />
                  Tùy chỉnh
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-6">
                  {/* Font sizes */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Kích thước chữ</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Lời bài hát: {lyricFontSize}px</label>
                        <input
                          type="range"
                          min="14"
                          max="24"
                          value={lyricFontSize}
                          onChange={(e) => setLyricFontSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Hợp âm: {chordFontSize}px</label>
                        <input
                          type="range"
                          min="10"
                          max="18"
                          value={chordFontSize}
                          onChange={(e) => setChordFontSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Ký hiệu khúc: {sectionFontSize}px</label>
                        <input
                          type="range"
                          min="12"
                          max="20"
                          value={sectionFontSize}
                          onChange={(e) => setSectionFontSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Màu sắc</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Màu hợp âm</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={chordColor}
                            onChange={(e) => setChordColor(e.target.value)}
                            className="w-12 h-8 rounded border border-gray-200 cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {chordColors.slice(0, 4).map(color => (
                              <button
                                key={color.value}
                                onClick={() => setChordColor(color.value)}
                                className={`w-6 h-6 rounded border-2 transition-all ${
                                  chordColor === color.value ? 'border-gray-800' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Màu ký hiệu khúc</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={sectionColor}
                            onChange={(e) => setSectionColor(e.target.value)}
                            className="w-12 h-8 rounded border border-gray-200 cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {[
                              { name: 'Xanh dương', value: '#3b82f6' },
                              { name: 'Xanh lá', value: '#10b981' },
                              { name: 'Tím', value: '#8b5cf6' },
                              { name: 'Cam', value: '#f97316' }
                            ].map(color => (
                              <button
                                key={color.value}
                                onClick={() => setSectionColor(color.value)}
                                className={`w-6 h-6 rounded border-2 transition-all ${
                                  sectionColor === color.value ? 'border-gray-800' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Lyrics */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{song.title}</h2>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                  <span>Tone gốc: <strong>{song.key_chord}</strong></span>
                  <span>•</span>
                  <span>Đang chơi: <strong style={{ color: chordColor }}>{currentKey}</strong></span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-2xl p-8 space-y-3">
                {parsedLyrics.map((line, index) => renderLyricLine(line, index))}
              </div>
              
              {song.tempo && (
                <div className="text-center mt-6 text-sm text-gray-500">
                  Tempo: {song.tempo} BPM
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SongDetailPage;