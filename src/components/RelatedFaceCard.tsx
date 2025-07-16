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
  const isMounted = useRef(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const originalSrcRef = useRef<string | null>(null);

  // Fetch the related face image when component mounts
  useEffect(() => {
    const fetchRelatedFaceImage = async () => {
      if (!card.relatedFace) return;
      
      // Support both string and array
      const relatedFaces = Array.isArray(card.relatedFace) ? card.relatedFace : [card.relatedFace];
      if (relatedFaces.length === 0) return;
      const firstRelated = relatedFaces[0];
      try {
        setIsLoading(true);
        // Try direct card lookup first
        try {
          const response = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(firstRelated)}`);
          if (response.ok) {
            const relatedCard = await response.json();
            if (relatedCard.imageUrl && isMounted.current) {
              setRelatedFaceImageUrl(relatedCard.imageUrl);
              return;
            }
          }
        } catch (directError) {
          console.log('Direct related face lookup failed, falling back to search:', directError);
        }
        // Fallback to search if direct lookup fails
        const response = await fetch(`${API_BASE_URL}/cards?search=${encodeURIComponent(firstRelated)}&include_facedown=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch related face card');
        }
        const data = await response.json();
        if (data.cards && data.cards.length > 0 && data.cards[0].imageUrl) {
          if (isMounted.current) {
            setRelatedFaceImageUrl(data.cards[0].imageUrl);
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
    // Support both string and array
    const hasRelated = card.relatedFace && (Array.isArray(card.relatedFace) ? card.relatedFace.length > 0 : true);
    if (!hasRelated || !relatedFaceImageUrl) return;
    setIsHovering(true);
    const imgElement = imgRef.current || document.querySelector('img');
    if (imgElement) {
      originalSrcRef.current = imgElement.src;
      imgElement.src = processImageUrl(relatedFaceImageUrl);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // Restore the original image
    const imgElement = imgRef.current || document.querySelector('img');
    if (imgElement && originalSrcRef.current) {
      imgElement.src = originalSrcRef.current;
    }
  };

  return (
    <div 
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
          onError={(e) => {
            console.error(`Error loading image for ${card.name}`);
            e.currentTarget.src = '/card-back.jpg';
          }}
        />
      )}
      
      {/* Show indicator if any related face exists */}
      {(Array.isArray(card.relatedFace) ? card.relatedFace.length > 0 : !!card.relatedFace) && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-xs">↔</span>
        </div>
      )}
    </div>
  );
}
