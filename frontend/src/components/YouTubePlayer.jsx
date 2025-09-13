import React from 'react';

// Simple YouTube Embed Player - No API required
const YouTubePlayer = ({ videoId, alternatives }) => {

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
        
        {/* Simple YouTube Embed - No API needed */}
        <iframe
          key={`player-${videoId}`} // Force remount when videoId changes
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
          title="YouTube video player"
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

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
    </div>
  );
};

export default YouTubePlayer;
