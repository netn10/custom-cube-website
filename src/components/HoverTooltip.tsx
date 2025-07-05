'use client';

import { useState, useRef, useEffect } from 'react';

interface HoverTooltipProps {
  children: React.ReactNode;
  imageUrl?: string;
  title?: string;
  className?: string;
  onShow?: () => void;
}

export default function HoverTooltip({ children, imageUrl, title, className = '', onShow }: HoverTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle mouse enter with delay to prevent flickering
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      setImageLoaded(false);
      setImageError(false);
      // Call onShow callback if provided
      if (onShow) {
        onShow();
      }
    }, 300); // 300ms delay before showing tooltip
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Position tooltip to avoid going off-screen
  useEffect(() => {
    if (showTooltip && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if tooltip goes off the right edge
      if (rect.right > viewportWidth) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
      }

      // Check if tooltip goes off the bottom edge
      if (rect.bottom > viewportHeight) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = '100%';
        tooltip.style.marginBottom = '8px';
        tooltip.style.marginTop = '0';
      }
    }
  }, [showTooltip, imageLoaded]);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {showTooltip && imageUrl && imageUrl !== 'no-image' && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 transform -translate-x-1/2 left-1/2 -top-2 -translate-y-full"
          style={{ minWidth: '200px', maxWidth: '300px' }}
        >
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {imageError && (
            <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400 text-sm">
              Image not available
            </div>
          )}
          
          {!imageError && (
            <img
              src={imageUrl}
              alt={title || 'Card image'}
              className={`w-full h-auto rounded ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 0.2s ease-in-out' }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          )}
          
          {title && (
            <div className="mt-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {title}
            </div>
          )}
          
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300 dark:border-t-gray-600"></div>
        </div>
      )}
    </div>
  );
} 