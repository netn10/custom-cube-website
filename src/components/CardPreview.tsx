'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface CardPreviewProps {
  children: React.ReactNode;
  cardName: string;
  imageUrl?: string;
}

export default function CardPreview({ children, cardName, imageUrl }: CardPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Track if component is mounted
  const isMounted = useRef(true);
  // Store processed image URL
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  
  // Process and preload image when URL is available
  useEffect(() => {
    // Reset states when image URL changes
    setIsLoading(true);
    setError(false);
    
    // Set a timeout to prevent infinite loading state
    const loadingTimeout = setTimeout(() => {
      if (isMounted.current && isLoading) {
        console.warn('Image loading timeout for', cardName);
        setIsLoading(false);
        setError(true);
      }
    }, 5000); // 5 second timeout
    
    if (imageUrl) {
      // Process the image URL through the proxy
      const imageProxyUrl = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      setProcessedImageUrl(imageProxyUrl);
      
      // Preload image
      const img = new Image();
      img.src = imageProxyUrl;
      
      img.onload = () => {
        if (isMounted.current) {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
        }
      };
      
      img.onerror = () => {
        if (isMounted.current) {
          clearTimeout(loadingTimeout);
          console.error('Error loading image preview for', cardName);
          setError(true);
          setIsLoading(false);
          
          // Try to use the direct image URL as fallback
          if (imageUrl !== processedImageUrl) {
            console.log('Attempting to load direct image URL as fallback:', imageUrl);
            setProcessedImageUrl(imageUrl);
          }
        }
      };
    } else {
      // If no image URL is provided, don't show loading state
      setIsLoading(false);
    }
    
    return () => {
      isMounted.current = false;
      clearTimeout(loadingTimeout);
    };
  }, [imageUrl, cardName]);
  
  // Reset mounted ref when component mounts
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const handleMouseEnter = () => {
    setShowPreview(true);
  };
  
  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      {children}
      
      {showPreview && (
        <div className="absolute z-50 left-1/2 transform -translate-x-1/2 bottom-full mb-2">
          <div className="w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 transition-opacity duration-200">
            {imageUrl ? (
              <>
                {isLoading && (
                  <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {!isLoading && !error && (
                  <img 
                    src={processedImageUrl}
                    alt={cardName}
                    className="w-full rounded"
                    onError={(e) => {
                      if (isMounted.current) {
                        // Try direct URL as fallback if using proxy URL
                        if (processedImageUrl.includes('/image-proxy')) {
                          console.log('Image proxy failed, trying direct URL:', imageUrl);
                          e.currentTarget.src = imageUrl;
                        } else {
                          setError(true);
                        }
                      }
                    }}
                  />
                )}
                {error && (
                  <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Image not available
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {cardName}
                </span>
              </div>
            )}
            <div className="w-full text-center mt-1 text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
              {cardName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
