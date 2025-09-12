import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import SongDetailPage from './pages/SongDetailPage';
import PlaylistPage from './pages/PlaylistPage';
import SharedPlaylistPage from './pages/SharedPlaylistPage';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineProvider, useOffline } from './contexts/OfflineContext';
import { NotificationProvider } from './components/NotificationProvider';
import { offlineManager } from './utils/offlineManager';

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
  
  // Test useOffline hook
  const { isOffline, offlineManager: offlineFromHook } = useOffline();
  const offline = offlineFromHook || offlineManager; // Fallback to direct import
  
  // Create a dummy setIsOffline since offline status is managed by useOffline hook
  const setIsOffline = (value) => {
    // Offline status is managed by useOffline hook
  };

  // Load favorites from localStorage and IndexedDB on mount
  useEffect(() => {
    const loadFavorites = async () => {
      // Try localStorage first (for backwards compatibility)
      const savedFavorites = localStorage.getItem('songFavorites');
      if (savedFavorites) {
        try {
          const favoritesData = JSON.parse(savedFavorites);
          if (Array.isArray(favoritesData)) {
            setFavorites(favoritesData);
            // Migrate to IndexedDB
            await offline.cacheFavorites(favoritesData);
          }
        } catch (error) {
          localStorage.removeItem('songFavorites');
        }
      } else {
        // Load from IndexedDB
        try {
          const cachedFavorites = await offline.getCachedFavorites();
          if (cachedFavorites && cachedFavorites.length > 0) {
            setFavorites(cachedFavorites);
          }
        } catch (error) {
          // Error loading cached favorites
        }
      }
    };

    loadFavorites();
  }, [offline]);

  // Save favorites to both localStorage and IndexedDB whenever it changes
  useEffect(() => {
    const saveFavorites = async () => {
      if (favorites.length > 0) {
        localStorage.setItem('songFavorites', JSON.stringify(favorites));
        try {
          await offline.cacheFavorites(favorites);
        } catch (error) {
          // Error caching favorites
        }
      } else {
        localStorage.removeItem('songFavorites');
      }
    };

    if (favorites.length >= 0) { // Save even if empty to clear cache
      saveFavorites();
    }
  }, [favorites, offline]);

  const toggleFavorite = async (song) => {
    const exists = favorites.find(fav => fav.id === song.id);
    
    if (exists) {
      // Remove favorite
      setFavorites(prev => prev.filter(fav => fav.id !== song.id));
      try {
        await offline.removeFavoriteOffline(song.id);
      } catch (error) {
        // Error removing favorite offline
      }
    } else {
      // Add favorite
      setFavorites(prev => [...prev, song]);
      try {
        await offline.addFavoriteOffline(song);
      } catch (error) {
        // Error adding favorite offline
      }
    }
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
      <ErrorBoundary>
        <OfflineProvider>
          <NotificationProvider>
            <AppProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/song/:id" element={<SongDetailPage />} />
                  <Route path="/favorites" element={<PlaylistPage />} />
                  <Route path="/playlist" element={<SharedPlaylistPage />} />
                </Routes>
              </BrowserRouter>
            </AppProvider>
          </NotificationProvider>
        </OfflineProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;