// Hook to detect scroll direction and show/hide header accordingly
import { useState, useEffect, useRef } from 'react';

export const useScrollDirection = (threshold = 10) => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastDirection = useRef('up'); // Track last scroll direction
  const ticking = useRef(false);
  const headerVisibleRef = useRef(true); // Track current visibility state

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      
      ticking.current = true;
      
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        
        // Clamp scrollY to prevent negative values on iOS overscroll
        const clampedScrollY = Math.max(0, currentScrollY);
        const difference = clampedScrollY - lastScrollY.current;
        
        // Always show header when near top (< 50px for better UX)
        if (clampedScrollY < 50) {
          if (!headerVisibleRef.current) {
            setIsHeaderVisible(true);
            headerVisibleRef.current = true;
          }
          lastScrollY.current = clampedScrollY;
          lastDirection.current = 'up';
          ticking.current = false;
          return;
        }
        
        // Ignore tiny movements (less than threshold)
        if (Math.abs(difference) < threshold) {
          ticking.current = false;
          return;
        }
        
        const scrollingDown = difference > 0;
        const scrollingUp = difference < 0;
        
        // Only update state when direction changes
        if (scrollingDown && lastDirection.current !== 'down') {
          setIsHeaderVisible(false);
          headerVisibleRef.current = false;
          lastDirection.current = 'down';
        } else if (scrollingUp && lastDirection.current !== 'up') {
          setIsHeaderVisible(true);
          headerVisibleRef.current = true;
          lastDirection.current = 'up';
        }
        
        lastScrollY.current = clampedScrollY;
        ticking.current = false;
      });
    };

    // Set initial scroll position
    lastScrollY.current = Math.max(0, window.scrollY);

    // Add scroll listener with passive flag for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]); // Only threshold in deps to avoid infinite loop

  return isHeaderVisible;
};

export default useScrollDirection;
