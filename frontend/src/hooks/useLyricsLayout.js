// Hook for detecting when lyrics should use column layout
import { useState, useEffect, useRef } from 'react';

export const useLyricsLayout = () => {
  const [shouldUseColumns, setShouldUseColumns] = useState(false);
  const lyricsRef = useRef(null);

  useEffect(() => {
    const checkLayout = () => {
      if (!lyricsRef.current) return;

      const element = lyricsRef.current;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // Header height (~60px) + Bottom controls (~80px) + padding (~100px)
      const reservedHeight = 240;
      const availableHeight = windowHeight - reservedHeight;
      
      // Get actual content height
      const contentHeight = element.scrollHeight;
      
      // Conditions for column layout:
      // 1. Desktop/tablet width (>= 1024px) OR landscape tablet (>= 768px && width > height)
      // 2. Content height exceeds available height by significant margin (150% or more)
      const isDesktopOrLandscape = windowWidth >= 1024 || (windowWidth >= 768 && windowWidth > windowHeight);
      const isContentTooTall = contentHeight > availableHeight * 1.5;
      
      setShouldUseColumns(isDesktopOrLandscape && isContentTooTall);
    };

    // Delay initial check to ensure content is rendered
    const timeoutId = setTimeout(checkLayout, 100);

    // Listen for resize and content changes
    window.addEventListener('resize', checkLayout);
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize observer
      setTimeout(checkLayout, 50);
    });
    
    if (lyricsRef.current) {
      resizeObserver.observe(lyricsRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkLayout);
      resizeObserver.disconnect();
    };
  }, []);

  return { shouldUseColumns, lyricsRef };
};

export default useLyricsLayout;
