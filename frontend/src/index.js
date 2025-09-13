import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// Register Service Worker for PWA - iOS compatible
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we're in a secure context or localhost
    const isSecureContext = window.isSecureContext || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.protocol === 'https:' ||
                           (process.env.NODE_ENV === 'development' && location.hostname.includes('192.168.'));
    
    if (isSecureContext) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // iOS specific: Force update check
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    } else {
      console.log('Service Worker not registered: not in secure context');
    }
  });
} else {
  console.log('Service Worker not supported');
}
