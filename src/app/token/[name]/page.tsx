'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTokenByName, API_BASE_URL } from '@/lib/api';
import { Token } from '@/types/types';

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (!params.name) {
        setError('Token name not provided');
        setLoading(false);
        return;
      }

      try {
        const tokenName = decodeURIComponent(params.name as string);
        const data = await getTokenByName(tokenName);
        setToken(data);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Failed to load token details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [params.name]);

  // Color classes for rendering
  const getColorClass = (color: string) => {
    const colorClasses: Record<string, string> = {
      W: 'bg-mtg-white text-black',
      U: 'bg-mtg-blue text-white',
      B: 'bg-mtg-black text-black',
      R: 'bg-mtg-red text-white',
      G: 'bg-mtg-green text-white',
    };
    return colorClasses[color] || 'bg-gray-300 text-black';
  };

  // Function to sort colors in the correct order: WU, UB, BR, RG, GW, WB, BG, GU, UR, RW
  const sortColors = (colors: string[]) => {
    if (!colors || colors.length === 0) return [];
    
    // For single color, no sorting needed
    if (colors.length === 1) return colors;
    
    // Define the correct order for dual color pairs
    const dualColorOrder = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'BG', 'GU', 'UR', 'RW'];
    
    // If we have exactly 2 colors, check if they form a known pair
    if (colors.length === 2) {
      const pair = colors.join('');
      // Check if this pair exists in our order (in either direction)
      const normalPairIndex = dualColorOrder.indexOf(pair);
      if (normalPairIndex >= 0) {
        return [colors[0], colors[1]]; // Already in correct order
      }
      
      // Check if the reversed pair exists
      const reversedPair = colors[1] + colors[0];
      const reversedPairIndex = dualColorOrder.indexOf(reversedPair);
      if (reversedPairIndex >= 0) {
        return [colors[1], colors[0]]; // Reverse to match the correct order
      }
    }
    
    // For more than 2 colors or unknown combinations, sort by WUBRG order
    const colorOrder = { W: 0, U: 1, B: 2, R: 3, G: 4 };
    return [...colors].sort((a, b) => (colorOrder[a as keyof typeof colorOrder] || 5) - (colorOrder[b as keyof typeof colorOrder] || 5));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading token details...
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center text-red-600 dark:text-red-400 mb-4">
          {error || 'Token not found'}
        </div>
        <div className="text-center">
          <Link 
            href="/tokens" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <Link 
          href="/tokens" 
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Tokens
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Token Image */}
        <div className="flex justify-center items-center">
          {token.imageUrl ? (
            <img 
              src={token.imageUrl}
              alt={token.name}
              className="rounded-lg shadow-lg max-h-96 max-w-full object-contain"
              onError={(e) => {
                console.error('Error loading image:', token.imageUrl);
                // Try the proxy if direct loading fails
                if (token.imageUrl) {
                  e.currentTarget.src = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(token.imageUrl)}`;
                  // Set a backup error handler for the proxy
                  e.currentTarget.onerror = () => {
                    e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22420%22%20viewBox%3D%220%200%20300%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22300%22%20height%3D%22420%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%22150%22%20y%3D%22210%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A20px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EToken Image Not Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                  };
                } else {
                  e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22420%22%20viewBox%3D%220%200%20300%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22300%22%20height%3D%22420%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%22150%22%20y%3D%22210%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A20px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3ENo Token Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                }
              }}
            />
          ) : (
            <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Token Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">{token.name}</h1>
          
          <div className="mb-4">
            <span className="text-lg text-gray-700 dark:text-gray-300">{token.type}</span>
          </div>
          
          {/* Colors */}
          <div className="flex items-center mb-4">
            <span className="text-gray-700 dark:text-gray-300 mr-2">Colors:</span>
            <div className="flex space-x-1">
              {token.colors && token.colors.length > 0 ? (
                sortColors(token.colors).map(color => (
                  <span 
                    key={color} 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${getColorClass(color)}`}
                  >
                    {color}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Colorless</span>
              )}
            </div>
          </div>
          
          {/* Power/Toughness */}
          {(token.power || token.toughness) && (
            <div className="mb-4">
              <span className="text-gray-700 dark:text-gray-300 mr-2">Power/Toughness:</span>
              <span className="font-medium dark:text-white">{token.power}/{token.toughness}</span>
            </div>
          )}
          
          {/* Abilities */}
          {token.abilities && token.abilities.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-1 dark:text-white">Abilities:</h2>
              {token.abilities.map((ability, index) => (
                <p key={index} className="mb-1">{ability}</p>
              ))}
            </div>
          )}
          
          {/* Artist */}
          {token.artist && (
            <div className="mt-6 text-sm text-gray-600 dark:text-gray-400 italic">
              Illustrated by {token.artist}
            </div>
          )}
          
          {/* Creator Cards */}
          {token.creatorCards && token.creatorCards.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3 dark:text-white">Created by:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {token.creatorCards.map((card: any) => (
                  <Link 
                    href={`/card/${encodeURIComponent(card.name)}`} 
                    key={card.id}
                    className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {card.imageUrl ? (
                      <img 
                        src={card.imageUrl} 
                        alt={card.name} 
                        className="w-10 h-10 object-cover rounded mr-2"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3C%2Fsvg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-800 rounded mr-2 flex items-center justify-center text-xs text-gray-500">No img</div>
                    )}
                    <span className="text-gray-800 dark:text-gray-200">{card.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
