'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCards, API_BASE_URL } from '@/lib/api';
import { Card } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [relatedCard, setRelatedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      // Fetch card data from API using name search
      const fetchCard = async () => {
        try {
          const cardName = decodeURIComponent(params.id as string);
          console.log('Fetching card with name:', cardName);
          
          // First search for the card by exact name
          console.log('Searching for exact match...');
          const exactSearchResults = await getCards({ search: `"${cardName}"`, limit: 10, facedown: true });
          
          // If we don't get an exact match, try a broader search
          let searchResults = exactSearchResults;
          if (exactSearchResults.cards.length === 0) {
            console.log('No exact matches, trying broader search...');
            searchResults = await getCards({ search: cardName, limit: 10, include_facedown: true });
          }
          
          // Look for cards in the results
          const cards = searchResults.cards;
          
          // First, try to find an exact name match (case insensitive)
          const exactMatch = cards.find(c => 
            c.name.toLowerCase() === cardName.toLowerCase()
          );
          
          // Determine the card to use - exact match, first result, or facedown card
          let cardToUse: Card | null = null;
          
          if (exactMatch) {
            console.log('Found exact matching card:', exactMatch.name);
            cardToUse = exactMatch;
          }
          
          setCard(cardToUse);
          console.log('Card data to use:', cardToUse);
            
          // If the card has a related face, fetch that card
          if (cardToUse && cardToUse.relatedFace) {
            try {
              // Search for the card by name
              const relatedCardResults = await getCards({ search: cardToUse.relatedFace, include_facedown: true });
              if (relatedCardResults.cards.length > 0) {
                setRelatedCard(relatedCardResults.cards[0]);
              }
            } catch (err) {
              console.error('Error fetching related card:', err);
            }
          }
        } catch (err) {
          console.error('Error fetching card:', err);
          setError('Failed to load card details. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCard();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">{error}</h2>
        <Link href="/cube-list" className="btn-primary">
          Back to Cube List
        </Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Card Not Found</h2>
        <p className="mb-6 dark:text-gray-300">The card you're looking for with name "{decodeURIComponent(params.id as string)}" doesn't exist or has been removed.</p>
        <Link href="/cube-list" className="btn-primary">
          Back to Cube List
        </Link>
      </div>
    );
  }

  // Color mapping for visual representation
  const colorMap: Record<string, string> = {
    W: 'bg-mtg-white text-black',
    U: 'bg-mtg-blue text-white',
    B: 'bg-mtg-black text-white',
    R: 'bg-mtg-red text-white',
    G: 'bg-mtg-green text-white',
  };

  // Create a general helper function for symbol spans
  const createSymbolSpan = (color: string, content: string, title?: string, size: string = 'w-5 h-5') => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<span style="display:inline-flex;vertical-align:middle" class="mx-0.5"><span class="inline-block ${size} ${color} rounded-full flex items-center justify-center text-xs font-bold"${titleAttr}>${content}</span></span>`;
  };
  
  // Function to format mana cost with colored symbols
  const formatManaCost = (manaCost: string) => {
    if (!manaCost) return '';
    
    return manaCost.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle Phyrexian mana symbols in either U/P or P/U format
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `${color}/P`, `Phyrexian ${color}`, 'w-6 h-6');
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `P/${color}`, `Phyrexian ${color}`, 'w-6 h-6');
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        // First check if both are colors
        if (colors.length === 2 && colors.every(c => 'WUBRG'.includes(c))) {
          return createSymbolSpan(`bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()}`, symbol, `${colors[0]}/${colors[1]}`, 'w-6 h-6');
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return createSymbolSpan(colorMap[symbol], symbol, undefined, 'w-6 h-6');
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return createSymbolSpan('bg-mtg-colorless text-black', symbol, undefined, 'w-6 h-6');
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return createSymbolSpan('bg-mtg-colorless text-black', 'X', 'Variable Mana', 'w-6 h-6');
      }
      
      // Return the original match if no specific formatting applies
      return `<span class="inline-block w-6 h-6 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
    });
  };

  // Function to format card text with appropriate symbols while preserving line breaks
  const formatCardText = (text: string) => {
    if (!text) return '';
        
    // Replace all mana symbols with their HTML equivalents
    const processedText = text.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle tap symbol
      if (symbol === 'T') {
        return createSymbolSpan('bg-gray-300 dark:bg-gray-600', 'T', 'Tap');
      }
      
      // Handle untap symbol
      if (symbol === 'Q') {
        return createSymbolSpan('bg-gray-300 dark:bg-gray-600', 'Q', 'Untap');
      }
      
      // Handle Phyrexian mana symbols in either U/P or P/U format
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `${color}/P`, `Phyrexian ${color}`);
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `P/${color}`, `Phyrexian ${color}`);
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        // First check if both are colors
        if (colors.length === 2 && colors.every(c => 'WUBRG'.includes(c))) {
          return createSymbolSpan(`bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()}`, symbol, `${colors[0]}/${colors[1]}`);
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return createSymbolSpan(colorMap[symbol], symbol);
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return createSymbolSpan('bg-mtg-colorless text-black', symbol);
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return createSymbolSpan('bg-mtg-colorless text-black', 'X', 'Variable Mana');
      }
      
      // Return the original match if no specific formatting applies
      return match;
    });
    
    // Now handle line breaks by converting them to <br /> tags
    // This preserves all original line breaks in the text
    return processedText.replace(/\n/g, '<br />');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Cube List
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 p-4 flex justify-center">
            {card.imageUrl ? (
              <img 
                src={`${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`}
                alt={card.name}
                className="mtg-card-detail fixed-card-size object-contain"
                onError={(e) => {
                  console.error('Error loading image:', card.imageUrl);
                  e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                }}
              />
            ) : (
              <div className="mtg-card-detail bg-gray-300 dark:bg-gray-700 flex items-center justify-center fixed-card-size object-contain">
                <span className="text-gray-500 dark:text-gray-400">No Image Available</span>
              </div>
            )}
          </div>
          
          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold dark:text-white">{card.name}</h1>
              <div 
                className="mana-cost flex flex-row flex-wrap" 
                dangerouslySetInnerHTML={{ __html: formatManaCost(card.manaCost) }} 
              />
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 italic">{card.type}</p>
              <div className="flex mt-2">
                {card.colors.map((color: string) => (
                  <span 
                    key={color} 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-1 ${colorMap[color]}`}
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <p className="dark:text-white text-base leading-relaxed" 
                 style={{ lineHeight: '1.6em' }}
                 dangerouslySetInnerHTML={{ __html: formatCardText(card.text) }} />
            </div>
            
            {(card.power && card.toughness) && (
              <div className="mb-4">
                <p className="text-lg font-semibold dark:text-white">
                  Power/Toughness: {card.power}/{card.toughness}
                </p>
              </div>
            )}
            
            <div className="mb-4">
              {card.flavorText && card.flavorText.trim() !== "" && (
                <p className="text-gray-600 dark:text-gray-400 italic">{card.flavorText}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Illustrated by {card.artist}</p>
            </div>

            {card.set && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Set: <span className="font-normal">{card.set}</span></p>
              </div>
            )}
            
            {card.notes && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Notes:</p>
                <p className="text-sm dark:text-gray-300 whitespace-pre-line">{card.notes}</p>
              </div>
            )}
            
            {card.relatedTokens && card.relatedTokens.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Related Tokens:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {card.relatedTokens.map((token: string) => (
                    <Link 
                      key={token}
                      href={`/tokens?search=${encodeURIComponent(token)}`}
                      className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs"
                    >
                      {token}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {card.relatedFace && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Related Face: 
                  <Link 
                    href={`/card/${encodeURIComponent(card.relatedFace)}`}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {card.relatedFace}
                  </Link>
                </p>
              </div>
            )}
            
            {/* Edit Card Button - Only shown for authenticated admins */}
            {isAuthenticated && isAdmin && (
              <div className="mt-6 mb-4">
                <Link href={`/card/${encodeURIComponent(card.name)}/edit`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit Card
                </Link>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-4">
              {card.custom && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  Custom Card
                </span>
              )}
              
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                {card.rarity}
              </span>
              
              {card.archetypes.map((archetype: string) => {
                const archetypeName = archetype.split('-').pop() || archetype;
                return (
                  <Link 
                    key={archetype} 
                    href={`/archetypes/${archetype}`}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {archetypeName.charAt(0).toUpperCase() + archetypeName.slice(1)} Archetype
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
