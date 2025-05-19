'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCardById, getCards, API_BASE_URL } from '@/lib/api';
import { Card } from '@/types/types';

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [relatedCard, setRelatedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      // Fetch card data from API
      const fetchCard = async () => {
        try {
          console.log('Fetching card with ID:', params.id);
          const data = await getCardById(params.id as string);
          console.log('Card data received:', data);
          setCard(data);
          
          // Handle related face linking - always get the direct ID
          if (data.relatedFaceId) {
            // We have the direct ID, no need to search
            setRelatedCard({ id: data.relatedFaceId, name: data.relatedFace || 'Related Face' });
          } else if (data.relatedFace && data.otherFaceId) {
            // For backward compatibility - some cards may have otherFaceId
            setRelatedCard({ id: data.otherFaceId, name: data.relatedFace || 'Related Face' });
          } else if (data.relatedFace) {
            // If we only have the name but not the ID, we'll search for it to get the ID
            try {
              // Search for the card by name (including facedown cards)
              const relatedCardResults = await getCards({ search: data.relatedFace, include_facedown: true });
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
        <p className="mb-6 dark:text-gray-300">The card you're looking for doesn't exist or has been removed.</p>
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

  // Function to convert mana cost to JSX elements
  const formatManaCost = (manaCost: string) => {
    if (!manaCost) return '';
    
    // Create a safe HTML string for dangerouslySetInnerHTML
    return manaCost.replace(/\{([WUBRGC0-9]+)\}/g, (match, symbol) => {
      const colorClass = symbol.length === 1 && 'WUBRG'.includes(symbol)
        ? colorMap[symbol]
        : 'bg-mtg-colorless text-black';
      
      return `<span class="inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass} mx-0.5">${symbol}</span>`;
    });
  }

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
                className="mtg-card-detail w-full md:w-auto fixed-card-size"
                onError={(e) => {
                  console.error('Error loading image:', card.imageUrl);
                  e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                }}
              />
            ) : (
              <div className="mtg-card-detail bg-gray-300 dark:bg-gray-700 flex items-center justify-center fixed-card-size">
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
              <p className="whitespace-pre-line dark:text-white">{card.text}</p>
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
            
            {(card.relatedFace || card.relatedFaceId) && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Related Face: 
                  {relatedCard ? (
                    <Link 
                      href={`/card/${relatedCard.id}`}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {card.relatedFace || 'View Related Face'}
                    </Link>
                  ) : card.relatedFaceId ? (
                    <Link 
                      href={`/card/${card.relatedFaceId}`}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {card.relatedFace || 'View Related Face'}
                    </Link>
                  ) : (
                    <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
                  )
                </p>
              </div>
            )}
            
            {/* Edit Card Button */}
            <div className="mt-6 mb-4">
              <Link href={`/card/${card.id}/edit`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Card
              </Link>
            </div>
            
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
