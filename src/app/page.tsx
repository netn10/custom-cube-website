'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getArchetypes, getRandomArchetypeCards } from '@/lib/api';
import { Archetype } from '@/types/types';
import Image from 'next/image';

// Color mapping for visual representation
const colorMap: Record<string, string> = {
  W: 'bg-mtg-white text-black',
  U: 'bg-mtg-blue text-white',
  B: 'bg-mtg-black text-white',
  R: 'bg-mtg-red text-white',
  G: 'bg-mtg-green text-white',
};

export default function Home() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [archetypeCards, setArchetypeCards] = useState<any[]>([]);
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch archetypes
        const archetypesData = await getArchetypes();
        
        // Make sure we're using the string ID from the API
        const processedArchetypes = archetypesData.map(archetype => ({
          ...archetype,
          // Ensure we're using the string ID, not the MongoDB ObjectID
          id: archetype.id
        }));
        
        setArchetypes(processedArchetypes);
        
        // Fetch random cards
        const randomCardsData = await getRandomArchetypeCards();
        
        if (Array.isArray(randomCardsData)) {
          // Make sure each card has the correct structure
          const processedCards = randomCardsData.map(card => {
            // Ensure card has all required properties
            return {
              ...card,
              // Make sure archetypes is an array
              archetypes: card.archetypes || []
            };
          });
          setArchetypeCards(processedCards);
        } else {
          console.error('Unexpected response format:', randomCardsData);
          setArchetypeCards([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Custom MTG Cube</h1>
        <p className="text-lg max-w-3xl mx-auto dark:text-gray-300">
          A 360-card cube featuring mostly custom cards with "weird" archetypes. The custom cards represent archetypes that aren't well-defined in "real" Magic, while the "reprints" are the simple, tried-and-true staples.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6 text-center dark:text-white">Archetypes</h2>
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archetypes.map((archetype) => {
              // Find the card for this archetype by matching with the card's archetypes array
              const randomCard = archetypeCards.find(card => 
                card && card.archetypes && Array.isArray(card.archetypes) && card.archetypes.includes(archetype.id)
              );
              
              return (
                <div 
                  key={archetype.id}
                  className={`p-6 rounded-lg shadow-md transition-all duration-300 cursor-pointer 
                    ${selectedArchetype === archetype.id ? 'ring-4 ring-blue-500' : ''}
                    dark:bg-gray-800 bg-white`}
                  onClick={() => setSelectedArchetype(archetype.id === selectedArchetype ? null : archetype.id)}
                >
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-bold mr-4 dark:text-white">{archetype.name}</h3>
                    <div className="flex space-x-1">
                      {archetype.colors.map((color) => (
                        <span 
                          key={color} 
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorMap[color]}`}
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p className="dark:text-gray-300 mb-4">{archetype.description}</p>
                  
                  {randomCard ? (
                    <div className={`p-4 rounded-lg mb-4 ${getCardColorClasses(randomCard.colors || [])} bg-opacity-20 dark:bg-opacity-30`}>
                      <div className="text-center">
                        <p className="text-sm dark:text-gray-300 mb-2">Card Image URL:</p>
                        <p className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-auto">
                          {randomCard.imageUrl || 'No image available'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg mb-4 bg-gray-200 dark:bg-gray-700">
                      <p className="text-center text-gray-500 dark:text-gray-400">No card available</p>
                    </div>
                  )}
                  
                  {selectedArchetype === archetype.id && (
                    <div className="mt-4">
                      <Link 
                        href={`/archetypes/${archetype.id}`}
                        className="btn-primary inline-block mt-2"
                      >
                        View Details
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-3xl mx-auto bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">About This Cube</h2>
        <div className="space-y-4 dark:text-gray-300">
          <p>
            This is a journey through Magic, with many "what ifs," references, nostalgia, and surprises. 
            The cube is designed to be drafted with 8 players, but works well with any number.
          </p>
          <p>
            The cube contains 360 cards, with a focus on synergy over raw power. Each color pair has a distinct 
            archetype that plays differently from traditional Magic.
          </p>
        </div>
      </section>
    </div>
  );
}

// Helper function to get color classes for cards
function getCardColorClasses(colors: string[]) {
  if (!colors || colors.length === 0) return 'bg-gray-300 dark:bg-gray-700';
  
  const colorClasses: Record<string, string> = {
    W: 'bg-mtg-white text-black',
    U: 'bg-mtg-blue text-white',
    B: 'bg-mtg-black text-white',
    R: 'bg-mtg-red text-white',
    G: 'bg-mtg-green text-white',
  };
  
  if (colors.length === 1) {
    return colorClasses[colors[0]];
  } else {
    // For multicolor cards
    return 'bg-mtg-gold text-black';
  }
}
