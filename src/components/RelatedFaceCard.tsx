'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/types/types';
import { API_BASE_URL } from '@/lib/api';

interface RelatedFaceCardProps {
  card: Card;
  className?: string;
  children?: React.ReactNode;
}

export default function RelatedFaceCard({ card, className = '', children }: RelatedFaceCardProps) {
  const [relatedFaceImageUrl, setRelatedFaceImageUrl] = useState<string>('');
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const isMounted = useRef(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const originalSrcRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch the related face image when component mounts
  useEffect(() => {
    const fetchRelatedFaceImage = async () => {
      if (!card.relatedFace) return;
      
      try {
        setIsLoading(true);
        
        // Make API call to get the related face card
        const response = await fetch(`${API_BASE_URL}/cards?search=${encodeURIComponent(card.relatedFace)}&include_facedown=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch related face card');
        }
        
        const data = await response.json();
        
        if (data.cards && data.cards.length > 0 && data.cards[0].imageUrl) {
          if (isMounted.current) {
            setRelatedFaceImageUrl(data.cards[0].imageUrl);
            // Preload the image
            const img = new Image();
            img.onload = () => {
              if (isMounted.current) {
                setIsImageLoaded(true);
              }
            };
            img.src = processImageUrl(data.cards[0].imageUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching related face:', error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    if (card.relatedFace) {
      fetchRelatedFaceImage();
    }

    return () => {
      isMounted.current = false;
    };
  }, [card.relatedFace]);

  // Process image URL through proxy if needed
  const processImageUrl = (url: string): string => {
    if (!url) return '';
    return url.startsWith('data:') ? url : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  };

  const handleMouseEnter = () => {
    if (!card.relatedFace || !relatedFaceImageUrl || !isImageLoaded) return;
    
    setIsHovering(true);
    
    // Find the image element and change its src
    const imgElement = imgRef.current;
    if (imgElement) {
      // Store the original src if not already stored
      if (!originalSrcRef.current) {
        originalSrcRef.current = imgElement.src;
      }
      
      // Change to related face image
      imgElement.src = processImageUrl(relatedFaceImageUrl);
    }
  };

  const handleMouseLeave = () => {
    if (!isHovering) return;
    
    setIsHovering(false);
    
    // Restore the original image
    const imgElement = imgRef.current;
    if (imgElement && originalSrcRef.current) {
      imgElement.src = originalSrcRef.current;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children || (
        <img 
          ref={imgRef}
          src={processImageUrl(card.imageUrl || '') || '/card-back.jpg'}
          alt={card.name}
          className="w-full h-full object-cover rounded-lg transition-all duration-300"
          onLoad={() => {
            // Store the original src when image first loads
            if (imgRef.current && !originalSrcRef.current) {
              originalSrcRef.current = imgRef.current.src;
            }
          }}
          onError={(e) => {
            console.error(`Error loading image for ${card.name}`);
            e.currentTarget.src = '/card-back.jpg';
          }}
        />
      )}
      
      {card.relatedFace && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-xs">↔</span>
        </div>
      )}
    </div>
  );
}
