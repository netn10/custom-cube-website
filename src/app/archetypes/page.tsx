'use client';

import React, { useState, useEffect } from 'react';
import { getArchetypes, getArchetypeCards, getRandomArchetypeCards } from '@/lib/api';
import { Archetype, Card } from '@/types/types';
import Image from 'next/image';
import Link from 'next/link';
import { FaChevronDown, FaChevronUp, FaInfoCircle, FaCaretRight } from 'react-icons/fa';

// Color mapping for visual representation
const colorMap: Record<string, string> = {
  W: 'bg-mtg-white text-black',
  U: 'bg-mtg-blue text-white',
  B: 'bg-mtg-black text-white',
  R: 'bg-mtg-red text-white',
  G: 'bg-mtg-green text-white',
};

// Color name mapping
const colorNames: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

export default function ArchetypesPage() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [archetypeCards, setArchetypeCards] = useState<Card[]>([]);
  const [archetypeCardsMap, setArchetypeCardsMap] = useState<Record<string, Card[]>>({});
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedArchetype, setExpandedArchetype] = useState<string | null>(null);

  // Helper function to get a random item from an array
  const getRandomItem = <T,>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  // Function to process and organize cards by color for an archetype
  const processArchetypeCards = (cards: Card[], archetypeColors: string[]): Card[] => {
    if (cards.length === 0) return [];
    
    // Organize cards by color
    const leftColorCards: Card[] = [];
    const rightColorCards: Card[] = [];
    const multiColorCards: Card[] = [];
    const otherCards: Card[] = [];
    
    // Only process if we have at least one color
    if (archetypeColors.length > 0) {
      const leftColor = archetypeColors[0];
      const rightColor = archetypeColors.length > 1 ? archetypeColors[archetypeColors.length - 1] : archetypeColors[0];
      
      // Sort cards into appropriate categories
      cards.forEach(card => {
        // Card has exactly one color and it's the left color
        if (card.colors.length === 1 && card.colors.includes(leftColor) && !card.colors.includes(rightColor)) {
          leftColorCards.push(card);
        }
        // Card has exactly one color and it's the right color
        else if (card.colors.length === 1 && card.colors.includes(rightColor) && !card.colors.includes(leftColor)) {
          rightColorCards.push(card);
        }
        // Card has both colors (multicolor)
        else if (card.colors.includes(leftColor) && card.colors.includes(rightColor)) {
          multiColorCards.push(card);
        }
        // Any other card
        else {
          otherCards.push(card);
        }
      });
      
      // Prepare the final cards array with random matches from each category
      const finalCards: Card[] = [];
      
      // Add a random left color card if available, otherwise use any card
      if (leftColorCards.length > 0) {
        finalCards.push(getRandomItem(leftColorCards));
      } else if (cards.length > 0) {
        finalCards.push(getRandomItem(cards));
      }
      
      // Add a random multicolor card if available, otherwise use any card
      if (multiColorCards.length > 0) {
        finalCards.push(getRandomItem(multiColorCards));
      } else if (cards.length > finalCards.length) {
        // Try to avoid duplicates by removing cards already selected
        const remainingCards = cards.filter(card => 
          !finalCards.some(selectedCard => selectedCard.id === card.id)
        );
        finalCards.push(remainingCards.length > 0 ? getRandomItem(remainingCards) : getRandomItem(cards));
      } else if (finalCards.length > 0) {
        finalCards.push({...finalCards[0]});
      }
      
      // Add a random right color card if available, otherwise use any card
      if (rightColorCards.length > 0) {
        finalCards.push(getRandomItem(rightColorCards));
      } else if (cards.length > finalCards.length) {
        // Try to avoid duplicates by removing cards already selected
        const remainingCards = cards.filter(card => 
          !finalCards.some(selectedCard => selectedCard.id === card.id)
        );
        finalCards.push(remainingCards.length > 0 ? getRandomItem(remainingCards) : getRandomItem(cards));
      } else if (finalCards.length > 0) {
        finalCards.push({...finalCards[0]});
      }
      
      // Make sure we have exactly 3 cards
      while (finalCards.length < 3 && finalCards.length > 0) {
        finalCards.push({...finalCards[finalCards.length - 1]});
      }
      
      return finalCards;
    } else {
      // If no colors, just use 3 random cards
      const finalCards: Card[] = [];
      const cardsCopy = [...cards];
      
      // Select 3 random cards without replacement if possible
      for (let i = 0; i < 3 && cardsCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * cardsCopy.length);
        finalCards.push(cardsCopy[randomIndex]);
        cardsCopy.splice(randomIndex, 1); // Remove the selected card
      }
      
      // Make sure we have exactly 3 cards
      while (finalCards.length < 3 && finalCards.length > 0) {
        const lastCard = finalCards[finalCards.length - 1];
        finalCards.push({...lastCard});
      }
      
      return finalCards;
    }
  };

  // Fetch archetypes and cards only once on component mount
  useEffect(() => {
    // Track if the component is mounted to prevent state updates after unmount
    let isMounted = true;
    
    // Use a ref to track if data has been loaded
    const dataLoaded = { archetypes: false, cards: false };
    
    const fetchArchetypes = async () => {
      // Skip if already loaded
      if (dataLoaded.archetypes) return;
      
      try {
        setLoading(true);
        
        // Fetch archetypes
        const archetypesData = await getArchetypes();
        
        // Check if component is still mounted
        if (!isMounted) return;
        
        // Process archetypes to ensure they have proper IDs
        const processedArchetypes = archetypesData.map(archetype => ({
          ...archetype,
          id: archetype.id
        }));
        
        setArchetypes(processedArchetypes);
        dataLoaded.archetypes = true;
        setLoading(false);
        
        // After setting archetypes, fetch cards in parallel
        fetchArchetypeCards(processedArchetypes);
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching archetypes:', err);
          setError('Failed to load archetypes. Please try again later.');
          setLoading(false);
        }
      }
    };

    // Function to fetch cards for all archetypes in parallel
    const fetchArchetypeCards = async (archetypes: Archetype[]) => {
      // Skip if already loaded
      if (dataLoaded.cards) return;
      
      try {
        setCardsLoading(true);
        
        // Create an array of promises for all archetype card fetches
        const cardFetchPromises = archetypes.map(archetype => 
          getArchetypeCards(archetype.id, 1, 30)
            .then(({ cards }) => ({ archetypeId: archetype.id, cards, colors: archetype.colors }))
            .catch(error => {
              console.error(`Error fetching cards for archetype ${archetype.id}:`, error);
              return { archetypeId: archetype.id, cards: [], colors: archetype.colors };
            })
        );
        
        // Wait for all promises to resolve in parallel
        const results = await Promise.all(cardFetchPromises);
        
        // Create a map of archetype ID to cards
        const cardMap: Record<string, Card[]> = {};
        
        // Process each result
        results.forEach(({ archetypeId, cards, colors }) => {
          // Filter out facedown cards before processing
          const visibleCards = cards.filter(card => !card.facedown);
          // Process cards for this archetype
          const processedCards = processArchetypeCards(visibleCards, colors);
          cardMap[archetypeId] = processedCards;
        });
        
        setArchetypeCardsMap(cardMap);
        dataLoaded.cards = true;
        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching archetype cards:', err);
          setError('Failed to load archetype cards. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setCardsLoading(false);
        }
      }
    };

    // Only fetch if not already loaded
    if (!dataLoaded.archetypes) {
      fetchArchetypes();
    }
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Add a console log to verify the component is not re-rendering unnecessarily
  // This can be removed in production
  useEffect(() => {
    console.log('ArchetypesPage rendered');
  });



  // Toggle expanded archetype description
  const toggleArchetypeExpansion = (archetypeId: string, event: React.MouseEvent) => {
    // Prevent the click from triggering the parent div's onClick
    event.stopPropagation();
    
    if (expandedArchetype === archetypeId) {
      setExpandedArchetype(null);
    } else {
      setExpandedArchetype(archetypeId);
    }
  };

  // Get color classes for the archetype card
  const getArchetypeColorClasses = (colors: string[]) => {
    if (colors.length === 0) return 'bg-gray-200 text-gray-800';
    
    if (colors.length === 1) {
      return colorMap[colors[0]] || 'bg-gray-200 text-gray-800';
    }
    
    // For multi-colored archetypes, create a gradient
    return 'bg-gradient-to-r from-mtg-gold to-mtg-gold-light text-black';
  };

  // Get card color classes
  const getCardColorClasses = (colors: string[]) => {
    if (colors.length === 0) return 'border-gray-300';
    
    if (colors.length === 1) {
      switch (colors[0]) {
        case 'W': return 'border-mtg-white';
        case 'U': return 'border-mtg-blue';
        case 'B': return 'border-mtg-black';
        case 'R': return 'border-mtg-red';
        case 'G': return 'border-mtg-green';
        default: return 'border-gray-300';
      }
    }
    
    // Multi-colored cards
    return 'border-mtg-gold';
  };

  // Get formatted color names for display
  const getColorNames = (colors: string[]) => {
    if (colors.length === 0) return 'Colorless';
    return colors.map(c => colorNames[c]).join('-');
  };
  
  // Function to fetch specific cards for an archetype
  const fetchArchetypeCards = async (archetypeId: string) => {
    if (archetypeCardsMap[archetypeId]?.length >= 3) {
      // Cards already loaded
      return;
    }
    
    try {
      setCardsLoading(true);
      // Fetch more cards to ensure we have at least 3
      const { cards } = await getArchetypeCards(archetypeId, 1, 10);
      
      // Make sure we have at least 3 cards (or as many as possible)
      const cardsToUse = cards.slice(0, Math.max(3, cards.length));
      
      console.log(`Fetched ${cards.length} cards for archetype ${archetypeId}`, cards);
      
      // Update the cards map
      setArchetypeCardsMap(prev => ({
        ...prev,
        [archetypeId]: cardsToUse
      }));
    } catch (err) {
      console.error(`Error fetching cards for archetype ${archetypeId}:`, err);
    } finally {
      setCardsLoading(false);
    }
  };

  // Sort archetypes by the color wheel order (WU, UB, BR, RG, GW, WB, BG, GU, UR, RW)
  const colorWheelOrder = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'BG', 'GU', 'UR', 'RW'];
  
  // Sort archetypes based on the color wheel order
  const sortedArchetypes = [...archetypes].sort((a, b) => {
    // Create color code for each archetype
    const aColors = a.colors.join('');
    const bColors = b.colors.join('');
    
    // Find index in colorWheelOrder
    const aIndex = colorWheelOrder.indexOf(aColors);
    const bIndex = colorWheelOrder.indexOf(bColors);
    
    // If both are in the color wheel order, sort by that
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the color wheel, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // Otherwise, sort by name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-xl mb-10 overflow-hidden">
          <div className="px-6 py-12 md:py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Cube Archetypes</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              Explore the unique archetypes that define this custom cube. Each archetype represents a distinct strategy and playstyle.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedArchetypes.map((archetype) => (
              <div 
                key={archetype.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* Archetype Header */}
                <div 
                  className={`p-5 ${getArchetypeColorClasses(archetype.colors)} cursor-pointer transition-all duration-200 hover:brightness-105`}
                  onClick={() => fetchArchetypeCards(archetype.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="text-2xl font-bold truncate">{archetype.name}</h3>
                    <div className="flex space-x-2 flex-shrink-0">
                      {archetype.colors.map((color) => (
                        <div 
                          key={color} 
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${colorMap[color]} shadow-sm`}
                        >
                          {color}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Archetype Description */}
                <div className="p-5 dark:text-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`${expandedArchetype === archetype.id ? '' : 'line-clamp-3'} text-gray-700 dark:text-gray-300`}>
                        {archetype.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Representative Cards Display - Left, Center, Right */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                      <FaInfoCircle className="mr-2" /> Example Cards
                    </h4>
                                        {cardsLoading ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : archetypeCardsMap[archetype.id]?.length > 0 ? (
                      <div className="flex justify-between h-48 gap-2">
                        {/* Left Card */}
                        <div 
                          className={`w-1/3 h-full rounded-lg overflow-hidden border-2 ${archetypeCardsMap[archetype.id]?.[0] ? getCardColorClasses(archetypeCardsMap[archetype.id][0].colors) : 'border-gray-300'} hover:shadow-xl transition-all duration-200 transform hover:scale-[1.03] hover:z-20 relative`}
                        >
                          
                          {archetypeCardsMap[archetype.id]?.[0]?.imageUrl ? (
                            <Link href={`/card/${encodeURIComponent(archetypeCardsMap[archetype.id][0].name)}`} className="block h-full">
                              <div className="relative h-full w-full">
                                <Image 
                                  src={archetypeCardsMap[archetype.id][0].imageUrl} 
                                  alt={`Left - ${archetypeCardsMap[archetype.id][0].name}`}
                                  fill
                                  sizes="(max-width: 768px) 33vw, 150px"
                                  className="object-cover"
                                  onError={() => {
                                    console.error(`Failed to load image: ${archetypeCardsMap[archetype.id][0].imageUrl}`);
                                  }}
                                  unoptimized={true}
                                />
                              </div>
                            </Link>
                          ) : (
                            <div className="h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-2 text-center">
                              <span className="text-sm font-medium dark:text-white">
                                {archetypeCardsMap[archetype.id]?.[0]?.name || 'No Card'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Center Card */}
                        <div 
                          className={`w-1/3 h-full rounded-lg overflow-hidden border-2 ${archetypeCardsMap[archetype.id]?.[1] ? getCardColorClasses(archetypeCardsMap[archetype.id][1].colors) : 'border-gray-300'} hover:shadow-xl transition-all duration-200 hover:scale-[1.05] z-10 hover:z-20 relative`}
                        >
                          
                          
                          {archetypeCardsMap[archetype.id]?.[1]?.imageUrl ? (
                            <Link href={`/card/${encodeURIComponent(archetypeCardsMap[archetype.id][1].name)}`} className="block h-full">
                              <div className="relative h-full w-full">
                                <Image 
                                  src={archetypeCardsMap[archetype.id][1].imageUrl} 
                                  alt={`Center - ${archetypeCardsMap[archetype.id][1].name}`}
                                  fill
                                  sizes="(max-width: 768px) 33vw, 150px"
                                  className="object-cover"
                                  onError={() => {
                                    console.error(`Failed to load image: ${archetypeCardsMap[archetype.id][1].imageUrl}`);
                                  }}
                                  unoptimized={true}
                                />
                              </div>
                            </Link>
                          ) : (
                            <div className="h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-2 text-center">
                              <span className="text-sm font-medium dark:text-white">
                                {archetypeCardsMap[archetype.id]?.[1]?.name || 'No Card'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Right Card */}
                        <div 
                          className={`w-1/3 h-full rounded-lg overflow-hidden border-2 ${archetypeCardsMap[archetype.id]?.[2] ? getCardColorClasses(archetypeCardsMap[archetype.id][2].colors) : 'border-gray-300'} hover:shadow-xl transition-all duration-200 transform hover:scale-[1.03] hover:z-20 relative`}
                        >
                          
                          
                          {archetypeCardsMap[archetype.id]?.[2]?.imageUrl ? (
                            <Link href={`/card/${encodeURIComponent(archetypeCardsMap[archetype.id][2].name)}`} className="block h-full">
                              <div className="relative h-full w-full">
                                <Image 
                                  src={archetypeCardsMap[archetype.id][2].imageUrl} 
                                  alt={`Right - ${archetypeCardsMap[archetype.id][2].name}`}
                                  fill
                                  sizes="(max-width: 768px) 33vw, 150px"
                                  className="object-cover"
                                  onError={() => {
                                    console.error(`Failed to load image: ${archetypeCardsMap[archetype.id][2].imageUrl}`);
                                  }}
                                  unoptimized={true}
                                />
                              </div>
                            </Link>
                          ) : (
                            <div className="h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-2 text-center">
                              <span className="text-sm font-medium dark:text-white">
                                {archetypeCardsMap[archetype.id]?.[2]?.name || 'No Card'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No cards found for this archetype.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* More Details button */}
                  <Link href={`/archetypes/${archetype.id}`}>
                    <button
                      className="mt-4 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full font-medium shadow-sm"
                    >
                      More Details
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {archetypes.length === 0 && !loading && !error && (
          <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-12">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No archetypes found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">The cube administrator has not defined any archetypes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
