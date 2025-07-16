'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/types/types';
import { API_BASE_URL } from '@/lib/api';

interface RelatedFaceCardDetailProps {
  card: Card;
  relatedCard: Card | null;
  className?: string;
}

export default function RelatedFaceCardDetail({ card, relatedCard, className = '' }: RelatedFaceCardDetailProps) {
  const [isHovering, setIsHovering] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const originalSrcRef = useRef<string | null>(null);
  // Support both string and array for indicator
  const hasRelated = card.relatedFace && (Array.isArray(card.relatedFace) ? card.relatedFace.length > 0 : true);
  // For hover, use the first related face if array
  const relatedFaceName = Array.isArray(card.relatedFace) ? card.relatedFace[0] : card.relatedFace;
  const relatedFaceImageUrl = relatedCard?.imageUrl || '';

  const handleMouseEnter = () => {
    if (imgRef.current && relatedCard?.imageUrl) {
      // Store the original image source
      originalSrcRef.current = imgRef.current.src;
      
      // Switch to the related face image
      const imageProxyUrl = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(relatedCard.imageUrl)}`;
      imgRef.current.src = imageProxyUrl;
      
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (imgRef.current && originalSrcRef.current) {
      // Switch back to the original image
      imgRef.current.src = originalSrcRef.current;
      setIsHovering(false);
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        <img 
          ref={imgRef}
          src={card.imageUrl || ''}
          alt={card.name || 'MTG Card'}
          className="w-full h-full object-cover rounded-lg shadow-lg"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
          }}
        />
        
        {/* Show indicator if any related face exists */}
        {hasRelated && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <span className="text-xs">↔</span>
          </div>
        )}
      </div>
    </div>
  );
}
