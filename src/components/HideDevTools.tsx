'use client';

import { useEffect } from 'react';

export default function HideDevTools() {
  useEffect(() => {
    // Function to hide dev tools elements
    const hideDevTools = () => {
      // Try to find elements by various selectors that might match the purple square
      const selectors = [
        'div[style*="position: fixed"][style*="bottom: 0"][style*="right: 0"]',
        'div[style*="background-color: rgb(135, 73, 243)"]',
        'div[style*="z-index: 99999"]',
        '#react-devtools-hook',
        '.react-devtools-portal',
        '.react-devtools-inline'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        });
      });
    };

    // Run immediately
    hideDevTools();
    
    // Set up a MutationObserver to watch for new elements
    const observer = new MutationObserver((mutations) => {
      hideDevTools();
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
      childList: true,
      subtree: true
    });
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
