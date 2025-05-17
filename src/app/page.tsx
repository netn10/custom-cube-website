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
  const [colorFilter, setColorFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroCardIndex, setHeroCardIndex] = useState(0);

  useEffect(() => {
    // Function to fetch archetypes and random cards data
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
  
  // Filter archetypes based on selected color
  const filteredArchetypes = archetypes.filter(archetype => {
    if (!colorFilter) return true;
    if (colorFilter === 'multi') {
      return archetype.colors.length > 1;
    }
    return archetype.colors.includes(colorFilter);
  });

  // Rotate hero cards every 5 seconds
  useEffect(() => {
    if (archetypeCards.length > 0) {
      const interval = setInterval(() => {
        setHeroCardIndex(prev => (prev + 1) % archetypeCards.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [archetypeCards]);

  return (
    <div className="space-y-12">
      {/* Hero Section with Animated Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          {archetypeCards.length > 0 && archetypeCards[heroCardIndex]?.imageUrl && (
            <div className="w-full h-full blur-sm scale-110 bg-center bg-cover transition-all duration-1000 ease-in-out"
                 style={{ backgroundImage: `url(${archetypeCards[heroCardIndex].imageUrl})` }}>
            </div>
          )}
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

      {/* Archetypes Section with Interactive Filtering and Card Display */}
      <section id="archetypes" className="px-4 py-12 bg-gradient-to-b from-gray-900 to-black">
        <h2 className="text-4xl font-bold mb-8 text-center text-white">
          <span className="relative inline-block">
            <span className="relative z-10">Explore The Archetypes</span>
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-mtg-blue to-mtg-red"></span>
          </span>
        </h2>
        
        {/* Filter Controls */}
        <div className="max-w-6xl mx-auto mb-8 p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-gray-800">
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={() => setSelectedArchetype(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedArchetype === null ? 'bg-mtg-gold text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              All Archetypes
            </button>
            <button 
              onClick={() => setColorFilter(colorFilter === '' ? '' : '')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${colorFilter === '' ? 'bg-mtg-gold text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              All Colors
            </button>
            <button 
              onClick={() => setColorFilter('W')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'W' ? 'bg-mtg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-mtg-white inline-block"></span>
              White
            </button>
            <button 
              onClick={() => setColorFilter('U')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'U' ? 'bg-mtg-blue text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-mtg-blue inline-block"></span>
              Blue
            </button>
            <button 
              onClick={() => setColorFilter('B')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'B' ? 'bg-mtg-black text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-mtg-black inline-block"></span>
              Black
            </button>
            <button 
              onClick={() => setColorFilter('R')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'R' ? 'bg-mtg-red text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-mtg-red inline-block"></span>
              Red
            </button>
            <button 
              onClick={() => setColorFilter('G')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'G' ? 'bg-mtg-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-mtg-green inline-block"></span>
              Green
            </button>
            <button 
              onClick={() => setColorFilter('multi')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${colorFilter === 'multi' ? 'bg-mtg-gold text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-r from-mtg-red via-mtg-green to-mtg-blue inline-block"></span>
              Multicolor
            </button>
          </div>
        </div>
        
        {/* Interactive Color Wheel and Cube Stats */}
        <div className="max-w-6xl mx-auto mb-16 grid md:grid-cols-2 gap-8 items-center">
          {/* Color Wheel Visualization */}
          <div className="relative aspect-square max-w-md mx-auto p-8">
            <div className="absolute inset-0 rounded-full bg-gray-800 shadow-xl"></div>
            
            {/* White */}
            <div className="absolute w-1/3 h-1/3 top-[5%] left-1/2 -translate-x-1/2 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-mtg-white flex items-center justify-center shadow-lg hover:shadow-white/30">
                <span className="text-black font-bold text-xl">W</span>
              </div>
            </div>
            
            {/* Blue */}
            <div className="absolute w-1/3 h-1/3 top-1/2 right-[5%] -translate-y-1/2 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-mtg-blue flex items-center justify-center shadow-lg hover:shadow-blue/30">
                <span className="text-white font-bold text-xl">U</span>
              </div>
            </div>
            
            {/* Black */}
            <div className="absolute w-1/3 h-1/3 bottom-[10%] right-[20%] flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-mtg-black flex items-center justify-center shadow-lg hover:shadow-white/30">
                <span className="text-white font-bold text-xl">B</span>
              </div>
            </div>
            
            {/* Red */}
            <div className="absolute w-1/3 h-1/3 bottom-[10%] left-[20%] flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-mtg-red flex items-center justify-center shadow-lg hover:shadow-red/30">
                <span className="text-white font-bold text-xl">R</span>
              </div>
            </div>
            
            {/* Green */}
            <div className="absolute w-1/3 h-1/3 top-1/2 left-[5%] -translate-y-1/2 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-mtg-green flex items-center justify-center shadow-lg hover:shadow-green/30">
                <span className="text-white font-bold text-xl">G</span>
              </div>
            </div>
            
            {/* Center - Colorless */}
            <div className="absolute w-1/4 h-1/4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-mtg-colorless flex items-center justify-center shadow-lg hover:shadow-white/30">
                <span className="text-black font-bold text-xl">C</span>
              </div>
            </div>
            
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <line x1="50" y1="15" x2="80" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="80" y1="50" x2="70" y2="80" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="70" y1="80" x2="30" y2="80" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="30" y1="80" x2="20" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="20" y1="50" x2="50" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              
              <line x1="50" y1="15" x2="50" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="80" y1="50" x2="50" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="70" y1="80" x2="50" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="30" y1="80" x2="50" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="20" y1="50" x2="50" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </svg>
          </div>
          
          {/* Cube Statistics */}
          <div className="text-white space-y-6">
            <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-mtg-white via-mtg-red to-mtg-blue">
              Cube Statistics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 transform hover:scale-105 transition-all">
                <div className="text-4xl font-bold mb-2 text-mtg-white">360</div>
                <div className="text-gray-400">Total Cards</div>
              </div>
              
              <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 transform hover:scale-105 transition-all">
                <div className="text-4xl font-bold mb-2 text-mtg-blue">10</div>
                <div className="text-gray-400">Archetypes</div>
              </div>
              
              <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 transform hover:scale-105 transition-all">
                <div className="text-4xl font-bold mb-2 text-mtg-red">60%</div>
                <div className="text-gray-400">Custom Cards</div>
              </div>
              
              <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 transform hover:scale-105 transition-all">
                <div className="text-4xl font-bold mb-2 text-mtg-green">8</div>
                <div className="text-gray-400">Players</div>
              </div>
            </div>
            
            <div className="bg-black/40 p-6 rounded-lg border border-gray-800">
              <h4 className="text-xl font-bold mb-3 text-mtg-gold">Design Philosophy</h4>
              <p className="text-gray-300 mb-3">
                This cube focuses on creating unique gameplay experiences that aren't well-represented in standard Magic formats.
                Each archetype has been carefully crafted to provide distinct strategic paths while maintaining overall balance.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-mtg-blue/20 text-blue-300 rounded-full text-sm">Synergy-Driven</span>
                <span className="px-3 py-1 bg-mtg-red/20 text-red-300 rounded-full text-sm">Interactive</span>
                <span className="px-3 py-1 bg-mtg-green/20 text-green-300 rounded-full text-sm">Diverse Strategies</span>
                <span className="px-3 py-1 bg-mtg-white/20 text-gray-300 rounded-full text-sm">Balanced Power</span>
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-mtg-blue"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-l-2 border-r-2 border-mtg-red absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-900/20 rounded-lg">
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
                      const processedCards = randomCardsData.map(card => {
                        return {
                          ...card,
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
                fetchAgain();
              }}
              className="mt-4 px-6 py-2 bg-mtg-red text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArchetypes.map((archetype) => {
              // Find the card for this archetype by matching with the card's archetypes array
              let randomCard = archetypeCards.find(card => 
                card && card.archetypes && Array.isArray(card.archetypes) && card.archetypes.includes(archetype.id)
              );
              
              // If no card or no image found, use appropriate fallback
              if (!randomCard || !randomCard.imageUrl) {
                // First, try to find any card with the same colors as the archetype
                const archetypeColors = archetype.colors;
                let fallbackCard = archetypeCards.find(card => 
                  card && card.imageUrl && card.colors && 
                  archetypeColors.every(color => card.colors.includes(color)) &&
                  card.colors.length === archetypeColors.length
                );
                
                // If that fails, just find any card with at least one matching color
                if (!fallbackCard) {
                  fallbackCard = archetypeCards.find(card => 
                    card && card.imageUrl && card.colors && 
                    archetypeColors.some(color => card.colors.includes(color))
                  );
                }
                
                // If all else fails, just use any card that has an image
                if (!fallbackCard) {
                  fallbackCard = archetypeCards.find(card => card && card.imageUrl);
                }
                
                // Use the fallback or create a minimal placeholder
                if (fallbackCard) {
                  randomCard = {
                    ...fallbackCard,
                    archetypes: [archetype.id]
                  };
                } else {
                  // Create a basic placeholder - we shouldn't get here if there are any cards with images
                  randomCard = {
                    ...randomCard || {},
                    name: randomCard?.name || `${archetype.name} Card`,
                    imageUrl: `/placeholder-${archetype.colors.join('')}.jpg`,
                    archetypes: [archetype.id]
                  };
                }
              }
              
              return (
                <div 
                  key={archetype.id}
                  className={`relative group overflow-hidden rounded-xl transition-all duration-500 
                    ${selectedArchetype === archetype.id ? 'ring-4 ring-mtg-gold' : ''}
                    dark:bg-gray-800/80 bg-white/90 backdrop-blur-sm transform hover:scale-105 hover:shadow-2xl cursor-pointer`}
                  onClick={() => setSelectedArchetype(selectedArchetype === archetype.id ? null : archetype.id)}
                >
                  {/* Card background with parallax effect */}
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-center bg-cover transform group-hover:scale-110 transition-transform duration-1000"
                       style={{ backgroundImage: `url(${randomCard.imageUrl})` }}>
                  </div>
                  
                  <div className="p-6 relative z-10">
                    {/* Archetype badge - number of cards */}
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {archetype.colors.map((color) => (
                        <span key={color} className={`inline-block w-4 h-4 rounded-full mr-1 ${colorMap[color]}`}></span>
                      ))}
                    </div>
                    <div className="flex items-center mb-4">
                      <h3 className="text-2xl font-bold mr-4 dark:text-white group-hover:text-mtg-gold transition-colors duration-300">
                        {archetype.name}
                      </h3>
                      <div className="flex space-x-1">
                        {archetype.colors.map((color) => (
                          <span 
                            key={color} 
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transform group-hover:scale-110 transition-transform ${colorMap[color]}`}
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="dark:text-gray-300 mb-6 line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                      {archetype.description}
                    </p>
                    
                    <div className="flex justify-between items-end">
                      {randomCard ? (
                        <div className="relative w-1/2 aspect-[2.5/3.5] overflow-hidden rounded-lg shadow-lg transform transition-transform duration-500 group-hover:scale-105">
                          {randomCard.imageUrl ? (
                            <img 
                              src={randomCard.imageUrl}
                              alt={randomCard.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Error loading image:', randomCard.imageUrl);
                                
                                // Try a color-based fallback image
                                if (archetype.colors && archetype.colors.length > 0) {
                                  const colorCombo = archetype.colors.join('');
                                  const colorMap = {
                                    'W': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Plains',
                                    'U': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Island',
                                    'B': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Swamp',
                                    'R': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Mountain',
                                    'G': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Forest',
                                    'WU': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430504',
                                    'UB': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430506',
                                    'BR': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430507',
                                    'RG': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430502',
                                    'GW': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430500',
                                    'WB': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430501',
                                    'UR': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430503',
                                    'BG': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430505',
                                    'RW': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430508',
                                    'GU': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=430509'
                                  };
                                  
                                  // Try to find a matching color combination or use the first color
                                  if (colorMap[colorCombo]) {
                                    e.currentTarget.src = colorMap[colorCombo];
                                  } else if (colorMap[archetype.colors[0]]) {
                                    e.currentTarget.src = colorMap[archetype.colors[0]];
                                  } else {
                                    e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3E${archetype.name}%3C%2Ftext%3E%3C%2Fsvg%3E';
                                  }
                                } else {
                                  e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3E${archetype.name}%3C%2Ftext%3E%3C%2Fsvg%3E';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400">No image</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-1/2 aspect-[2.5/3.5] rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <p className="text-center text-gray-500 dark:text-gray-400">No card</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2">
                        <Link 
                          href={`/archetypes/${archetype.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-mtg-blue to-mtg-red text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Details
                        </Link>
                        {selectedArchetype === archetype.id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/archetypes/${archetype.id}`, '_blank');
                            }}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg shadow hover:bg-gray-600 transition-all duration-300 text-center text-sm flex items-center justify-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open in New Tab
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
