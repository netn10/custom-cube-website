// API service for fetching data from the Flask backend
import { Card, Archetype, Token, Suggestion } from '@/types/types';

// In development, we use localhost with /api path
// In production, the URL from env already includes the /api path
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://127.0.0.1:5000/api';

// For debugging
console.log('API_BASE_URL:', API_BASE_URL);

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
export async function addCard(cardData: Partial<Card>): Promise<Card> {
  try {
    // Check if the API URL already includes /api to avoid duplication
    const endpoint = `/cards/add`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
export async function updateCard(id: string, cardData: Partial<Card>): Promise<Card> {
  try {
    // Check if the API URL already includes /api to avoid duplication
    const endpoint = `/cards/update/${id}`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
  colors?: string[];
  type?: string;
  custom?: boolean | null;
  page?: number;
  limit?: number;
}): Promise<{cards: Card[], total: number}> {
  let queryParams = new URLSearchParams();
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.colors && params.colors.length > 0) {
    queryParams.append('colors', params.colors.join(','));
  }
  
  if (params?.type) {
    queryParams.append('type', params.type);
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
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{cards: Card[], total: number}>(`/cards${queryString}`);
}

export async function getCardById(id: string): Promise<Card> {
  console.log(`Attempting to fetch card with ID: ${id}`);
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API fetch error:', error);
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
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{cards: Card[], total: number}>(`/archetypes/${id}/cards${queryString}`);
}

export async function getRandomArchetypeCards(): Promise<Card[]> {
  try {
    // Use the full URL to avoid any path issues
    const response = await fetch(`http://127.0.0.1:5000/api/archetypes/random-cards`, {
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
    console.log('Raw API response for random cards:', data);
    return data;
  } catch (error) {
    console.error('Error fetching random archetype cards:', error);
    throw error;
  }
}

// Tokens API
export async function getTokens(params?: {
  search?: string;
  colors?: string[];
}): Promise<{tokens: Token[], total: number}> {
  let queryParams = new URLSearchParams();
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.colors && params.colors.length > 0) {
    queryParams.append('colors', params.colors.join(','));
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<{tokens: Token[], total: number}>(`/tokens${queryString}`);
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

// Generate a random pack with equal probability for each card
export async function getRandomPack(size?: number): Promise<{pack: Card[], metadata: any}> {
  try {
    const endpoint = size ? `/random-pack?size=${size}` : '/random-pack';
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
  return fetchFromAPI<Card[]>('/chatgpt_cards');
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


