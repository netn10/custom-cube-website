'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getArchetypeById, getArchetypeCards } from '@/lib/api';
import { Archetype, Card } from '@/types/types';

export default function ArchetypePage() {
  const params = useParams();
  const router = useRouter();
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      const archetypeId = params.id as string;
      
      const fetchData = async () => {
        try {
          setLoading(true);
          // Fetch archetype data
          const archetypeData = await getArchetypeById(archetypeId);
          setArchetype(archetypeData);
          
          // Fetch cards for this archetype
          const cardsData = await getArchetypeCards(archetypeId);
          setCards(cardsData);
          
          setError(null);
        } catch (err) {
          console.error('Error fetching archetype data:', err);
          setError('Failed to load archetype data. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
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
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Error Loading Archetype</h2>
        <p className="mb-6 dark:text-gray-300">{error}</p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!archetype) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Archetype Not Found</h2>
        <p className="mb-6 dark:text-gray-300">The archetype you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="btn-primary">
          Back to Home
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

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold mr-4 dark:text-white">{archetype.name} Archetype</h1>
          <div className="flex space-x-1">
            {archetype.colors.map((color: string) => (
              <span 
                key={color} 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorMap[color]}`}
              >
                {color}
              </span>
            ))}
          </div>
        </div>
        
        <p className="text-lg mb-6 dark:text-gray-300">{archetype.description}</p>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-3 dark:text-white">Strategy Guide</h2>
          <p className="dark:text-gray-300">
            The {archetype.name} archetype focuses on {archetype.description.toLowerCase()} 
            This archetype is primarily in {archetype.colors.join('/')} colors and works well with cards that synergize with its main strategy.
          </p>
          <p className="mt-3 dark:text-gray-300">
            When drafting this archetype, prioritize cards that support the core mechanics and look for enablers that can trigger your payoffs consistently.
          </p>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Key Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <Link href={`/card/${card.id}`} key={card.id}>
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md card-hover">
                <div className="h-40 bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Card Image</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold dark:text-white">{card.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex space-x-1">
                      {card.colors.map((color: string) => (
                        <span 
                          key={color} 
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${colorMap[color]}`}
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{card.manaCost}</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{card.type}</span>
                    {card.custom && (
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Tips for Playing {archetype.name}</h2>
        <ul className="list-disc pl-5 space-y-2 dark:text-gray-300">
          <li>Focus on building a strong core of {archetype.name.toLowerCase()} enablers before adding payoffs.</li>
          <li>Don't forget to include some interaction - removal and counterspells are still important.</li>
          <li>Balance your mana curve to ensure you can play your key cards on time.</li>
          <li>Look for synergies with other archetypes that share colors with {archetype.name}.</li>
          <li>Be mindful of your mana requirements, especially if you're splashing a third color.</li>
        </ul>
      </div>
    </div>
  );
}
