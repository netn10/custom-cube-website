// API service for fetching data from the Flask backend
import { Card, Archetype, Token, Suggestion } from '@/types/types';

// In development, we use localhost with /api path
// In production, the URL from env already includes the /api path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://127.0.0.1:5000/api';

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

// Cards API
export async function getCards(params?: {
  search?: string;
  colors?: string[];
  type?: string;
  custom?: boolean | null;
}): Promise<Card[]> {
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
  
  if (params?.custom !== undefined && params.custom !== null) {
    queryParams.append('custom', params.custom ? 'true' : 'false');
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<Card[]>(`/cards${queryString}`);
}

export async function getCardById(id: string): Promise<Card> {
  return fetchFromAPI<Card>(`/cards/${id}`);
}

// Archetypes API
export async function getArchetypes(): Promise<Archetype[]> {
  return fetchFromAPI<Archetype[]>('/archetypes');
}

export async function getArchetypeById(id: string): Promise<Archetype> {
  return fetchFromAPI<Archetype>(`/archetypes/${id}`);
}

export async function getArchetypeCards(id: string): Promise<Card[]> {
  return fetchFromAPI<Card[]>(`/archetypes/${id}/cards`);
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
}): Promise<Token[]> {
  let queryParams = new URLSearchParams();
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.colors && params.colors.length > 0) {
    queryParams.append('colors', params.colors.join(','));
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchFromAPI<Token[]>(`/tokens${queryString}`);
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
    // Use the dedicated endpoint for draft packs
    const response = await fetch(`${API_BASE_URL}/draft/pack`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const pack = await response.json();
    console.log(`Received pack with ${pack.length} cards`);
    return pack;
  } catch (error) {
    console.error('Error generating draft pack:', error);
    throw error;
  }
}

// Card Suggestions API
export async function getSuggestions(): Promise<Suggestion[]> {
  return fetchFromAPI('/suggestions');
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
  return fetchFromAPI('/cards/chatgpt');
}

export async function getChatGPTResponse(prompt: string): Promise<any> {
  return fetchFromAPI('/chatgpt/response', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}
