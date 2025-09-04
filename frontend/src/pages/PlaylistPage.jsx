import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Music, Trash2 } from 'lucide-react';
import { useAppContext } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import SongCard from '../components/SongCard';

const PlaylistPage = () => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useAppContext();

  const handleSongPlay = (song) => {
    navigate(`/song/${song.id}`);
  };

  const clearAllFavorites = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả bài hát yêu thích?')) {
      favorites.forEach(song => toggleFavorite(song));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-xl">
                  <Heart className="h-6 w-6 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Bài hát yêu thích</h1>
                  <p className="text-sm text-gray-600">
                    {favorites.length} bài hát trong danh sách
                  </p>
                </div>
              </div>
            </div>
            
            {favorites.length > 0 && (
              <Button
                onClick={clearAllFavorites}
                variant="outline"
                className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Xóa tất cả
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Heart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-600 mb-2">
                Chưa có bài hát yêu thích
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Hãy thêm những bài hát bạn yêu thích vào danh sách để dễ dàng tìm lại sau này
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Music className="h-4 w-4 mr-2" />
                Khám phá bài hát
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{favorites.length}</p>
                      <p className="text-sm text-gray-600">Bài hát yêu thích</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {new Set(favorites.map(song => song.key_chord)).size}
                      </p>
                      <p className="text-sm text-gray-600">Tone khác nhau</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Badge className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                      {new Set(favorites.map(song => song.type_name)).size}
                    </Badge>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {new Set(favorites.map(song => song.type_name)).size}
                      </p>
                      <p className="text-sm text-gray-600">Thể loại</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Popular chords and types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tone phổ biến</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      favorites.reduce((acc, song) => {
                        acc[song.key_chord] = (acc[song.key_chord] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([chord, count]) => (
                        <Badge key={chord} variant="outline" className="text-blue-600 border-blue-200">
                          {chord} ({count})
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thể loại yêu thích</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      favorites.reduce((acc, song) => {
                        acc[song.type_name] = (acc[song.type_name] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {type} ({count})
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Songs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {favorites.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPlay={handleSongPlay}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite(song.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PlaylistPage;