'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTokens, API_BASE_URL } from '@/lib/api';
import { Token } from '@/types/types';

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodySearchTerm, setBodySearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [colorMatchType, setColorMatchType] = useState<'exact' | 'includes' | 'at-most'>('includes');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  const [tokensPerPage, setTokensPerPage] = useState(20);
  const [visiblePageNumbers, setVisiblePageNumbers] = useState<number[]>([]);
  const [sortFields, setSortFields] = useState<Array<{field: string, direction: 'asc' | 'desc'}>>([{field: 'name', direction: 'asc'}]);

  useEffect(() => {
    // Fetch tokens whenever any filter changes
    fetchTokens();
  }, [
    currentPage, 
    tokensPerPage, 
    JSON.stringify(sortFields),
    searchTerm,
    bodySearchTerm,
    JSON.stringify(filterColor),
    colorMatchType
  ]);

  // Fetch tokens with current filters
  const fetchTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: {
        search?: string;
        body_search?: string;
        colors?: string[];
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_dir?: string;
      } = {
        page: currentPage,
        limit: tokensPerPage,
        sort_by: sortFields.map(sort => sort.field).join(','),
        sort_dir: sortFields.map(sort => sort.direction).join(',')
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (bodySearchTerm) {
        params.body_search = bodySearchTerm;
      }
      
      if (filterColor.length > 0) {
        params.colors = filterColor;
        params.color_match = colorMatchType;
      }
      
      console.log('Fetching tokens with params:', params);
      const response = await getTokens(params);
      
      // Check if we need to filter out colorless tokens (when multicolor is selected)
      let filteredTokens = response.tokens;
      
      // If multicolor is selected but not colorless, filter out tokens with no colors
      if (filterColor.includes('multicolor') && !filterColor.includes('colorless')) {
        filteredTokens = filteredTokens.filter(token => {
          // Filter out tokens with empty colors array or no colors property
          return token.colors && token.colors.length > 0;
        });
      }
      
      setTokens(filteredTokens);
      setTotalTokens(response.total);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens. Please try again later.');
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
    // Always use lowercase for comparison
    const lowercaseFilterType = filterType.toLowerCase();
    
    if (lowercaseFilterType === 'colorless') {
      // For colorless, we set a special filter value (case-insensitive check)
      const hasColorless = filterColor.some(c => c.toLowerCase() === 'colorless');
      if (hasColorless) {
        setFilterColor(filterColor.filter(c => c.toLowerCase() !== 'colorless'));
      } else {
        // Remove multicolor filter if it exists when selecting colorless
        const newFilters = filterColor.filter(c => c.toLowerCase() !== 'multicolor');
        setFilterColor([...newFilters, 'colorless']); // Always use lowercase for consistency
      }
    } else if (lowercaseFilterType === 'multicolor') {
      // For multicolor, we set a special filter value (case-insensitive check)
      const hasMulticolor = filterColor.some(c => c.toLowerCase() === 'multicolor');
      if (hasMulticolor) {
        setFilterColor(filterColor.filter(c => c.toLowerCase() !== 'multicolor'));
      } else {
        // Remove colorless filter if it exists when selecting multicolor
        const newFilters = filterColor.filter(c => c.toLowerCase() !== 'colorless');
        setFilterColor([...newFilters, 'multicolor']); // Always use lowercase for consistency
      }
    }
  };

  // Reset page when filters change
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  
  // We no longer need local filtering as the backend is handling all filters

  // Calculate visible page numbers whenever current page or total changes
  useEffect(() => {
    const totalPages = Math.ceil(totalTokens / tokensPerPage);
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start page if we're at the end of the range
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    setVisiblePageNumbers(pages);
  }, [currentPage, totalTokens, tokensPerPage]);

  // Handle change in tokens per page
  const handleTokensPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(e.target.value);
    setTokensPerPage(newValue);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Enhanced pagination component
  const PaginationControls = () => {
    if (totalTokens <= tokensPerPage) return null;
    
    const totalPages = Math.ceil(totalTokens / tokensPerPage);
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between my-4 gap-4">
        <div className="flex items-center">
          <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Tokens per page:</label>
          <select 
            value={tokensPerPage} 
            onChange={handleTokensPerPageChange}
            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-800 dark:text-gray-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {Math.min(totalTokens, (currentPage - 1) * tokensPerPage + 1)} - {Math.min(totalTokens, currentPage * tokensPerPage)} of {totalTokens}
          </span>
        </div>
        
        <div className="flex items-center">
          <button
            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded mr-1 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            title="First page"
          >
            <span>«</span>
          </button>
          
          <button
            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded mr-1 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            title="Previous page"
          >
            <span>‹</span>
          </button>
          
          {visiblePageNumbers.map(pageNum => (
            <button
              key={pageNum}
              className={`w-8 h-8 flex items-center justify-center rounded mx-1 text-sm 
                ${currentPage === pageNum 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              onClick={() => handlePageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
            >
              {pageNum}
            </button>
          ))}
          
          <button
            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            title="Next page"
          >
            <span>›</span>
          </button>
          
          <button
            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            title="Last page"
          >
            <span>»</span>
          </button>
        </div>
      </div>
    );
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    resetPage();
  };
  
  // Handle body text search input changes
  const handleBodySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBodySearchTerm(e.target.value);
    resetPage();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center dark:text-white">Tokens</h1>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search by Name
            </label>
            <input
              type="text"
              placeholder="Search token names..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Name & Abilities
            </label>
            <input
              type="text"
              placeholder="Search in names and abilities..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={bodySearchTerm}
              onChange={handleBodySearchChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sorting
            </label>
            {sortFields.map((sortItem, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 mb-2 p-2 border border-gray-200 dark:border-gray-700 rounded">
                <div className="flex-1">
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={sortItem.field}
                    onChange={(e) => {
                      const newSortFields = [...sortFields];
                      newSortFields[index].field = e.target.value;
                      setSortFields(newSortFields);
                    }}
                  >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="power">Power</option>
                    <option value="toughness">Toughness</option>
                    <option value="colors">Color</option>
                  </select>
                </div>
                
                <div className="flex gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      checked={sortItem.direction === 'asc'}
                      onChange={() => {
                        const newSortFields = [...sortFields];
                        newSortFields[index].direction = 'asc';
                        setSortFields(newSortFields);
                      }}
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Asc</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      checked={sortItem.direction === 'desc'}
                      onChange={() => {
                        const newSortFields = [...sortFields];
                        newSortFields[index].direction = 'desc';
                        setSortFields(newSortFields);
                      }}
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Desc</span>
                  </label>
                </div>
                
                <div className="flex gap-2">
                  {index > 0 && (
                    <button
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => {
                        const newSortFields = [...sortFields];
                        newSortFields.splice(index, 1);
                        setSortFields(newSortFields);
                      }}
                      aria-label="Remove sort field"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  
                  {index === sortFields.length - 1 && (
                    <button
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => {
                        setSortFields([...sortFields, {field: 'name', direction: 'asc'}]);
                      }}
                      aria-label="Add sort field"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Colors
            </label>
            <div className="mb-2">
              <div className="flex flex-wrap gap-2 mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={colorMatchType === 'exact'}
                    onChange={() => setColorMatchType('exact')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Exactly these colors</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={colorMatchType === 'includes'}
                    onChange={() => setColorMatchType('includes')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Including these colors</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={colorMatchType === 'at-most'}
                    onChange={() => setColorMatchType('at-most')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">At most these colors</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
              {/* Display color filters in WUBRG order */}
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
                  ${filterColor.some(c => c.toLowerCase() === 'colorless') ? 'ring-2 ring-yellow-400' : 'opacity-70'}`}
                onClick={() => toggleSpecialFilter('colorless')}
              >
                Colorless
              </button>
              
              {/* Multicolor option */}
              <button
                className={`px-2 py-1 bg-gradient-to-r from-mtg-red via-mtg-green to-mtg-blue text-white rounded-md text-xs
                  ${filterColor.some(c => c.toLowerCase() === 'multicolor') ? 'ring-2 ring-yellow-400' : 'opacity-70'}`}
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
          </div>
        </div>
        
        {/* Apply Filters button removed - filters now apply automatically */}
      </div>
      
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Loading tokens...
        </div>
      ) : error ? (
        <div className="text-center text-red-600 dark:text-red-400 mt-4">
          {error}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-4 space-y-2">
            <p className="dark:text-gray-300">Results: {totalTokens} tokens found</p>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <p>
                <strong>Filters:</strong> {searchTerm ? `Name: "${searchTerm}"` : ''} 
                {bodySearchTerm ? `Text: "${bodySearchTerm}"` : ''} 
                {filterColor.length > 0 ? `Colors: ${filterColor.join(', ')} (${colorMatchType === 'exact' ? 'Exactly' : colorMatchType === 'includes' ? 'Including' : 'At most'})` : ''}
                {!searchTerm && !bodySearchTerm && filterColor.length === 0 ? 'None' : ''}
              </p>
              <p>
                <strong>Sorting:</strong> {sortFields.map((sort, index) => 
                  `${index + 1}. ${sort.field} (${sort.direction === 'asc' ? 'ascending' : 'descending'})`
                ).join(', ')}
              </p>
            </div>
          </div>
          
          {/* Top pagination controls */}
          <PaginationControls />
          
          <div className="mtg-card-grid">
            {tokens.map(token => (
              <Link href={`/token/${encodeURIComponent(token.name)}`} key={token.id}>
                <div className="mtg-card card-hover">
                {token.imageUrl ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <img 
                      src={token.imageUrl}
                      alt={token.name}
                      className="mtg-card-image"
                      onError={(e) => {
                        console.error('Error loading image:', token.imageUrl);
                        // Try the proxy if direct loading fails
                        if (token.imageUrl) {
                          e.currentTarget.src = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(token.imageUrl)}`;
                          // Set a backup error handler for the proxy
                          e.currentTarget.onerror = () => {
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          };
                        } else {
                          e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                      <h3 className="font-bold text-white text-sm truncate">{token.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex space-x-1">
                          {sortColors(token.colors).map(color => {
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
                        {token.power && token.toughness && (
                          <span className="text-xs px-1 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                            {token.power}/{token.toughness}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-gray-300 dark:bg-gray-700 flex flex-col items-center justify-center p-2">
                    <span className="text-gray-500 dark:text-gray-400 mb-2">{token.name}</span>
                    <div className="flex space-x-1 mb-1">
                      {sortColors(token.colors).map(color => {
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">{token.type}</p>
                    {token.power && token.toughness && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{token.power}/{token.toughness}</p>
                    )}
                  </div>
                )}
              </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
