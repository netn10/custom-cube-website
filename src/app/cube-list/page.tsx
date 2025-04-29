'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getCards, API_BASE_URL } from '@/lib/api';
import { Card } from '@/types/types';

export default function CubeList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterCustom, setFilterCustom] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const cardsPerPage = 50;

  useEffect(() => {
    // Fetch cards on initial load
    fetchCards();
  }, [currentPage]);

  // Fetch cards with current filters
  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: {
        search?: string;
        colors?: string[];
        type?: string;
        custom?: boolean | null;
        page?: number;
        limit?: number;
      } = {
        page: currentPage,
        limit: cardsPerPage
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (filterColor.length > 0) {
        params.colors = filterColor;
      }
      
      if (filterType) {
        params.type = filterType;
      }
      
      if (filterCustom !== null) {
        params.custom = filterCustom;
      }
      
      console.log('Fetching cards with params:', params);
      const response = await getCards(params);
      setCards(response.cards);
      setTotalCards(response.total);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Failed to load cards. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleColorFilter = (color: string) => {
    if (filterColor.includes(color)) {
      setFilterColor(filterColor.filter(c => c !== color));
    } else {
      setFilterColor([...filterColor, color]);
    }
  };

  // Special filter for colorless or multicolor
  const toggleSpecialFilter = (filterType: string) => {
    if (filterType === 'colorless') {
      // For colorless, we set a special filter value
      if (filterColor.includes('colorless')) {
        setFilterColor(filterColor.filter(c => c !== 'colorless'));
      } else {
        setFilterColor([...filterColor, 'colorless']);
      }
    } else if (filterType === 'multicolor') {
      // For multicolor, we set a special filter value
      if (filterColor.includes('multicolor')) {
        setFilterColor(filterColor.filter(c => c !== 'multicolor'));
      } else {
        setFilterColor([...filterColor, 'multicolor']);
      }
    }
  };

  // Apply filters and fetch new data
  const applyFilters = () => {
    setCurrentPage(1);
    console.log("Applying filters with type:", filterType);
    fetchCards();
  };

  // Handle search input changes with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // We'll apply the search filter immediately for better UX
    setTimeout(() => {
      applyFilters();
    }, 300);
  };

  const filteredCards = cards.filter(card => {
    // Search term filter
    if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Color filter
    if (filterColor.length > 0) {
      if (filterColor.includes('colorless')) {
        if (card.colors.length > 0) {
          return false;
        }
      } else if (filterColor.includes('multicolor')) {
        if (card.colors.length <= 1) {
          return false;
        }
      } else if (!filterColor.some(color => card.colors.includes(color))) {
        return false;
      }
    }
    
    // Type filter
    if (filterType && !card.type.includes(filterType)) {
      return false;
    }
    
    // Custom filter
    if (filterCustom !== null && card.custom !== filterCustom) {
      return false;
    }
    
    return true;
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center dark:text-white">Cube Card List</h1>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search cards..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Creature">Creature</option>
              <option value="Instant">Instant</option>
              <option value="Sorcery">Sorcery</option>
              <option value="Enchantment">Enchantment</option>
              <option value="Artifact">Artifact</option>
              <option value="Land">Land</option>
              <option value="Planeswalker">Planeswalker</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Source
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={filterCustom === null ? '' : filterCustom ? 'custom' : 'reprint'}
              onChange={(e) => {
                if (e.target.value === '') setFilterCustom(null);
                else setFilterCustom(e.target.value === 'custom');
              }}
            >
              <option value="">All Cards</option>
              <option value="custom">Custom Cards</option>
              <option value="reprint">Reprints</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-end">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Colors
            </label>
            <div className="flex flex-wrap gap-2">
              {['W', 'U', 'B', 'R', 'G'].map(color => {
                const colorClasses: Record<string, string> = {
                  W: 'bg-mtg-white text-black',
                  U: 'bg-mtg-blue text-white',
                  B: 'bg-mtg-black text-black',
                  R: 'bg-mtg-red text-white',
                  G: 'bg-mtg-green text-white',
                };
                
                return (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold 
                      ${colorClasses[color]} 
                      ${filterColor.includes(color) ? 'ring-2 ring-yellow-400' : 'opacity-70'}`}
                    onClick={() => toggleColorFilter(color)}
                  >
                    {color}
                  </button>
                );
              })}
              
              {/* Colorless option */}
              <button
                className={`px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md text-xs
                  ${filterColor.includes('colorless') ? 'ring-2 ring-yellow-400' : 'opacity-70'}`}
                onClick={() => toggleSpecialFilter('colorless')}
              >
                Colorless
              </button>
              
              {/* Multicolor option */}
              <button
                className={`px-2 py-1 bg-gradient-to-r from-mtg-red via-mtg-green to-mtg-blue text-white rounded-md text-xs
                  ${filterColor.includes('multicolor') ? 'ring-2 ring-yellow-400' : 'opacity-70'}`}
                onClick={() => toggleSpecialFilter('multicolor')}
              >
                Multicolor
              </button>
              
              <button
                className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm"
                onClick={() => setFilterColor([])}
              >
                Clear
              </button>
            </div>
          </div>
          
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            onClick={applyFilters}
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading cards...
        </div>
      ) : error ? (
        <div className="text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <div className="flex justify-center items-center mb-4">
            <p className="dark:text-gray-300">Showing {filteredCards.length} of {totalCards}</p>
          </div>
          <div className="mtg-card-grid">
            {filteredCards.map(card => (
              <Link href={`/card/${card.id}`} key={card.id}>
                <div className="mtg-card card-hover">
                  {card.imageUrl ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <img 
                        src={`${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`}
                        alt={card.name}
                        className="mtg-card-image"
                        onError={(e) => {
                          console.error('Error loading image:', card.imageUrl);
                          e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                        <h3 className="font-bold text-white text-sm truncate">{card.name}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex space-x-1">
                            {card.colors.map(color => {
                              const colorClasses: Record<string, string> = {
                                W: 'bg-mtg-white text-black',
                                U: 'bg-mtg-blue text-white',
                                B: 'bg-mtg-black text-black',
                                R: 'bg-mtg-red text-white',
                                G: 'bg-mtg-green text-white',
                              };
                              
                              return (
                                <span 
                                  key={color} 
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${colorClasses[color]}`}
                                >
                                  {color}
                                </span>
                              );
                            })}
                          </div>
                          {card.custom && (
                            <span className="text-xs px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      
      {totalCards > cardsPerPage && (
        <div className="flex justify-center mt-4">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="mx-2 text-gray-600 dark:text-gray-400">{currentPage} / {Math.ceil(totalCards / cardsPerPage)}</span>
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === Math.ceil(totalCards / cardsPerPage)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
