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
  const childrenRef = useRef<HTMLDivElement>(null);

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
    if (!card.relatedFace || !relatedFaceImageUrl) return;
    
    setIsHovering(true);
    
    // Find the image element inside the children and change its src
    if (childrenRef.current) {
      const imgElement = childrenRef.current.querySelector('img');
      if (imgElement) {
        // Store the original src in a data attribute if not already stored
        if (!imgElement.dataset.originalSrc) {
          imgElement.dataset.originalSrc = imgElement.src;
        }
        // Change to related face image
        imgElement.src = processImageUrl(relatedFaceImageUrl);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // Restore the original image
    if (childrenRef.current) {
      const imgElement = childrenRef.current.querySelector('img');
      if (imgElement && imgElement.dataset.originalSrc) {
        imgElement.src = imgElement.dataset.originalSrc;
      }
    }
  };

  return (
    <div 
      ref={childrenRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children || (
        <img 
          src={processImageUrl(card.imageUrl || '') || '/card-back.jpg'}
          alt={card.name}
          className="w-full h-full object-cover rounded-lg transition-all duration-300"
          data-original-src={processImageUrl(card.imageUrl || '')}
          onError={(e) => {
            console.error(`Error loading image for ${card.name}`);
            e.currentTarget.src = '/card-back.jpg';
          }}
        />
      )}
    </div>
  );
}
