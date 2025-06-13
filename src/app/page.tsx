'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getArchetypes, getRandomArchetypeCards, getRandomPack } from '@/lib/api';
import { Archetype, Card } from '@/types/types';
import RelatedFaceCard from '@/components/RelatedFaceCard';

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
  const [randomCubeCards, setRandomCubeCards] = useState<Card[]>([]);
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroCardIndex, setHeroCardIndex] = useState(0);
  const [boosterCards, setBoosterCards] = useState<Card[]>([]);
  const [isBoosterOpened, setIsBoosterOpened] = useState(false);
  const [isBoosterOpening, setIsBoosterOpening] = useState(false);
  const [statistics, setStatistics] = useState({
    totalCards: 0,
    totalArchetypes: 0,
    customCardPercentage: 0,
    recommendedPlayers: 0
  });

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
        
        // Fetch random cards for archetypes
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
        
        // Fetch random cards from the entire cube for the bottom section
        try {
          const randomCubeData = await getRandomPack(8); // Get 8 random cards from the cube
          if (randomCubeData && randomCubeData.pack) {
            setRandomCubeCards(randomCubeData.pack);
          }
        } catch (err) {
          console.error('Error fetching random cube cards:', err);
          setRandomCubeCards([]);
        }
        
        // Booster cards will be fetched on demand when the pack is clicked
        
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
  
  // Function to handle booster pack opening
  const handleOpenBooster = async () => {
    if (!isBoosterOpening && !isBoosterOpened) {
      try {
        // Fetch the booster cards immediately when clicking, before animation starts
        if (boosterCards.length === 0) {
          const randomPackData = await getRandomPack(15);
          if (randomPackData && randomPackData.pack) {
            // Process the cards
            const processedPack = randomPackData.pack.map(card => ({
              ...card,
              id: card.id || card._id || `card-${Math.random().toString(36).substr(2, 9)}`,
              _id: card._id || card.id || `card-${Math.random().toString(36).substr(2, 9)}`
            }));
            
            // Ensure exactly 15 cards
            const fullPack = [...processedPack];
            while (fullPack.length < 15) {
              fullPack.push({
                id: `placeholder-${fullPack.length}`,
                _id: `placeholder-${fullPack.length}`,
                name: 'Mystery Card',
                manaCost: '{?}',
                type: 'Card',
                rarity: 'Common',
                text: 'This card is a mystery.',
                colors: [],
                custom: true,
                archetypes: []
              });
            }
            
            setBoosterCards(fullPack.slice(0, 15));
          }
        }
        
        // Start the animation
        setIsBoosterOpening(true);
        
        // After animation completes, set the booster as opened
        setTimeout(() => {
          setIsBoosterOpened(true);
          setIsBoosterOpening(false);
          
          // Let the booster cards simply reveal in place without forcing a scroll
          // This avoids the issue on mobile where content gets pushed up
          setTimeout(() => {
            // No automatic scrolling - cards will appear in place
            // This provides a better user experience, especially on mobile
          }, 300);
        }, 2000); // Increased duration to match the realistic pack opening animation
      } catch (error) {
        console.error('Error fetching booster cards:', error);
      }
    }
  };
  
  // Sort archetypes by the color wheel order (WU, UB, BR, RG, GW, WB, BG, GU, UR, RW)
  const colorWheelOrder = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'BG', 'GU', 'UR', 'RW'];
  
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
  
  // Filter archetypes based on selected color
  const filteredArchetypes = sortedArchetypes.filter(archetype => {
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
        
        <div className="relative z-10 py-20 px-4 bg-gradient-to-r from-gray-100/80 via-transparent to-gray-100/80 dark:from-black/70 dark:via-transparent dark:to-black/70 text-center">
          <h1 className="text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-mtg-blue via-mtg-red to-mtg-green">
            Welcome to the Weird Side of Magic: The Gathering
          </h1>
          
          <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-800 dark:text-white drop-shadow-lg">
            Here, we redefine what Magic: The Gathering is, and what it could be.
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
          
          {/* Booster pack opening animation */}
          <div className="mt-12 relative">
            {!isBoosterOpening && !isBoosterOpened ? (
              <div 
                className="relative mx-auto w-80 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-2xl perspective-1000"
                style={{ height: '400px' }}
                onClick={handleOpenBooster}
              >
                {/* MTG Booster Pack */}
                <div className="relative w-full h-full">
                  {/* Main booster pack */}
                  <div className="absolute inset-0 bg-gray-800 dark:bg-black rounded-lg overflow-hidden border-4 border-mtg-gold shadow-[0_0_15px_5px_rgba(255,215,0,0.3)]">
                    {/* Pack background with MTG style */}
                    <div className="absolute inset-0 bg-gradient-to-br from-mtg-red via-mtg-blue to-mtg-green opacity-80"></div>
                    
                    {/* Metallic foil effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{
                        backgroundSize: '200% 100%',
                        animation: 'packShine 3s linear infinite'
                      }}
                    ></div>
                    
                    {/* Pack artwork and design */}
                    <div className="absolute inset-0 flex flex-col items-center justify-between p-4">
                      {/* Top logo area */}
                      <div className="w-full bg-gray-900/60 dark:bg-black/60 rounded-lg p-2 border-b-2 border-mtg-gold">
                        <div className="text-mtg-gold font-extrabold text-3xl text-center drop-shadow-lg tracking-wider">Certified Chaos Within</div>
                      </div>
                      
                      {/* Center artwork */}
                      <div className="relative w-full h-64 flex items-center justify-center my-2 overflow-hidden">
                        {/* Pack artwork background */}
                        <div className="absolute inset-0 bg-gray-700/40 dark:bg-black/40 rounded-lg"></div>
                        
                        {/* Animated background effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-mtg-red/20 via-mtg-blue/20 to-mtg-green/20 animate-[pulse_3s_ease-in-out_infinite]"></div>
                        
                        {/* Cube symbol */}
                        <div className="relative z-10 w-40 h-40 bg-gray-800/60 dark:bg-black/60 rounded-full flex items-center justify-center border-2 border-mtg-gold shadow-[0_0_10px_2px_rgba(255,215,0,0.5)]">
                          <img 
                            src="https://i.imgur.com/hkGysU7.png" 
                            alt="Cube Symbol"
                            className="w-32 h-32 object-contain animate-[pulse_2s_ease-in-out_infinite]"
                          />
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute top-2 left-2 w-16 h-16 rounded-full bg-mtg-red/40 blur-sm animate-[float1_3s_ease-in-out_infinite]"></div>
                        <div className="absolute bottom-2 right-2 w-16 h-16 rounded-full bg-mtg-blue/40 blur-sm animate-[float2_4s_ease-in-out_infinite]"></div>
                        <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-mtg-green/40 blur-sm animate-[float3_3.5s_ease-in-out_infinite]"></div>
                      </div>
                      
                      {/* Bottom info area */}
                      <div className="w-full bg-gray-900/60 dark:bg-black/60 rounded-lg p-2 border-t-2 border-mtg-gold flex flex-col items-center">
                        <div className="text-white text-sm font-bold">15 RANDOM CARDS</div>
                        <div className="text-mtg-gold text-lg mt-1 animate-pulse font-bold">CLICK TO OPEN!!!!</div>
                      </div>
                    </div>
                    
                    {/* Corner decorations */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-mtg-gold/70 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-mtg-gold/70 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-mtg-gold/70 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-mtg-gold/70 rounded-br-lg"></div>
                  </div>
                  
                  {/* 3D effect shadows */}
                  <div className="absolute -inset-2 bg-black/50 -z-10 rounded-lg blur-md"></div>
                </div>
              </div>
            ) : isBoosterOpening ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Dark overlay with magical background */}
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm">
                  {/* Animated magical background */}
                  <div className="absolute inset-0 overflow-hidden">
                    {/* Magical energy waves */}
                    <div className="absolute inset-0 bg-gradient-to-r from-mtg-red/10 via-mtg-blue/10 to-mtg-green/10 animate-[pulse_4s_ease-in-out_infinite]"></div>
                    
                    {/* Magical circles */}
                    <div className="absolute left-1/2 top-1/2 w-[200vw] h-[200vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-8 border-mtg-gold/10 animate-[spin_60s_linear_infinite]"></div>
                    <div className="absolute left-1/2 top-1/2 w-[150vw] h-[150vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-mtg-blue/10 animate-[spin_40s_linear_infinite_reverse]"></div>
                    <div className="absolute left-1/2 top-1/2 w-[100vw] h-[100vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-mtg-red/10 animate-[spin_20s_linear_infinite]"></div>
                    
                    {/* Magical particles */}
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i}
                        className={`absolute rounded-full ${i % 5 === 0 ? 'bg-mtg-red/60' : i % 5 === 1 ? 'bg-mtg-blue/60' : i % 5 === 2 ? 'bg-mtg-green/60' : i % 5 === 3 ? 'bg-mtg-gold/60' : 'bg-white/60'}`}
                        style={{
                          width: `${3 + Math.random() * 6}px`,
                          height: `${3 + Math.random() * 6}px`,
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animation: `float${(i % 3) + 1} ${3 + Math.random() * 5}s ease-in-out infinite`,
                          opacity: 0.2 + Math.random() * 0.6,
                          filter: `blur(${Math.random() * 2}px)`,
                          boxShadow: `0 0 ${5 + Math.random() * 10}px ${i % 5 === 0 ? 'rgba(255,50,50,0.8)' : i % 5 === 1 ? 'rgba(50,50,255,0.8)' : i % 5 === 2 ? 'rgba(50,255,50,0.8)' : i % 5 === 3 ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.8)'}`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                
                {/* Main animation container */}
                <div className="relative w-96 h-[500px] perspective-1000">
                  {/* Initial pack shake animation */}
                  <div 
                    className="absolute inset-0 animate-[shake_0.8s_ease-in-out]"
                    style={{ animationIterationCount: 4, animationDelay: '0.2s' }}
                  >
                    {/* 3D Booster Pack */}
                    <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                      {/* Main pack body - starts as a closed pack */}
                      <div 
                        className="absolute inset-0 bg-black rounded-lg overflow-hidden border-4 border-mtg-gold"
                        style={{ 
                          boxShadow: '0 0 30px 10px rgba(255, 215, 0, 0.4)',
                          animation: 'packGlow 1s ease-in-out infinite',
                        }}
                      >
                        {/* Pack background with MTG style */}
                        <div className="absolute inset-0 bg-gradient-to-br from-mtg-red via-mtg-blue to-mtg-green opacity-80"></div>
                        
                        {/* Pack artwork and design */}
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-4">
                          {/* Pack title */}
                          <div className="w-full bg-black/60 rounded-lg p-2 border-b-2 border-mtg-gold">
                            <div className="text-mtg-gold font-extrabold text-3xl text-center drop-shadow-lg tracking-wider animate-[pulse_1s_ease-in-out_infinite]">CUSTOM CUBE</div>
                          </div>
                        </div>
                        
                        {/* Corner decorations */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-mtg-gold/70 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-mtg-gold/70 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-mtg-gold/70 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-mtg-gold/70 rounded-br-lg"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pack opening animation elements */}
                  <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                    {/* Top flap with tearing effect */}
                    <div 
                      className="absolute w-full h-1/4 bg-gradient-to-r from-mtg-red via-mtg-gold to-mtg-green rounded-t-lg shadow-lg overflow-hidden"
                      style={{ 
                        top: 0,
                        animation: 'packTopOpen 1s ease-in-out forwards',
                        animationDelay: '1.0s',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        zIndex: 20,
                        boxShadow: '0 0 15px 2px rgba(255, 215, 0, 0.3)',
                        transformOrigin: 'top center'
                      }}
                    >
                      {/* Torn paper effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                      
                      {/* Torn edges */}
                      {[...Array(8)].map((_, i) => (
                        <div 
                          key={`torn-edge-${i}`}
                          className="absolute bottom-0 bg-white/20"
                          style={{
                            left: `${i * 12.5}%`,
                            height: `${5 + Math.random() * 15}px`,
                            width: `${8 + Math.random() * 10}px`,
                            clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
                            opacity: 0.7 + Math.random() * 0.3
                          }}
                        ></div>
                      ))}
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white font-extrabold text-2xl tracking-wider drop-shadow-lg">CUSTOM</div>
                      </div>
                      <div className="absolute inset-0 bg-black/20 rounded-t-lg"></div>
                    </div>
                    
                    {/* Bottom flap */}
                    <div 
                      className="absolute w-full h-1/4 bg-gradient-to-r from-mtg-red via-mtg-gold to-mtg-green rounded-b-lg shadow-lg"
                      style={{ 
                        bottom: 0,
                        animation: 'packBottomOpen 0.8s ease-in-out forwards',
                        animationDelay: '1.2s',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        zIndex: 20,
                        boxShadow: '0 0 15px 2px rgba(255, 215, 0, 0.3)'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white font-extrabold text-2xl tracking-wider drop-shadow-lg">CUBE</div>
                      </div>
                      <div className="absolute inset-0 bg-black/20 rounded-b-lg"></div>
                    </div>
                    
                    {/* Left side flap */}
                    <div 
                      className="absolute h-1/2 w-1/6 bg-gradient-to-r from-mtg-red to-mtg-gold shadow-lg"
                      style={{ 
                        left: 0,
                        top: '25%',
                        animation: 'packSideLeftOpen 0.6s ease-in-out forwards',
                        animationDelay: '1.4s',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        zIndex: 15,
                        boxShadow: '0 0 10px 1px rgba(255, 215, 0, 0.3)'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    
                    {/* Right side flap */}
                    <div 
                      className="absolute h-1/2 w-1/6 bg-gradient-to-l from-mtg-red to-mtg-gold shadow-lg"
                      style={{ 
                        right: 0,
                        top: '25%',
                        animation: 'packSideRightOpen 0.6s ease-in-out forwards',
                        animationDelay: '1.4s',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        zIndex: 15,
                        boxShadow: '0 0 10px 1px rgba(255, 215, 0, 0.3)'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    
                    {/* Enhanced explosion effect when pack opens */}
                    <div 
                      className="absolute left-1/2 top-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden"
                      style={{ 
                        animation: 'packExplosion 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                        animationDelay: '1.4s',
                        zIndex: 25,
                        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,215,0,0.9) 15%, rgba(255,150,0,0.7) 35%, rgba(255,50,0,0.5) 65%, transparent 100%)',
                        boxShadow: '0 0 150px 80px rgba(255, 215, 0, 0.9)',
                        transformOrigin: 'center center'
                      }}
                    >
                      {/* Inner explosion glow */}
                      <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 20%, rgba(255,215,0,0.6) 40%, transparent 70%)',
                          animation: 'packLightBurst 0.8s ease-out forwards',
                          animationDelay: '1.45s',
                        }}
                      ></div>
                    </div>
                    
                    {/* Secondary explosion wave */}
                    <div 
                      className="absolute left-1/2 top-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ 
                        animation: 'packLightBurst 1s ease-out forwards',
                        animationDelay: '1.5s',
                        zIndex: 24,
                        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,100,0,0.8) 30%, rgba(255,0,0,0.6) 60%, transparent 100%)',
                        boxShadow: '0 0 120px 60px rgba(255, 100, 0, 0.9)'
                      }}
                    ></div>
                    
                    {/* Tertiary explosion wave */}
                    <div 
                      className="absolute left-1/2 top-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ 
                        animation: 'packLightBurst 1.2s ease-out forwards',
                        animationDelay: '1.6s',
                        zIndex: 23,
                        background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,165,0,0.7) 40%, rgba(255,69,0,0.5) 70%, transparent 100%)',
                        boxShadow: '0 0 100px 50px rgba(255, 165, 0, 0.8)'
                      }}
                    ></div>
                    
                    {/* Enhanced explosion fragments */}
                    {[...Array(30)].map((_, i) => {
                      const randomX = (Math.random() * 2 - 1) * 400; // -400px to 400px
                      const randomY = (Math.random() * 2 - 1) * 400; // -400px to 400px
                      const randomRotate = Math.random() * 720 - 360; // -360deg to 360deg
                      const randomDelay = 1.4 + Math.random() * 0.3; // 1.4s to 1.7s
                      const randomSize = 6 + Math.random() * 12; // 6px to 18px
                      const randomOpacity = 0.7 + Math.random() * 0.3; // 0.7 to 1.0
                      
                      // More fragment shapes for variety
                      const fragmentShapes = [
                        'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // diamond
                        'polygon(0 0, 100% 0, 100% 100%, 0 100%)', // square
                        'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', // pentagon
                        'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', // hexagon
                        'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)', // octagon
                        'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)', // arrow
                        'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', // star
                        'polygon(40% 0%, 40% 40%, 0% 40%, 0% 60%, 40% 60%, 40% 100%, 60% 100%, 60% 60%, 100% 60%, 100% 40%, 60% 40%, 60% 0%)', // plus
                      ];
                      
                      // More gradient color combinations
                      const fragmentColors = [
                        'linear-gradient(to right, #ff0000, #ff6600)', // red to orange
                        'linear-gradient(to right, #ffd700, #ffaa00)', // gold to amber
                        'linear-gradient(to right, #0066ff, #00ccff)', // blue to cyan
                        'linear-gradient(to right, #00cc00, #66ff66)', // green to light green
                        'linear-gradient(to right, #cc00cc, #ff66ff)', // purple to pink
                        'linear-gradient(to right, #ff3300, #ff9966)', // bright orange
                        'linear-gradient(to right, #ffcc00, #ffff66)', // yellow
                        'linear-gradient(to right, #9900cc, #cc66ff)', // violet
                        'linear-gradient(to right, #ff0066, #ff99cc)', // hot pink
                        'linear-gradient(to right, #00ffcc, #99ffee)', // turquoise
                      ];
                      
                      return (
                        <div 
                          key={i}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ 
                            '--x': `${randomX}px`,
                            '--y': `${randomY}px`,
                            '--r': `${randomRotate}deg`,
                            width: `${randomSize}px`,
                            height: `${randomSize}px`,
                            animation: 'packFragment 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                            animationDelay: `${randomDelay}s`,
                            zIndex: 26,
                            background: fragmentColors[i % fragmentColors.length],
                            clipPath: fragmentShapes[i % fragmentShapes.length],
                            boxShadow: `0 0 ${randomSize/2}px ${randomSize/4}px rgba(255, 255, 255, ${randomOpacity})`,
                            opacity: randomOpacity
                          }}
                        ></div>
                      );
                    })}
                    
                    {/* Enhanced magical light burst when pack opens */}
                    <div 
                      className="absolute left-1/2 top-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                      style={{ 
                        animation: 'packLightBurst 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                        animationDelay: '1.45s',
                        zIndex: 27,
                        boxShadow: '0 0 70px 40px rgba(255, 255, 255, 0.9)'
                      }}
                    ></div>
                    
                    {/* Glowing particles */}
                    {[...Array(15)].map((_, i) => {
                      const angle = (i / 15) * 2 * Math.PI;
                      const distance = 100 + Math.random() * 150;
                      const x = Math.cos(angle) * distance;
                      const y = Math.sin(angle) * distance;
                      const size = 3 + Math.random() * 5;
                      const delay = 1.5 + Math.random() * 0.3;
                      
                      return (
                        <div 
                          key={`particle-${i}`}
                          className="absolute left-1/2 top-1/2 rounded-full bg-white"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                            opacity: 0,
                            boxShadow: `0 0 ${size * 2}px ${size}px rgba(255, 255, 255, 0.8)`,
                            animation: 'fadeInOut 1s ease-out forwards',
                            animationDelay: `${delay}s`,
                            zIndex: 28
                          }}
                        ></div>
                      );
                    })}
                    
                    {/* Cards inside pack */}
                    <div 
                      className="absolute w-2/3 h-1/2 rounded-lg"
                      style={{ 
                        left: '16.5%',
                        top: '25%',
                        zIndex: 10,
                      }}
                    >
                      <div className="w-full h-full relative overflow-hidden">
                        {/* Card stack effect - cards fly out one by one */}
                        {[...Array(7)].map((_, i) => (
                          <div 
                            key={i}
                            className="absolute w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-xl"
                            style={{ 
                              animation: `cardFlyOut 0.7s ease-out forwards, cardGlow 1s ease-in-out infinite`,
                              animationDelay: `${2.0 + i * 0.15}s, ${2.0 + i * 0.15}s`,
                              opacity: 0,
                              transform: 'scale(0.8) translateY(0) rotate(0deg)',
                              transformOrigin: 'center center',
                              boxShadow: '0 0 20px 5px rgba(255, 255, 255, 0.4)',
                              zIndex: 30 + i
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img 
                                src="/card-back.jpg" 
                                alt="Card Back"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Magical energy burst when cards appear */}
                    <div 
                      className="absolute left-1/2 top-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ 
                        animation: 'magicalEnergyBurst 1s ease-out forwards',
                        animationDelay: '1.7s',
                        zIndex: 5,
                        background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,255,255,0.4) 50%, transparent 70%)'
                      }}
                    ></div>
                    
                    {/* Pack wrapper that fades away */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-mtg-red via-mtg-gold to-mtg-green rounded-lg shadow-2xl"
                      style={{ 
                        animation: 'packFadeOut 0.5s ease-in-out forwards',
                        animationDelay: '1.6s',
                        zIndex: 5,
                        boxShadow: '0 0 20px 5px rgba(255, 215, 0, 0.4)'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div id="booster-cards" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-2 md:gap-3 w-full max-w-5xl mx-auto pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 mt-4 booster-cards-container">
                {boosterCards.slice(0, 15).map((card, index) => (
                  <div 
                    key={index}
                    className="mtg-card transform transition-all duration-500 hover:scale-110 hover:z-50 shadow-2xl mx-auto"
                    style={{
                      animation: `cardReveal 0.4s ${index * 0.03}s forwards`,
                      opacity: 0,
                      transform: 'scale(0) rotate(180deg)',
                      zIndex: isBoosterOpened ? 10 + index : 0,
                      maxWidth: '95%'
                    }}
                  >
                    <Link href={`/card/${encodeURIComponent(card.name)}`} passHref>
                      <div className="relative w-full h-full">
                        {card.relatedFace ? (
                          <RelatedFaceCard card={card} className="w-full h-full" />
                        ) : (
                          <img 
                            src={card.imageUrl || '/card-back.jpg'} 
                            alt={card.name || 'MTG Card'}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = '/card-back.jpg';
                            }}
                          />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 rounded-b-lg">
                          <p className="text-white text-xs font-bold truncate">
                            {card.name}
                            {card.relatedFace && (
                              <span className="ml-1 text-blue-300" title="Has related face">↔</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 justify-items-center">
            {filteredArchetypes.map((archetype) => {
              // Based on the list provided, we know the exact archetype format matches
              // Example: "GU Prowess" is the exact archetype string we need to match
              
              // Create the exact archetype string to match
              const exactArchetypeName = `${archetype.name}`;
              
              // Find cards that explicitly list this exact archetype
              const archetypeSpecificCards = archetypeCards.filter(card => {
                if (!card || !card.archetypes || !Array.isArray(card.archetypes)) return false;
                
                return card.archetypes.some((cardArchetype: string) => {
                  return cardArchetype === exactArchetypeName;
                });
              });
                            
              // If we have cards for this archetype, pick one randomly
              let randomCard = null;
              if (archetypeSpecificCards.length > 0) {
                const randomIndex = Math.floor(Math.random() * archetypeSpecificCards.length);
                randomCard = archetypeSpecificCards[randomIndex];
              }
              
              // If no card or no image found, use appropriate fallback
              if (!randomCard || !randomCard.imageUrl) {
                // First, try to find any card with the same colors as the archetype
                const archetypeColors = archetype.colors;
                const colorMatchCards = archetypeCards.filter(card => 
                  card && card.imageUrl && card.colors && 
                  archetypeColors.every(color => card.colors.includes(color)) &&
                  card.colors.length === archetypeColors.length
                );
                
                // If we have color-matched cards, pick one randomly
                if (colorMatchCards.length > 0) {
                  randomCard = colorMatchCards[Math.floor(Math.random() * colorMatchCards.length)];
                } else {
                  // If no exact color match, find cards with at least one matching color
                  const partialColorMatchCards = archetypeCards.filter(card => 
                    card && card.imageUrl && card.colors && 
                    archetypeColors.some(color => card.colors.includes(color))
                  );
                  
                  if (partialColorMatchCards.length > 0) {
                    randomCard = partialColorMatchCards[Math.floor(Math.random() * partialColorMatchCards.length)];
                  } else {
                    // If all else fails, just use any card that has an image
                    const cardsWithImages = archetypeCards.filter(card => card && card.imageUrl);
                    
                    if (cardsWithImages.length > 0) {
                      randomCard = cardsWithImages[Math.floor(Math.random() * cardsWithImages.length)];
                    } else {
                      // Create a basic placeholder - we shouldn't get here if there are any cards with images
                      randomCard = {
                        name: `${archetype.name} Card`,
                        imageUrl: `/placeholder-${archetype.colors.join('')}.jpg`,
                        archetypes: [archetype.id]
                      };
                    }
                  }
                }
              }
              
              return (
                <Link 
                  href={`/archetypes/${archetype.id}`}
                  key={archetype.id}
                  className={`relative group overflow-hidden rounded-xl transition-all duration-500 
                    ${selectedArchetype === archetype.id ? 'ring-4 ring-mtg-gold' : ''}
                    dark:bg-gray-800/80 bg-white/90 backdrop-blur-sm transform hover:scale-105 hover:shadow-2xl cursor-pointer block w-full h-full flex flex-col`}
                >
                  {/* Card background with parallax effect */}
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-center bg-cover transform group-hover:scale-110 transition-transform duration-1000"
                       style={{ backgroundImage: `url(${randomCard.imageUrl})` }}>
                  </div>
                  
                  <div className="p-3 sm:p-4 md:p-6 relative z-10 flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:items-center mb-4">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold mr-2 sm:mr-4 dark:text-white group-hover:text-mtg-gold transition-colors duration-300 truncate">
                        {archetype.name}
                      </h3>
                      <div className="flex space-x-1 mt-1 sm:mt-0">
                        {archetype.colors.map((color) => (
                          <span 
                            key={color} 
                            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transform group-hover:scale-110 transition-transform ${colorMap[color]}`}
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="dark:text-gray-300 text-sm sm:text-base mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                      {archetype.description}
                    </p>
                    
                    <div className="flex flex-col items-center mt-auto">
                      {randomCard ? (
                        <Link 
                          href={`/card/${encodeURIComponent(randomCard.name)}`} 
                          className="relative w-[65%] sm:w-[55%] md:w-1/2 aspect-[2.5/3.5] overflow-hidden rounded-lg shadow-lg transform transition-transform duration-500 group-hover:scale-105 cursor-pointer mx-auto mb-4"
                          onClick={(e) => e.stopPropagation()} /* Prevent triggering the parent Link */
                        >
                          {randomCard.imageUrl ? (
                            <>
                              {randomCard.relatedFace ? (
                                <RelatedFaceCard card={randomCard} className="w-full h-full" />
                              ) : (
                                <img 
                                  src={randomCard.imageUrl}
                                  alt={randomCard.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Error loading image:', randomCard.imageUrl);
                                    
                                    // Try a color-based fallback image
                                    if (archetype.colors && archetype.colors.length > 0) {
                                      const colorCombo = archetype.colors.join('');
                                      const colorMap: Record<string, string> = {
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
                                      if (colorCombo in colorMap) {
                                        e.currentTarget.src = colorMap[colorCombo];
                                      } else if (archetype.colors[0] in colorMap) {
                                        e.currentTarget.src = colorMap[archetype.colors[0]];
                                      } else {
                                        e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3E${archetype.name}%3C%2Ftext%3E%3C%2Fsvg%3E';
                                      }
                                    } else {
                                      e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3E${archetype.name}%3C%2Ftext%3E%3C%2Fsvg%3E';
                                    }
                                  }}
                                />
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-white text-xs font-semibold truncate">
                                {/*{randomCard.name}*/}
                                {randomCard.relatedFace && (
                                  <span className="ml-1 text-blue-300" title="Has related face">↔</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400">No image</p>
                            </div>
                          )}
                        </Link>
                      ) : (
                        <div className="w-1/2 aspect-[2.5/3.5] rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                          <p className="text-center text-gray-500 dark:text-gray-400">No card</p>
                        </div>
                      )}
                      
                      <div className="w-full">
                        <div 
                          className="px-4 py-2 bg-gradient-to-r from-mtg-blue to-mtg-red text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center w-full"
                        >
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* About Section with Improved Design */}
      <section className="relative px-4 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-mtg-black/80 via-transparent to-mtg-blue/30 dark:from-mtg-black/80 dark:via-transparent dark:to-mtg-blue/30 light:from-mtg-white/80 light:via-transparent light:to-mtg-blue/10 z-0"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">
            <span className="relative inline-block">
              <span className="relative z-10">About This Cube</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-mtg-red to-mtg-green"></span>
            </span>
          </h2>
          
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-800">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 text-gray-700 dark:text-gray-200">
                <p className="text-lg leading-relaxed">
                  This is a journey through Magic, with many "what ifs," references, nostalgia, and surprises. 
                  The cube is designed to be drafted with 8 players, but works well with any number.
                </p>
                <p className="text-lg leading-relaxed">
                  The cube contains 480 cards, with a focus on synergy over raw power. Each color pair has a distinct 
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
                  {/* Display completely random cards from the cube, not related to archetypes */}
                  {randomCubeCards.slice(0, 4).map((card, index) => (
                    card?.imageUrl && (
                      <Link 
                        key={index}
                        href={`/card/${encodeURIComponent(card.name)}`}
                        className="mtg-card overflow-hidden rounded-lg shadow-xl transform hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer"
                        style={{ transform: `rotate(${(index % 2 === 0 ? -5 : 5)}deg)` }}
                      >
                        <div className="relative">
                          {card.relatedFace ? (
                            <RelatedFaceCard card={card} className="w-full h-full" />
                          ) : (
                            <img 
                              src={card.imageUrl}
                              alt={card.name || 'MTG Card'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                              }}
                            />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-white text-xs font-semibold truncate">
                            {card.name}
                            {card.relatedFace && (
                              <span className="ml-1 text-blue-300" title="Has related face">↔</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add animation keyframes */}
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
        @keyframes booster-opening {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(0.1); opacity: 0; }
        }
        @keyframes cardReveal {
          0% { transform: scale(0.1); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
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