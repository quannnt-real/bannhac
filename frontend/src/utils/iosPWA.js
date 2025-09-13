// iOS PWA utilities and detection
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

export const isIOSStandalone = () => {
  return isIOS() && window.navigator.standalone === true;
};

export const isIOSPWACompatible = () => {
  return isIOS() && 'serviceWorker' in navigator;
};

export const addIOSPWAListeners = () => {
  if (!isIOS()) return;

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent scroll bounce
  document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1) {
      event.preventDefault();
    }
  }, { passive: false });

// iOS PWA viewport height fix - CRITICAL for black screen
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Ensure body and root have correct height
    document.body.style.height = '100%';
    const root = document.getElementById('root');
    if (root) {
      root.style.minHeight = '100vh';
      root.style.backgroundColor = '#ffffff';
    }
  };
  
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 500);
  });
};

export const showIOSInstallPrompt = () => {
  if (!isIOS() || isIOSStandalone()) return false;
  
  // Check if user has already been prompted
  const hasBeenPrompted = localStorage.getItem('ios-install-prompted');
  if (hasBeenPrompted) return false;
  
  // Show iOS install instructions
  const installMessage = `
Để cài đặt app này trên iPhone/iPad:
1. Nhấn nút Share (biểu tượng hộp có mũi tên)
2. Cuộn xuống và chọn "Add to Home Screen"
3. Nhấn "Add" để hoàn tất
  `;
  
  const userChoice = confirm(installMessage);
  if (userChoice) {
    localStorage.setItem('ios-install-prompted', 'true');
  }
  
  return true;
};

// iOS PWA theme color handler
export const setIOSThemeColor = (color = '#dc2626') => {
  if (!isIOS()) return;
  
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', color);
  }
  
  // iOS status bar style
  const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBarMeta) {
    // Use black-translucent for better integration
    statusBarMeta.setAttribute('content', 'black-translucent');
  }
};

// Initialize iOS PWA features
export const initIOSPWA = () => {
  if (!isIOS()) return;
  
  addIOSPWAListeners();
  setIOSThemeColor();
  
  // Show install prompt after 10 seconds if not installed
  if (!isIOSStandalone()) {
    setTimeout(() => {
      showIOSInstallPrompt();
    }, 10000);
  }
  
  console.log('iOS PWA features initialized');
};
