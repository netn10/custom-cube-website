'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCards, getTokenByName, API_BASE_URL, getGeminiResponse, getCardComments, addComment, deleteComment, addCardHistory, getCardHistory } from '@/lib/api';
import { FaRobot, FaTrash, FaHistory, FaPlus, FaSave, FaCopy } from 'react-icons/fa';
import { Card, Token, Comment } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import CardPreview from '@/components/CardPreview';
import RelatedFaceCardDetail from '@/components/RelatedFaceCardDetail';
import CardHistoryModal from '@/components/CardHistoryModal';

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isAdmin, user } = useAuth();
  
  // Store token image URLs
  const [tokenImages, setTokenImages] = useState<{[name: string]: string}>({});
  // Store related face image URL
  const [relatedFaceImage, setRelatedFaceImage] = useState<string>('');
  // AI Archetype Analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisRequested, setAiAnalysisRequested] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);
  
  // Card History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddHistoryForm, setShowAddHistoryForm] = useState(false);
  const [historyNote, setHistoryNote] = useState('');
  const [addingHistory, setAddingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySuccess, setHistorySuccess] = useState<string | null>(null);
  const [customCardData, setCustomCardData] = useState<Partial<Card> | null>(null);
  const [useCustomData, setUseCustomData] = useState(false);
  const [hasHistory, setHasHistory] = useState<boolean>(false);
  
  // Copy feedback state
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  
  // Archetype data
  const archetypes = [
    { id: 'wu-storm', name: 'Storm', colors: ['W', 'U'], description: 'Cast multiple spells in a turn to trigger powerful effects.' },
    { id: 'ub-broken-cipher', name: 'Broken Cipher', colors: ['U', 'B'], description: 'Encode secrets onto creatures and gain value when they deal combat damage.' },
    { id: 'br-token-collection', name: 'Token Collection', colors: ['B', 'R'], description: 'Create and collect various token types for different synergies.' },
    { id: 'rg-control', name: 'Control', colors: ['R', 'G'], description: 'An unusual take on control using red and green to dominate the board.' },
    { id: 'gw-vehicles', name: 'Vehicles', colors: ['G', 'W'], description: 'Crew powerful artifact vehicles with your creatures for strong attacks.' },
    { id: 'wb-blink', name: 'Blink/ETB/Value', colors: ['W', 'B'], description: 'Flicker creatures in and out of the battlefield to accumulate triggers.' },
    { id: 'bg-artifacts', name: 'Artifacts', colors: ['B', 'G'], description: 'Leverage artifacts for value and synergy in an unusual color combination.' },
    { id: 'ur-enchantments', name: 'Enchantments', colors: ['U', 'R'], description: 'Use enchantments to control the game and generate value over time.' },
    { id: 'rw-self-mill', name: 'Self-mill', colors: ['R', 'W'], description: 'Put cards from your library into your graveyard for value and synergy.' },
    { id: 'gu-prowess', name: 'Prowess', colors: ['G', 'U'], description: 'Cast non-creature spells to trigger bonuses on your creatures.' },
  ];

  // Get the current URL parameters to preserve when going back to the cube list
  const getBackToCubeListURL = () => {
    // Get all search parameters from the current URL
    const currentParams = new URLSearchParams();
    
    // Copy the parameters we want to preserve
    const preserveParams = ['search', 'bodySearch', 'colors', 'colorMatch', 'type', 'set', 'custom', 'page', 'limit', 'sort'];
    
    // Check if we have parameters in the URL
    let hasURLParams = false;
    preserveParams.forEach(param => {
      if (searchParams.has(param)) {
        currentParams.set(param, searchParams.get(param)!);
        hasURLParams = true;
      }
    });
    
    // If we don't have URL parameters, try to load from localStorage
    if (!hasURLParams && typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('cubeListFilters');
      if (savedFilters) {
        const savedParams = new URLSearchParams(savedFilters);
        preserveParams.forEach(param => {
          if (savedParams.has(param)) {
            currentParams.set(param, savedParams.get(param)!);
          }
        });
      }
    }
    
    // Build the URL
    const queryString = currentParams.toString();
    return `/cube-list${queryString ? `?${queryString}` : ''}`;
  };
  const [card, setCard] = useState<Card | null>(null);
  const [relatedCard, setRelatedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store current search parameters in localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Only store parameters if we have at least one filter parameter
      const preserveParams = ['search', 'bodySearch', 'colors', 'colorMatch', 'type', 'set', 'custom', 'page', 'limit', 'sort'];
      let hasAnyParams = false;
      
      preserveParams.forEach(param => {
        if (searchParams.has(param)) {
          hasAnyParams = true;
        }
      });
      
      // Only save if we have parameters and came from the cube list
      const referrer = document.referrer;
      if (hasAnyParams && referrer.includes('/cube-list')) {
        localStorage.setItem('cubeListFilters', searchParams.toString());
      }
    }
  }, [searchParams]);
  
  // Function to fetch comments for the current card
  const fetchComments = async (cardId: string) => {
    try {
      const commentsData = await getCardComments(cardId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setCommentError('Failed to load comments. Please try again later.');
    }
  };

  // Function to handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentContent.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    
    if (!isAuthenticated && !guestUsername.trim()) {
      setCommentError('Please enter a username to post as a guest.');
      return;
    }
    
    if (!card?.id) {
      setCommentError('Card information is missing.');
      return;
    }
    
    try {
      setIsSubmittingComment(true);
      setCommentError(null);
      
      // Create a mock comment for immediate display
      const tempId = `temp-${Date.now()}`;
      const currentTime = new Date().toISOString();
      const displayName = isAuthenticated ? (user?.username || 'User') : guestUsername.trim();
      
      // Create a temporary comment to show immediately
      const tempComment: Comment = {
        id: tempId,
        cardId: card.id,
        userId: isAuthenticated ? (user?.id || 'guest') : 'guest',
        username: displayName,
        content: commentContent,
        createdAt: currentTime
      };
      
      // Add the temporary comment to the UI
      setComments(prevComments => [tempComment, ...prevComments]);
      
      // Prepare the data to send to the API
      let commentData: CommentFormData = { content: commentContent };
      let token: string | null = null;
      
      // If user is authenticated, use their token
      if (isAuthenticated) {
        token = localStorage.getItem('auth_token');
        if (!token) {
          // Even if token is missing, we've already shown the temp comment
          console.warn('Authentication token is missing, but proceeding with guest comment');
        }
      } else {
        // For non-authenticated users, include the guest username
        commentData.username = guestUsername.trim();
      }
      
      // Clear the comment input field immediately for better UX
      setCommentContent('');
      
      // Send the comment to the server
      try {
        const newComment = await addComment(card.id, commentData, token || undefined);
        
        // Replace the temporary comment with the real one from the server
        setComments(prevComments => {
          return prevComments.map(comment => 
            comment.id === tempId ? newComment : comment
          );
        });
      } catch (error) {
        // If the server request fails, keep the temporary comment but mark it as failed
        console.error('Error submitting comment to server:', error);
        setComments(prevComments => {
          return prevComments.map(comment => 
            comment.id === tempId ? {
              ...comment,
              content: comment.content + ' [Failed to save - please try again]',
            } : comment
          );
        });
        setCommentError('Comment displayed locally but failed to save to server. Please try again.');
      }
    } catch (error) {
      console.error('Error in comment submission process:', error);
      setCommentError('Failed to submit comment. Please try again later.');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Function to handle comment deletion
  const handleDeleteComment = async (commentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCommentError('Authentication token is missing. Please log in again.');
        return;
      }
      
      await deleteComment(commentId, token);
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setCommentError('Failed to delete comment. Please try again later.');
    }
  };

  useEffect(() => {
    if (params.id) {
      // Check if a card has history
  const checkCardHistory = async (cardId: string) => {
    if (!cardId) {
      console.error('No card ID provided for history check');
      setHasHistory(false);
      return;
    }
    
    try {
      console.log('Checking history for card ID:', cardId);
      console.log('API Base URL:', API_BASE_URL);
      
      const history = await getCardHistory(cardId, 1, 1);
      console.log('History response:', {
        total: history.total,
        history: history.history.map(h => ({
          id: h._id,
          timestamp: h.timestamp,
          version_data: {
            name: h.version_data.name,
            type: h.version_data.type
          }
        }))
      });
      const hasHistory = history.total > 0;
      console.log('Has history:', hasHistory);
      setHasHistory(hasHistory);
      
      // If no history found, log the exact request URL for debugging
      if (!hasHistory) {
        console.log(`No history found for card ID: ${cardId}`);
        console.log(`History endpoint: ${API_BASE_URL}/cards/${cardId}/history?page=1&limit=1`);
        console.log('Card ID format:', typeof cardId);
      }
    } catch (error) {
      console.error('Error checking card history:', error);
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      // Don't set hasHistory to false here as it might be a temporary error
      // The button will still be hidden by default
    }
  };

  // Fetch card data from API using name search
  const fetchCard = async () => {
    try {
      const cardName = decodeURIComponent(params.id as string);
      const exactSearchResults = await getCards({ search: `"${cardName}"`, limit: 10, include_facedown: true });
      
      // If we don't get an exact match, try a broader search
      let searchResults = exactSearchResults;
      if (exactSearchResults.cards.length === 0) {
        searchResults = await getCards({ search: cardName, limit: 10, include_facedown: true });
      }
      
      // Look for cards in the results
      const cards = searchResults.cards;
      
      // First, try to find an exact name match (case insensitive)
      const exactMatch = cards.find(c => 
        c.name.toLowerCase() === cardName.toLowerCase()
      );
      
      // Determine the card to use - exact match, first result, or facedown card
      let cardToUse: Card | null = null;
      
      if (exactMatch) {
        cardToUse = exactMatch;
      }
          
          setCard(cardToUse);
            
          // If the card has a related face, fetch that card
          if (cardToUse && cardToUse.relatedFace) {
            try {
              // Search for the card by name
              const relatedCardResults = await getCards({ search: cardToUse.relatedFace, include_facedown: true });
              if (relatedCardResults.cards.length > 0) {
                setRelatedCard(relatedCardResults.cards[0]);
                // Save the related face image URL if available
                if (relatedCardResults.cards[0].imageUrl) {
                  setRelatedFaceImage(relatedCardResults.cards[0].imageUrl);
                }
              }
            } catch (err) {
              console.error('Error fetching related card:', err);
            }
          }
          
          // Fetch comments and check history for the card if we have a valid card ID
          if (cardToUse && cardToUse.id) {
            fetchComments(cardToUse.id);
            console.log('Card data:', {
              id: cardToUse.id,
              name: cardToUse.name,
              // @ts-ignore - _id might exist on the object
              _id: cardToUse._id
            });
            // Try with both possible ID fields
            checkCardHistory(cardToUse.id);
            // @ts-ignore - _id might exist on the object
            if (cardToUse._id && cardToUse._id !== cardToUse.id) {
              console.log('Trying with _id field as well');
              checkCardHistory(cardToUse._id);
            }
          }
          
          // We don't automatically analyze with AI anymore - user must click the button
          
          // If card has related tokens, fetch their images using the token API
          if (cardToUse && cardToUse.relatedTokens && cardToUse.relatedTokens.length > 0) {
            try {
              
              // Create a batch request to fetch all token data using the token API
              const tokenPromises = cardToUse.relatedTokens.map(async (tokenName: string) => {
                try {
                  // Use the token-specific API endpoint
                  const token = await getTokenByName(tokenName);
                  
                  if (token && token.imageUrl) {
                    return { name: tokenName, imageUrl: token.imageUrl };
                  }
                } catch (tokenError) {
                  const tokenResults = await getCards({ search: `"${tokenName}"`, include_facedown: true });
                  
                  if (tokenResults.cards.length > 0) {
                    const tokenCard = tokenResults.cards[0];                    
                    if (tokenCard.imageUrl) {
                      return { name: tokenName, imageUrl: tokenCard.imageUrl };
                    }
                  }
                }
                
                return { name: tokenName, imageUrl: '' };
              });
              
              const tokenData = await Promise.all(tokenPromises);
              const tokenImageMap = tokenData.reduce((acc, token) => {
                if (token.imageUrl) {
                  acc[token.name] = token.imageUrl;
                }
                return acc;
              }, {} as {[name: string]: string});
              
              setTokenImages(tokenImageMap);
            } catch (err) {
              console.error('Error fetching token images:', err);
            }
          }
        } catch (err) {
          console.error('Error fetching card:', err);
          setError('Failed to load card details. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCard();
    }
  }, [params.id]);
  
  const getAIAnalysis = async () => {
    // Check if card exists
    if (!card) return;
    
    // Check if analysis was already requested
    if (aiAnalysisRequested) return;
    
    // Check for rate limiting (only allow one request per minute)
    const now = Date.now();
    if (lastAnalysisTime && now - lastAnalysisTime < 60000) {
      setAiResponse('Please wait at least 1 minute between AI analysis requests.');
      return;
    }
    
    try {
      setAiLoading(true);
      setAiAnalysisRequested(true);
      setLastAnalysisTime(now);
      
      // Create a detailed prompt for the AI
      const archetypeDescriptions = archetypes.map(a => 
        `${a.name} (${a.colors.join('/')}): ${a.description}`
      ).join('\n');
      
      // Build a description of the card
      let cardDescription = `${card.name} - ${card.type}`;
      if (card.manaCost) {
        cardDescription += ` - Mana Cost: ${card.manaCost}`;
      }
      if (card.power && card.toughness) {
        cardDescription += ` (${card.power}/${card.toughness})`;
      }
      if (card.colors && card.colors.length > 0) {
        cardDescription += ` - Colors: ${card.colors.join('/')}`;
      }
      if (card.text) {
        cardDescription += `\nCard Text: ${card.text}`;
      }
      
      const prompt = `You are an expert Magic: The Gathering card analyst. Based on the following card description, determine which archetype(s) from our custom cube would be the best fit for this card. Explain why the card fits into these archetypes and how it could be used strategically. Be specific and detailed in your analysis.\n\nCard: "${cardDescription}"\n\nAvailable archetypes in our cube:\n${archetypeDescriptions}\n\nProvide your analysis in a concise format with clear recommendations.`;
      
      // Call the Gemini API
      const response = await getGeminiResponse(prompt);
      setAiResponse(response.response);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      setAiResponse('Sorry, there was an error analyzing this card with AI. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };
  
  const handleAnalysisButtonClick = () => {
    setShowAiAnalysis(true);
    if (!aiAnalysisRequested) {
      getAIAnalysis();
    }
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
        <h2 className="text-2xl font-bold mb-4 dark:text-white">{error}</h2>
        <button 
          onClick={() => router.push(getBackToCubeListURL())} 
          className="btn-primary"
        >
          Back to Cube List
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Card Not Found</h2>
        <p className="mb-6 dark:text-gray-300">The card you're looking for with name "{decodeURIComponent(params.id as string)}" doesn't exist or has been removed.</p>
        <button 
          onClick={() => router.push(getBackToCubeListURL())} 
          className="btn-primary"
        >
          Back to Cube List
        </button>
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

  // Create a general helper function for symbol spans
  const createSymbolSpan = (color: string, content: string, title?: string, size: string = 'w-5 h-5') => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<span style="display:inline-flex;vertical-align:middle" class="mx-0.5"><span class="inline-block ${size} ${color} rounded-full flex items-center justify-center text-xs font-bold"${titleAttr}>${content}</span></span>`;
  };
  
  // Function to format mana cost with colored symbols
  const formatManaCost = (manaCost: string) => {
    if (!manaCost) return '';
    
    return manaCost.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle Phyrexian mana symbols in either U/P or P/U format
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `${color}/P`, `Phyrexian ${color}`, 'w-6 h-6');
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `P/${color}`, `Phyrexian ${color}`, 'w-6 h-6');
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        // First check if both are colors
        if (colors.length === 2 && colors.every(c => 'WUBRG'.includes(c))) {
          return createSymbolSpan(`bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()}`, symbol, `${colors[0]}/${colors[1]}`, 'w-6 h-6');
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return createSymbolSpan(colorMap[symbol], symbol, undefined, 'w-6 h-6');
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return createSymbolSpan('bg-mtg-colorless text-black', symbol, undefined, 'w-6 h-6');
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return createSymbolSpan('bg-mtg-colorless text-black', 'X', 'Variable Mana', 'w-6 h-6');
      }
      
      // Return the original match if no specific formatting applies
      return `<span class="inline-block w-6 h-6 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
    });
  };

  // Function to format card text with appropriate symbols while preserving line breaks
  const formatCardText = (text: string) => {
    if (!text) return '';
        
    // Replace all mana symbols with their HTML equivalents
    const processedText = text.replace(/\{([^}]+)\}/g, (match, symbol) => {
      // Handle tap symbol
      if (symbol === 'T') {
        return createSymbolSpan('bg-gray-300 dark:bg-gray-600', 'T', 'Tap');
      }
      
      // Handle untap symbol
      if (symbol === 'Q') {
        return createSymbolSpan('bg-gray-300 dark:bg-gray-600', 'Q', 'Untap');
      }
      
      // Handle Phyrexian mana symbols in either U/P or P/U format
      if (symbol.includes('/P')) {
        const color = symbol.split('/')[0];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `${color}/P`, `Phyrexian ${color}`);
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `P/${color}`, `Phyrexian ${color}`);
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        // First check if both are colors
        if (colors.length === 2 && colors.every(c => 'WUBRG'.includes(c))) {
          return createSymbolSpan(`bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()}`, symbol, `${colors[0]}/${colors[1]}`);
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return createSymbolSpan(colorMap[symbol], symbol);
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return createSymbolSpan('bg-mtg-colorless text-black', symbol);
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return createSymbolSpan('bg-mtg-colorless text-black', 'X', 'Variable Mana');
      }
      
      // Return the original match if no specific formatting applies
      return match;
    });
    
    // Now handle line breaks by converting them to <br /> tags
    // This preserves all original line breaks in the text
    return processedText.replace(/\n/g, '<br />');
  };

  // Function to convert formatted card text back to plain text for copying
  const getPlainCardText = (text: string) => {
    if (!text) return '';
    
    // Convert HTML back to plain text
    let plainText = text
      // Replace <br /> tags with newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    return plainText;
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, successMessage: string = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(successMessage);
      // Clear message after 2 seconds
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyMessage(successMessage);
        setTimeout(() => setCopyMessage(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
        setCopyMessage('Failed to copy text');
        setTimeout(() => setCopyMessage(null), 2000);
      }
      document.body.removeChild(textArea);
    }
  };

  // Function to copy just the card text
  const copyCardText = () => {
    if (!card?.text) return;
    const plainText = getPlainCardText(card.text);
    copyToClipboard(plainText, 'Card text copied to clipboard!');
  };

  // Function to copy complete card information
  const copyFullCard = () => {
    if (!card) return;
    
    const plainText = getPlainCardText(card.text);
    const flavorText = card.flavorText ? getPlainCardText(card.flavorText) : '';
    
    let fullCardText = `${card.name}\n`;
    if (card.manaCost) {
      fullCardText += `${card.manaCost}\n`;
    }
    fullCardText += `${card.type}\n`;
    if (plainText) {
      fullCardText += `\n${plainText}\n`;
    }
    if (card.power && card.toughness) {
      fullCardText += `\n${card.power}/${card.toughness}\n`;
    }
    if (flavorText) {
      fullCardText += `\n${flavorText}\n`;
    }
    if (card.artist) {
      fullCardText += `\nIllustrated by ${card.artist}`;
    }
    if (card.set) {
      fullCardText += `\nSet: ${card.set}`;
    }
    
    copyToClipboard(fullCardText, 'Full card information copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button 
          onClick={() => router.push(getBackToCubeListURL())} 
          className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Cube List
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 p-4 flex justify-center">
            {card.imageUrl ? (
              card.relatedFace && relatedCard ? (
                <RelatedFaceCardDetail 
                  card={card} 
                  relatedCard={relatedCard} 
                  className="mtg-card-detail fixed-card-size object-contain"
                />
              ) : (
                <img 
                  src={`${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`}
                  alt={card.name}
                  className="mtg-card-detail fixed-card-size object-contain"
                  onError={(e) => {
                    console.error('Error loading image:', card.imageUrl);
                    e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                  }}
                />
              )
            ) : (
              <div className="mtg-card-detail bg-gray-300 dark:bg-gray-700 flex items-center justify-center fixed-card-size object-contain">
                <span className="text-gray-500 dark:text-gray-400">No Image Available</span>
              </div>
            )}
          </div>
          
          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold dark:text-white">{card.name}</h1>
              <div 
                className="mana-cost flex flex-row flex-wrap" 
                dangerouslySetInnerHTML={{ __html: formatManaCost(card.manaCost) }} 
              />
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 italic">{card.type}</p>
              <div className="flex mt-2">
                {card.colors.map((color: string) => (
                  <span 
                    key={color} 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-1 ${colorMap[color]}`}
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <button
                onClick={handleAnalysisButtonClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FaRobot className="text-white" />
                <span>AI Analysis</span>
              </button>
              
              {/* Card History Button - Only show if card has history */}
              {hasHistory && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaHistory className="text-white" />
                  <span>View History</span>
                </button>
              )}
              
              {/* Add History Button (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => setShowAddHistoryForm(!showAddHistoryForm)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaPlus className="text-white" />
                  <span>Add History</span>
                </button>
              )}
            </div>
            
            {/* Add History Form (Admin Only) */}
            {isAdmin && showAddHistoryForm && (
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-4 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">Add History Entry</h3>
                {historyError && (
                  <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-2 rounded mb-2">
                    {historyError}
                  </div>
                )}
                {historySuccess && (
                  <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-2 rounded mb-2">
                    {historySuccess}
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="useCustomData"
                      checked={useCustomData}
                      onChange={(e) => {
                        setUseCustomData(e.target.checked);
                        if (e.target.checked && !customCardData && card) {
                          // Initialize with current card data
                          setCustomCardData({
                            ...card,
                            id: card.id,
                            _id: card.id
                          });
                        }
                      }}
                      className="mr-2 h-4 w-4"
                    />
                    <label htmlFor="useCustomData" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Customize card data for this history entry
                    </label>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={historyNote}
                    onChange={(e) => setHistoryNote(e.target.value)}
                    placeholder="Add a note about this version (e.g., 'Initial design', 'Balance adjustment')"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    rows={3}
                  />
                </div>
                
                {useCustomData && customCardData && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">Custom Card Data</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Card Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Card Name
                        </label>
                        <input
                          type="text"
                          value={customCardData.name || ''}
                          onChange={(e) => setCustomCardData({...customCardData, name: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Mana Cost */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mana Cost
                        </label>
                        <input
                          type="text"
                          value={customCardData.manaCost || ''}
                          onChange={(e) => setCustomCardData({...customCardData, manaCost: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <input
                          type="text"
                          value={customCardData.type || ''}
                          onChange={(e) => setCustomCardData({...customCardData, type: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Rarity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Rarity
                        </label>
                        <select
                          value={customCardData.rarity || 'Common'}
                          onChange={(e) => setCustomCardData({...customCardData, rarity: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="Common">Common</option>
                          <option value="Uncommon">Uncommon</option>
                          <option value="Rare">Rare</option>
                          <option value="Mythic Rare">Mythic Rare</option>
                        </select>
                      </div>
                      
                      {/* Power */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Power
                        </label>
                        <input
                          type="text"
                          value={customCardData.power || ''}
                          onChange={(e) => setCustomCardData({...customCardData, power: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Toughness */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Toughness
                        </label>
                        <input
                          type="text"
                          value={customCardData.toughness || ''}
                          onChange={(e) => setCustomCardData({...customCardData, toughness: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Loyalty */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Loyalty (for Planeswalkers)
                        </label>
                        <input
                          type="number"
                          value={customCardData.loyalty || ''}
                          onChange={(e) => setCustomCardData({...customCardData, loyalty: parseInt(e.target.value) || undefined})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Image URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Image URL
                        </label>
                        <input
                          type="text"
                          value={customCardData.imageUrl || ''}
                          onChange={(e) => setCustomCardData({...customCardData, imageUrl: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Artist */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Artist
                        </label>
                        <input
                          type="text"
                          value={customCardData.artist || ''}
                          onChange={(e) => setCustomCardData({...customCardData, artist: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    
                    {/* Card Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Card Text
                      </label>
                      <textarea
                        value={customCardData.text || ''}
                        onChange={(e) => setCustomCardData({...customCardData, text: e.target.value})}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={4}
                      />
                    </div>
                    
                    {/* Flavor Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Flavor Text
                      </label>
                      <textarea
                        value={customCardData.flavorText || ''}
                        onChange={(e) => setCustomCardData({...customCardData, flavorText: e.target.value})}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={2}
                      />
                    </div>
                    
                    {/* Preview of the card */}
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Card Preview</h5>
                      <div className="flex">
                        <div className="w-1/3">
                          {customCardData.imageUrl ? (
                            <img 
                              src={`${API_BASE_URL}/image-proxy?url=${encodeURIComponent(customCardData.imageUrl)}`}
                              alt={customCardData.name || 'Card'}
                              className="w-full rounded-lg shadow-md"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-full h-40 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="w-2/3 pl-4">
                          <h3 className="text-lg font-bold">{customCardData.name || 'Unnamed Card'}</h3>
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                            {customCardData.manaCost || ''}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {customCardData.type || 'No Type'}
                          </div>
                          <div className="text-sm mb-2">{customCardData.text || 'No text'}</div>
                          {(customCardData.power || customCardData.toughness) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              Power/Toughness: {customCardData.power || '0'}/{customCardData.toughness || '0'}
                            </div>
                          )}
                          {customCardData.loyalty && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              Loyalty: {customCardData.loyalty}
                            </div>
                          )}
                          {customCardData.artist && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                              Artist: {customCardData.artist}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      if (!card?.id) return;
                      
                      try {
                        setAddingHistory(true);
                        setHistoryError(null);
                        
                        const token = localStorage.getItem('token');
                        if (!token) {
                          setHistoryError('Authentication token is missing. Please log in again.');
                          return;
                        }
                        
                        const result = await addCardHistory(
                          card.id,
                          historyNote || 'Manual history entry',
                          token,
                          useCustomData ? customCardData || undefined : undefined
                        );
                        
                        setHistorySuccess('History entry added successfully!');
                        setHistoryNote('');
                        
                        // Auto-hide success message after 3 seconds
                        setTimeout(() => {
                          setHistorySuccess(null);
                        }, 3000);
                      } catch (error) {
                        console.error('Error adding history:', error);
                        setHistoryError('Failed to add history entry. Please try again.');
                      } finally {
                        setAddingHistory(false);
                      }
                    }}
                    disabled={addingHistory}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingHistory ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-white" />
                        <span>Save History</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddHistoryForm(false);
                      setHistoryNote('');
                      setHistoryError(null);
                      setHistorySuccess(null);
                      setUseCustomData(false);
                    }}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold dark:text-white">Card Text</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={copyCardText}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center space-x-1 transition-colors"
                    title="Copy card text only"
                  >
                    <FaCopy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </button>
                  <button
                    onClick={copyFullCard}
                    className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center space-x-1 transition-colors"
                    title="Copy complete card information"
                  >
                    <FaCopy className="w-3 h-3" />
                    <span>Copy Full Card</span>
                  </button>
                </div>
              </div>
              {copyMessage && (
                <div className="mb-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  {copyMessage}
                </div>
              )}
              <p className="dark:text-white text-base leading-relaxed" 
                 style={{ lineHeight: '1.6em' }}
                 dangerouslySetInnerHTML={{ __html: formatCardText(card.text) }} />
            </div>
            
            {(card.power && card.toughness) && (
              <div className="mb-4">
                <p className="text-lg font-semibold dark:text-white">
                  Power/Toughness: {card.power}/{card.toughness}
                </p>
              </div>
            )}
            
            <div className="mb-4">
              {card.flavorText && card.flavorText.trim() !== "" && (
                <p className="text-gray-600 dark:text-gray-400 italic">{card.flavorText}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Illustrated by {card.artist}</p>
            </div>

            {card.set && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Set: <span className="font-normal">{card.set}</span></p>
              </div>
            )}
            
            {card.notes && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Notes:</p>
                <p className="text-sm dark:text-gray-300 whitespace-pre-line">{card.notes}</p>
              </div>
            )}
            
            {card.relatedTokens && card.relatedTokens.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Related Tokens:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {card.relatedTokens.map((token: string) => {
                    return (
                      <CardPreview 
                        key={token} 
                        cardName={token} 
                        imageUrl={tokenImages[token] || ''}
                      >
                        <Link 
                          href={`/token/${encodeURIComponent(token)}`}
                          className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs"
                          onClick={(e) => {
                            // Prevent navigation if token images are still loading
                            if (!tokenImages[token]) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {token}
                        </Link>
                      </CardPreview>
                    );
                  })}
                </div>
              </div>
            )}
            
            {card.relatedFace && (
              <div className="mb-4">
                <p className="text-sm font-semibold dark:text-white">Related Face: 
                  <CardPreview cardName={card.relatedFace} imageUrl={relatedFaceImage || undefined}>
                    <Link 
                      href={`/card/${encodeURIComponent(card.relatedFace)}`}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {card.relatedFace}
                    </Link>
                  </CardPreview>
                </p>
              </div>
            )}
            
            {/* Edit Card Button - Only shown for authenticated admins */}
            {isAuthenticated && isAdmin && (
              <div className="mt-6 mb-4">
                <Link href={`/card/${encodeURIComponent(card.name)}/edit`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit Card
                </Link>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-4">
              {card.custom && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  Custom Card
                </span>
              )}
              
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                {card.rarity}
              </span>
              
              {card.archetypes.map((archetype: string) => {
                const archetypeName = archetype.split('-').pop() || archetype;
                return (
                  <Link 
                    key={archetype} 
                    href={`/archetypes/${archetype}`}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {archetypeName.charAt(0).toUpperCase() + archetypeName.slice(1)} Archetype
                  </Link>
                );
              })}
            </div>
            
          </div>
        </div>
        
        {/* AI Archetype Analysis Button - Moved outside the two-column layout to span full width */}
        <div className="p-4">
          {!showAiAnalysis ? (
            <button
              onClick={handleAnalysisButtonClick}
              className="flex items-center justify-center w-full py-3 px-4 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg transition-colors"
            >
              <FaRobot className="mr-2" />
              <span>Analyze with AI Archetype Finder</span>
            </button>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <FaRobot className="text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold dark:text-white">AI Archetype Analysis</h3>
                </div>
                {lastAnalysisTime && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Rate limited: 1 request per minute
                  </div>
                )}
              </div>
              
              {aiLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Analyzing with AI...</span>
                </div>
              ) : aiResponse ? (
                <div className="prose dark:prose-invert max-w-none w-full">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-inner w-full">
                    <div className="whitespace-pre-line">{aiResponse}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 py-4 text-center">
                  AI analysis is loading...
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Comment Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">Comments</h3>
          
          {/* Comment Form - Available to all users */}
          <form onSubmit={handleCommentSubmit} className="mb-6">
            {/* Username field for non-logged-in users */}
            {!isAuthenticated && (
              <div className="mb-4">
                <label htmlFor="guest-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Name
                </label>
                <input
                  id="guest-username"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your name"
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  disabled={isSubmittingComment}
                />
              </div>
            )}
            
            {/* Comment content field */}
            <div className="mb-4">
              <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comment
              </label>
              <textarea
                id="comment-content"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Share your thoughts about this card..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmittingComment}
              ></textarea>
            </div>
            
            {commentError && (
              <div className="mb-4 text-red-500 dark:text-red-400">{commentError}</div>
            )}
            
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? 'Posting...' : 'Post Comment'}
            </button>
            
            {!isAuthenticated && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Or <Link href="/login" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">log in</Link> to comment with your account.
              </p>
            )}
          </form>
          
          {/* Comments List */}
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold dark:text-white">{comment.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{comment.content}</p>
                  
                  {/* Delete button - Only shown to comment owner or admin */}
                  {isAuthenticated && (isAdmin || (user && user.id === comment.userId)) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="mt-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center"
                      aria-label="Delete comment"
                    >
                      <FaTrash className="mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Card History Modal */}
      {card && card.id && (
        <CardHistoryModal
          cardId={card.id}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}