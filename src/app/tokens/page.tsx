'use client';

import { useState, useEffect } from 'react';
import { getTokens } from '@/lib/api';
import { Token } from '@/types/types';

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodySearchTerm, setBodySearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  const [tokensPerPage, setTokensPerPage] = useState(20);
  const [visiblePageNumbers, setVisiblePageNumbers] = useState<number[]>([]);

  useEffect(() => {
    // Fetch tokens on initial load
    fetchTokens();
  }, [currentPage, tokensPerPage]);

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
      } = {
        page: currentPage,
        limit: tokensPerPage
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (bodySearchTerm) {
        params.body_search = bodySearchTerm;
      }
      
      if (filterColor.length > 0) {
        params.colors = filterColor;
      }
      
      console.log('Fetching tokens with params:', params);
      const response = await getTokens(params);
      setTokens(response.tokens);
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
    fetchTokens();
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    setTimeout(() => {
      fetchTokens();
    }, 100);
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

  // Handle search input changes with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle body text search input changes
  const handleBodySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBodySearchTerm(e.target.value);
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
              Search Token Abilities
            </label>
            <input
              type="text"
              placeholder="Search abilities text..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={bodySearchTerm}
              onChange={handleBodySearchChange}
            />
          </div>
          
          <div>
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
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            onClick={applyFilters}
          >
            Apply Filters
          </button>
        </div>
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
          <div className="flex justify-center items-center mb-4">
            <p className="dark:text-gray-300">Results: {totalTokens} tokens found</p>
          </div>
          
          {/* Top pagination controls */}
          <PaginationControls />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tokens.map(token => (
              <div key={token.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                <div className="h-40 bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Token Image</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold dark:text-white">{token.name}</h3>
                  <div className="flex items-center mt-2">
                    <div className="flex space-x-1">
                      {token.colors.map(color => {
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
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${colorClasses[color]}`}
                          >
                            {color}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{token.type}</p>
                    <p className="text-sm font-semibold dark:text-white mt-1">
                      {token.power}/{token.toughness}
                    </p>
                    {token.abilities && token.abilities.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {token.abilities.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
