'use client';

import { useState } from 'react';
import { FaDice, FaRandom, FaCalculator, FaSearch } from 'react-icons/fa';
import { getBotDraftPick, getDraftPack } from '@/lib/api';

type Tool = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
};

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

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
      id: 'archetype-finder',
      name: 'Archetype Finder',
      description: 'Find which archetype a card fits into best based on its abilities and synergies.',
      icon: <FaSearch className="h-6 w-6" />,
      component: <ArchetypeFinder />,
    },
  ];

  const selectedTool = tools.find(tool => tool.id === activeTool);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center dark:text-white">Cube Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-200 
              ${activeTool === tool.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
            onClick={() => setActiveTool(tool.id)}
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
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
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
      console.log("Starting draft...");
      
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
      
      // Generate packs for all players (player + bots)
      const totalPlayers = numBots + 1; // +1 for the human player
      const newAllPacks: any[][] = [];
      
      // Create 3 packs for each player
      for (let packIdx = 0; packIdx < 3; packIdx++) {
        const packsForThisRound: any[] = [];
        
        // Generate a pack for each player
        for (let playerIdx = 0; playerIdx < totalPlayers; playerIdx++) {
          console.log(`Generating pack ${packIdx + 1} for player ${playerIdx + 1}`);
          const pack = await getDraftPack();
          
          // Ensure we have exactly 15 cards in the pack
          if (pack.length !== totalCardsPerPack) {
            console.warn(`Pack contains ${pack.length} cards instead of expected ${totalCardsPerPack}`);
          }
          
          packsForThisRound.push(pack);
        }
        
        newAllPacks.push(packsForThisRound);
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
      let updatedPack = currentPack.filter(c => c.id !== card.id);
      
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
            currentPack: botPack.filter(c => c.id !== botCard.id) // Remove picked card
          };
          
          // Record this pick for history
          currentBotPicks.push({
            botId: bot.id,
            botName: bot.name,
            card: botCard
          });
        }
      }
      
      // Add current bot picks to history
      setBotPicks([...botPicks, ...currentBotPicks]);
      
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
          
          // Log completion stats
          console.log(`Draft complete! You drafted ${updatedPickedCards.length} cards.`);
          console.log(`Expected total: 45 cards (3 packs × 15 cards)`);
          
          // Check if we have the expected number of cards
          if (updatedPickedCards.length !== 45) {
            console.warn(`You drafted ${updatedPickedCards.length} cards instead of expected 45`);
          }
          
          // Log bot stats
          updatedBots.forEach(bot => {
            console.log(`${bot.name} drafted ${bot.picks.length} cards`);
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
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                {pickedCards.map((card, index) => (
                  <div 
                    key={`${card.id}-${index}`} 
                    className={`p-2 rounded text-xs ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30`}
                  >
                    <p className="font-medium dark:text-white">{card.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{card.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Pack {card.packNumber}, Pick {card.pickNumber}</p>
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
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                      {bot.picks.map((card: any, index: number) => (
                        <div 
                          key={`${card.id}-${index}`} 
                          className={`p-2 rounded text-xs ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30`}
                        >
                          <p className="font-medium dark:text-white">{card.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{card.type}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Pack {card.packNumber}, Pick {card.pickNumber}</p>
                        </div>
                      ))}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
              {currentPack.map(card => (
                <div 
                  key={card.id} 
                  className={`${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 p-2 rounded cursor-pointer hover:bg-opacity-30 dark:hover:bg-opacity-40 transition-colors`}
                  onClick={() => pickCard(card)}
                >
                  <p className="font-medium dark:text-white">{card.name}</p>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {pickedCards.map((card, index) => (
                  <div 
                    key={`${card.id}-${index}`} 
                    className={`p-2 rounded text-xs ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30`}
                  >
                    <p className="font-medium dark:text-white">{card.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{card.type}</p>
                  </div>
                ))}
              </div>
              
              {botPicksVisible && botPicks.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2 dark:text-white">Recent Bot Picks:</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {botPicks.slice(-numBots * 2).map((pick, index) => (
                      <div 
                        key={`bot-pick-${index}`} 
                        className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-sm"
                      >
                        <p className="font-medium dark:text-white">
                          {pick.botName} picked:
                        </p>
                        <div className={`mt-1 p-2 rounded ${getCardColorClasses(pick.card.colors)} bg-opacity-20 dark:bg-opacity-30`}>
                          <p className="font-medium dark:text-white">{pick.card.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{pick.card.type}</p>
                        </div>
                      </div>
                    ))}
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
  
  const generatePack = () => {
    // In a real implementation, this would fetch actual cards from your cube
    const newPack = Array(15).fill(null).map((_, i) => ({
      id: `random-card-${i}`,
      name: `Example Card ${i + 1}`,
      colors: ['W', 'U', 'B', 'R', 'G'].slice(0, Math.floor(Math.random() * 3) + 1),
      type: ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact'][Math.floor(Math.random() * 5)],
      manaCost: `{${Math.floor(Math.random() * 5) + 1}}`,
      custom: Math.random() > 0.5,
    }));
    setPack(newPack);
  };

  return (
    <div className="space-y-4">
      <p className="dark:text-gray-300">
        Generate a random 15-card pack from the cube to see what you might open in a draft.
      </p>
      
      <button 
        className="btn-primary"
        onClick={generatePack}
      >
        Generate Random Pack
      </button>
      
      {pack.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Your Pack:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {pack.map(card => (
              <div 
                key={card.id} 
                className="bg-gray-100 dark:bg-gray-700 p-2 rounded"
              >
                <p className="font-medium dark:text-white">{card.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.type}</p>
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

// Archetype Finder Component
function ArchetypeFinder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  
  const archetypes = [
    { id: 'wu-storm', name: 'Storm', colors: ['W', 'U'] },
    { id: 'ub-broken-cipher', name: 'Broken Cipher', colors: ['U', 'B'] },
    { id: 'br-token-collection', name: 'Token Collection', colors: ['B', 'R'] },
    { id: 'rg-control', name: 'Control', colors: ['R', 'G'] },
    { id: 'gw-vehicles', name: 'Vehicles', colors: ['G', 'W'] },
    { id: 'wb-blink', name: 'Blink/ETB/Value', colors: ['W', 'B'] },
    { id: 'bg-artifacts', name: 'Artifacts', colors: ['B', 'G'] },
    { id: 'ur-enchantments', name: 'Enchantments', colors: ['U', 'R'] },
    { id: 'rw-self-mill', name: 'Self-mill', colors: ['R', 'W'] },
    { id: 'gu-prowess', name: 'Prowess', colors: ['G', 'U'] },
  ];
  
  const keywords = {
    'Storm': ['storm', 'cast', 'spell', 'instant', 'sorcery', 'copy'],
    'Broken Cipher': ['cipher', 'encode', 'combat damage', 'unblockable', 'evasion'],
    'Token Collection': ['token', 'create', 'creature token', 'sacrifice'],
    'Control': ['destroy', 'damage', 'counter', 'exile', 'return'],
    'Vehicles': ['vehicle', 'crew', 'artifact', 'pilot'],
    'Blink/ETB/Value': ['flicker', 'exile', 'return', 'battlefield', 'enters', 'etb'],
    'Artifacts': ['artifact', 'equipment', 'attach', 'equip', 'sacrifice'],
    'Enchantments': ['enchantment', 'aura', 'attach', 'enchant'],
    'Self-mill': ['mill', 'graveyard', 'discard', 'draw', 'library'],
    'Prowess': ['prowess', 'noncreature', 'spell', 'cast', 'trigger'],
  };

  const findArchetypes = () => {
    if (!searchTerm.trim()) {
      return;
    }
    
    const term = searchTerm.toLowerCase();
    
    // Calculate a score for each archetype based on keyword matches
    const results = archetypes.map(archetype => {
      const archetypeKeywords = keywords[archetype.name as keyof typeof keywords];
      
      let score = 0;
      archetypeKeywords.forEach(keyword => {
        if (term.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });
      
      return {
        ...archetype,
        score,
        keywords: archetypeKeywords.filter(keyword => 
          term.includes(keyword.toLowerCase())
        ),
      };
    });
    
    // Sort by score and filter out zero scores
    const filteredResults = results
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);
    
    setSearchResults(filteredResults.length > 0 ? filteredResults : []);
  };

  return (
    <div className="space-y-4">
      <p className="dark:text-gray-300">
        Find which archetype a card fits into best based on its abilities and synergies.
        Enter a card name or its rules text to see matching archetypes.
      </p>
      
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Enter card name or rules text..."
          className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findArchetypes()}
        />
        <button 
          className="btn-primary"
          onClick={findArchetypes}
        >
          Find Archetypes
        </button>
      </div>
      
      {searchResults && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Matching Archetypes:</h3>
          
          {searchResults.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No matching archetypes found. Try different keywords or check the About page for archetype descriptions.
            </p>
          ) : (
            <div className="space-y-3">
              {searchResults.map(result => (
                <div 
                  key={result.id} 
                  className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h4 className="text-lg font-semibold dark:text-white">{result.name}</h4>
                      <div className="flex ml-3">
                        {result.colors.map((color: string) => (
                          <span 
                            key={color} 
                            className="w-5 h-5 rounded-full mx-0.5"
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
                    <span className="text-sm font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                      Match Score: {result.score}
                    </span>
                  </div>
                  
                  {result.keywords.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Matching keywords: {result.keywords.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
