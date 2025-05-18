'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCubeStatistics } from '@/lib/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    totalCards: 0,
    totalArchetypes: 0,
    customCardPercentage: 0,
    recommendedPlayers: 0
  });

  useEffect(() => {
    // Function to fetch cube statistics
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch cube statistics
        const statsData = await getCubeStatistics();
        if (statsData) {
          setStatistics(statsData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section with Animated Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 bg-gradient-to-r from-mtg-blue via-mtg-red to-mtg-green">
        </div>
        
        <div className="relative z-10 py-20 px-4 bg-gradient-to-r from-black/70 via-transparent to-black/70 text-center">
          <h1 className="text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-mtg-blue via-mtg-red to-mtg-green">
            Custom MTG Cube
          </h1>
          
          <p className="text-xl max-w-3xl mx-auto mb-8 text-white drop-shadow-lg">
            A 360-card cube featuring mostly custom cards with "weird" archetypes. Discover unique gameplay experiences 
            that push the boundaries of traditional Magic.
          </p>
          
          <div className="flex justify-center gap-4 mt-8">
            <Link href="/cube-list" className="px-6 py-3 bg-mtg-blue text-white rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 font-bold">
              Browse Cards
            </Link>
            <Link 
              href="#archetypes" 
              className="px-6 py-3 bg-mtg-red text-white rounded-lg shadow-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 font-bold"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('archetypes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore The Archetypes
            </Link>
          </div>
          
          {/* Floating cards animation */}
          <div className="mt-12 relative h-48">
            {archetypeCards.slice(0, 5).map((card, index) => (
              card?.imageUrl && (
                <div 
                  key={index}
                  className="absolute mtg-card transform transition-all duration-500 hover:scale-110 hover:z-50 shadow-2xl"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${index % 2 === 0 ? 0 : 10}%`,
                    transform: `rotate(${-10 + index * 5}deg)`,
                    zIndex: index,
                    animation: `float${index % 3 + 1} ${3 + index}s ease-in-out infinite`
                  }}
                >
                  <img 
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-full rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                    }}
                  />
                </div>
              )
            ))}
          </div>
        </div>
      </section>
        
      {/* Displayed content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-mtg-blue"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-l-2 border-r-2 border-mtg-red absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-red-900/20 rounded-lg max-w-5xl mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xl text-red-400">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              // Fetch data again
              const fetchAgain = async () => {
                try {
                  // Fetch featured cards for the hero section
                  const randomCardsData = await getRandomArchetypeCards();
                  
                  if (Array.isArray(randomCardsData)) {
                    // Process the cards to ensure they have valid imageUrl
                    const processedCards = randomCardsData.map(card => {
                      return {
                        ...card,
                        // Ensure valid imageUrl 
                        imageUrl: card.imageUrl && card.imageUrl.trim() !== '' ? card.imageUrl : 'https://i.imgur.com/MNDyDPT.png'
                      };
                    });
                    setArchetypeCards(processedCards);
                  } else {
                    console.error('Unexpected response format:', randomCardsData);
                    // Provide fallback cards if the API call fails
                    setArchetypeCards([
                      {
                        name: 'Example Card 1',
                        imageUrl: 'https://i.imgur.com/MNDyDPT.png'
                      },
                      {
                        name: 'Example Card 2',
                        imageUrl: 'https://i.imgur.com/KwNKcbO.png'
                      },
                      {
                        name: 'Example Card 3',
                        imageUrl: 'https://i.imgur.com/fVuTogB.png'
                      }
                    ]);
                  }
                  
                  // Fetch cube statistics
                  const statsData = await getCubeStatistics();
                  setStatistics(statsData);
                  
                  setError(null);
                } catch (err) {
                  console.error('Error fetching data:', err);
                  setError('Failed to load data. Please try again later.');
                } finally {
                  setLoading(false);
                }
              };
              fetchAgain();
            }}
            className="mt-4 px-6 py-2 bg-mtg-red text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
          <div className="p-8 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-white">Welcome to the Custom MTG Cube</h2>
            <p className="text-lg mb-6 text-gray-300">
              This custom cube features unique and creative Magic: The Gathering cards designed specifically for a unique drafting experience.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/cube-list" className="px-6 py-3 bg-mtg-blue text-white rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 font-bold">
                Browse All Cards
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* About Section with Improved Design */}
      <section className="relative px-4 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-mtg-black/80 via-transparent to-mtg-blue/30 z-0"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold mb-8 text-center text-white">
            <span className="relative inline-block">
              <span className="relative z-10">About This Cube</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-mtg-red to-mtg-green"></span>
            </span>
          </h2>
          
          <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-800">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 text-gray-200">
                <p className="text-lg leading-relaxed">
                  This is a journey through Magic, with many "what ifs," references, nostalgia, and surprises. 
                  The cube is designed to be drafted with 8 players, but works well with any number.
                </p>
                <p className="text-lg leading-relaxed">
                  The cube contains 360 cards, with a focus on synergy over raw power. Each color pair has a distinct 
                  archetype that plays differently from traditional Magic.
                </p>
                <div className="pt-4">
                  <Link 
                    href="/cube-list"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-mtg-green to-mtg-blue text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <span>Browse All Cards</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="relative">
                <div className="grid grid-cols-2 gap-4 transform rotate-3">
                  {archetypeCards.slice(0, 4).map((card, index) => (
                    card?.imageUrl && (
                      <div 
                        key={index} 
                        className="mtg-card overflow-hidden rounded-lg shadow-xl transform hover:rotate-0 hover:scale-105 transition-all duration-300"
                        style={{ transform: `rotate(${(index % 2 === 0 ? -5 : 5)}deg)` }}
                      >
                        <img 
                          src={card.imageUrl}
                          alt={card.name || 'MTG Card'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add floating animation keyframes */}
      <style jsx>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(0deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px) rotate(5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
      `}</style>
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
