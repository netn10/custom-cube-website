'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/types';
import { API_BASE_URL } from '@/lib/api';

interface BoosterPackAnimationProps {
  cards: Card[];
  onAnimationComplete: () => void;
}

export default function BoosterPackAnimation({ cards, onAnimationComplete }: BoosterPackAnimationProps) {
  const [animationStage, setAnimationStage] = useState<'closed' | 'opening' | 'opened'>('closed');
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);

  // Function to get proxied image URL
  function getProxiedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '/card-back.jpg';
    
    // If the URL is already proxied or is a local URL, return it as is
    if (originalUrl.startsWith('/') || originalUrl.includes('localhost') || originalUrl.includes('127.0.0.1')) {
      return originalUrl;
    }
    
    // Otherwise, proxy through our backend to avoid CORS issues
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${API_BASE_URL}/proxy-image?url=${encodedUrl}`;
  }

  // Function to get fallback image URL based on card colors
  function getFallbackImageUrl(colors: string[] = []): string {
    // Default fallback image for cards with no color information
    return '/card-back.jpg';
  }

  useEffect(() => {
    // Start the animation sequence
    const openingTimeout = setTimeout(() => {
      setAnimationStage('opening');
      
      // After the pack opens, start revealing cards one by one
      const openedTimeout = setTimeout(() => {
        setAnimationStage('opened');
        
        // Reveal cards one by one with a delay
        cards.forEach((card, index) => {
          setTimeout(() => {
            setRevealedCards(prev => [...prev, card]);
            
            // If this is the last card, notify parent that animation is complete
            if (index === cards.length - 1) {
              setTimeout(() => {
                onAnimationComplete();
              }, 1000); // Wait a bit after all cards are revealed
            }
          }, 150 * index); // Stagger the reveal of each card
        });
      }, 1500); // Time for the pack opening animation
      
      return () => clearTimeout(openedTimeout);
    }, 1000); // Initial delay before starting
    
    return () => clearTimeout(openingTimeout);
  }, [cards, onAnimationComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Booster pack animation - CSS-based instead of image */}
        {animationStage !== 'opened' && (
          <div 
            className={`relative mx-auto w-64 h-96 transform transition-all duration-1000 ${
              animationStage === 'opening' ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            {/* CSS-based booster pack */}
            <div className="absolute inset-0 rounded-lg shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-mtg-red via-mtg-gold to-mtg-blue"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 border-4 border-mtg-gold rounded-lg flex flex-col items-center justify-center p-4 bg-black bg-opacity-70">
                  <div className="text-mtg-gold text-2xl font-bold mb-2">CUSTOM</div>
                  <div className="text-white text-4xl font-extrabold mb-2">CUBE</div>
                  <div className="text-mtg-gold text-xl font-bold">BOOSTER</div>
                  <div className="mt-4 text-white text-sm">15 RANDOM CARDS</div>
                  <div className={`mt-4 text-white text-xs ${animationStage === 'opening' ? 'animate-pulse' : ''}`}>
                    {animationStage === 'opening' ? 'OPENING...' : 'CLICK TO OPEN'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Revealed cards */}
        {animationStage === 'opened' && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 p-4 max-h-[80vh] overflow-y-auto">
            {revealedCards.map((card, index) => (
              <div 
                key={card.id || index}
                className="relative transform transition-all duration-500 hover:scale-105"
                style={{
                  animationName: 'cardReveal',
                  animationDuration: '0.5s',
                  animationFillMode: 'forwards',
                  animationDelay: `${index * 0.15}s`,
                  opacity: 0,
                  transform: 'translateY(20px)'
                }}
              >
                <img 
                  src={card.imageUrl ? getProxiedImageUrl(card.imageUrl) : getFallbackImageUrl(card.colors)}
                  alt={card.name || 'MTG Card'}
                  className="w-full rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = getFallbackImageUrl(card.colors);
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 rounded-b-lg">
                  <p className="text-white text-xs font-bold truncate">{card.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* CSS for card reveal animation */}
      <style jsx global>{`
        @keyframes cardReveal {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
