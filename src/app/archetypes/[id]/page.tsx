'use client';

import React from 'react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const cardsPerPage = 50;

  useEffect(() => {
    if (params.id) {
      const archetypeId = params.id as string;
      
      const fetchData = async () => {
        try {
          setLoading(true);
          // Fetch archetype data
          const archetypeData = await getArchetypeById(archetypeId);
          setArchetype(archetypeData);
          
          // Fetch cards for this archetype with pagination
          const cardsData = await getArchetypeCards(archetypeId, currentPage, cardsPerPage);
          setCards(cardsData.cards);
          setTotalCards(cardsData.total);
          
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
  }, [params.id, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <div className="flex justify-center items-center mb-4">
          <p className="dark:text-gray-300">Showing {cards.length} of {totalCards}</p>
        </div>
        <div className="mtg-card-grid">
          {cards.map(card => (
            <Link href={`/card/${encodeURIComponent(card.name)}`} key={card.id}>
              <div className="mtg-card card-hover">
                {card.imageUrl ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <img 
                      src={card.imageUrl}
                      alt={card.name}
                      className="mtg-card-image"
                      onError={(e) => {
                        console.error('Error loading image:', card.imageUrl);
                        e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                      <h3 className="font-bold text-white text-sm truncate">{card.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex space-x-1">
                          {card.colors.map((color: string) => {
                            const colorClasses: Record<string, string> = {
                              W: 'bg-mtg-white text-black',
                              U: 'bg-mtg-blue text-white',
                              B: 'bg-mtg-black text-black',
                              R: 'bg-mtg-red text-white',
                              G: 'bg-mtg-green text-white',
                            };
                            
                            return (
                              <span 
                                key={color} 
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${colorClasses[color]}`}
                              >
                                {color}
                              </span>
                            );
                          })}
                        </div>
                        {card.custom && (
                          <span className="text-xs px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">No Image</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        
        {/* Pagination controls */}
        {totalCards > cardsPerPage && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.ceil(totalCards / cardsPerPage) }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === Math.ceil(totalCards / cardsPerPage) || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => {
                    // Add ellipsis if there are gaps in the sequence
                    if (index > 0 && page - array[index - 1] > 1) {
                      return (
                        <React.Fragment key={`ellipsis-${page}`}>
                          <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-8 h-8 flex items-center justify-center rounded ${
                              currentPage === page
                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded ${
                          currentPage === page
                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCards / cardsPerPage)}
                className={`px-3 py-1 rounded ${
                  currentPage >= Math.ceil(totalCards / cardsPerPage)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
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
