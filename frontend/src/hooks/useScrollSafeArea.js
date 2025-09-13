// Hook for dynamic safe area based on scroll position
import { useState, useEffect } from 'react';

export const useScrollSafeArea = (threshold = 50) => {
  const [shouldUseSafeArea, setShouldUseSafeArea] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShouldUseSafeArea(scrollY > threshold);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return shouldUseSafeArea;
};

export default useScrollSafeArea;
