// Console filter để giảm noise từ YouTube embed và browser extensions
// Chỉ hoạt động trong production để giữ console sạch sẽ

if (process.env.NODE_ENV === 'production') {
  // Backup original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // List of patterns to filter out (YouTube internal errors, extension errors)
  const filterPatterns = [
    'ERR_BLOCKED_BY_CLIENT', // Ad blocker blocking YouTube tracking
    'Failed to execute \'postMessage\' on \'DOMWindow\'', // YouTube postMessage origin mismatch
    'The target origin provided (\'https://www.youtube.com\')', // YouTube origin mismatch
    'dashlane-webauthn-page-script', // Dashlane extension errors
    'generate_204', // YouTube tracking URLs
    'log_event?alt=json', // YouTube analytics
    'youtubei/v1/log_event', // YouTube analytics API
    'play.google.com/log', // Google Play tracking
    'content_script.js', // Browser extension scripts
    'inject.js', // Browser extension inject scripts
    'fetchError: Failed to fetch', // Extension fetch errors
    'Uncaught TypeError: Cannot read properties of undefined', // Extension errors
    'www-embed-player.js', // YouTube embed player internal errors
    'www-widgetapi.js', // YouTube widget API internal errors
  ];

  // Helper function to check if error should be filtered
  const shouldFilter = (message) => {
    const messageStr = String(message);
    return filterPatterns.some(pattern => messageStr.includes(pattern));
  };

  // Override console.error
  console.error = (...args) => {
    if (!shouldFilter(args[0])) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = (...args) => {
    if (!shouldFilter(args[0])) {
      originalWarn.apply(console, args);
    }
  };

  // Keep console.log as is for production debugging
  console.log = originalLog;
}

export default {};
