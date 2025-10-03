// Hook for momentum-based header with scroll velocity tracking
import { useState, useEffect, useRef } from 'react';

export const useScrollDirection = () => {
  const [headerTranslate, setHeaderTranslate] = useState(0); // Translate value in pixels
  const headerTranslateRef = useRef(0); // Ref to track current translate without re-render
  const lastScrollY = useRef(0);
  const lastTimestamp = useRef(Date.now());
  const scrollVelocity = useRef(0);
  const ticking = useRef(false);
  const headerHeight = 200; // Approximate header height including safe area

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      
      ticking.current = true;
      
      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY);
        const currentTimestamp = Date.now();
        
        // Calculate scroll velocity (pixels per millisecond)
        const timeDelta = currentTimestamp - lastTimestamp.current;
        const scrollDelta = currentScrollY - lastScrollY.current;
        
        if (timeDelta > 0) {
          scrollVelocity.current = scrollDelta / timeDelta;
        }
        
        // Always show header when near top
        if (currentScrollY < 100) {
          setHeaderTranslate(0);
          headerTranslateRef.current = 0;
          lastScrollY.current = currentScrollY;
          lastTimestamp.current = currentTimestamp;
          ticking.current = false;
          return;
        }
        
        const scrollingDown = scrollDelta > 0;
        const scrollingUp = scrollDelta < 0;
        
        // Calculate new translate value based on scroll delta
        if (scrollingDown) {
          // Scrolling down - hide header proportionally
          // Faster scroll = faster hide
          const hideAmount = Math.abs(scrollDelta);
          const newTranslate = Math.min(headerHeight, headerTranslateRef.current + hideAmount);
          setHeaderTranslate(newTranslate);
          headerTranslateRef.current = newTranslate;
        } else if (scrollingUp) {
          // Scrolling up - show header proportionally
          // Faster scroll = faster show
          const showAmount = Math.abs(scrollDelta);
          const newTranslate = Math.max(0, headerTranslateRef.current - showAmount);
          setHeaderTranslate(newTranslate);
          headerTranslateRef.current = newTranslate;
        }
        
        lastScrollY.current = currentScrollY;
        lastTimestamp.current = currentTimestamp;
        ticking.current = false;
      });
    };

    // Set initial values
    lastScrollY.current = Math.max(0, window.scrollY);
    lastTimestamp.current = Date.now();

    // Add scroll listener with passive flag
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return headerTranslate;
};

export default useScrollDirection;
