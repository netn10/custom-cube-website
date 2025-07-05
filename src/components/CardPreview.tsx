'use client';

import { useState, useEffect, memo } from 'react';
import { Card } from '@/types/types';

interface CardPreviewProps {
  card: Card;
  className?: string;
  showImage?: boolean;
  showText?: boolean;
  showStats?: boolean;
  showArchetypes?: boolean;
  showSet?: boolean;
  showArtist?: boolean;
  showNotes?: boolean;
  showRelatedTokens?: boolean;
  showFlavorText?: boolean;
  tokenImages?: {[name: string]: string};
  onImageError?: () => void;
  onImageLoad?: () => void;
}

const CardPreview = memo(({
  card,
  className = "",
  showImage = true,
  showText = true,
  showStats = true,
  showArchetypes = false,
  showSet = false,
  showArtist = false,
  showNotes = false,
  showRelatedTokens = false,
  showFlavorText = false,
  tokenImages = {},
  onImageError,
  onImageLoad
}: CardPreviewProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Guard clause for undefined or null card
  if (!card) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading card...</div>
        </div>
      </div>
    );
  }

  // Reset image state when card changes
  useEffect(() => {
    if (card?.id) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [card?.id]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    onImageLoad?.();
  };

  const handleImageError = () => {
    setImageError(true);
    onImageError?.();
  };

  // Memoize the formatted mana cost to avoid recalculation
  const formatManaCost = (manaCost: string) => {
    if (!manaCost) return '';
    
    return manaCost.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle Phyrexian mana symbols
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        return `<span class="inline-block w-4 h-4 bg-mtg-${color.toLowerCase()} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${color}/P</span>`;
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        return `<span class="inline-block w-4 h-4 bg-mtg-${color.toLowerCase()} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">P/${color}</span>`;
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        if (colors.length === 2 && colors.every((c: string) => 'WUBRG'.includes(c))) {
          return `<span class="inline-block w-4 h-4 bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()} rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return `<span class="inline-block w-4 h-4 bg-mtg-${symbol.toLowerCase()} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">X</span>`;
      }
      
      return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
    });
  };

  // Memoize the formatted card text
  const formatCardText = (text: string) => {
    if (!text) return '';
    
    return text.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle tap symbol
      if (symbol === 'T') {
        return '<span class="inline-block w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold mx-0.5">T</span>';
      }
      
      // Handle untap symbol
      if (symbol === 'Q') {
        return '<span class="inline-block w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold mx-0.5">Q</span>';
      }
      
      // Handle Phyrexian mana symbols
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        const colorClass = 'WUBRG'.includes(color) ? `bg-mtg-${color.toLowerCase()}` : 'bg-mtg-colorless';
        return `<span class="inline-block w-4 h-4 ${colorClass} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${color}/P</span>`;
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? `bg-mtg-${color.toLowerCase()}` : 'bg-mtg-colorless';
        return `<span class="inline-block w-4 h-4 ${colorClass} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">P/${color}</span>`;
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        if (colors.length === 2 && colors.every((c: string) => 'WUBRG'.includes(c))) {
          return `<span class="inline-block w-4 h-4 bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()} rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return `<span class="inline-block w-4 h-4 bg-mtg-${symbol.toLowerCase()} text-white rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">X</span>`;
      }
      
      return match;
    }).replace(/\n/g, '<br />');
  };

  const formattedManaCost = formatManaCost(card.manaCost || '');
  const formattedText = formatCardText(card.text || '');
  const formattedFlavorText = card.flavorText ? formatCardText(card.flavorText) : '';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      <div className="md:flex">
        {showImage && (
          <div className="md:w-1/3 p-4 flex justify-center">
            {card.imageUrl && !imageError ? (
              <div className="relative">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className={`w-full rounded-lg shadow-md transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                No Image
              </div>
            )}
          </div>
        )}
        
        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{card.name || 'Unnamed Card'}</h1>
            {formattedManaCost && (
              <div 
                className="text-lg font-semibold text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: formattedManaCost }}
              />
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">{card.type || 'Unknown Type'}</p>
          
          {showText && formattedText && (
            <div 
              className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          )}
          
          {showStats && (card.power || card.toughness || card.loyalty) && (
            <div className="text-gray-600 dark:text-gray-400 mb-4">
              {card.power && card.toughness && (
                <span className="font-semibold">{card.power}/{card.toughness}</span>
              )}
              {card.loyalty && (
                <span className="font-semibold ml-2">Loyalty: {card.loyalty}</span>
              )}
            </div>
          )}
          
          {showFlavorText && formattedFlavorText && (
            <div 
              className="text-gray-500 dark:text-gray-400 mb-4 italic text-sm"
              dangerouslySetInnerHTML={{ __html: formattedFlavorText }}
            />
          )}
          
          {showArchetypes && card.archetypes && Array.isArray(card.archetypes) && card.archetypes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Archetypes:</h3>
              <div className="flex flex-wrap gap-2">
                {card.archetypes.map((archetype, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                  >
                    {archetype}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {showSet && card.set && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Set: {card.set}</p>
          )}
          
          {showArtist && card.artist && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Artist: {card.artist}</p>
          )}
          
          {showNotes && card.notes && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{card.notes}</p>
            </div>
          )}
          
          {showRelatedTokens && card.relatedTokens && Array.isArray(card.relatedTokens) && card.relatedTokens.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Related Tokens:</h3>
              <div className="flex flex-wrap gap-2">
                {card.relatedTokens.map((tokenName, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {tokenImages[tokenName] && (
                      <img
                        src={tokenImages[tokenName]}
                        alt={tokenName}
                        className="w-8 h-8 rounded border"
                        loading="lazy"
                      />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tokenName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CardPreview.displayName = 'CardPreview';

export default CardPreview;
