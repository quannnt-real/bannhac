import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import SongDetailPage from './pages/SongDetailPage';
import PlaylistPage from './pages/PlaylistPage';

// Context for managing app state
const AppContext = React.createContext();

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const AppProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [types, setTypes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [keyChords, setKeyChords] = useState(['A', 'Am', 'Bm', 'C', 'D', 'Dm', 'E', 'Eb', 'Em', 'F', 'F#m', 'G']);
  const [isOffline, setIsOffline] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('songFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('songFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (song) => {
    setFavorites(prev => {
      const exists = prev.find(fav => fav.id === song.id);
      if (exists) {
        return prev.filter(fav => fav.id !== song.id);
      } else {
        return [...prev, song];
      }
    });
  };

  const isFavorite = (songId) => {
    return favorites.some(fav => fav.id === songId);
  };

  const value = {
    songs,
    setSongs,
    favorites,
    setFavorites,
    toggleFavorite,
    isFavorite,
    types,
    setTypes,
    topics,
    setTopics,
    keyChords,
    setKeyChords,
    isOffline,
    setIsOffline
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

function App() {
  return (
    <div className="App min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/song/:id" element={<SongDetailPage />} />
            <Route path="/playlist" element={<PlaylistPage />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;