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
        <div key={index} className="my-6 text-center">
          <Badge 
            variant="outline" 
            className="px-4 py-2 text-base font-semibold rounded-full"
            style={{ 
              backgroundColor: chordColor + '20', 
              color: chordColor,
              borderColor: chordColor + '40'
            }}
          >
            {line.content}
          </Badge>
        </div>
      );
    }

    if (line.type === 'lyric') {
      const words = line.text.split(' ');
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
            <span key={`chord-${idx}`} className="relative inline-block mr-2">
              <span 
                className="absolute -top-7 left-0 text-sm font-bold whitespace-nowrap px-1 py-0.5 rounded"
                style={{ 
                  color: chordColor,
                  backgroundColor: chordColor + '10',
                  fontSize: '13px'
                }}
              >
                {transposedChord}
              </span>
              <span className="text-gray-700 text-lg leading-relaxed">{word}</span>
            </span>
          );
        } else {
          result.push(
            <span key={`word-${idx}`} className="text-gray-700 text-lg leading-relaxed mr-2">
              {word}
            </span>
          );
        }
        
        currentPos += word.length + 1; // +1 for space
      });

      return (
        <div key={index} className="leading-10 py-2 min-h-[3rem] text-left">
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
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-100">
          {/* Key transpose buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">Tone:</span>
            <div className="flex flex-wrap gap-1">
              {getAvailableKeys().slice(0, 8).map(key => (
                <Button
                  key={key}
                  onClick={() => handleKeyChange(key)}
                  variant={currentKey === key ? "default" : "outline"}
                  size="sm"
                  className={`px-3 py-1 text-xs ${
                    currentKey === key 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {key}
                  {key === song?.key_chord && <span className="ml-1 text-xs">*</span>}
                </Button>
              ))}
              {getAvailableKeys().length > 8 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2 py-1 text-xs border-blue-200">
                      +{getAvailableKeys().length - 8}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {getAvailableKeys().slice(8).map(key => (
                        <Button
                          key={key}
                          onClick={() => handleKeyChange(key)}
                          variant={currentKey === key ? "default" : "outline"}
                          size="sm"
                          className="px-3 py-1 text-xs"
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                <Settings className="h-4 w-4 mr-1" />
                Tùy chỉnh
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Màu hợp âm</label>
                  <input
                    type="color"
                    value={chordColor}
                    onChange={(e) => setChordColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {chordColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setChordColor(color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        chordColor === color.value ? 'border-gray-800 scale-110' : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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