import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, ExternalLink, Volume2, VolumeX } from 'lucide-react';

// YouTube Video Player Component - Using YouTube IFrame Player API + Data API v3
const YouTubePlayer = ({ videoId, title, thumbnailUrl, alternatives }) => {
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted, 0: ended, 1: playing, 2: paused
  const [isMuted, setIsMuted] = useState(true);
  
  // Refs for player management
  const playerElementRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const apiLoadedRef = useRef(false);
  const isInitializingRef = useRef(false);

  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

  // Load YouTube IFrame Player API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }
    
    if (!window.YT && !apiLoadedRef.current) {
      apiLoadedRef.current = true;
      
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      // Handle script loading errors (CSP blocks, network issues, etc.)
      tag.onerror = () => {
        console.error('❌ Failed to load YouTube IFrame API (possibly blocked by CSP)');
        setError('Failed to load YouTube player. Please check your content security policy settings.');
        apiLoadedRef.current = false; // Reset so user can try again
      };
      
      tag.onload = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ YouTube IFrame API script loaded');
        }
      };
      
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Global callback for when API is ready
      window.onYouTubeIframeAPIReady = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ YouTube IFrame Player API ready');
        }
        setApiReady(true);
        setError(null); // Clear any previous errors
      };
      
      // Timeout fallback - if API doesn't load in 10 seconds
      setTimeout(() => {
        if (!window.YT || !window.YT.Player) {
          console.error('❌ YouTube API timeout - failed to load in 10 seconds');
          setError('YouTube API failed to load. This might be due to network issues or content blocking.');
          apiLoadedRef.current = false;
        }
      }, 10000);
    }
  }, []);

  // Initialize player when videoId changes and API is ready
  useEffect(() => {
    if (videoId && (window.YT || apiReady)) {
      // Small delay to ensure API and DOM are ready
      const timer = setTimeout(() => {
        initializePlayer();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        destroyPlayer();
      };
    } else {
      destroyPlayer();
    }
  }, [videoId, apiReady]);

  // Fetch video metadata
  useEffect(() => {
    if (videoId) {
      getYouTubeVideoData();
    }
  }, [videoId]);

  const initializePlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player || !videoId || isInitializingRef.current) {
      return;
    }
    
    const element = playerElementRef.current;
    if (!element) {
      console.warn('Player element not found');
      return;
    }

    isInitializingRef.current = true;
    
    // Clear any existing player first
    destroyPlayer();
    
    try {
      // Clear the element content
      element.innerHTML = '';
      
      // Create a unique div for the player
      const playerId = `youtube-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const playerDiv = document.createElement('div');
      playerDiv.id = playerId;
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      element.appendChild(playerDiv);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎬 Initializing YouTube Player for video:', videoId);
      }

      const player = new window.YT.Player(playerId, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1,
          cc_load_policy: 0,
          iv_load_policy: 3,
          autohide: 0,
          playsinline: 1,
          origin: window.location.origin,
          host: window.location.hostname,
          enablejsapi: 1
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });

      playerInstanceRef.current = player;
      
    } catch (error) {
      console.error('❌ Error initializing YouTube Player:', error);
      setError('Failed to initialize player');
      setPlayerReady(false);
      isInitializingRef.current = false;
    }
  }, [videoId]);

  const destroyPlayer = useCallback(() => {
    isInitializingRef.current = false;
    
    try {
      if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ Destroying YouTube Player');
        }
        playerInstanceRef.current.destroy();
      }
    } catch (error) {
      console.warn('⚠️ Error destroying player:', error);
    } finally {
      playerInstanceRef.current = null;
      setPlayerReady(false);
      
      // Clean up the player element safely
      if (playerElementRef.current) {
        try {
          playerElementRef.current.innerHTML = '';
        } catch (error) {
          console.warn('⚠️ Error cleaning player element:', error);
        }
      }
    }
  }, []);

  const onPlayerReady = (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ YouTube Player ready');
    }
    
    setPlayerReady(true);
    setError(null);
    isInitializingRef.current = false;
    
    // Start muted for autoplay compliance
    try {
      event.target.mute();
      setIsMuted(true);
    } catch (error) {
      console.warn('Could not mute player:', error);
    }
  };

  const onPlayerStateChange = (event) => {
    setPlayerState(event.data);
    
    if (process.env.NODE_ENV === 'development') {
      const states = {
        '-1': 'unstarted',
        0: 'ended',
        1: 'playing', 
        2: 'paused',
        3: 'buffering',
        5: 'cued'
      };
      console.log('🎵 Player state:', states[event.data] || event.data);
    }
  };

  const onPlayerError = (event) => {
    const errorMessages = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Embedding disabled by owner',
      150: 'Embedding disabled by owner'
    };
    
    const errorMsg = errorMessages[event.data] || `Player error: ${event.data}`;
    
    // Only log actual player errors, not analytics/tracking errors
    if (![100, 101, 150].includes(event.data)) {
      console.warn('YouTube Player error:', errorMsg);
    } else {
      console.error('❌ YouTube Player error:', errorMsg);
    }
    
    setError(errorMsg);
    setPlayerReady(false);
    isInitializingRef.current = false;
  };

  // Player controls
  const togglePlay = () => {
    if (!playerInstanceRef.current) return;
    
    try {
      if (playerState === 1) {
        playerInstanceRef.current.pauseVideo();
      } else {
        playerInstanceRef.current.playVideo();
      }
    } catch (error) {
      console.error('Play control error:', error);
    }
  };

  const toggleMute = () => {
    if (!playerInstanceRef.current) return;
    
    try {
      if (isMuted) {
        playerInstanceRef.current.unMute();
        setIsMuted(false);
      } else {
        playerInstanceRef.current.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Mute control error:', error);
    }
  };

  // Get video metadata using YouTube Data API v3
  const getYouTubeVideoData = async () => {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE') {
      if (process.env.NODE_ENV === 'development') {
        console.log('YouTube API key not configured, skipping metadata');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const videoInfo = data.items[0];
      setVideoData({
        title: videoInfo.snippet.title,
        description: videoInfo.snippet.description,
        channelTitle: videoInfo.snippet.channelTitle,
        publishedAt: videoInfo.snippet.publishedAt,
        viewCount: videoInfo.statistics?.viewCount,
        likeCount: videoInfo.statistics?.likeCount,
        duration: videoInfo.contentDetails?.duration
      });

      setError(null);
    } catch (error) {
      console.error('Error fetching video data:', error);
      setError(`Failed to load video metadata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No video ID provided</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        
        {/* YouTube Player API */}
        <div 
          key={`player-${videoId}`} // Force remount when videoId changes
          ref={playerElementRef}
          className="w-full h-full"
          style={{ backgroundColor: '#000' }}
        />

        {/* Loading overlay */}
        {(loading || !apiReady) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>{!apiReady ? 'Loading YouTube API...' : 'Loading player...'}</p>
            </div>
          </div>
        )}

        

        {/* Top right controls */}

        {/* Error display */}
        {error && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-red-500 bg-opacity-90 text-white text-xs p-2 rounded">
              ❌ {error}
            </div>
          </div>
        )}

        {/* API Loading State */}
        {!window.YT && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading YouTube API...</p>
            </div>
          </div>
        )}
      </div>

      {/* Video metadata */}
      {videoData && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">{videoData.title}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Channel:</strong> {videoData.channelTitle}</p>
            {videoData.viewCount && (
              <p><strong>Views:</strong> {parseInt(videoData.viewCount).toLocaleString()}</p>
            )}
            {videoData.likeCount && (
              <p><strong>Likes:</strong> {parseInt(videoData.likeCount).toLocaleString()}</p>
            )}
            {videoData.publishedAt && (
              <p><strong>Published:</strong> {new Date(videoData.publishedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Alternative videos */}
      {alternatives && alternatives.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Videos:</h4>
          <div className="flex gap-2 overflow-x-auto">
            {alternatives.map((alt, index) => (
              <a
                key={index}
                href={alt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded text-sm text-blue-700 transition-colors"
              >
                {alt.title || `Alternative ${index + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <div>Video ID: {videoId}</div>
          <div>API Status: {window.YT ? '✅ Loaded' : '⏳ Loading'}</div>
          <div>API Ready: {apiReady ? '✅ Ready' : '⏳ Not Ready'}</div>
          <div>Player Status: {playerReady ? '✅ Ready' : '⏳ Not Ready'}</div>
          <div>Player State: {playerState}</div>
          <div>Is Muted: {isMuted ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
