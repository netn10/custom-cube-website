'use client';

import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { FaDice, FaRandom, FaCalculator, FaSearch, FaPlusCircle, FaList, FaRobot } from 'react-icons/fa';
import { getBotDraftPick, getDraftPack, getMultipleDraftPacks, getSuggestions, addSuggestion, uploadSuggestionImage, getChatGPTCards, getChatGPTResponse, getGeminiResponse, getRandomPack, API_BASE_URL } from '@/lib/api';

type Tool = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
};

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const toolContentRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to bottom of page smoothly
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Effect to scroll when tool content is rendered
  useEffect(() => {
    if (toolContentRef.current && activeTool) {
      setTimeout(() => {
        toolContentRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 1000);
    }
  }, [activeTool]);

  const tools: Tool[] = [
    {
      id: 'draft-simulator',
      name: 'Draft Simulator',
      description: 'Simulate a draft with the cube to test archetypes and strategies.',
      icon: <FaDice className="h-6 w-6" />,
      component: <DraftSimulator />,
    },
    {
      id: 'random-pack',
      name: 'Random Pack Generator',
      description: 'Generate a random pack from the cube to see what you might open.',
      icon: <FaRandom className="h-6 w-6" />,
      component: <RandomPackGenerator />,
    },
    {
      id: 'mana-calculator',
      name: 'Mana Calculator',
      description: 'Calculate the optimal mana base for your deck based on mana symbols.',
      icon: <FaCalculator className="h-6 w-6" />,
      component: <ManaCalculator />,
    },
    {
      id: 'ask-chatgpt',
      name: 'Ask Gemini',
      description: 'View cards that instruct you to ask Gemini for something and get AI-generated responses.',
      icon: <FaRobot className="h-6 w-6" />,
      component: <AskChatGPT />,
    },
    {
      id: 'suggest-card',
      name: 'Suggest a Card',
      description: 'Submit your own card suggestions for the cube by uploading an image or providing a description.',
      icon: <FaPlusCircle className="h-6 w-6" />,
      component: <CardSuggestion />,
    },
    {
      id: 'suggested-cards',
      name: 'Suggested Cards',
      description: 'View all card suggestions submitted by the community.',
      icon: <FaList className="h-6 w-6" />,
      component: <SuggestedCards />,
    },
  ];

  const selectedTool = tools.find(tool => tool.id === activeTool);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center dark:text-white">Cube Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-200 
              ${activeTool === tool.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
            onClick={() => {
              setActiveTool(tool.id);
            }}
          >
            <div className="flex items-center mb-4">
              <div className="mr-4 text-blue-500 dark:text-blue-400">
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold dark:text-white">{tool.name}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{tool.description}</p>
          </div>
        ))}
      </div>
      
      {selectedTool && (
        <div 
          ref={toolContentRef}
          className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h2 className="text-2xl font-bold mb-4 dark:text-white">{selectedTool.name}</h2>
          <div>{selectedTool.component}</div>
        </div>
      )}
    </div>
  );
}

