'use client';

import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { FaDice, FaRandom, FaCalculator, FaSearch, FaPlusCircle, FaList, FaRobot } from 'react-icons/fa';
import { getBotDraftPick, getDraftPack, getMultipleDraftPacks, getSuggestions, addSuggestion, uploadSuggestionImage, getChatGPTCards, getChatGPTResponse, getGeminiResponse, getRandomPack, getShowDecks, API_BASE_URL } from '@/lib/api';

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
  const [openBotTabs, setOpenBotTabs] = useState<number[]>([]);
  const [botPicks, setBotPicks] = useState<any[]>([]);
  const [numBots, setNumBots] = useState(7);
  const [draftComplete, setDraftComplete] = useState(false);
  const [totalCardsPerPack] = useState(15); // Standard MTG pack size
  const [allPacks, setAllPacks] = useState<any[][]>([]);
  const [draftDirection, setDraftDirection] = useState<'left' | 'right'>('left');
  const [constructedDecks, setConstructedDecks] = useState<any[]>([]);
  const [decksVisible, setDecksVisible] = useState(false);
  const [deckBuildingLoading, setDeckBuildingLoading] = useState(false);
  const [deckBuildingMode, setDeckBuildingMode] = useState(false);
  const [mainDeck, setMainDeck] = useState<any[]>([]);
  const [sideboard, setSideboard] = useState<any[]>([]);
  const [basicLands, setBasicLands] = useState({
    Plains: 0,
    Island: 0,
    Swamp: 0,
    Mountain: 0,
    Forest: 0
  });

  // Basic land card data with Scryfall images
  const basicLandCards = {
    Plains: {
      id: 'basic-plains',
      name: 'Plains',
      type: 'Basic Land — Plains',
      colors: ['W'],
      imageUrl: 'https://cards.scryfall.io/large/front/9/d/9dd2d666-7c6b-48ce-93dc-c004ebdd1fe9.jpg?1748706876',
      manaCost: '',
      rarity: 'Basic'
    },
    Island: {
      id: 'basic-island',
      name: 'Island',
      type: 'Basic Land — Island',
      colors: ['U'],
      imageUrl: 'https://cards.scryfall.io/large/front/b/9/b92ec9f6-a56d-40c6-aee2-7d5e1524c985.jpg?1749278110',
      manaCost: '',
      rarity: 'Basic'
    },
    Swamp: {
      id: 'basic-swamp',
      name: 'Swamp',
      type: 'Basic Land — Swamp',
      colors: ['B'],
      imageUrl: 'https://cards.scryfall.io/large/front/1/1/1176ebbf-4130-4e4e-ad49-65101a7357b4.jpg?1748707608',
      manaCost: '',
      rarity: 'Basic'
    },
    Mountain: {
      id: 'basic-mountain',
      name: 'Mountain',
      type: 'Basic Land — Mountain',
      colors: ['R'],
      imageUrl: 'https://cards.scryfall.io/large/front/a/1/a18ef64b-a9de-4548-b4d5-168758442db7.jpg?1748706910',
      manaCost: '',
      rarity: 'Basic'
    },
    Forest: {
      id: 'basic-forest',
      name: 'Forest',
      type: 'Basic Land — Forest',
      colors: ['G'],
      imageUrl: 'https://cards.scryfall.io/large/front/2/0/2036f825-ef57-4a40-b45f-0668d9c8ec6a.jpg?1748707608',
      manaCost: '',
      rarity: 'Basic'
    }
  };
  const [draggedCard, setDraggedCard] = useState<any>(null);

  const toggleBotTab = (botId: number) => {
    setOpenBotTabs(prev => {
      if (prev.includes(botId)) {
        return prev.filter(id => id !== botId);
      } else {
        return [...prev, botId];
      }
    });
  };

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
      setOpenBotTabs([]);
      
      // Define all possible color pairs for bots
      const colors = ['W', 'U', 'B', 'R', 'G'];
      const colorPairs = [];
      
      // Generate all possible color pairs
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          colorPairs.push([colors[i], colors[j]]);
        }
      }
      
      const newBots = Array(numBots).fill(null).map((_, i) => {
        // Assign a random color pair to each bot
        const randomPairIndex = Math.floor(Math.random() * colorPairs.length);
        const preferredColors = colorPairs[randomPairIndex];
        
        return {
          id: i + 1,
          name: `Bot ${i + 1}`,
          // Start with an empty colors array, but bots will have preferred colors
          // that influence their early picks (handled in pickCard)
          colors: [],
          preferredColors: preferredColors,
          // No specific archetype name anymore
          picks: [],
          currentPack: []
        };
      });
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
      
      // Process bot picks one by one
      for (let i = 0; i < updatedBots.length; i++) {
        const bot = updatedBots[i];
        const botPack = bot.currentPack;
        
        if (botPack.length > 0) {
          let botCard;
          
          try {
            // Use the API to get an intelligent bot pick based on the bot's current strategy
            const pickResponse = await getBotDraftPick({
              availableCards: botPack,
              botColors: bot.colors,
              packNumber,
              pickNumber
            });
            
            botCard = pickResponse.card || botPack[0];
          } catch (error) {
            console.warn('Error getting bot pick from API, falling back to local strategy:', error);
            
            // Fallback to local strategy if API fails
            botCard = getBotPickUsingLocalStrategy(botPack, bot.colors, bot.picks, packNumber, pickNumber);
          }
          
          // Update bot's colors based on the pick and existing strategy
          let updatedBotColors = [...bot.colors];
          
          // Early picks (first 3-5 picks) establish the bot's color identity
          if (packNumber === 1 && pickNumber <= 5) {
            if (botCard.colors && botCard.colors.length > 0) {
              // For early picks, if the card is colored, adjust the bot's color preference
              if (updatedBotColors.length === 0) {
                // First colored card - adopt its colors fully
                updatedBotColors = botCard.colors;
              } else if (updatedBotColors.length > 0 && botCard.colors.length <= 2) {
                // If bot already has colors and this is a 1-2 color card, look for overlapping colors
                const overlappingColors = botCard.colors.filter((c: string) => updatedBotColors.includes(c));
                
                if (overlappingColors.length > 0) {
                  // Strengthen the overlapping colors (maintain direction but refine)
                  updatedBotColors = [...new Set([...overlappingColors, ...updatedBotColors.slice(0, 1)])];
                }
              }
            }
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
          
          // Build bot decks
          const updatedBotsWithDecks = updatedBots.map(bot => {
            // Get all cards this bot has picked
            const botCards = botPicks.filter(pick => pick.botId === bot.id).map(pick => pick.card);
            
            // Determine bot's final colors - use the 2 most common colors from their picks
            const colorCount: Record<string, number> = {};
            botCards.forEach(card => {
              if (card.colors && card.colors.length > 0) {
                card.colors.forEach((color: string) => {
                  colorCount[color] = (colorCount[color] || 0) + 1;
                });
              }
            });
            
            // Sort colors by count
            const sortedColors = Object.entries(colorCount)
              .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
              .map(([color]) => color);
            
            // Determine if this should be a 2-color or 3-color deck
            // Only go to 3 colors if there's a good reason (3rd color has significant presence)
            let mainColors;
            if (sortedColors.length >= 3 && 
                (colorCount[sortedColors[2]] >= 5 || // Either has significant presence
                 (colorCount[sortedColors[2]] >= 3 && colorCount[sortedColors[2]] >= colorCount[sortedColors[1]] * 0.7))) { // Or close to 2nd color
              mainColors = sortedColors.slice(0, 3);
            } else {
              mainColors = sortedColors.slice(0, Math.min(2, sortedColors.length));
            }
            
            // Score each card for deck inclusion
            const scoredCards = botCards.map(card => {
              let score = 0;
              
              // Check color match
              if (card.colors && card.colors.length > 0) {
                const matchingColors = card.colors.filter((c: string) => mainColors.includes(c)).length;
                const nonMatchingColors = card.colors.filter((c: string) => !mainColors.includes(c)).length;
                
                // Higher bonus for perfect color matches
                if (matchingColors === card.colors.length) {
                  score += 3 * matchingColors;
                } else {
                  score += 2 * matchingColors;
                }
                
                // Heavier penalty for off-color cards
                score -= nonMatchingColors * 2;
                
                // Additional scoring for multicolor cards that fit our strategy
                if (card.colors.length > 1 && matchingColors === card.colors.length) {
                  score += 1; // Bonus for multicolor cards that perfectly match our colors
                }
                
                // Penalize splashing a 3rd color if we're mainly in 2 colors
                if (mainColors.length === 2 && matchingColors < card.colors.length) {
                  score -= 1;
                }
              } else {
                // Colorless cards get a small bonus
                score += 1;
              }
              
              // Card type considerations
              if (card.type) {
                if (card.type.includes('Creature')) {
                  score += 0.8; // Creatures are important
                }
                if (card.type.includes('Removal') || 
                    card.type.includes('Destroy') || 
                    card.type.includes('Exile')) {
                  score += 1.5; // Removal is very valuable
                }
                if (card.type.includes('Card Draw') || 
                    card.type.includes('Draw a card')) {
                  score += 1; // Card draw is valuable
                }
                if (card.type.includes('Counter') && 
                    card.type.includes('Spell')) {
                  score += 0.7; // Counterspells are situationally good
                }
              }
              
              // Consider mana curve
              if (card.cmc !== undefined) {
                // Prefer a good curve (more low drops, fewer high drops)
                if (card.cmc <= 2) score += 0.5; // Early plays are important
                if (card.cmc >= 6) score -= 0.3; // Too many expensive cards is bad
              }
              
              return { card, score };
            });
            
            // Sort by score
            scoredCards.sort((a, b) => b.score - a.score);
            
            // First select the top cards by score (we'll determine exact count after analyzing curve)
            const topCards = scoredCards.slice(0, 24).map(scored => scored.card);
            
            // Analyze the mana curve to determine ideal land count (16 or 17)
            const avgCmc = topCards.reduce((sum, card) => sum + (card.cmc || 0), 0) / topCards.length || 0;
            
            // Select cards for the deck - number depends on land count
            // Lower curve = 24 cards, 16 lands; Higher curve = 23 cards, 17 lands
            const useLowerLandCount = avgCmc < 3.0 && mainColors.length <= 2;
            const nonLandCount = useLowerLandCount ? 24 : 23;
            const landCount = useLowerLandCount ? 16 : 17;
            
            // Select the final cards for the deck
            const deckCards = topCards.slice(0, nonLandCount);
            
            // Create a deck object with the selected cards and land distribution
            const deck = {
              cards: deckCards,
              colors: mainColors,
              totalCards: nonLandCount,
              landCount: landCount,
              // Calculate land distribution based on color requirements
              lands: (() => {
                const landDistribution: Record<string, number> = {};
                
                // If only one color, all lands are that color
                if (mainColors.length === 1) {
                  landDistribution[mainColors[0]] = landCount;
                  return landDistribution;
                }
                
                // Calculate color pip requirements based on selected deck cards
                const colorPips: Record<string, number> = {};
                mainColors.forEach(color => { colorPips[color] = 0; });
                
                // Count colored mana symbols in card costs
                deckCards.forEach(card => {
                  if (card.manaCost) {
                    mainColors.forEach(color => {
                      // Count color pips in mana cost using regex
                      const colorSymbol = color === 'W' ? 'W' : 
                                         color === 'U' ? 'U' : 
                                         color === 'B' ? 'B' : 
                                         color === 'R' ? 'R' : 'G';
                      const matches = card.manaCost.match(new RegExp(colorSymbol, 'g'));
                      if (matches) {
                        colorPips[color] += matches.length;
                      }
                    });
                  } else if (card.colors) {
                    // If no mana cost info, just count the card's colors
                    card.colors.forEach((color: string) => {
                      if (mainColors.includes(color)) {
                        colorPips[color] = (colorPips[color] || 0) + 1;
                      }
                    });
                  }
                });
                
                // Calculate total color requirements
                const totalPips = Object.values(colorPips).reduce((sum, count) => sum + count, 0) || 1;
                
                // Distribute lands proportionally to color requirements
                let remainingLands = landCount;
                
                if (mainColors.length === 2) {
                  // Two colors: distribute proportionally with minimums
                  const firstColorRatio = colorPips[mainColors[0]] / totalPips;
                  let firstColorLands = Math.round(landCount * firstColorRatio);
                  
                  // Ensure minimum land counts per color
                  firstColorLands = Math.max(firstColorLands, Math.floor(landCount * 0.35));
                  firstColorLands = Math.min(firstColorLands, Math.ceil(landCount * 0.65));
                  
                  landDistribution[mainColors[0]] = firstColorLands;
                  landDistribution[mainColors[1]] = landCount - firstColorLands;
                } else if (mainColors.length === 3) {
                  // Three colors: more complex distribution
                  for (let i = 0; i < 2; i++) { // Handle first two colors
                    const color = mainColors[i];
                    const ratio = colorPips[color] / totalPips;
                    let colorLands = Math.round(landCount * ratio);
                    
                    // Ensure minimum viable land count
                    colorLands = Math.max(colorLands, Math.floor(landCount * 0.2));
                    
                    landDistribution[color] = colorLands;
                    remainingLands -= colorLands;
                  }
                  
                  // Third color gets remaining lands
                  landDistribution[mainColors[2]] = remainingLands;
                  
                  // Ensure third color gets at least a minimum number of lands
                  if (landDistribution[mainColors[2]] < 3) {
                    // Redistribute if third color gets too few lands
                    if (landDistribution[mainColors[0]] > 5) {
                      landDistribution[mainColors[0]]--;
                      landDistribution[mainColors[2]]++;
                    }
                    if (landDistribution[mainColors[2]] < 3 && landDistribution[mainColors[1]] > 5) {
                      landDistribution[mainColors[1]]--;
                      landDistribution[mainColors[2]]++;
                    }
                  }
                }
                
                // Verify the total is exactly the expected land count
                const totalCalculatedLands = Object.values(landDistribution).reduce((sum, count) => sum + count, 0);
                if (totalCalculatedLands !== landCount) {
                  console.error('Land distribution error:', landDistribution, 'total:', totalCalculatedLands, 'expected:', landCount);
                  
                  // If somehow we got a wrong total, fix it with a reasonable distribution
                  if (mainColors.length === 2) {
                    const half = Math.floor(landCount / 2);
                    landDistribution[mainColors[0]] = half + (landCount % 2);
                    landDistribution[mainColors[1]] = half;
                  } else if (mainColors.length === 3) {
                    // For 3 colors, do a 40/40/20 split
                    const third = Math.floor(landCount / 3);
                    landDistribution[mainColors[0]] = third + Math.floor((landCount % 3) / 2) + ((landCount % 3) % 2);
                    landDistribution[mainColors[1]] = third + Math.floor((landCount % 3) / 2);
                    landDistribution[mainColors[2]] = third;
                  }
                }
                
                return landDistribution;
              })() 
            };
            
            return {
              ...bot,
              deck: deck,
              deckBuilt: true
            };
          });
          
          setBots(updatedBotsWithDecks);
          
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
    // Hide constructed decks when showing bot picks
    if (!botPicksVisible) {
      setDecksVisible(false);
    }
  };

  // Function to organize bot picks by bot ID
  const getBotPicksById = (botId: number) => {
    return botPicks.filter(pick => pick.botId === botId);
  };

  // Function to show constructed decks
  const showDecks = async () => {
    console.log('showDecks called');
    console.log('draftComplete:', draftComplete);
    console.log('bots:', bots);
    
    if (!draftComplete) {
      setError("Draft must be completed before building decks.");
      return;
    }

    setDeckBuildingLoading(true);
    setError(null);

    try {
      // Check if all bots have 45 cards
      const invalidBots = bots.filter(bot => bot.picks.length !== 45);
      console.log('invalidBots:', invalidBots);
      
      if (invalidBots.length > 0) {
        setError(`Some bots don't have exactly 45 cards: ${invalidBots.map(bot => `${bot.name} (${bot.picks.length})`).join(', ')}`);
        setDeckBuildingLoading(false);
        return;
      }

      // Generate a unique draft ID for reproducible results
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Calling API with draftId:', draftId);

      // Call the API to build decks
      const response = await getShowDecks(draftId, bots);
      console.log('API response:', response);
      
      setConstructedDecks(response.decks);
      setDecksVisible(true);
      // Hide bot picks when showing constructed decks
      setBotPicksVisible(false);

    } catch (err) {
      console.error('Error building decks:', err);
      setError(`Failed to build decks: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeckBuildingLoading(false);
    }
  };

  const toggleDecksVisible = () => {
    setDecksVisible(!decksVisible);
  };

  // Local strategy for bot picks when API is unavailable
  const getBotPickUsingLocalStrategy = (cards: any[], botColors: string[], botPicks: any[], packNumber: number, pickNumber: number) => {
    // If bot has no established colors yet, prioritize powerful single-color cards in early picks
    if (botColors.length === 0) {
      // Look for powerful mono-colored cards first (simplified heuristic: lower mana cost often = better early pick)
      const monoColoredCards = cards.filter(card => card.colors && card.colors.length === 1);
      if (monoColoredCards.length > 0) {
        // Sort by mana cost as a simple power approximation
        monoColoredCards.sort((a, b) => (a.cmc || 999) - (b.cmc || 999));
        return monoColoredCards[0];
      }
    }
    
    // If bot has established colors, prioritize cards matching its colors
    if (botColors.length > 0) {
      // Score cards based on color match and other factors
      const scoredCards = cards.map(card => {
        let score = 0;
        
        // Higher score for color matches
        if (card.colors && card.colors.length > 0) {
          const colorMatches = card.colors.filter((color: string) => botColors.includes(color)).length;
          score += colorMatches * 3; // Heavy weight on color matching
          
          // Penalize cards with colors outside the bot's colors
          const nonMatches = card.colors.filter((color: string) => !botColors.includes(color)).length;
          score -= nonMatches * 2;
        }
        
        // Give some value to colorless cards
        if (!card.colors || card.colors.length === 0) {
          score += 1;
        }
        
        // Later in the draft, prioritize curve considerations
        if (packNumber >= 2) {
          // Count cards by mana cost to evaluate curve needs
          const cmcCounts = botPicks.reduce((counts: any, pick: any) => {
            const cmc = pick.cmc || 0;
            counts[cmc] = (counts[cmc] || 0) + 1;
            return counts;
          }, {});
          
          // Simplistic curve preference (could be refined further)
          const cardCmc = card.cmc || 0;
          const countAtCmc = cmcCounts[cardCmc] || 0;
          
          // Prefer cards that fill curve gaps
          if ((cardCmc <= 3 && countAtCmc < 4) || 
              (cardCmc === 4 && countAtCmc < 3) || 
              (cardCmc >= 5 && countAtCmc < 2)) {
            score += 1;
          }
        }
        
        return { card, score };
      });
      
      // Sort by score and return the highest scored card
      scoredCards.sort((a, b) => b.score - a.score);
      return scoredCards[0].card;
    }
    
    // Fallback to random if no strategy applies
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
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

  // Function to download deck as TXT
  const downloadDeckAsTxt = () => {
    const cardsToExport = deckBuildingMode ? mainDeck : pickedCards;
    if (!cardsToExport.length) return;

    // Sort cards by name for better organization
    const sortedCards = [...cardsToExport].sort((a, b) => a.name.localeCompare(b.name));
    
    // Group cards by type
    const creatures = sortedCards.filter(card => card.type?.includes('Creature'));
    const spells = sortedCards.filter(card => !card.type?.includes('Creature') && !card.type?.includes('Land'));
    const lands = sortedCards.filter(card => card.type?.includes('Land'));
    
    let deckContent = `${deckBuildingMode ? 'Main Deck' : 'Draft Pool'} - ${new Date().toLocaleDateString()}\n`;
    deckContent += `Total Cards: ${cardsToExport.length}`;
    
    if (deckBuildingMode) {
      const totalLands = getTotalLands();
      deckContent += ` + ${totalLands} lands = ${cardsToExport.length + totalLands} total\n\n`;
    } else {
      deckContent += '\n\n';
    }
    
    if (creatures.length > 0) {
      deckContent += `CREATURES (${creatures.length}):\n`;
      creatures.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
      });
      deckContent += '\n';
    }
    
    if (spells.length > 0) {
      deckContent += `SPELLS (${spells.length}):\n`;
      spells.forEach(card => {
        const colors = card.colors?.join('') || '';  
        const mana = card.manaCost || '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}\n`;
      });
      deckContent += '\n';
    }
    
    if (lands.length > 0) {
      deckContent += `LANDS (${lands.length}):\n`;
      lands.forEach(card => {
        deckContent += `1 ${card.name}\n`;
      });
      deckContent += '\n';
    }
    
    // Add basic lands if in deck building mode
    if (deckBuildingMode && getTotalLands() > 0) {
      deckContent += `BASIC LANDS (${getTotalLands()}):\n`;
      Object.entries(basicLands).forEach(([landType, count]) => {
        if (count > 0) {
          deckContent += `${count} ${landType}\n`;
        }
      });
      deckContent += '\n';
      
      // Add sideboard info
      if (sideboard.length > 0) {
        deckContent += `\nSIDEBOARD (${sideboard.length}):\n`;
        const sortedSideboard = [...sideboard].sort((a, b) => a.name.localeCompare(b.name));
        sortedSideboard.forEach(card => {
          deckContent += `1 ${card.name}\n`;
        });
        deckContent += '\n';
      }
    }
    
    if (!deckBuildingMode) {
      deckContent += `\nDRAFT ORDER:\n`;
      pickedCards.forEach((card, index) => {
        deckContent += `P${card.packNumber}P${card.pickNumber}: ${card.name}\n`;
      });
    }

    // Create and download the file
    const blob = new Blob([deckContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draft-deck-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        URL.revokeObjectURL(url);
  };

  // Deck building functions
  const startDeckBuilding = () => {
    setDeckBuildingMode(true);
    // Initially, all cards go to sideboard
    setSideboard([...pickedCards]);
    setMainDeck([]);
    setBasicLands({
      Plains: 0,
      Island: 0,
      Swamp: 0,
      Mountain: 0,
      Forest: 0
    });
  };

  const exitDeckBuilding = () => {
    setDeckBuildingMode(false);
  };

  const updateBasicLands = (landType: string, count: number) => {
    setBasicLands(prev => ({
      ...prev,
      [landType]: Math.max(0, count)
    }));
  };

  const getTotalLands = () => {
    return Object.values(basicLands).reduce((sum, count) => sum + count, 0);
  };

  const getTotalDeckSize = () => {
    return mainDeck.length + getTotalLands();
  };

  // Get basic land cards as an array for display and PDF
  const getBasicLandCards = () => {
    const landCards: any[] = [];
    Object.entries(basicLands).forEach(([landType, count]) => {
      if (count > 0) {
        const landCard = basicLandCards[landType as keyof typeof basicLandCards];
        for (let i = 0; i < count; i++) {
          landCards.push({
            ...landCard,
            id: `${landCard.id}-${i}` // Unique ID for each copy
          });
        }
      }
    });
    return landCards;
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, card: any, source: 'main' | 'sideboard') => {
    setDraggedCard({ ...card, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, target: 'main' | 'sideboard') => {
    e.preventDefault();
    
    if (!draggedCard) return;

    const sourceList = draggedCard.source === 'main' ? mainDeck : sideboard;
    const targetList = target === 'main' ? mainDeck : sideboard;
    
    // Don't allow more than 40 cards in main deck (excluding lands)
    if (target === 'main' && mainDeck.length >= 40) {
      alert('Main deck cannot have more than 40 cards (excluding basic lands)');
      return;
    }

    // Remove from source
    const newSourceList = sourceList.filter(card => card.id !== draggedCard.id);
    
    // Add to target
    const newTargetList = [...targetList, draggedCard];

    if (draggedCard.source === 'main') {
      setMainDeck(newSourceList);
      if (target === 'sideboard') {
        setSideboard(newTargetList);
      }
    } else {
      setSideboard(newSourceList);
      if (target === 'main') {
        setMainDeck(newTargetList);
      }
    }

    setDraggedCard(null);
  };

  const moveCardToMain = (card: any) => {
    if (mainDeck.length >= 40) {
      alert('Main deck cannot have more than 40 cards (excluding basic lands)');
      return;
    }
    
    setSideboard(prev => prev.filter(c => c.id !== card.id));
    setMainDeck(prev => [...prev, card]);
  };

  const moveCardToSideboard = (card: any) => {
    setMainDeck(prev => prev.filter(c => c.id !== card.id));
    setSideboard(prev => [...prev, card]);
  };

  // Function to download bot pool as TXT
  const downloadBotPoolAsTxt = (bot: any) => {
    if (!bot.picks.length) return;

    const sortedCards = [...bot.picks].sort((a, b) => a.name.localeCompare(b.name));
    const creatures = sortedCards.filter(card => card.type?.includes('Creature'));
    const spells = sortedCards.filter(card => !card.type?.includes('Creature') && !card.type?.includes('Land'));
    const lands = sortedCards.filter(card => card.type?.includes('Land'));
    
    let deckContent = `${bot.name} Draft Pool - ${new Date().toLocaleDateString()}\n`;
    deckContent += `Total Cards: ${bot.picks.length}\n`;
    deckContent += `Colors: ${bot.colors.join(', ') || 'Colorless'}\n\n`;
    
    if (creatures.length > 0) {
      deckContent += `CREATURES (${creatures.length}):\n`;
      creatures.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
      });
      deckContent += '\n';
    }
    
    if (spells.length > 0) {
      deckContent += `SPELLS (${spells.length}):\n`;
      spells.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}\n`;
      });
      deckContent += '\n';
    }
    
    if (lands.length > 0) {
      deckContent += `LANDS (${lands.length}):\n`;
      lands.forEach(card => {
        deckContent += `1 ${card.name}\n`;
      });
      deckContent += '\n';
    }
    
    deckContent += `\nDRAFT ORDER:\n`;
    bot.picks.forEach((card: any) => {
      deckContent += `P${card.packNumber}P${card.pickNumber}: ${card.name}\n`;
    });

    const blob = new Blob([deckContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bot.name.toLowerCase().replace(' ', '-')}-pool-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to find constructed deck for a bot
  const findConstructedDeckForBot = (botId: number) => {
    return constructedDecks.find(deck => parseInt(deck.bot_id) === botId);
  };

  // Function to download bot deck as TXT
  const downloadBotDeckAsTxt = (bot: any) => {
    const constructedDeck = findConstructedDeckForBot(bot.id);
    if (!constructedDeck || (!constructedDeck.non_lands?.length && !constructedDeck.lands?.length)) return;

    // Combine non-lands and lands for sorting
    const allCards = [...(constructedDeck.non_lands || []), ...(constructedDeck.lands || [])];
    const sortedCards = allCards.sort((a, b) => a.name.localeCompare(b.name));
    const creatures = sortedCards.filter(card => card.type?.includes('Creature'));
    const spells = sortedCards.filter(card => !card.type?.includes('Creature') && !card.type?.includes('Land'));
    const lands = sortedCards.filter(card => card.type?.includes('Land'));
    
    let deckContent = `${bot.name} Constructed Deck - ${new Date().toLocaleDateString()}\n`;
    deckContent += `Total Cards: ${(constructedDeck.non_lands?.length || 0)} spells + ${(constructedDeck.lands?.length || 0)} lands = ${allCards.length} total\n`;
    deckContent += `Colors: ${constructedDeck.colors?.join(', ') || 'Colorless'}\n`;
    if (constructedDeck.sideboard && constructedDeck.sideboard.length > 0) {
      deckContent += `Sideboard: ${constructedDeck.sideboard.length} cards\n`;
    }
    deckContent += '\n';
    
    if (creatures.length > 0) {
      deckContent += `CREATURES (${creatures.length}):\n`;
      creatures.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
      });
      deckContent += '\n';
    }
    
    if (spells.length > 0) {
      deckContent += `SPELLS (${spells.length}):\n`;
      spells.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}\n`;
      });
      deckContent += '\n';
    }
    
    if (lands.length > 0) {
      deckContent += `LANDS (${lands.length}):\n`;
      lands.forEach(card => {
        deckContent += `1 ${card.name}${card.isBasicLand ? ' (Basic)' : ''}\n`;
      });
      deckContent += '\n';
    }
    
    // Add sideboard if present
    if (constructedDeck.sideboard && constructedDeck.sideboard.length > 0) {
      const sortedSideboard = [...constructedDeck.sideboard].sort((a, b) => a.name.localeCompare(b.name));
      deckContent += `SIDEBOARD (${constructedDeck.sideboard.length}):\n`;
      sortedSideboard.forEach(card => {
        const colors = card.colors?.join('') || '';
        const mana = card.manaCost || '';
        const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
        deckContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
      });
      deckContent += '\n';
    }

    const blob = new Blob([deckContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bot.name.toLowerCase().replace(' ', '-')}-deck-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to download all bot pools as one TXT file
  const downloadAllBotPoolsAsTxt = () => {
    if (!bots.length) return;

    let allPoolsContent = `All Bot Draft Pools - ${new Date().toLocaleDateString()}\n`;
    allPoolsContent += `Total Bots: ${bots.length}\n\n`;
    allPoolsContent += '='.repeat(80) + '\n\n';

    bots.forEach((bot, botIndex) => {
      const sortedCards = [...bot.picks].sort((a, b) => a.name.localeCompare(b.name));
      const creatures = sortedCards.filter(card => card.type?.includes('Creature'));
      const spells = sortedCards.filter(card => !card.type?.includes('Creature') && !card.type?.includes('Land'));
      const lands = sortedCards.filter(card => card.type?.includes('Land'));
      
      allPoolsContent += `${bot.name.toUpperCase()}\n`;
      allPoolsContent += `Colors: ${bot.colors.join(', ') || 'Colorless'}\n`;
      allPoolsContent += `Total Cards: ${bot.picks.length}\n\n`;
      
      if (creatures.length > 0) {
        allPoolsContent += `CREATURES (${creatures.length}):\n`;
        creatures.forEach(card => {
          const colors = card.colors?.join('') || '';
          const mana = card.manaCost || '';
          const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
          allPoolsContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
        });
        allPoolsContent += '\n';
      }
      
      if (spells.length > 0) {
        allPoolsContent += `SPELLS (${spells.length}):\n`;
        spells.forEach(card => {
          const colors = card.colors?.join('') || '';
          const mana = card.manaCost || '';
          allPoolsContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}\n`;
        });
        allPoolsContent += '\n';
      }
      
      if (lands.length > 0) {
        allPoolsContent += `LANDS (${lands.length}):\n`;
        lands.forEach(card => {
          allPoolsContent += `1 ${card.name}\n`;
        });
        allPoolsContent += '\n';
      }
      
      if (botIndex < bots.length - 1) {
        allPoolsContent += '='.repeat(80) + '\n\n';
      }
    });

    const blob = new Blob([allPoolsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-bot-pools-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to download all bot decks as one TXT file
  const downloadAllBotDecksAsTxt = () => {
    if (!constructedDecks.length) return;

    let allDecksContent = `All Bot Constructed Decks - ${new Date().toLocaleDateString()}\n`;
    allDecksContent += `Total Decks: ${constructedDecks.length}\n\n`;
    allDecksContent += '='.repeat(80) + '\n\n';

    constructedDecks.forEach((deck, deckIndex) => {
      // Combine non-lands and lands for sorting
      const allCards = [...(deck.non_lands || []), ...(deck.lands || [])];
      const sortedCards = allCards.sort((a, b) => a.name.localeCompare(b.name));
      const creatures = sortedCards.filter(card => card.type?.includes('Creature'));
      const spells = sortedCards.filter(card => !card.type?.includes('Creature') && !card.type?.includes('Land'));
      const lands = sortedCards.filter(card => card.type?.includes('Land'));
      
      allDecksContent += `${deck.bot_name.toUpperCase()}\n`;
      allDecksContent += `Colors: ${deck.colors?.join(', ') || 'Colorless'}\n`;
      allDecksContent += `Total Cards: ${(deck.non_lands?.length || 0)} spells + ${(deck.lands?.length || 0)} lands = ${allCards.length} total\n`;
      if (deck.sideboard && deck.sideboard.length > 0) {
        allDecksContent += `Sideboard: ${deck.sideboard.length} cards\n`;
      }
      allDecksContent += '\n';
      
      if (creatures.length > 0) {
        allDecksContent += `CREATURES (${creatures.length}):\n`;
        creatures.forEach(card => {
          const colors = card.colors?.join('') || '';
          const mana = card.manaCost || '';
          const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
          allDecksContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
        });
        allDecksContent += '\n';
      }
      
      if (spells.length > 0) {
        allDecksContent += `SPELLS (${spells.length}):\n`;
        spells.forEach(card => {
          const colors = card.colors?.join('') || '';
          const mana = card.manaCost || '';
          allDecksContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}\n`;
        });
        allDecksContent += '\n';
      }
      
      if (lands.length > 0) {
        allDecksContent += `LANDS (${lands.length}):\n`;
        lands.forEach(card => {
          allDecksContent += `1 ${card.name}${card.isBasicLand ? ' (Basic)' : ''}\n`;
        });
        allDecksContent += '\n';
      }
      
      // Add sideboard if present
      if (deck.sideboard && deck.sideboard.length > 0) {
        const sortedSideboard = [...deck.sideboard].sort((a, b) => a.name.localeCompare(b.name));
        allDecksContent += `SIDEBOARD (${deck.sideboard.length}):\n`;
        sortedSideboard.forEach(card => {
          const colors = card.colors?.join('') || '';
          const mana = card.manaCost || '';
          const pt = card.power && card.toughness ? ` (${card.power}/${card.toughness})` : '';
          allDecksContent += `1 ${card.name}${colors ? ` [${colors}]` : ''}${mana ? ` ${mana}` : ''}${pt}\n`;
        });
        allDecksContent += '\n';
      }
      
      if (deckIndex < constructedDecks.length - 1) {
        allDecksContent += '='.repeat(80) + '\n\n';
      }
    });

    const blob = new Blob([allDecksContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-bot-decks-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to download deck as PDF with card images
  const downloadDeckAsPdf = async () => {
    const cardsToExport = deckBuildingMode ? mainDeck : pickedCards;
    const basicLandCardsForPdf = deckBuildingMode ? getBasicLandCards() : [];
    const allCardsForPdf = [...cardsToExport, ...basicLandCardsForPdf];
    
    if (!allCardsForPdf.length) return;

    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Configuration for card layout
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      const cardsPerRow = 3;
      const cardsPerPage = 9; // 3x3 grid
      const cardWidth = (pageWidth - margin * 2 - (cardsPerRow - 1) * 5) / cardsPerRow;
      const cardHeight = cardWidth * 1.4; // MTG card aspect ratio
      const cardSpacing = 5;

      // Title page
      doc.setFontSize(20);
      doc.text(deckBuildingMode ? 'Main Deck' : 'Draft Pool', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 45, { align: 'center' });
      
      if (deckBuildingMode) {
        const totalLands = getTotalLands();
        doc.text(`Cards: ${cardsToExport.length} + ${totalLands} lands = ${allCardsForPdf.length} total`, pageWidth / 2, 55, { align: 'center' });
      } else {
        doc.text(`Total Cards: ${allCardsForPdf.length}`, pageWidth / 2, 55, { align: 'center' });
      }

      // Add a new page for cards
      doc.addPage();

      // Function to load image as base64
      const loadImageAsBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            try {
              const dataURL = canvas.toDataURL('image/jpeg', 0.8);
              resolve(dataURL);
            } catch (error) {
              reject(error);
            }
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          
          // Use the proxy URL for external images
          if (url.startsWith('data:')) {
            img.src = url;
          } else {
            img.src = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
          }
        });
      };

      // Function to create a placeholder image
      const createPlaceholderImage = (cardName: string, colors: string[] = []): string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        
        canvas.width = 200;
        canvas.height = 280;
        
        // Background color based on card colors
        let bgColor = '#f0f0f0';
        if (colors.length === 1) {
          const colorMap: { [key: string]: string } = {
            'W': '#fffbd5',
            'U': '#0e68ab',
            'B': '#150b00',
            'R': '#d3202a',
            'G': '#00733e'
          };
          bgColor = colorMap[colors[0]] || bgColor;
        } else if (colors.length > 1) {
          bgColor = '#ffd700'; // Gold for multicolor
        }
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Card name
        ctx.fillStyle = colors.length === 1 && colors[0] === 'W' ? '#000' : '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Wrap text if too long
        const maxWidth = canvas.width - 20;
        const words = cardName.split(' ');
        let line = '';
        let y = canvas.height / 2;
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, canvas.width / 2, y);
            line = words[n] + ' ';
            y += 20;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, canvas.width / 2, y);
        
        return canvas.toDataURL('image/jpeg', 0.8);
      };

      // Process cards in batches to avoid overwhelming the browser
      let currentPage = 1;
      let cardIndex = 0;
      
      for (let i = 0; i < allCardsForPdf.length; i++) {
        const card = allCardsForPdf[i];
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + cardSpacing);
        const y = margin + row * (cardHeight + cardSpacing);
        
        try {
          let imageData;
          
          if (card.imageUrl) {
            try {
              imageData = await loadImageAsBase64(card.imageUrl);
            } catch (error) {
              console.warn(`Failed to load image for ${card.name}, using placeholder:`, error);
              imageData = createPlaceholderImage(card.name, card.colors);
            }
          } else {
            imageData = createPlaceholderImage(card.name, card.colors);
          }
          
          if (imageData) {
            doc.addImage(imageData, 'JPEG', x, y, cardWidth, cardHeight);
            
            // Add card name below the image
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(card.name, x + cardWidth / 2, y + cardHeight + 5, { align: 'center' });
            
            // Add pick order or land indicator
            doc.setFontSize(6);
            if (card.packNumber && card.pickNumber) {
              doc.text(`P${card.packNumber}P${card.pickNumber}`, x + cardWidth / 2, y + cardHeight + 10, { align: 'center' });
            } else if (card.rarity === 'Basic') {
              doc.text('Basic Land', x + cardWidth / 2, y + cardHeight + 10, { align: 'center' });
            }
          }
        } catch (error) {
          console.error(`Error processing card ${card.name}:`, error);
          // Add text fallback
          doc.setFontSize(10);
          doc.text(card.name, x + cardWidth / 2, y + cardHeight / 2, { align: 'center' });
        }
        
        cardIndex++;
        
        // Check if we need a new page
        if (cardIndex >= cardsPerPage) {
          if (i < allCardsForPdf.length - 1) {
            doc.addPage();
            cardIndex = 0;
            currentPage++;
          }
        }
      }

      // Save the PDF - generate blob and trigger download
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `draft-deck-with-images-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error creating PDF with images. This might be due to image loading issues. Please try again or use the TXT download instead.');
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
            
            {!deckBuildingMode ? (
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
            ) : (
              <div className="mb-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Main Deck */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium dark:text-white">Main Deck ({getTotalDeckSize()}/60)</h4>
                      <div className="text-sm dark:text-gray-300">
                        {mainDeck.length} cards + {getTotalLands()} lands
                      </div>
                    </div>
                    
                    {/* Basic Lands Section */}
                    <div className="mb-4 p-3 bg-white dark:bg-gray-600 rounded">
                      <h5 className="font-medium mb-2 dark:text-white">Basic Lands</h5>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(basicLands).map(([landType, count]) => {
                          const colorMap: { [key: string]: string } = {
                            'Plains': 'W',
                            'Island': 'U', 
                            'Swamp': 'B',
                            'Mountain': 'R',
                            'Forest': 'G'
                          };
                          return (
                            <div key={landType} className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto mb-1 ${getCardColorClasses([colorMap[landType]])}`}></div>
                              <div className="flex items-center justify-center space-x-1">
                                <button 
                                  onClick={() => updateBasicLands(landType, count - 1)}
                                  className="w-6 h-6 text-xs bg-gray-300 hover:bg-gray-400 rounded"
                                  disabled={count === 0}
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-sm dark:text-white">{count}</span>
                                <button 
                                  onClick={() => updateBasicLands(landType, count + 1)}
                                  className="w-6 h-6 text-xs bg-gray-300 hover:bg-gray-400 rounded"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-xs dark:text-gray-300">{landType}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Main Deck Cards */}
                    <div 
                      className="min-h-32 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded p-2"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'main')}
                    >
                      <div className="flex flex-wrap">
                        {/* Non-land cards */}
                        {mainDeck.map((card, index) => (
                          <div 
                            key={`main-${card.id}-${index}`}
                            className="inline-block mr-2 mb-2 cursor-move"
                            draggable
                            onDragStart={(e) => handleDragStart(e, card, 'main')}
                            onClick={() => moveCardToSideboard(card)}
                            title="Click or drag to move to sideboard"
                          >
                            {card.imageUrl ? (
                              <img 
                                src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                                alt={card.name} 
                                className="w-20 h-28 object-cover rounded shadow-sm hover:shadow-md transition-shadow"
                              />
                            ) : (
                              <div className={`w-20 h-28 ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 rounded p-1 shadow-sm hover:shadow-md transition-shadow`}>
                                <p className="text-xs truncate font-medium dark:text-white">{card.name}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Basic land cards */}
                        {getBasicLandCards().map((landCard, index) => (
                          <div 
                            key={`land-${landCard.id}-${index}`}
                            className="inline-block mr-2 mb-2 relative"
                            title={`${landCard.name} - Basic Land`}
                          >
                            <img 
                              src={`${API_BASE_URL}/image-proxy?url=${encodeURIComponent(landCard.imageUrl)}`} 
                              alt={landCard.name} 
                              className="w-20 h-28 object-cover rounded shadow-sm"
                            />
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl">
                              Land
                            </div>
                          </div>
                        ))}
                      </div>
                      {mainDeck.length === 0 && getTotalLands() === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          Drag cards here to build your main deck (max 40 cards)
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Sideboard */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-4 dark:text-white">Sideboard ({sideboard.length} cards)</h4>
                    <div 
                      className="min-h-32 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded p-2"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'sideboard')}
                    >
                      <div className="flex flex-wrap">
                        {sideboard.map((card, index) => (
                          <div 
                            key={`sideboard-${card.id}-${index}`}
                            className="inline-block mr-2 mb-2 cursor-move"
                            draggable
                            onDragStart={(e) => handleDragStart(e, card, 'sideboard')}
                            onClick={() => moveCardToMain(card)}
                            title="Click or drag to move to main deck"
                          >
                            {card.imageUrl ? (
                              <img 
                                src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                                alt={card.name} 
                                className="w-20 h-28 object-cover rounded shadow-sm hover:shadow-md transition-shadow"
                              />
                            ) : (
                              <div className={`w-20 h-28 ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 rounded p-1 shadow-sm hover:shadow-md transition-shadow`}>
                                <p className="text-xs truncate font-medium dark:text-white">{card.name}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {sideboard.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          All cards are in your main deck
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            
            <div className="flex flex-col space-y-4">
              {/* Download Options */}
              <div className="flex justify-center space-x-4">
                {!deckBuildingMode ? (
                  <>
                    <button 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={startDeckBuilding}
                      title="Build a 40-card deck from your draft pool"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Build Deck
                    </button>
                    
                    <button 
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={downloadDeckAsTxt}
                      title="Download your draft pool as a text file"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download as TXT
                    </button>
                    
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={downloadDeckAsPdf}
                      title="Download your draft pool as a PDF file"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download as PDF
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={exitDeckBuilding}
                      title="Exit deck building mode"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Exit Deck Building
                    </button>
                    
                    <button 
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={downloadDeckAsTxt}
                      title="Download your constructed deck as a text file"
                      disabled={mainDeck.length === 0}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Deck TXT
                    </button>
                    
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      onClick={downloadDeckAsPdf}
                      title="Download your constructed deck as a PDF file"
                      disabled={mainDeck.length === 0}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Deck PDF
                    </button>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <button 
                  className="btn-primary"
                  onClick={startDraft}
                >
                  New Draft
                </button>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="btn-secondary"
                    onClick={toggleBotPicks}
                  >
                    {botPicksVisible ? 'Hide Bot Picks' : 'Show Bot Picks'}
                  </button>
                  
                  <button 
                    className="btn-secondary"
                    onClick={decksVisible ? toggleDecksVisible : showDecks}
                    disabled={!draftComplete || deckBuildingLoading}
                  >
                    {deckBuildingLoading ? 'Building Decks...' : (decksVisible ? 'Hide Decks' : 'Show Decks')}
                  </button>
                  
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    onClick={downloadAllBotPoolsAsTxt}
                    title="Download all bot draft pools in one file"
                  >
                    All Pools TXT
                  </button>
                  
                  <button 
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    onClick={downloadAllBotDecksAsTxt}
                    title="Download all bot constructed decks in one file"
                    disabled={constructedDecks.length === 0}
                  >
                    All Decks TXT
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {botPicksVisible && (
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-4 dark:text-white">Bot Decks</h4>
              
              <div className="space-y-4">
                {bots.map(bot => (
                  <div key={bot.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center cursor-pointer flex-grow" 
                        onClick={() => toggleBotTab(bot.id)}
                      >
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
                        <div className="flex items-center ml-auto mr-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
                            {bot.picks.length} cards picked
                          </span>
                          <svg 
                            className={`w-5 h-5 transition-transform duration-200 ${openBotTabs.includes(bot.id) ? 'transform rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Individual download buttons */}
                      <div className="flex space-x-2">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadBotPoolAsTxt(bot);
                          }}
                          title={`Download ${bot.name}'s draft pool`}
                        >
                          Pool
                        </button>
                        
                        {findConstructedDeckForBot(bot.id) && (
                          <button
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadBotDeckAsTxt(bot);
                            }}
                            title={`Download ${bot.name}'s constructed deck`}
                          >
                            Deck
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {openBotTabs.includes(bot.id) && (
                      <div className="mt-3">
                        <div className="flex items-end justify-between mb-3">
                          <h6 className="font-medium text-sm dark:text-white">
                            {bot.deckBuilt ? 'Deck Built' : 'Cards Picked'}
                          </h6>
                          {bot.deckBuilt && (
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                40-card deck ({bot.deck.totalCards} spells + {bot.deck.totalLandCount} lands)
                              </span>
                              <div className="flex items-center mt-1">
                                {Object.entries(bot.deck.basicLands as Record<string, number>).map(([color, count]) => (
                                  <div key={color} className="flex items-center mx-1" title={`${count} ${color} basic lands`}>
                                    <span 
                                      className={`w-4 h-4 rounded-full mr-1 ${getCardColorClasses([color])}`}
                                    />
                                    <span className="text-xs">{count}</span>
                                  </div>
                                ))}
                                {bot.deck.nonBasicLands.length > 0 && (
                                  <div className="flex items-center mx-1" title={`${bot.deck.nonBasicLands.length} non-basic lands`}>
                                    <span className="w-4 h-4 rounded-full mr-1 bg-mtg-gold"></span>
                                    <span className="text-xs">{bot.deck.nonBasicLands.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {(bot.deckBuilt ? 
                            // If deck is built, show the deck cards first
                            [...bot.deck.cards, ...bot.picks.filter((pick: any) => 
                              !bot.deck.cards.some((deckCard: any) => deckCard.id === pick.id)
                            )] : 
                            // Otherwise show all picks
                            bot.picks
                          ).map((card: any, index: number) => (
                            <div 
                              key={`${card.id}-${index}`} 
                              className="relative group"
                            >
                              {card.imageUrl ? (
                                <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
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
                                    <div className="flex justify-between items-center">
                                      <div className="flex">
                                        {card.colors.map((color: string) => (
                                          <span 
                                            key={color} 
                                            className="w-3 h-3 rounded-full mr-0.5"
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
                                      <p className="text-white text-xs">P{card.packNumber}-P{card.pickNumber}</p>
                                    </div>
                                  </div>
                                  <CardHoverPreview card={card} />
                                </div>
                              ) : (
                                <div className={`aspect-[2.5/3.5] ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
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
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs dark:text-gray-300">{card.type?.split(' ')[0]}</span>
                                    <span className="text-xs dark:text-white">P{card.packNumber}-P{card.pickNumber}</span>
                                  </div>
                                </div>
                              )}
                              {bot.deckBuilt && bot.deck.cards.some((deckCard: any) => deckCard.id === card.id) && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                                  Deck
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {decksVisible && (
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium dark:text-white">Constructed 40-Card Decks</h4>
              </div>
              
              <div className="space-y-4">
                {constructedDecks.map((deck, index) => (
                  <div key={`deck-${deck.bot_id}-${index}`} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center cursor-pointer flex-grow" 
                        onClick={() => toggleBotTab(parseInt(deck.bot_id))}
                      >
                        <div className="flex items-center">
                          <h5 className="font-medium text-lg dark:text-white">{deck.bot_name}</h5>
                          <div className="flex ml-3">
                            {deck.colors && deck.colors.map((color: string) => (
                              <span 
                                key={color} 
                                className={`w-5 h-5 rounded-full mx-0.5 ${getCardColorClasses([color])}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center ml-auto mr-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
                            {deck.full_deck ? deck.full_deck.length : 0} cards
                            {deck.error && (
                              <span className="text-red-500 ml-2">ERROR</span>
                            )}
                          </span>
                          <svg 
                            className={`w-5 h-5 transition-transform duration-200 ${openBotTabs.includes(parseInt(deck.bot_id)) ? 'transform rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Individual download buttons for constructed decks */}
                      {!deck.error && (
                        <div className="flex space-x-2">
                          <button
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Create a bot-like object for the download function
                              const botForDownload = { 
                                id: parseInt(deck.bot_id), 
                                name: deck.bot_name 
                              };
                              downloadBotDeckAsTxt(botForDownload);
                            }}
                            title={`Download ${deck.bot_name}'s constructed deck`}
                          >
                            Deck
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {openBotTabs.includes(parseInt(deck.bot_id)) && (
                      <div className="mt-3">
                        {deck.error ? (
                          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded-lg">
                            <p className="font-medium">Error building deck:</p>
                            <p>{deck.error}</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-end justify-between mb-3">
                              <h6 className="font-medium text-sm dark:text-white">
                                40-Card Constructed Deck
                              </h6>
                                                             <div className="flex flex-col items-end">
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                   {deck.non_lands ? deck.non_lands.length : 0} spells + {deck.lands ? deck.lands.length : 0} lands
                                 </span>
                                 <span className="text-xs text-gray-500 dark:text-gray-400">
                                   Sideboard: {deck.sideboard ? deck.sideboard.length : 0} cards
                                 </span>
                                <div className="flex items-center mt-1">
                                  {deck.lands && deck.lands.filter((land: any) => land.isBasicLand).reduce((acc: any, land: any) => {
                                    const landType = land.name || 'Unknown';
                                    acc[landType] = (acc[landType] || 0) + 1;
                                    return acc;
                                  }, {}) && Object.entries(deck.lands.filter((land: any) => land.isBasicLand).reduce((acc: any, land: any) => {
                                    const landType = land.name || 'Unknown';
                                    acc[landType] = (acc[landType] || 0) + 1;
                                    return acc;
                                  }, {})).map(([landType, count]) => (
                                    <div key={landType} className="flex items-center mx-1" title={`${count} ${landType}`}>
                                      <span className={`w-4 h-4 rounded-full mr-1 ${
                                        landType === 'Plains' ? 'bg-yellow-200' :
                                        landType === 'Island' ? 'bg-blue-500' :
                                        landType === 'Swamp' ? 'bg-gray-800' :
                                        landType === 'Mountain' ? 'bg-red-500' :
                                        landType === 'Forest' ? 'bg-green-500' :
                                        'bg-gray-400'
                                      }`} />
                                      <span className="text-xs">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {/* Non-land cards */}
                              {deck.non_lands && deck.non_lands.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Spells ({deck.non_lands.length})
                                  </h6>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                    {deck.non_lands.map((card: any, cardIndex: number) => (
                                      <div 
                                        key={`${card.id}-nonland-${cardIndex}`} 
                                        className="relative group"
                                      >
                                        {card.imageUrl ? (
                                          <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
                                            <img 
                                              src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                                              alt={card.name} 
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                console.error('Error loading image:', card.imageUrl);
                                                e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                                              }}
                                            />
                                            <CardHoverPreview card={card} />
                                          </div>
                                        ) : (
                                          <div className={`aspect-[2.5/3.5] ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
                                            <p className="text-sm truncate font-medium dark:text-white">{card.name}</p>
                                            <div className="flex justify-center">
                                              {card.colors && card.colors.map((color: string) => (
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
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs dark:text-gray-300">{card.type?.split(' ')[0]}</span>
                                              <span className="text-xs dark:text-white">{card.cmc || 0}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Land cards */}
                              {deck.lands && deck.lands.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Lands ({deck.lands.length})
                                  </h6>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                    {deck.lands.map((card: any, cardIndex: number) => {
                                      // Debug logging for basic lands
                                      if (card.isBasicLand) {
                                        console.log('Basic land card:', card.name, 'imageUrl:', card.imageUrl, 'isBasicLand:', card.isBasicLand);
                                      }
                                      return (
                                        <div 
                                          key={`${card.id}-land-${cardIndex}`} 
                                          className="relative group"
                                        >
                                          {card.imageUrl ? (
                                            <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200">
                                              <img 
                                                src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                                                alt={card.name} 
                                                className="w-full h-full object-cover"
                                              />
                                              <CardHoverPreview card={card} />
                                            </div>
                                          ) : (
                                            <div className={`aspect-[2.5/3.5] ${card.isBasicLand ? 'bg-amber-100 dark:bg-amber-900' : getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-center items-center rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200`}>
                                              <p className="text-sm font-medium dark:text-white text-center">{card.name}</p>
                                              {card.isBasicLand && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Basic Land</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                                                 </div>
                               )}
                               
                               {/* Sideboard cards */}
                               {deck.sideboard && deck.sideboard.length > 0 && (
                                 <div>
                                   <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                     Sideboard ({deck.sideboard.length})
                                   </h6>
                                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                     {deck.sideboard.map((card: any, cardIndex: number) => (
                                       <div 
                                         key={`${card.id}-sideboard-${cardIndex}`} 
                                         className="relative group"
                                       >
                                         {card.imageUrl ? (
                                           <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded shadow-md hover:shadow-lg transition-shadow duration-200 opacity-75">
                                             <img 
                                               src={card.imageUrl.startsWith('data:') ? card.imageUrl : `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`} 
                                               alt={card.name} 
                                               className="w-full h-full object-cover"
                                               onError={(e) => {
                                                 console.error('Error loading image:', card.imageUrl);
                                                 e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                                               }}
                                             />
                                             <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-1 rounded-bl">
                                               SB
                                             </div>
                                             <CardHoverPreview card={card} />
                                           </div>
                                         ) : (
                                           <div className={`aspect-[2.5/3.5] ${getCardColorClasses(card.colors)} bg-opacity-20 dark:bg-opacity-30 flex flex-col justify-between rounded p-2 shadow-md hover:shadow-lg transition-shadow duration-200 opacity-75`}>
                                             <p className="text-sm truncate font-medium dark:text-white">{card.name}</p>
                                             <div className="flex justify-center">
                                               {card.colors && card.colors.map((color: string) => (
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
                                             <div className="flex justify-between items-center">
                                               <span className="text-xs dark:text-gray-300">{card.type?.split(' ')[0]}</span>
                                               <span className="text-xs dark:text-white">{card.cmc || 0}</span>
                                             </div>
                                             <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-1 rounded-bl">
                                               SB
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           </>
                         )}
                       </div>
                     )}
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
                      {/* <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-1 sm:p-2">
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
                      </div> */}
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
                <div className="flex space-x-2">
                  <button 
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={toggleBotPicks}
                  >
                    {botPicksVisible ? 'Hide Bot Picks' : 'Show Bot Picks'}
                  </button>
                </div>
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
