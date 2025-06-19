// API service for fetching data from the Flask backend
import { Card, Archetype, Token, Suggestion, User, LoginCredentials, RegisterFormData, Comment, CommentFormData, CardHistoryEntry, CardHistoryResponse } from '@/types/types';

// In development, we use localhost with /api path
// In production, the URL from env already includes the /api path
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://127.0.0.1:5000/api';


// Authentication API

// Register a new user
export async function registerUser(userData: RegisterFormData): Promise<{ message: string, user_id: string }> {
  return fetchFromAPI<{ message: string, user_id: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// Login user
export async function loginUser(credentials: LoginCredentials): Promise<{ token: string, user: User }> {
  return fetchFromAPI<{ token: string, user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// Get current user profile
export async function getUserProfile(token: string): Promise<User> {
  return fetchFromAPI<User>('/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

// Generic fetch function with error handling
async function fetchFromAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// Add a new card
export async function addCard(cardData: Partial<Card>, token: string): Promise<Card> {
  try {
    // Check if the API URL already includes /api to avoid duplication
    const endpoint = `/cards/add`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(cardData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to add card: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding card:', error);
    throw error;
  }
}

// Update an existing card
export async function updateCard(id: string, cardData: Partial<Card>, token: string): Promise<Card> {
  try {
    // Check if the API URL already includes /api to avoid duplication
    const endpoint = `/cards/update/${id}`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(cardData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to update card: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating card:', error);
    throw error;
  }
}

// Cards API
export async function getCards(params?: {
  search?: string;
  body_search?: string;
  colors?: string[];
  color_match?: 'exact' | 'includes' | 'at-most';
  type?: string;
  set?: string;
  custom?: boolean | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: string;
  include_facedown?: boolean;
  historic_mode?: string;
}): Promise<{cards: Card[], total: number}> {
  let queryParams = new URLSearchParams();
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.body_search) {
    queryParams.append('body_search', params.body_search);
  }
  
  if (params?.colors && params.colors.length > 0) {
    queryParams.append('colors', params.colors.join(','));
  }
  
  if (params?.color_match) {
    queryParams.append('color_match', params.color_match);
  }
  
  if (params?.type) {
    queryParams.append('type', params.type);
  }
  
  if (params?.set) {
    queryParams.append('set', params.set);
  }
  
  if (params?.custom !== undefined && params?.custom !== null) {
    queryParams.append('custom', params.custom ? 'true' : 'false');
  }
  
  if (params?.page !== undefined) {
    queryParams.append('page', params.page.toString());
  }
  
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  
  if (params?.sort_by) {
    queryParams.append('sort_by', params.sort_by);
  }
  
  if (params?.sort_dir) {
    queryParams.append('sort_dir', params.sort_dir);
  }
  
  if (params?.include_facedown) {
    queryParams.append('include_facedown', params.include_facedown ? 'true' : 'false');
  }
  
  if (params?.historic_mode) {
    queryParams.append('historic_mode', params.historic_mode);
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{cards: Card[], total: number}>(`/cards${queryString}`);
}

export async function getCardById(id: string): Promise<Card> {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Get card history (past iterations)
export async function getCardHistory(cardId: string, page: number = 1, limit: number = 10): Promise<CardHistoryResponse> {
  try {
    // Always use the base URL with /api path
    const url = `${API_BASE_URL}/cards/${cardId}/history?page=${page}&limit=${limit}`;
    console.log('Fetching card history from:', url); // This will help with debugging
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Use no-store cache to prevent caching issues
      cache: 'no-store',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'Failed to fetch card history',
        status: response.status
      }));
      
      console.error('Card history fetch failed:', {
        url,
        status: response.status,
        error: errorData.message
      });
      
      // Always return a default response with total 0 if fetch fails
      return {
        total: 0,
        history: [],
        page: page,
        limit: limit
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getCardHistory:', {
      cardId,
      page,
      limit,
      API_BASE_URL,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a default response on error instead of throwing
    return {
      total: 0,
      history: [],
      page: page,
      limit: limit
    };
  }
}

// Manually add a card history entry (admin only)
export async function addCardHistory(
  cardId: string, 
  note: string, 
  token: string, 
  customCardData?: Partial<Card>
): Promise<{ message: string, entry_id: string }> {
  try {
    const payload: any = { note };
    
    // If custom card data is provided, include it in the request
    if (customCardData) {
      payload.custom_card_data = customCardData;
    }
    
    const response = await fetch(`${API_BASE_URL}/cards/${cardId}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding card history:', error);
    throw error;
  }
}

// Archetypes API
export async function getArchetypes(): Promise<Archetype[]> {
  return fetchFromAPI<Archetype[]>('/archetypes');
}

export async function getArchetypeById(id: string): Promise<Archetype> {
  return fetchFromAPI<Archetype>(`/archetypes/${id}`);
}

export async function getArchetypeCards(id: string, page: number = 1, limit: number = 50): Promise<{cards: Card[], total: number}> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('exclude_facedown', 'true');
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{cards: Card[], total: number}>(`/archetypes/${id}/cards${queryString}`);
}

export async function getRandomArchetypeCards(): Promise<Card[]> {
  try {
    // Use the API_BASE_URL to ensure it works in all environments
    const response = await fetch(`${API_BASE_URL}/archetypes/random-cards?exclude_facedown=true`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Prevent caching to ensure fresh data
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Tokens API
export async function getTokens(params?: {
  search?: string;
  body_search?: string;
  colors?: string[];
  color_match?: 'exact' | 'includes' | 'at-most';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: string;
}): Promise<{tokens: Token[], total: number}> {
  let queryParams = new URLSearchParams();
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.body_search) {
    queryParams.append('body_search', params.body_search);
  }
  
  if (params?.colors && params.colors.length > 0) {
    queryParams.append('colors', params.colors.join(','));
  }
  
  if (params?.color_match) {
    queryParams.append('color_match', params.color_match);
  }
  
  if (params?.page !== undefined) {
    queryParams.append('page', params.page.toString());
  }
  
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  
  if (params?.sort_by) {
    queryParams.append('sort_by', params.sort_by);
  }
  
  if (params?.sort_dir) {
    queryParams.append('sort_dir', params.sort_dir);
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{tokens: Token[], total: number}>(`/tokens${queryString}`);
}

// Get a single token by name
export async function getTokenByName(name: string): Promise<Token> {
  try {
    // Double-encode slashes and other special characters to ensure proper URL handling
    const safeTokenName = name.replace(/\//g, '%2F');
    const response = await fetch(`${API_BASE_URL}/tokens/${encodeURIComponent(safeTokenName)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching token by name: ${error}`);
    throw error;
  }
}

// Add a new token
export async function addToken(tokenData: Partial<Token>, token: string): Promise<Token> {
  try {
    const endpoint = `/tokens/add`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to add token: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding token:', error);
    throw error;
  }
}

// Draft API
export async function getBotDraftPick(params: {
  availableCards: any[];
  botColors: string[];
  packNumber: number;
  pickNumber: number;
}): Promise<any> {
  return fetchFromAPI('/draft/bot-pick', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Generate a draft pack
export async function getDraftPack(): Promise<Card[]> {
  try {
    const data = await fetchFromAPI<Card[]>('/draft/pack');
    
    // Process the cards to ensure they have the correct structure
    const processedCards = data.map(card => ({
      ...card,
      colors: card.colors || [],
      archetypes: card.archetypes || [],
    }));
    
    return processedCards;
  } catch (error) {
    console.error('Error fetching draft pack:', error);
    throw error;
  }
}

// Generate multiple draft packs in a single request
export async function getMultipleDraftPacks(count: number): Promise<Card[][]> {
  try {
    const data = await fetchFromAPI<Card[][]>(`/draft/packs?count=${count}`);
    
    // Process the cards in each pack to ensure they have the correct structure
    const processedPacks = data.map(pack => 
      pack.map(card => ({
        ...card,
        colors: card.colors || [],
        archetypes: card.archetypes || [],
      }))
    );
    
    return processedPacks;
  } catch (error) {
    console.error('Error fetching multiple draft packs:', error);
    // Fallback to fetching packs individually if the bulk endpoint fails
    const packs: Card[][] = [];
    for (let i = 0; i < count; i++) {
      try {
        const pack = await getDraftPack();
        packs.push(pack);
      } catch (e) {
        console.error(`Error fetching individual pack ${i}:`, e);
        throw e;
      }
    }
    return packs;
  }
}

// Generate a random pack with equal probability for each card
export async function getRandomPack(size?: number): Promise<{pack: Card[], metadata: any}> {
  try {
    const endpoint = size ? `/random-pack?size=${size}&exclude_facedown=true` : '/random-pack?exclude_facedown=true';
    const data = await fetchFromAPI<{pack: Card[], metadata: any}>(endpoint);
    
    // Process the cards to ensure they have the correct structure
    const processedCards = data.pack.map(card => ({
      ...card,
      colors: card.colors || [],
      archetypes: card.archetypes || [],
    }));
    
    return {
      pack: processedCards,
      metadata: data.metadata
    };
  } catch (error) {
    console.error('Error fetching random pack:', error);
    throw error;
  }
}

// Card Suggestions API
export async function getSuggestions(page: number = 1, limit: number = 50): Promise<{suggestions: Suggestion[], total: number}> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{suggestions: Suggestion[], total: number}>(`/suggestions${queryString}`);
}

export async function addSuggestion(suggestion: {
  name: string;
  description?: string;
  imageUrl?: string;
  createdBy?: string;
}): Promise<Suggestion> {
  return fetchFromAPI('/suggestions', {
    method: 'POST',
    body: JSON.stringify(suggestion),
  });
}

export async function uploadSuggestionImage(imageFile: File): Promise<any> {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    const response = await fetch(`${API_BASE_URL}/suggestions/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header as the browser will set it with the boundary
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// ChatGPT Cards API
export async function getChatGPTCards(): Promise<Card[]> {
  return fetchFromAPI<Card[]>(`/chatgpt_cards`);
}

// Cube Statistics API
export async function getCubeStatistics(): Promise<{
  totalCards: number;
  totalArchetypes: number;
  customCardPercentage: number;
  recommendedPlayers: number;
}> {
  try {
    return fetchFromAPI<{
      totalCards: number;
      totalArchetypes: number;
      customCardPercentage: number;
      recommendedPlayers: number;
    }>('/statistics');
  } catch (error) {
    console.error('Error fetching cube statistics:', error);
    // Return default values if API fails
    return {
      totalCards: 360,
      totalArchetypes: 10,
      customCardPercentage: 60,
      recommendedPlayers: 8
    };
  }
}

export async function getChatGPTResponse(prompt: string): Promise<any> {
  return fetchFromAPI('/chatgpt_response', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export async function getGeminiResponse(prompt: string): Promise<any> {
  return fetchFromAPI('/gemini/response', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

// Comments API

// Get comments for a card
export async function getCardComments(cardId: string): Promise<Comment[]> {
  try {
    return await fetchFromAPI<Comment[]>(`/comments/card/${cardId}`);
  } catch (error) {
    console.error('Error fetching comments:', error);
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }
}

// Add a new comment
export async function addComment(cardId: string, commentData: CommentFormData, token?: string): Promise<Comment> {
  try {
    // For guest comments, we need to ensure the endpoint can handle them
    // We'll use a different API path for guest comments vs. authenticated comments
    const endpoint = token 
      ? `/comments/card/${cardId}` // Authenticated comment endpoint
      : `/comments/card/${cardId}/guest`; // Guest comment endpoint
    
    const options: RequestInit = {
      method: 'POST',
      body: JSON.stringify(commentData),
    };
    
    // Only add Authorization header if token is provided (for logged-in users)
    if (token) {
      options.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return await fetchFromAPI<Comment>(endpoint, options);
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

// Delete a comment (only for comment owner or admin)
export async function deleteComment(commentId: string, token: string): Promise<{ message: string }> {
  return fetchFromAPI<{ message: string }>(`/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });
}

// Show Decks API
export async function getShowDecks(draftId: string, bots: any[]): Promise<{
  draft_id: string;
  decks: Array<{
    bot_id: string;
    bot_name: string;
    lands: any[];
    non_lands: any[];
    full_deck: any[];
    sideboard: any[];
    colors: string[];
    error?: string;
  }>;
}> {
  return fetchFromAPI('/show-decks', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      bots: bots
    }),
  });
}
