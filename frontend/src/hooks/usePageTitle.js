import { useEffect } from 'react';

// Hook để set title cho từng trang
export const usePageTitle = (title) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    
    // Cleanup: restore previous title when component unmounts
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};

// Helper function để tạo title với format thống nhất
export const createPageTitle = (pageTitle) => {
  const baseTitle = "HT Nguồn Sống";
  return pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle;
};