// Draft Simulator Component
function DraftSimulator() {
  const [draftStarted, setDraftStarted] = useState(false);
  const [currentPack, setCurrentPack] = useState<any[]>([]);
  const [pickedCards, setPickedCards] = useState<any[]>([]);
  const [packNumber, setPackNumber] = useState(1);
  const [pickNumber, setPickNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [botPicksVisible, setBotPicksVisible] = useState(false);
  const [botPicks, setBotPicks] = useState<any[]>([]);
  const [numBots, setNumBots] = useState(7);
  const [draftComplete, setDraftComplete] = useState(false);
  const [totalCardsPerPack] = useState(15); // Standard MTG pack size
  const [allPacks, setAllPacks] = useState<any[][]>([]);
  const [draftDirection, setDraftDirection] = useState<'left' | 'right'>('left');

  const startDraft = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reset draft state
      setPickedCards([]);
      setPackNumber(1);
      setPickNumber(1);
      setBotPicks([]);
      setDraftComplete(false);
      
      // Initialize bots
      const newBots = Array(numBots).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Bot ${i + 1}`,
        colors: [],
        picks: [],
        currentPack: []
      }));
      setBots(newBots);
      
      // Generate packs for all players (player + bots) in a single request
      const totalPlayers = numBots + 1; // +1 for the human player
      const totalPacks = totalPlayers * 3; // 3 packs per player
      
      // Use the new bulk API to get all packs at once
      const allPacksFlat = await getMultipleDraftPacks(totalPacks);
      
      // Reshape the flat array of packs into the format we need:
      // [round][player_index] = pack
      const newAllPacks: any[][] = [[], [], []];
      
      // Distribute packs by round and player
      for (let i = 0; i < allPacksFlat.length; i++) {
        const roundIndex = Math.floor(i / totalPlayers);
        const pack = allPacksFlat[i];
        
        // Ensure we have exactly 15 cards in the pack
        if (pack.length !== totalCardsPerPack) {
          console.warn(`Pack contains ${pack.length} cards instead of expected ${totalCardsPerPack}`);
        }
        
        newAllPacks[roundIndex].push(pack);
      }
      
      setAllPacks(newAllPacks);
      
      // Set direction for pack passing (left for pack 1 and 3, right for pack 2)
      setDraftDirection('left');
      
      // Distribute first pack to all players
      const firstRoundPacks = newAllPacks[0];
      
      // Player gets the first pack
      setCurrentPack(firstRoundPacks[0]);
      
      // Bots get their packs
      const updatedBots = [...newBots];
      for (let i = 0; i < numBots; i++) {
        updatedBots[i].currentPack = firstRoundPacks[i + 1]; // +1 because player has the first pack
      }
      setBots(updatedBots);
      
      setDraftStarted(true);
    } catch (err) {
      console.error('Error starting draft:', err);
      setError(`Failed to start draft: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const pickCard = async (card: any) => {
    try {
      setLoading(true);
      
      // Add card to player's picks
      const updatedPickedCards = [...pickedCards, { ...card, pickNumber, packNumber }];
      setPickedCards(updatedPickedCards);
      
      // Remove picked card from current pack
      let updatedPack = currentPack.filter((c: { id: string }) => c.id !== card.id);
      
      // Each bot makes a pick from their current pack
      const updatedBots = [...bots];
      const currentBotPicks: any[] = [];
      
      for (let i = 0; i < updatedBots.length; i++) {
        const bot = updatedBots[i];
        const botPack = bot.currentPack;
        
        if (botPack.length > 0) {
          // Bot makes a pick (for now, just random)
          const randomIndex = Math.floor(Math.random() * botPack.length);
          const botCard = botPack[randomIndex];
          
          // Update bot's colors if they don't have any yet
          let updatedBotColors = [...bot.colors];
          if (updatedBotColors.length === 0 && botCard.colors && botCard.colors.length > 0) {
            updatedBotColors = botCard.colors;
          }
          
          // Add card to bot's picks
          updatedBots[i] = {
            ...bot,
            colors: updatedBotColors,
            picks: [...bot.picks, { ...botCard, pickNumber, packNumber }],
            currentPack: botPack.filter((c: { id: string }) => c.id !== botCard.id) // Remove picked card
          };
          
          // Record this pick for history
          currentBotPicks.push({
            botId: bot.id,
            botName: bot.name,
            card: botCard
          });
        }
      }
      
      // Add current bot picks to history - organize by bot ID
      const updatedBotPicks = [...botPicks];
      
      // Add each bot's pick to their respective history
      currentBotPicks.forEach(pick => {
        updatedBotPicks.push(pick);
      });
      
      setBotPicks(updatedBotPicks);
      
      // Pass packs - in a real draft, packs are passed around the table
      // For pack 1 and 3, pass to the left; for pack 2, pass to the right
      if (updatedPack.length > 0) {
        // Still cards in the pack - pass packs around
        if (draftDirection === 'left') {
          // Pass to the left (player gets last bot's pack)
          setCurrentPack(updatedBots[updatedBots.length - 1].currentPack);
          
          // Each bot gets the pack from the player/bot to their right
          for (let i = updatedBots.length - 1; i > 0; i--) {
            updatedBots[i].currentPack = updatedBots[i - 1].currentPack;
          }
          
          // First bot gets player's pack
          updatedBots[0].currentPack = updatedPack;
        } else {
          // Pass to the right (player gets first bot's pack)
          setCurrentPack(updatedBots[0].currentPack);
          
          // Each bot gets the pack from the player/bot to their left
          for (let i = 0; i < updatedBots.length - 1; i++) {
            updatedBots[i].currentPack = updatedBots[i + 1].currentPack;
          }
          
          // Last bot gets player's pack
          updatedBots[updatedBots.length - 1].currentPack = updatedPack;
        }
        
        // Increment pick number
        setPickNumber(pickNumber + 1);
      } else {
        // No more cards in the pack - move to next pack
        if (packNumber < 3) {
          // Start next pack
          const nextPackIndex = packNumber;
          const nextPacksForRound = allPacks[nextPackIndex];
          
          // Change direction for pack 2
          const newDirection = packNumber === 1 ? 'right' : 'left';
          setDraftDirection(newDirection);
          
          // Distribute new packs
          setCurrentPack(nextPacksForRound[0]);
          
          for (let i = 0; i < updatedBots.length; i++) {
            updatedBots[i].currentPack = nextPacksForRound[i + 1]; // +1 because player has the first pack
          }
          
          // Update pack and pick numbers
          setPackNumber(packNumber + 1);
          setPickNumber(1);
        } else {
          // Draft is complete
          setDraftStarted(false);
          setDraftComplete(true);
          
          // Check if we have the expected number of cards
          if (updatedPickedCards.length !== 45) {
            console.warn(`You drafted ${updatedPickedCards.length} cards instead of expected 45`);
          }
          
          // Log bot stats
          updatedBots.forEach(bot => {
            if (bot.picks.length !== 45) {
              console.warn(`${bot.name} drafted ${bot.picks.length} cards instead of expected 45`);
            }
          });
        }
      }
      
      // Update bots state
      setBots(updatedBots);
    } catch (err) {
      console.error('Error making pick:', err);
      setError('Failed to process draft pick. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBotPicks = () => {
    setBotPicksVisible(!botPicksVisible);
  };
  
  // Function to organize bot picks by bot ID
  const getBotPicksById = (botId: number) => {
    return botPicks.filter(pick => pick.botId === botId);
  };

  const getCardColorClasses = (colors: string[]) => {
    if (!colors || colors.length === 0) return 'bg-gray-300';
    
    const colorClasses: Record<string, string> = {
      W: 'bg-mtg-white',
      U: 'bg-mtg-blue',
      B: 'bg-mtg-black',
      R: 'bg-mtg-red',
      G: 'bg-mtg-green',
    };
    
    if (colors.length === 1) {
      return colorClasses[colors[0]];
    } else {
      // For multicolor cards
      return 'bg-mtg-gold';
    }
  };

  // Card hover preview component that follows the cursor
  const CardHoverPreview = ({ card }: { card: any }) => {
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    // Handle mouse movement to update the preview position
    const handleMouseMove = (e: React.MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    if (!card?.imageUrl) return null;
    
    return (
      <>
        <div 
          className="absolute inset-0 cursor-pointer z-10"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onMouseMove={handleMouseMove}
        />
        {hovering && (
          <div 
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${position.x + 20}px`,
              top: `${position.y - 20}px`,
              transform: 'translate(0, -50%)',
              maxWidth: '350px'
            }}
          >
            <img 
              src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`}
              alt={card.name}
              className="w-full h-auto rounded shadow-xl"
              style={{ maxHeight: '500px' }}
              onError={(e) => {
                console.error('Error loading preview image:', card.imageUrl);
                e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22420%22%20viewBox%3D%220%200%20300%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22300%22%20height%3D%22420%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%22150%22%20y%3D%22210%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A16px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
              }}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {!draftStarted && !draftComplete ? (
        <div className="text-center">
          <p className="mb-4 dark:text-gray-300">
            Start a simulated draft with 3 packs of 15 cards each. You'll draft against {numBots} AI bots that make intelligent picks!
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Bots
            </label>
            <select
              className="w-40 mx-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={numBots}
              onChange={(e) => setNumBots(Number(e.target.value))}
            >
              {[3, 5, 7].map(num => (
                <option key={num} value={num}>{num} Bots</option>
              ))}
            </select>
          </div>
          
          <button 
            className="btn-primary"
            onClick={startDraft}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Draft'}
          </button>
        </div>
      ) : draftComplete ? (
        <div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Draft Complete!</h3>
            
            <div className="mb-4">
              <p className="dark:text-gray-300">
                You've completed a full 3-pack draft and selected {pickedCards.length} cards.
              </p>
              {pickedCards.length !== 45 && (
                <p className="text-amber-600 dark:text-amber-400 mt-2">
                  Note: A complete draft should have 45 cards (3 packs × 15 cards).
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2 dark:text-white">Your Draft Pool ({pickedCards.length} cards)</h4>
              
              <div className="flex flex-wrap">
                {pickedCards.map((card, index) => (
                  <div 
                    key={index} 
                    className="inline-block mr-3 mb-3 group relative"
                  >
                    {card.imageUrl ? (
                      <div className="relative w-32 h-44 overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
                        <img 
                          src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', card.imageUrl);
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-1">
                          <p className="text-white text-xs truncate">{card.name}</p>
                          <p className="text-xs text-gray-300 text-center">P{card.packNumber}-P{card.pickNumber}</p>
                        </div>
                        <CardHoverPreview card={card} />
                      </div>
                    ) : (
                      <div className={`w-40 h-56 ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
                        <p className="text-sm truncate font-medium dark:text-white">{card.name}</p>
                        <div className="flex justify-center">
                          {card.colors.map((color: string) => (
                            <span 
                              key={color} 
                              className="w-3 h-3 rounded-full mx-0.5"
                              style={{ 
                                backgroundColor: 
                                  color === 'W' ? '#F9FAF4' : 
                                  color === 'U' ? '#0E68AB' : 
                                  color === 'B' ? '#150B00' : 
                                  color === 'R' ? '#D3202A' : 
                                  '#00733E'
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-center dark:text-white">P{card.packNumber}-P{card.pickNumber}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            
            <div className="flex justify-between">
              <button 
                className="btn-primary"
                onClick={startDraft}
              >
                New Draft
              </button>
              
              <button 
                className="btn-secondary"
                onClick={toggleBotPicks}
              >
                {botPicksVisible ? 'Hide Bot Decks' : 'Show Bot Decks'}
              </button>
            </div>
          </div>
          
          {botPicksVisible && (
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-4 dark:text-white">Bot Draft Pools</h4>
              
              <div className="space-y-6">
                {bots.map(bot => (
                  <div key={bot.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <h5 className="font-medium text-lg dark:text-white">{bot.name}</h5>
                        <div className="flex ml-3">
                          {bot.colors.map((color: string) => (
                            <span 
                              key={color} 
                              className={`w-5 h-5 rounded-full mx-0.5 ${getCardColorClasses([color])}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {bot.picks.length} cards {bot.picks.length !== 45 && `(expected 45)`}
                      </span>
                    </div>
                    
                    <div className="overflow-y-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded p-2">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="py-2 px-3 text-left">#</th>
                            <th className="py-2 px-3 text-left">Card</th>
                            <th className="py-2 px-3 text-left">Type</th>
                            <th className="py-2 px-3 text-left">Pack/Pick</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bot.picks.map((card: any, index: number) => (
                            <tr 
                              key={`${card.id}-${index}`} 
                              className={`border-t border-gray-200 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}`}
                            >
                              <td className="py-2 px-3 font-medium">{index + 1}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center">
                                  <div className="flex mr-2">
                                    {card.colors.map((color: string) => (
                                      <span 
                                        key={color} 
                                        className="w-3 h-3 rounded-full mr-1"
                                        style={{ 
                                          backgroundColor: 
                                            color === 'W' ? '#F9FAF4' : 
                                            color === 'U' ? '#0E68AB' : 
                                            color === 'B' ? '#150B00' : 
                                            color === 'R' ? '#D3202A' : 
                                            '#00733E'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className="font-medium dark:text-white">{card.name}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{card.type}</td>
                              <td className="py-2 px-3 text-gray-500 dark:text-gray-500">Pack {card.packNumber}, Pick {card.pickNumber}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              Pack {packNumber}, Pick {pickNumber}
            </h3>
            <p className="dark:text-gray-300">
              {pickedCards.length} cards picked
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 mb-6">
              {currentPack.map(card => (
                <div 
                  key={card.id} 
                  className="mtg-card card-hover cursor-pointer h-auto"
                  onClick={() => pickCard(card)}
                >
                  {card.imageUrl ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <img 
                        src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                        alt={card.name} 
                        className="mtg-card-image w-full h-auto object-contain"
                        onError={(e) => {
                          console.error('Error loading image:', card.imageUrl);
                          e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-1 sm:p-2">
                        <p className="font-medium text-white text-xs sm:text-sm truncate">{card.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex">
                            {card.colors.map((color: string) => (
                              <span 
                                key={color} 
                                className="w-4 h-4 rounded-full mr-1"
                                style={{ 
                                  backgroundColor: 
                                    color === 'W' ? '#F9FAF4' : 
                                    color === 'U' ? '#0E68AB' : 
                                    color === 'B' ? '#150B00' : 
                                    color === 'R' ? '#D3202A' : 
                                    '#00733E'
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-white hidden sm:inline">{card.type}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`h-full ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between p-3`}>
                      <p className="font-medium dark:text-white">{card.name}</p>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.type}</p>
                        <div className="flex mt-1">
                          {card.colors.map((color: string) => (
                            <span 
                              key={color} 
                              className="w-4 h-4 rounded-full mr-1"
                              style={{ 
                                backgroundColor: 
                                  color === 'W' ? '#F9FAF4' : 
                                  color === 'U' ? '#0E68AB' : 
                                  color === 'B' ? '#150B00' : 
                                  color === 'R' ? '#D3202A' : 
                                  '#00733E'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {pickedCards.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold dark:text-white">Your Picks:</h3>
                <button 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={toggleBotPicks}
                >
                  {botPicksVisible ? 'Hide Bot Picks' : 'Show Bot Picks'}
                </button>
              </div>
              
              <div className="flex flex-wrap">
                {pickedCards.map((card, index) => (
                  <div 
                    key={`${card.id}-${index}`} 
                    className="inline-block mr-3 mb-3 group relative"
                  >
                    {card.imageUrl ? (
                      <div className="relative w-32 h-44 overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
                        <img 
                          src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', card.imageUrl);
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-1">
                          <p className="text-white text-xs truncate">{index + 1}</p>
                        </div>
                        <CardHoverPreview card={card} />
                      </div>
                    ) : (
                      <div className={`w-32 h-44 ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
                        <p className="text-sm truncate font-medium dark:text-white">{card.name}</p>
                        <div className="flex justify-center">
                          {card.colors.map((color: string) => (
                            <span 
                              key={color} 
                              className="w-3 h-3 rounded-full mx-0.5"
                              style={{ 
                                backgroundColor: 
                                  color === 'W' ? '#F9FAF4' : 
                                  color === 'U' ? '#0E68AB' : 
                                  color === 'B' ? '#150B00' : 
                                  color === 'R' ? '#D3202A' : 
                                  '#00733E'
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-center dark:text-white">{index + 1}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {botPicksVisible && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2 dark:text-white">Bot Picks:</h3>
                  
                  <div className="space-y-4">
                    {bots.map(bot => {
                      const botPickHistory = getBotPicksById(bot.id);
                      return (
                        <div key={bot.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <h4 className="text-md font-medium dark:text-white mb-2">
                            {bot.name} Picks ({botPickHistory.length}):
                          </h4>
                          
                          {botPickHistory.length > 0 ? (
                            <div className="space-y-2">
                              {botPickHistory.map((pick, index) => (
                                <div 
                                  key={index} 
                                  className="inline-block mr-3 mb-3 group relative"
                                >
                                  {pick.card.imageUrl ? (
                                    <div className="relative w-32 h-44 overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
                                      <img 
                                        src={pick.card.imageUrl.startsWith('data:') ? pick.card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(pick.card.imageUrl)}`} 
                                        alt={pick.card.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          console.error('Error loading image:', pick.card.imageUrl);
                                          e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                                        }}
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-1">
                                        <p className="text-white text-xs truncate">{index + 1}</p>
                                      </div>
                                      <CardHoverPreview card={pick.card} />
                                    </div>
                                  ) : (
                                    <div className={`w-32 h-44 ${getCardColorClasses(pick.card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
                                      <p className="text-sm truncate font-medium dark:text-white">{pick.card.name}</p>
                                      <div className="flex justify-center">
                                        {pick.card.colors.map((color: string) => (
                                          <span 
                                            key={color} 
                                            className="w-3 h-3 rounded-full mx-0.5"
                                            style={{ 
                                              backgroundColor: 
                                                color === 'W' ? '#F9FAF4' : 
                                                color === 'U' ? '#0E68AB' : 
                                                color === 'B' ? '#150B00' : 
                                                color === 'R' ? '#D3202A' : 
                                                '#00733E'
                                            }}
                                          />
                                        ))}
                                      </div>
                                      <p className="text-white text-xs text-center">{index + 1}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No picks yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Random Pack Generator Component
function RandomPackGenerator() {
  const [pack, setPack] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [packSize, setPackSize] = useState(15);
  
  const generatePack = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getRandomPack(packSize);
      setPack(result.pack);
      setMetadata(result.metadata);
    } catch (err: any) {
      console.error('Error generating random pack:', err);
      setError(err.message || 'Failed to generate random pack');
      setPack([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="dark:text-gray-300">
        Generate a random pack from the cube where each card has an equal chance of appearing.
      </p>
      
      <div className="flex items-center space-x-4 mb-4">
        <div>
          <label htmlFor="packSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pack Size
          </label>
          <input
            id="packSize"
            type="number"
            min="1"
            max="30"
            value={packSize}
            onChange={(e) => setPackSize(Math.max(1, Math.min(30, parseInt(e.target.value) || 15)))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <button 
          className="btn-primary mt-6"
          onClick={generatePack}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Random Pack'}
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {metadata && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Total cards in database: {metadata.total_cards_in_database}</p>
          <p>Generated at: {new Date(metadata.timestamp).toLocaleString()}</p>
        </div>
      )}
      
      {pack.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Your Pack ({pack.length} cards):</h3>
          <div className="mtg-card-grid">
            {pack.map(card => (
              <div 
                key={card.id} 
                className="mtg-card"
              >
                <div className="h-full bg-gray-100 dark:bg-gray-700 flex flex-col justify-between p-3 relative">
                  {card.imageUrl && (
                    <div className="absolute inset-0 p-1">
                      <img 
                        src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                        alt={card.name}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  {!card.imageUrl && (
                    <>
                      <div>
                        <p className="font-medium dark:text-white">{card.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.manaCost}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.type}</p>
                        <p className="text-xs mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">{card.text}</p>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex">
                            {card.colors.map((color: string) => (
                              <span 
                                key={color} 
                                className="w-4 h-4 rounded-full mr-1"
                                style={{ 
                                  backgroundColor: 
                                    color === 'W' ? '#F9FAF4' : 
                                    color === 'U' ? '#0E68AB' : 
                                    color === 'B' ? '#150B00' : 
                                    color === 'R' ? '#D3202A' : 
                                    '#00733E'
                                }}
                              />
                            ))}
                          </div>
                          {card.custom && (
                            <span className="text-xs px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mana Calculator Component
function ManaCalculator() {
  const [whiteSymbols, setWhiteSymbols] = useState(0);
  const [blueSymbols, setBlueSymbols] = useState(0);
  const [blackSymbols, setBlackSymbols] = useState(0);
  const [redSymbols, setRedSymbols] = useState(0);
  const [greenSymbols, setGreenSymbols] = useState(0);
  const [totalLands, setTotalLands] = useState(17);
  const [results, setResults] = useState<Record<string, number> | null>(null);

  const calculateManaBase = () => {
    const totalSymbols = whiteSymbols + blueSymbols + blackSymbols + redSymbols + greenSymbols;
    
    if (totalSymbols === 0) {
      return;
    }
    
    const manaBase: Record<string, number> = {
      'Plains': Math.round((whiteSymbols / totalSymbols) * totalLands),
      'Island': Math.round((blueSymbols / totalSymbols) * totalLands),
      'Swamp': Math.round((blackSymbols / totalSymbols) * totalLands),
      'Mountain': Math.round((redSymbols / totalSymbols) * totalLands),
      'Forest': Math.round((greenSymbols / totalSymbols) * totalLands),
    };
    
    // Adjust to match total lands
    let calculatedTotal = Object.values(manaBase).reduce((sum, count) => sum + count, 0);
    
    if (calculatedTotal !== totalLands) {
      const diff = totalLands - calculatedTotal;
      
      // Find the color with the most symbols to adjust
      const colors = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
      const symbolCounts = [whiteSymbols, blueSymbols, blackSymbols, redSymbols, greenSymbols];
      
      const maxIndex = symbolCounts.indexOf(Math.max(...symbolCounts.filter(count => count > 0)));
      manaBase[colors[maxIndex]] += diff;
    }
    
    setResults(manaBase);
  };

  return (
    <div className="space-y-4">
      <p className="dark:text-gray-300">
        Calculate the optimal mana base for your deck based on mana symbols in casting costs.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Mana Symbols in Your Deck</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                White Symbols
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={whiteSymbols}
                onChange={(e) => setWhiteSymbols(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blue Symbols
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={blueSymbols}
                onChange={(e) => setBlueSymbols(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Black Symbols
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={blackSymbols}
                onChange={(e) => setBlackSymbols(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Red Symbols
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={redSymbols}
                onChange={(e) => setRedSymbols(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Green Symbols
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={greenSymbols}
                onChange={(e) => setGreenSymbols(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Lands
              </label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={totalLands}
                onChange={(e) => setTotalLands(parseInt(e.target.value) || 17)}
              />
            </div>
            
            <button 
              className="btn-primary mt-2"
              onClick={calculateManaBase}
            >
              Calculate Mana Base
            </button>
          </div>
        </div>
        
        {results && (
          <div>
            <h3 className="text-lg font-semibold mb-3 dark:text-white">Recommended Mana Base</h3>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              {Object.entries(results)
                .filter(([_, count]) => count > 0)
                .map(([land, count]) => (
                  <div key={land} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="font-medium dark:text-white">{land}</span>
                    <span className="dark:text-white">{count}</span>
                  </div>
                ))}
              
              <div className="flex justify-between py-2 mt-2 font-bold">
                <span className="dark:text-white">Total</span>
                <span className="dark:text-white">{totalLands}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Card Suggestion Component
function CardSuggestion() {
  const [submitOption, setSubmitOption] = useState<'image' | 'text' | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardName) {
      setError('Card name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      let imageUrl = '';
      
      // If image was uploaded, process it first
      if (submitOption === 'image' && selectedImage) {
        const uploadResult = await uploadSuggestionImage(selectedImage);
        imageUrl = uploadResult.imageUrl;
      }
      
      // Submit the suggestion
      await addSuggestion({
        name: cardName,
        description: cardDescription,
        imageUrl: imageUrl,
        createdBy: createdBy || 'Anonymous'
      });
      
      // Reset form
      setCardName('');
      setCardDescription('');
      setCreatedBy('');
      setSelectedImage(null);
      setPreviewUrl(null);
      setSubmitOption(null);
      setSubmitSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting suggestion:', err);
      setError(`Failed to submit suggestion: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="prose dark:prose-invert max-w-none">
        <p>
          Have a great idea for a card that would fit perfectly in the cube? Submit your suggestion here!
          You can either upload an image of your card design or provide a text description.
        </p>
      </div>
      
      {/* Option Selection */}
      {!submitOption && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-200"
            onClick={() => setSubmitOption('image')}
          >
            <h3 className="text-xl font-bold mb-2 dark:text-white">Upload a Picture</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Upload an image of your card design or concept art.
            </p>
          </div>
          
          <div 
            className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-200"
            onClick={() => setSubmitOption('text')}
          >
            <h3 className="text-xl font-bold mb-2 dark:text-white">Submit Text Description</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Describe your card idea with text, including name, cost, type, and abilities.
            </p>
          </div>
        </div>
      )}
      
      {/* Submission Form */}
      {submitOption && (
        <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md">
          <button 
            className="text-blue-500 mb-4 flex items-center"
            onClick={() => {
              setSubmitOption(null);
              setSelectedImage(null);
              setPreviewUrl(null);
              setError(null);
            }}
          >
            ← Back to options
          </button>
          
          <h3 className="text-xl font-bold mb-4 dark:text-white">
            {submitOption === 'image' ? 'Upload Card Image' : 'Describe Your Card'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Card Name *
              </label>
              <input
                type="text"
                id="cardName"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created By
              </label>
              <input
                type="text"
                id="createdBy"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Your name (optional)"
              />
            </div>
            
            {submitOption === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Card Image *
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Select Image
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedImage ? selectedImage.name : 'No file selected'}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                
                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview:</p>
                    <img 
                      src={previewUrl} 
                      alt="Card preview" 
                      className="max-w-xs rounded-md shadow-md" 
                    />
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="cardDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Card Description {submitOption === 'text' && '*'}
              </label>
              <textarea
                id="cardDescription"
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                required={submitOption === 'text'}
                placeholder={submitOption === 'text' ? 
                  "Describe your card idea in detail. Include name, cost, type, and abilities." : 
                  "Optional: Add any additional notes about your card design."}
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {submitSuccess && (
              <div className="text-green-500 text-sm">
                Your card suggestion was submitted successfully!
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Suggested Cards Component
function SuggestedCards() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const suggestionsPerPage = 50;

  // Fetch existing suggestions when component mounts or page changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        const data = await getSuggestions(currentPage, suggestionsPerPage);
        setSuggestions(data.suggestions || []);
        setTotalSuggestions(data.total || 0);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Failed to load existing suggestions');
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="prose dark:prose-invert max-w-none">
        <p>
          Browse all card suggestions submitted by the community. These cards may be considered for inclusion in future cube updates.
        </p>
      </div>
      
      {isLoadingSuggestions ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading suggestions...</p>
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="flex justify-center items-center mb-4">
            <p className="dark:text-gray-300">Showing {suggestions.length} of {totalSuggestions}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {suggestion.imageUrl && (
                  <div className="flex justify-center p-2">
                    <img 
                      src={suggestion.imageUrl.startsWith('data:') ? suggestion.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(suggestion.imageUrl)}`} 
                      alt={suggestion.name} 
                      className="mtg-card"
                      onError={(e) => {
                        console.error('Error loading image:', suggestion.imageUrl);
                        e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                      }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="text-lg font-bold mb-2 dark:text-white">{suggestion.name}</h4>
                  {suggestion.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{suggestion.description}</p>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <p>Created by: {suggestion.createdBy || 'Anonymous'}</p>
                    <p>Submitted: {new Date(suggestion.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalSuggestions > suggestionsPerPage && (
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
                  {Array.from({ length: Math.ceil(totalSuggestions / suggestionsPerPage) }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === Math.ceil(totalSuggestions / suggestionsPerPage) || 
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
                  disabled={currentPage >= Math.ceil(totalSuggestions / suggestionsPerPage)}
                  className={`px-3 py-1 rounded ${
                    currentPage >= Math.ceil(totalSuggestions / suggestionsPerPage)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No card suggestions yet. Be the first to suggest a card!</p>
        </div>
      )}
    </div>
  );
}

// Ask ChatGPT Component
function AskChatGPT() {
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [chatGPTResponse, setChatGPTResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch cards that have a prompt field
  useEffect(() => {
    const fetchChatGPTCards = async () => {
      try {
        setIsLoading(true);
        const data = await getChatGPTCards();
        setCards(data);
      } catch (err) {
        setError('Failed to load cards with Gemini prompts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatGPTCards();
  }, []);

  // Handle card click to generate Gemini response
  const handleCardClick = async (card: any) => {
    setSelectedCard(card);
    setChatGPTResponse(null);
    
    if (!card.prompt) {
      setChatGPTResponse('This card does not have a valid prompt. Please select another card.');
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Get response from Gemini API using the card's prompt field
      const response = await getGeminiResponse(card.prompt);
      setChatGPTResponse(response.response);
      
    } catch (err) {
      console.error('Error getting Gemini response:', err);
      setChatGPTResponse('Sorry, there was an error generating a response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="prose dark:prose-invert max-w-none">
        <p>
          Some cards in the cube have special prompts for Gemini. Click on any card below to automatically
          prompt Gemini and see the response.
        </p>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading cards...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No cards with Gemini prompts found in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div 
              key={card.id} 
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 
                ${selectedCard?.id === card.id ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => handleCardClick(card)}
            >
              {card.imageUrl && (
                <div className="flex justify-center p-2">
                  <img 
                    src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                    alt={card.name} 
                    className="mtg-card"
                    onError={(e) => {
                      console.error('Error loading image:', card.imageUrl);
                      e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* ChatGPT Response Section */}
      {selectedCard && (
        <div 
          className="mt-8 bg-gray-100 dark:bg-gray-700 p-6 rounded-lg"
          ref={(el) => {
            // Scroll to this element once it's rendered
            if (el) {
              setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}>
          <h3 className="text-xl font-bold mb-4 dark:text-white">
            Gemini Response for {selectedCard.name}
          </h3>
          
          {isGenerating ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Generating response...</p>
            </div>
          ) : chatGPTResponse ? (
            <div className="prose dark:prose-invert max-w-none">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                <p className="whitespace-pre-line">{chatGPTResponse}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No response generated yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
