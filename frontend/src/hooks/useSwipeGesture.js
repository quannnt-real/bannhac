import { useEffect, useRef } from 'react';

export const useSwipeGesture = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  minSwipeDistance = 50,
  maxSwipeTime = 300 
}) => {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !touchStartY.current || !touchStartTime.current) {
        return;
      }

      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchEndTime = Date.now();

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const deltaTime = touchEndTime - touchStartTime.current;

      // Check if the swipe is horizontal and within time limit
      if (
        Math.abs(deltaX) > Math.abs(deltaY) && // More horizontal than vertical
        Math.abs(deltaX) > minSwipeDistance && // Minimum distance
        deltaTime < maxSwipeTime // Within time limit
      ) {
        if (deltaX > 0) {
          // Swipe right
          onSwipeRight && onSwipeRight();
        } else {
          // Swipe left
          onSwipeLeft && onSwipeLeft();
        }
      }

      // Reset values
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
    };

    const handleTouchMove = (e) => {
      // Only prevent default for swipe gesture if user is NOT trying to select text
      if (touchStartX.current !== null) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX.current);
        const deltaY = Math.abs(touch.clientY - touchStartY.current);
        
        // Check if there's text selection happening
        const selection = window.getSelection();
        const hasSelection = selection && selection.toString().length > 0;
        
        // Only prevent scroll if it's a clear horizontal swipe AND no text selection
        if (deltaX > deltaY && deltaX > 20 && !hasSelection) {
          // Check if the target element allows text selection
          const target = e.target;
          const isTextSelectable = target.tagName === 'P' || 
                                  target.tagName === 'SPAN' || 
                                  target.tagName === 'DIV' ||
                                  target.className?.includes('lyrics') ||
                                  target.className?.includes('chord') ||
                                  target.className?.includes('text');
          
          // Don't prevent if touching selectable text elements
          if (!isTextSelectable) {
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxSwipeTime]);

  return elementRef;
};
