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
  const [bodySearchTerm, setBodySearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [colorMatchType, setColorMatchType] = useState<'exact' | 'includes' | 'at-most'>('includes');
  const [filterType, setFilterType] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterCustom, setFilterCustom] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(50);
  const [visiblePageNumbers, setVisiblePageNumbers] = useState<number[]>([]);
  const [sortFields, setSortFields] = useState<Array<{field: string, direction: 'asc' | 'desc'}>>([{field: 'name', direction: 'asc'}]);

  useEffect(() => {
    // Fetch cards whenever any filter changes
    fetchCards();
  }, [
    currentPage, 
    cardsPerPage, 
    JSON.stringify(sortFields),
    searchTerm,
    bodySearchTerm,
    JSON.stringify(filterColor),
    colorMatchType,
    filterType,
    filterSet,
    filterCustom
  ]);

  // Fetch cards with current filters
  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: {
        search?: string;
        body_search?: string;
        colors?: string[];
        type?: string;
        set?: string;
        custom?: boolean | null;
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_dir?: string;
        facedown?: string;
      } = {
        page: currentPage,
        limit: cardsPerPage,
        sort_by: sortFields.map(sort => sort.field).join(','),
        sort_dir: sortFields.map(sort => sort.direction).join(','),
        facedown: 'false' // Always exclude facedown cards
      };
      
      // Special handling for "colorless" search term
      let searchTermToUse = searchTerm;
      let colorFilters = [...filterColor];
      
      // Check if the search term contains "colorless" (case insensitive)
      if (searchTerm && searchTerm.toLowerCase().includes('colorless')) {
        // Add 'colorless' to color filters if not already there
        if (!colorFilters.includes('colorless')) {
          colorFilters.push('colorless');
        }
        
        // Remove "colorless" from the search term
        searchTermToUse = searchTerm.replace(/colorless/gi, '').trim();
      }
      
      // Apply the possibly modified search term
      if (searchTermToUse) {
        params.search = searchTermToUse;
      }
      
      if (bodySearchTerm) {
        params.body_search = bodySearchTerm;
      }
      
      // Apply color filters (original + potentially added 'colorless')
      if (colorFilters.length > 0) {
        params.colors = colorFilters;
        params.color_match = colorMatchType;
      }
      
      if (filterType) {
        params.type = filterType;
      }
      
      if (filterSet) {
        params.set = filterSet;
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
    resetPage();
  };

  // Special filter for colorless or multicolor
  const toggleSpecialFilter = (filterType: string) => {
    // Special filter for colorless or multicolor - always use lowercase for comparison
    const lowercaseFilterType = filterType.toLowerCase();
    
    if (lowercaseFilterType === 'colorless') {
      // For colorless, we set a special filter value (case-insensitive check)
      const hasColorless = filterColor.some(c => c.toLowerCase() === 'colorless');
      if (hasColorless) {
        setFilterColor(filterColor.filter(c => c.toLowerCase() !== 'colorless'));
      } else {
        setFilterColor([...filterColor, 'colorless']); // Always use lowercase for consistency
      }
    } else if (lowercaseFilterType === 'multicolor') {
      // For multicolor, we set a special filter value (case-insensitive check)
      const hasMulticolor = filterColor.some(c => c.toLowerCase() === 'multicolor');
      if (hasMulticolor) {
        setFilterColor(filterColor.filter(c => c.toLowerCase() !== 'multicolor'));
      } else {
        setFilterColor([...filterColor, 'multicolor']); // Always use lowercase for consistency
      }
    }
    resetPage();
  };

  // Reset page when filters change
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Handle search input changes with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    resetPage();
  };
  
  // Handle body text search input changes
  // This now searches in both card name and text fields
  const handleBodySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBodySearchTerm(e.target.value);
    resetPage();
  };

  const filteredCards = cards.filter(card => {
    // Exclude facedown cards
    if (card.facedown === true) {
      return false;
    }
    
    // Search term filter
    if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Color filter - using case-insensitive comparison
    if (filterColor.length > 0) {
      const hasColorless = filterColor.some(c => c.toLowerCase() === 'colorless');
      const hasMulticolor = filterColor.some(c => c.toLowerCase() === 'multicolor');
      
      if (hasColorless) {
        if (card.colors.length > 0) {
          return false;
        }
      } else if (hasMulticolor) {
        if (card.colors.length <= 1) {
          return false;
        }
      } else if (colorMatchType === 'exact') {
        // For exact match, the card must have exactly the selected colors (no more, no less)
        // First check if card has all the selected colors
        const hasAllSelectedColors = filterColor.every(color => card.colors.includes(color));
        // Then check if card has no other colors
        const hasNoOtherColors = card.colors.every(color => filterColor.includes(color));
        
        if (!hasAllSelectedColors || !hasNoOtherColors) {
          return false;
        }
      } else if (colorMatchType === 'at-most') {
        // For at-most match type, the card must have only colors from the selected colors
        // (but doesn't need to have all of them)
        // Check if card has any color that's not in the selected colors
        const hasUnselectedColor = card.colors.some(color => !filterColor.includes(color));
        
        if (hasUnselectedColor) {
          return false;
        }
      } else if (!filterColor.some(color => card.colors.includes(color))) {
        // For 'includes' match type, card must have at least one of the selected colors
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

  // Calculate visible page numbers whenever current page or total changes
  useEffect(() => {
    const totalPages = Math.ceil(totalCards / cardsPerPage);
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
  }, [currentPage, totalCards, cardsPerPage]);

  // Handle change in cards per page
  const handleCardsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(e.target.value);
    setCardsPerPage(newValue);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Enhanced pagination component
  const PaginationControls = () => {
    if (totalCards <= cardsPerPage) return null;
    
    const totalPages = Math.ceil(totalCards / cardsPerPage);
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between my-4 gap-4">
        <div className="flex items-center">
          <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Cards per page:</label>
          <select 
            value={cardsPerPage} 
            onChange={handleCardsPerPageChange}
            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-800 dark:text-gray-200"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {Math.min(totalCards, (currentPage - 1) * cardsPerPage + 1)} - {Math.min(totalCards, currentPage * cardsPerPage)} of {totalCards}
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center dark:text-white">Cube Card List</h1>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search by Name
            </label>
            <input
              type="text"
              placeholder="Search card names..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Name & Text
            </label>
            <input
              type="text"
              placeholder="Search in names and card text..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={bodySearchTerm}
              onChange={handleBodySearchChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                resetPage();
              }}
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
              Set
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={filterSet}
              onChange={(e) => {
                setFilterSet(e.target.value);
                resetPage();
              }}
            >
              <option value="">All Sets</option>
              <option value="Set 1">Set 1</option>
              <option value="Set 2">Set 2</option>
              <option value="Set 3">Set 3</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                resetPage();
              }}
            >
              <option value="">All Cards</option>
              <option value="custom">Custom Cards</option>
              <option value="reprint">Reprints</option>
            </select>
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
                      resetPage();
                    }}
                  >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="rarity">Rarity</option>
                    <option value="custom">Custom Status</option>
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
                        resetPage();
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
                        resetPage();
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
                        resetPage();
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
                        resetPage();
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
        </div>
        
        <div className="mt-4 flex justify-between items-end">
          <div className="flex-grow">
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
                    onChange={() => {
                      setColorMatchType('exact');
                      resetPage();
                    }}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Exactly these colors</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={colorMatchType === 'includes'}
                    onChange={() => {
                      setColorMatchType('includes');
                      resetPage();
                    }}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Including these colors</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={colorMatchType === 'at-most'}
                    onChange={() => {
                      setColorMatchType('at-most');
                      resetPage();
                    }}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">At most these colors</span>
                </label>
              </div>
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
                onClick={() => {
                  setFilterColor([]);
                  resetPage();
                }}
              >
                Clear
              </button>
              </div>
            </div>
          </div>
          
          {/* Apply Filters button removed - filters now apply automatically */}
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
          <div className="flex flex-col items-center mb-4 space-y-2">
            <p className="dark:text-gray-300">Results: {totalCards} cards found</p>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <p>
                <strong>Filters:</strong> {searchTerm ? `Name: "${searchTerm}"` : ''} 
                {bodySearchTerm ? `Text: "${bodySearchTerm}"` : ''} 
                {filterType ? `Type: ${filterType}` : ''} 
                {filterSet ? `Set: ${filterSet}` : ''} 
                {filterCustom !== null ? `Custom: ${filterCustom ? 'Yes' : 'No'}` : ''} 
                {filterColor.length > 0 ? `Colors: ${filterColor.join(', ')} (${colorMatchType === 'exact' ? 'Exactly' : colorMatchType === 'includes' ? 'Including' : 'At most'})` : ''}
                {!searchTerm && !bodySearchTerm && !filterType && !filterSet && filterCustom === null && filterColor.length === 0 ? 'None' : ''}
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
            {filteredCards.map(card => (
              <Link href={`/card/${card.id}`} key={card.id}>
                <div className="mtg-card card-hover">
                  {card.imageUrl ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <img 
                        src={card.imageUrl}
                        alt={card.name}
                        className="mtg-card-image"
                        onError={(e) => {
                          console.error('Error loading image:', card.imageUrl);
                          // Try the proxy if direct loading fails
                          if (card.imageUrl) {
                            e.currentTarget.src = `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(card.imageUrl)}`;
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
    </div>
  );
}
