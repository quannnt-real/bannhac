import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Music2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { parseLyrics, transposeChord, getAvailableKeys } from '../utils/chordUtils';
import '../components/LyricsDisplay.css';

const SongDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite, isOffline } = useAppContext();
  
  // Playlist navigation states
  const playlistParam = searchParams.get('playlist');
  const indexParam = searchParams.get('index');
  const fromParam = searchParams.get('from'); // 'favorites', 'shared', or null
  
  const playlistSongIds = playlistParam ? playlistParam.split(',').map(Number) : [];
  const currentPlaylistIndex = indexParam ? parseInt(indexParam) : -1;
  
  const [song, setSong] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [currentKey, setCurrentKey] = useState('C'); // Initialize with 'C' instead of empty string
  const [chordColor, setChordColor] = useState('#ef4444'); // Default red
  const [sectionColor, setSectionColor] = useState('#3b82f6'); // Default blue
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [currentFavoriteIndex, setCurrentFavoriteIndex] = useState(-1);
  const [baseFontSize, setBaseFontSize] = useState(18); // Base size for lyrics
  const [sectionFontSize, setSectionFontSize] = useState(13); // Independent section size

  // Calculate font sizes: lyrics and chords linked, section independent
  const lyricFontSize = baseFontSize;
  const chordFontSize = Math.round(baseFontSize * 0.78); // ~78% of lyric size (18->14, 17->13, etc.)

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
        const response = await fetch(`/api/songs/view/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setSong(data.data);
          console.log('Song loaded:', data.data.title, 'Original key:', data.data.key_chord); // Debug log
          setCurrentKey(data.data.key_chord || 'C'); // Fallback to 'C' if no key_chord
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
          console.log('Offline song loaded:', songData.title, 'Original key:', songData.key_chord); // Debug log
          setCurrentKey(songData.key_chord || 'C'); // Fallback to 'C' if no key_chord
        } else {
          navigate('/');
        }
      }
    };

    fetchSongDetail();
  }, [id, navigate]);

  // Load playlist songs nếu có playlist context
  useEffect(() => {
    if (playlistSongIds.length > 0) {
      // Load từ localStorage (tương tự SharedPlaylistPage)
      const cachedSongs = localStorage.getItem('songs_data');
      if (cachedSongs) {
        const allSongs = JSON.parse(cachedSongs);
        const orderedPlaylistSongs = [];
        
        playlistSongIds.forEach(songId => {
          const playlistSong = allSongs.find(s => s.id === songId);
          if (playlistSong) {
            orderedPlaylistSongs.push(playlistSong);
          }
        });
        
        setPlaylistSongs(orderedPlaylistSongs);
        console.log('Playlist loaded:', orderedPlaylistSongs.length, 'songs');
      } else if (fromParam === 'favorites') {
        // Fallback: sử dụng favorites từ context
        const orderedPlaylistSongs = [];
        playlistSongIds.forEach(songId => {
          const favSong = favorites.find(s => s.id === songId);
          if (favSong) {
            orderedPlaylistSongs.push(favSong);
          }
        });
        setPlaylistSongs(orderedPlaylistSongs);
      }
    }
  }, [playlistSongIds.join(','), favorites, fromParam]);

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

  // Debug useEffect to track currentKey changes
  useEffect(() => {
    console.log('Current key changed to:', currentKey, 'Song key_chord:', song?.key_chord);
  }, [currentKey, song?.key_chord]);

  const handleKeyChange = (newKey) => {
    setCurrentKey(newKey);
  };

  const transposeUp = () => {
    const keys = getAvailableKeys(song?.key_chord);
    const currentIndex = keys.findIndex(key => {
      // Find index by normalizing both current key and keys in list
      const normalizeForComparison = (k) => {
        const equivalents = {
          // Sharp to flat
          'D#m': 'Ebm', 'D#': 'Eb',
          'G#m': 'Abm', 'G#': 'Ab', 
          'A#m': 'Bbm', 'A#': 'Bb',
          'C#m': 'Dbm', 'C#': 'Db',
          'F#m': 'Gbm', 'F#': 'Gb',
          // Flat to flat (identity)
          'Ebm': 'Ebm', 'Eb': 'Eb',
          'Abm': 'Abm', 'Ab': 'Ab',
          'Bbm': 'Bbm', 'Bb': 'Bb',
          'Dbm': 'Dbm', 'Db': 'Db',
          'Gbm': 'Gbm', 'Gb': 'Gb'
        };
        return equivalents[k] || k;
      };
      return normalizeForComparison(key) === normalizeForComparison(currentKey);
    });
    
    const nextIndex = (currentIndex + 1) % keys.length;
    let nextKey = keys[nextIndex];
    
    // Convert to sharp notation when going up
    const sharpEquivalents = {
      'Ebm': 'D#m', 'Abm': 'G#m', 'Bbm': 'A#m',
      'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
      'Dbm': 'C#m', 'Gbm': 'F#m',
      'Db': 'C#', 'Gb': 'F#'
    };
    nextKey = sharpEquivalents[nextKey] || nextKey;
    
    setCurrentKey(nextKey);
  };

  const transposeDown = () => {
    const keys = getAvailableKeys(song?.key_chord);
    const currentIndex = keys.findIndex(key => {
      // Find index by normalizing both current key and keys in list
      const normalizeForComparison = (k) => {
        const equivalents = {
          // Sharp to flat
          'D#m': 'Ebm', 'D#': 'Eb',
          'G#m': 'Abm', 'G#': 'Ab', 
          'A#m': 'Bbm', 'A#': 'Bb',
          'C#m': 'Dbm', 'C#': 'Db',
          'F#m': 'Gbm', 'F#': 'Gb',
          // Flat to flat (identity)
          'Ebm': 'Ebm', 'Eb': 'Eb',
          'Abm': 'Abm', 'Ab': 'Ab',
          'Bbm': 'Bbm', 'Bb': 'Bb',
          'Dbm': 'Dbm', 'Db': 'Db',
          'Gbm': 'Gbm', 'Gb': 'Gb'
        };
        return equivalents[k] || k;
      };
      return normalizeForComparison(key) === normalizeForComparison(currentKey);
    });
    
    const prevIndex = currentIndex === 0 ? keys.length - 1 : currentIndex - 1;
    let prevKey = keys[prevIndex];
    
    // Keep flat notation when going down (keys are already in flat format)
    setCurrentKey(prevKey);
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

  // Playlist navigation functions
  const navigateInPlaylist = (direction) => {
    if (playlistSongs.length === 0 || currentPlaylistIndex === -1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentPlaylistIndex > 0 ? currentPlaylistIndex - 1 : playlistSongs.length - 1;
    } else {
      newIndex = currentPlaylistIndex < playlistSongs.length - 1 ? currentPlaylistIndex + 1 : 0;
    }
    
    const nextSong = playlistSongs[newIndex];
    if (nextSong) {
      // Maintain playlist context when navigating
      const playlistIds = playlistSongs.map(s => s.id).join(',');
      navigate(`/song/${nextSong.id}?playlist=${playlistIds}&index=${newIndex}&from=${fromParam}`);
    }
  };

  const goBackToPlaylist = () => {
    if (fromParam === 'favorites') {
      navigate('/favorites');
    } else if (fromParam === 'shared' && playlistParam) {
      navigate(`/playlist?songs=${playlistParam}`);
    } else {
      navigate('/');
    }
  };

  const renderLyricLine = (line, index) => {
    if (line.type === 'section') {
      return (
        <div key={index} className="my-4 text-left">
          <Badge 
          variant="outline" 
          className="font-semibold rounded-md border capitalize"
          style={{ 
            backgroundColor: sectionColor + '10', 
            color: sectionColor,
            borderColor: sectionColor + '40',
            fontSize: `${lyricFontSize - 4}px`
          }}
            >
          {line.content}
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
        const hasChord = chordMap.has(currentPos);
        const originalChord = hasChord ? chordMap.get(currentPos) : null;
        const transposedChord = originalChord && song?.key_chord && currentKey !== song.key_chord 
          ? transposeChord(originalChord, song.key_chord, currentKey)
          : originalChord;

        if (hasChord) {
          result.push(
            <span key={`segment-${idx}`} className="chord-segment">
              <span className="chord-label">
                {transposedChord}
              </span>
              <span className="lyric-word">
                {word}
              </span>
            </span>
          );
        } else {
          result.push(
            <span key={`segment-${idx}`} className="lyric-word-no-chord">
              {word}
            </span>
          );
        }
        
        currentPos += word.length + 1; // +1 for space
      });

      return (
        <div key={index} className="mb-6 lyric-container">
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
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <Button
                onClick={() => {
                  // Ưu tiên quay lại playlist nếu có context
                  if (fromParam && playlistSongs.length > 0) {
                    goBackToPlaylist();
                  } else if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                variant="ghost"
                size="sm"
                className="p-2 flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">{song.title}</h1>
                <div className="flex items-center gap-1 md:gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                    Tone: {currentKey}
                  </Badge>
                  {song.type_name && (
                    <Badge variant="secondary" className="text-xs">{song.type_name}</Badge>
                  )}
                  {song.topic_name && (
                    <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                      {song.topic_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {/* Playlist navigation (ưu tiên playlist context, fallback to favorites) */}
              {((playlistSongs.length > 1 && currentPlaylistIndex !== -1) || 
                (currentFavoriteIndex !== -1 && favorites.length > 1 && !fromParam)) && (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => {
                      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
                        navigateInPlaylist('prev');
                      } else {
                        navigateToFavorite('prev');
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 px-1 md:px-2 whitespace-nowrap">
                    {playlistSongs.length > 1 && currentPlaylistIndex !== -1 ? 
                      `${currentPlaylistIndex + 1}/${playlistSongs.length}` :
                      `${currentFavoriteIndex + 1}/${favorites.length}`
                    }
                  </span>
                  <Button
                    onClick={() => {
                      if (playlistSongs.length > 1 && currentPlaylistIndex !== -1) {
                        navigateInPlaylist('next');
                      } else {
                        navigateToFavorite('next');
                      }
                    }}
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
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-blue-100 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Left side: Transpose and Font Size controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Transpose controls */}
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-sm font-medium text-gray-600">Tone:</span>
                <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-lg p-1">
                  <Button
                    onClick={transposeDown}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 text-lg font-bold"
                  >
                    -
                  </Button>
                  <div className="flex items-center gap-1 px-1">
                    <input
                      type="text"
                      value={currentKey}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        if (value) {
                          setCurrentKey(value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      className="bg-transparent border-0 outline-none font-bold text-lg cursor-pointer hover:bg-blue-50 rounded px-1 w-12 text-center"
                      style={{ color: chordColor }}
                      placeholder="Dm"
                    />
                    {currentKey === song?.key_chord && (
                      <span className="text-xs text-gray-500 hidden md:inline">(gốc)</span>
                    )}
                  </div>
                  <Button
                    onClick={transposeUp}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 text-lg font-bold"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Font Size controls */}
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-sm font-medium text-gray-600">Size:</span>
                <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-lg p-1">
                  <Button
                    onClick={() => setBaseFontSize(Math.max(8, baseFontSize - 1))}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 text-lg font-bold"
                  >
                    -
                  </Button>
                  <div className="px-1">
                    <input
                      type="number"
                      min="8"
                      max="28"
                      value={baseFontSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 8 && value <= 28) {
                          setBaseFontSize(value);
                        }
                      }}
                      className="bg-transparent border-0 outline-none font-bold text-sm text-gray-700 w-8 text-center"
                    />
                  </div>
                  <Button
                    onClick={() => setBaseFontSize(Math.min(28, baseFontSize + 1))}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 text-lg font-bold"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Right side: Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50 h-8">
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline">Tùy chỉnh</span>
                  <span className="md:hidden">Cài đặt</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-6">
                  {/* Section font size */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Kích thước ký hiệu khúc</h4>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Ký hiệu khúc: {sectionFontSize}px</label>
                      <input
                        type="range"
                        min="10"
                        max="20"
                        value={sectionFontSize}
                        onChange={(e) => setSectionFontSize(parseInt(e.target.value))}
                        className="w-full"
                      />
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
          <CardContent className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{song.title}</h2>
                <div className="flex items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 flex-wrap">
                  <span>Tone gốc: <strong>{song.key_chord}</strong></span>
                  <span className="hidden md:inline">•</span>
                  <span>Đang chơi: <strong style={{ color: chordColor }}>{currentKey}</strong></span>
                </div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl md:rounded-2xl p-4 md:p-8"
                style={{
                  '--lyric-font-size': `${lyricFontSize}px`,
                  '--chord-font-size': `${chordFontSize}px`,
                  '--chord-color': chordColor,
                  '--chord-bg': chordColor + '15',
                  '--chord-border': chordColor + '30',
                  '--chord-top': `-${chordFontSize * 0.7}px`,
                  '--text-padding-top': `${chordFontSize - 6}px`,
                  '--line-height': `${lyricFontSize + chordFontSize + 6}px`
                }}
              >
                <div className="space-y-1 md:space-y-2 leading-relaxed lyrics-content">
                  {parsedLyrics.map((line, index) => renderLyricLine(line, index))}
                </div>
              </div>
              
              {song.tempo && (
                <div className="text-center mt-4 md:mt-6 text-xs md:text-sm text-gray-500">
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