'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaHistory, FaEye, FaEyeSlash, FaChevronLeft, FaChevronRight, FaCopy, FaCheck } from 'react-icons/fa';
import { Card, CardHistoryEntry, CardHistoryResponse } from '@/types/types';
import { getCardHistory, getCardById, API_BASE_URL } from '@/lib/api';
import * as Diff from 'diff';

interface CardHistoryModalProps {
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardHistoryModal({ cardId, isOpen, onClose }: CardHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CardHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [loadingCurrentCard, setLoadingCurrentCard] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Card | null>(null);
  const [comparisonVersion, setComparisonVersion] = useState<Card | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Color mapping for visual representation
  const colorMap: Record<string, string> = {
    W: 'bg-mtg-white text-black',
    U: 'bg-mtg-blue text-white',
    B: 'bg-mtg-black text-white',
    R: 'bg-mtg-red text-white',
    G: 'bg-mtg-green text-white',
  };

  // Create a general helper function for symbol spans
  const createSymbolSpan = (color: string, content: string, title?: string, size: string = 'w-4 h-4') => {
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
        return createSymbolSpan(colorClass, `${color}/P`, `Phyrexian ${color}`, 'w-4 h-4');
      }
      
      if (symbol.includes('P/')) {
        const color = symbol.split('/')[1];
        const colorClass = 'WUBRG'.includes(color) ? colorMap[color] : 'bg-mtg-colorless text-black';
        return createSymbolSpan(colorClass, `P/${color}`, `Phyrexian ${color}`, 'w-4 h-4');
      }
      
      // Handle hybrid mana symbols
      if (symbol.includes('/')) {
        const colors = symbol.split('/');
        // First check if both are colors
        if (colors.length === 2 && colors.every((c: string) => 'WUBRG'.includes(c))) {
          return createSymbolSpan(`bg-gradient-to-br from-mtg-${colors[0].toLowerCase()} to-mtg-${colors[1].toLowerCase()}`, symbol, `${colors[0]}/${colors[1]}`, 'w-4 h-4');
        }
      }
      
      // Handle regular mana symbols
      if (symbol.length === 1 && 'WUBRG'.includes(symbol)) {
        return createSymbolSpan(colorMap[symbol], symbol, undefined, 'w-4 h-4');
      }
      
      // Handle colorless mana
      if (/^[0-9]+$/.test(symbol)) {
        return createSymbolSpan('bg-mtg-colorless text-black', symbol, undefined, 'w-4 h-4');
      }
      
      // Handle variable mana X
      if (symbol === 'X') {
        return createSymbolSpan('bg-mtg-colorless text-black', 'X', 'Variable Mana', 'w-4 h-4');
      }
      
      // Return the original match if no specific formatting applies
      return `<span class="inline-block w-4 h-4 bg-mtg-colorless text-black rounded-full flex items-center justify-center text-xs font-bold mx-0.5">${symbol}</span>`;
    });
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    if (!isOpen || !cardId) return;
    
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCardHistory(cardId, page, limit);
        setHistory(data.history);
        setTotal(data.total);
        
        // Select the first version by default if available and not in compare mode
        if (data.history.length > 0 && !selectedVersion && !compareMode) {
          setSelectedVersion(data.history[0].version_data);
        }
      } catch (err) {
        console.error('Error fetching card history:', err);
        setError('Failed to load card history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchCurrentCard = async () => {
      try {
        setLoadingCurrentCard(true);
        const data = await getCardById(cardId);
        setCurrentCard(data);
      } catch (err) {
        console.error('Error fetching current card:', err);
      } finally {
        setLoadingCurrentCard(false);
      }
    };
    
    fetchHistory();
    fetchCurrentCard();
  }, [cardId, isOpen, page, limit, selectedVersion, compareMode]);
  
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
      setSelectedVersion(null);
      setComparisonVersion(null);
      setCompareMode(false);
    }
  };
  
  const handleNextPage = () => {
    if (page * limit < total) {
      setPage(page + 1);
      setSelectedVersion(null);
      setComparisonVersion(null);
      setCompareMode(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Function to create text difference highlighting
  const getTextDiff = (oldText: string, newText: string) => {
    if (!oldText && !newText) return null;
    if (!oldText) return <span className="bg-green-100 dark:bg-green-900 px-1 font-bold">{newText}</span>;
    if (!newText) return <span className="bg-red-100 dark:bg-red-900 px-1 font-bold">{oldText}</span>;
    
    const changes = Diff.diffWords(oldText, newText);
    
    return (
      <span>
        {changes.map((part, index) => {
          // Added text is green and bold, removed text is red and bold, unchanged is normal
          const className = part.added 
            ? 'bg-green-100 dark:bg-green-900 px-1 font-bold' 
            : part.removed 
              ? 'bg-red-100 dark:bg-red-900 px-1 font-bold' 
              : '';
          
          return (
            <span key={index} className={className}>
              {part.value}
            </span>
          );
        })}
      </span>
    );
  };
  
  // Function to get set identifier for a card version
  const getSetLabel = (card: Card, index: number) => {
    return card.set || `Set ${index + 1}`;
  };
  
  const toggleCompareMode = () => {
    if (compareMode) {
      // Exit compare mode
      setCompareMode(false);
      setComparisonVersion(null);
    } else {
      // Enter compare mode - clear current selections to start fresh
      setCompareMode(true);
      setSelectedVersion(null);
      setComparisonVersion(null);
    }
  };
  
  // Create a unique identifier for each card version based on whether it's the current card or a history entry
  const getCardUniqueId = (version: Card, isCurrentCard: boolean = false): string => {
    // For the current live version, add a prefix to distinguish it from history versions
    return isCurrentCard ? `current_${version.id}` : `history_${version.id}`;
  };

  // Get the selection status indicator for a card version
  const getSelectionStatus = (version: Card, isCurrentCard: boolean = false) => {
    if (!compareMode) return '';
    
    // Create unique IDs for comparison
    const versionUniqueId = getCardUniqueId(version, isCurrentCard);
    const selectedVersionUniqueId = selectedVersion ? getCardUniqueId(selectedVersion, !!(currentCard && selectedVersion.id === currentCard?.id)) : null;
    const comparisonVersionUniqueId = comparisonVersion ? getCardUniqueId(comparisonVersion, !!(currentCard && comparisonVersion.id === currentCard?.id)) : null;
    
    // Check if this card is the first selected card
    if (selectedVersion && versionUniqueId === selectedVersionUniqueId) {
      return (
        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-xs font-bold">1</span>
        </div>
      );
    } 
    // Check if this card is the second selected card
    else if (comparisonVersion && versionUniqueId === comparisonVersionUniqueId) {
      return (
        <div className="absolute top-2 right-2 bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-xs font-bold">2</span>
        </div>
      );
    } 
    // If no card is selected yet, show a question mark
    else if (!selectedVersion) {
      return (
        <div className="absolute top-2 right-2 bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-70">
          <span className="text-xs">?</span>
        </div>
      );
    } 
    // If first card is selected but second isn't, show a hint for second selection
    else if (selectedVersion && !comparisonVersion) {
      // Show a hint that this card can be selected as the second comparison card
      return (
        <div className="absolute top-2 right-2 bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-70">
          <span className="text-xs">2?</span>
        </div>
      );
    }
    
    return '';
  };
  
  const handleVersionSelect = (version: Card, isCurrentCard: boolean = false) => {
    // Create unique ID for this version
    const versionUniqueId = getCardUniqueId(version, isCurrentCard);
    // Define unique IDs for selected and comparison versions (fixes ReferenceError)
    const selectedVersionUniqueId = selectedVersion ? getCardUniqueId(selectedVersion, !!(currentCard && selectedVersion.id === currentCard?.id)) : null;
    const comparisonVersionUniqueId = comparisonVersion ? getCardUniqueId(comparisonVersion, !!(currentCard && comparisonVersion.id === currentCard?.id)) : null;

    if (compareMode) {
      // In compare mode
      if (!selectedVersion) {
        // First selection in compare mode
        setSelectedVersion(version);
        setComparisonVersion(null);
        console.log('Selected first card:', versionUniqueId, version.name, isCurrentCard ? '(current)' : '(history)');
      } else if (versionUniqueId === selectedVersionUniqueId) {
        // If selecting the same version, deselect it and start over
        setSelectedVersion(null);
        setComparisonVersion(null);
        console.log('Deselected first card');
      } else if (comparisonVersion && versionUniqueId === comparisonVersionUniqueId) {
        // If selecting the same comparison version, deselect it
        setComparisonVersion(null);
        console.log('Deselected second card');
      } else {
        // Second selection or replacement of comparison version
        setComparisonVersion(version);
        console.log('Selected second card:', versionUniqueId, version.name, isCurrentCard ? '(current)' : '(history)');
      }
    } else {
      // Normal mode
      setSelectedVersion(version);
      setComparisonVersion(null);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Card History</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleCompareMode}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md ${compareMode ? 'bg-blue-600 text-white font-bold' : 'bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 text-blue-800 dark:text-blue-200'}`}
              title={compareMode ? 'Exit comparison mode' : 'Compare versions'}
            >
              <FaChevronLeft size={14} />
              <span className="text-sm">{compareMode ? 'Exit Compare Mode' : 'Compare Versions'}</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* History list with current version */}
          <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {/* Comparison mode instruction banner */}
            {compareMode && (
              <div className={`mb-4 p-3 rounded-lg ${!selectedVersion ? 'bg-blue-100 dark:bg-blue-900' : !comparisonVersion ? 'bg-amber-100 dark:bg-amber-900' : 'bg-green-100 dark:bg-green-900'}`}>
                <div className="text-sm font-medium text-center">
                  {!selectedVersion ? (
                    <span className="text-blue-700 dark:text-blue-300">Select first card to compare</span>
                  ) : !comparisonVersion ? (
                    <span className="text-amber-700 dark:text-amber-300">Now select second card to compare</span>
                  ) : (
                    <span className="text-green-700 dark:text-green-300">Comparing selected cards. View differences below!</span>
                  )}
                </div>
              </div>
            )}
            {/* Current version section */}
            {loadingCurrentCard ? (
              <div className="flex justify-center items-center h-20 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
              </div>
            ) : currentCard ? (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Current Version - {currentCard ? getSetLabel(currentCard, 0) : 'Current Set'}
                </h3>
                <div 
                  className={`p-3 rounded-lg cursor-pointer transition-colors bg-green-100 dark:bg-green-900 border-l-4 border-green-500 mb-4`}
                  onClick={() => handleVersionSelect(currentCard, true)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-16 h-22 rounded overflow-hidden shadow-sm relative">
                        <img 
                          src={currentCard.imageUrl ? 
                            `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(currentCard.imageUrl)}` : 
                            'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E'}
                          alt={currentCard.name || 'Current card'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                        {getSelectionStatus(currentCard, true)}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium">{currentCard.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <span dangerouslySetInnerHTML={{ __html: formatManaCost(currentCard.manaCost) }} />
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                        {currentCard.type}
                      </div>
                      {(currentCard.power || currentCard.toughness) && (
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {currentCard.power}/{currentCard.toughness}
                        </div>
                      )}
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                        Current Live Version
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">History Versions</h3>
              </div>
            ) : null}
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4">{error}</div>
            ) : history.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 p-4">No history available for this card.</div>
            ) : (
              <>
                <ul className="space-y-2">
                  {history.map((item) => (
                    <li 
                      key={item._id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVersion && selectedVersion.id === item.version_data.id ? 
                        'bg-blue-100 dark:bg-blue-900' : 
                        currentCard && selectedVersion && currentCard.id === selectedVersion.id ? 
                        'bg-green-100 dark:bg-green-900' :
                        'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleVersionSelect(item.version_data)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-16 h-22 rounded overflow-hidden shadow-sm relative">
                            <img 
                              src={item.version_data.imageUrl ? 
                                `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(item.version_data.imageUrl)}` : 
                                'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E'
                              }
                              alt={item.version_data.name || 'Card version'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                              }}
                            />
                            {getSelectionStatus(item.version_data)}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium">{item.version_data.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            <span dangerouslySetInnerHTML={{ __html: formatManaCost(item.version_data.manaCost) }} />
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                            {item.version_data.type}
                          </div>
                          {(item.version_data.power || item.version_data.toughness) && (
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {item.version_data.power}/{item.version_data.toughness}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(item.timestamp)}
                            {item.version_data.set && (
                              <span className="ml-2 text-gray-400 dark:text-gray-500">
                                • Set: {item.version_data.set}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                
                {/* Pagination */}
                {total > limit && (
                  <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handlePreviousPage}
                      disabled={page === 1}
                      className={`p-2 rounded ${
                        page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={page * limit >= total}
                      className={`p-2 rounded ${
                        page * limit >= total ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Selected version details */}
          <div className="w-full md:w-2/3 p-4 overflow-y-auto">
            {compareMode && selectedVersion && comparisonVersion ? (
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-semibold text-center">Comparing Versions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First card (selected version) */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Selected Version - {getSetLabel(selectedVersion, 0)}
                    </h4>
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-auto mb-3">
                        <img 
                          src={selectedVersion.imageUrl ? 
                            `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(selectedVersion.imageUrl)}` : 
                            'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E'
                          }
                          alt={selectedVersion.name || 'Card version'}
                          className="w-full h-full object-contain rounded-lg shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                      </div>
                      <div className="w-full space-y-2">
                        <h3 className="text-base font-bold">{selectedVersion.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span dangerouslySetInnerHTML={{ __html: formatManaCost(selectedVersion.manaCost) }} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {selectedVersion.type}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{selectedVersion.text}</div>
                        
                        {(selectedVersion.power || selectedVersion.toughness) && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Power/Toughness: {selectedVersion.power}/{selectedVersion.toughness}
                          </div>
                        )}
                        
                        {selectedVersion.loyalty && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Loyalty: {selectedVersion.loyalty}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Second card (comparison version) */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Comparison Version - {getSetLabel(comparisonVersion, 1)}
                    </h4>
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-auto mb-3">
                        <img 
                          src={comparisonVersion.imageUrl ? 
                            `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(comparisonVersion.imageUrl)}` : 
                            'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E'
                          }
                          alt={comparisonVersion.name || 'Card version'}
                          className="w-full h-full object-contain rounded-lg shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                      </div>
                      <div className="w-full space-y-2">
                        <h3 className="text-base font-bold">{comparisonVersion.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span dangerouslySetInnerHTML={{ __html: formatManaCost(comparisonVersion.manaCost) }} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {comparisonVersion.type}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{comparisonVersion.text}</div>
                        
                        {(comparisonVersion.power || comparisonVersion.toughness) && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Power/Toughness: {comparisonVersion.power}/{comparisonVersion.toughness}
                          </div>
                        )}
                        
                        {comparisonVersion.loyalty && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Loyalty: {comparisonVersion.loyalty}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Differences section */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-md font-semibold mb-2">Changes</h4>
                  <ul className="space-y-1 text-sm">
                    {selectedVersion.name !== comparisonVersion.name && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Name changed:</div>
                        {getTextDiff(comparisonVersion.name, selectedVersion.name)}
                      </li>
                    )}
                    {selectedVersion.manaCost !== comparisonVersion.manaCost && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Mana cost changed:</div>
                        {getTextDiff(comparisonVersion.manaCost, selectedVersion.manaCost)}
                      </li>
                    )}
                    {selectedVersion.type !== comparisonVersion.type && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Type changed:</div>
                        {getTextDiff(comparisonVersion.type, selectedVersion.type)}
                      </li>
                    )}
                    {selectedVersion.rarity !== comparisonVersion.rarity && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Rarity changed:</div>
                        {getTextDiff(comparisonVersion.rarity, selectedVersion.rarity)}
                      </li>
                    )}
                    {selectedVersion.text !== comparisonVersion.text && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Card text changed:</div>
                        {getTextDiff(comparisonVersion.text, selectedVersion.text)}
                      </li>
                    )}
                    {selectedVersion.flavorText !== comparisonVersion.flavorText && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Flavor text changed:</div>
                        {getTextDiff(comparisonVersion.flavorText || '', selectedVersion.flavorText || '')}
                      </li>
                    )}
                    {(selectedVersion.power !== comparisonVersion.power || selectedVersion.toughness !== comparisonVersion.toughness) && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Power/Toughness changed:</div>
                        {getTextDiff(`${comparisonVersion.power || '?'}/${comparisonVersion.toughness || '?'}`, `${selectedVersion.power || '?'}/${selectedVersion.toughness || '?'}`)}
                      </li>
                    )}
                    {selectedVersion.loyalty !== comparisonVersion.loyalty && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Loyalty changed:</div>
                        {getTextDiff(`${comparisonVersion.loyalty || 'None'}`, `${selectedVersion.loyalty || 'None'}`)}
                      </li>
                    )}
                    {JSON.stringify(selectedVersion.colors) !== JSON.stringify(comparisonVersion.colors) && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Colors changed:</div>
                        {getTextDiff(comparisonVersion.colors.join(', ') || 'None', selectedVersion.colors.join(', ') || 'None')}
                      </li>
                    )}
                    {selectedVersion.set !== comparisonVersion.set && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Set changed:</div>
                        {getTextDiff(comparisonVersion.set || 'None', selectedVersion.set || 'None')}
                      </li>
                    )}
                    {selectedVersion.custom !== comparisonVersion.custom && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Custom status changed:</div>
                        From {comparisonVersion.custom ? 'Custom' : 'Official'} to {selectedVersion.custom ? 'Custom' : 'Official'}
                      </li>
                    )}
                    {JSON.stringify(selectedVersion.archetypes) !== JSON.stringify(comparisonVersion.archetypes) && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Archetypes changed:</div>
                        {getTextDiff(comparisonVersion.archetypes.join(', ') || 'None', selectedVersion.archetypes.join(', ') || 'None')}
                      </li>
                    )}
                    {selectedVersion.notes !== comparisonVersion.notes && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Notes changed:</div>
                        {getTextDiff(comparisonVersion.notes || 'None', selectedVersion.notes || 'None')}
                      </li>
                    )}
                    {JSON.stringify(selectedVersion.relatedTokens) !== JSON.stringify(comparisonVersion.relatedTokens) && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Related tokens changed:</div>
                        {getTextDiff(
                          comparisonVersion.relatedTokens?.join(', ') || 'None', 
                          selectedVersion.relatedTokens?.join(', ') || 'None'
                        )}
                      </li>
                    )}
                    {selectedVersion.relatedFace !== comparisonVersion.relatedFace && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Related face changed:</div>
                        {getTextDiff(
                          Array.isArray(comparisonVersion.relatedFace)
                            ? comparisonVersion.relatedFace.join(', ')
                            : comparisonVersion.relatedFace || 'None',
                          Array.isArray(selectedVersion.relatedFace)
                            ? selectedVersion.relatedFace.join(', ')
                            : selectedVersion.relatedFace || 'None'
                        )}
                      </li>
                    )}
                    {selectedVersion.facedown !== comparisonVersion.facedown && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Facedown status changed:</div>
                        From {comparisonVersion.facedown ? 'Facedown' : 'Normal'} to {selectedVersion.facedown ? 'Facedown' : 'Normal'}
                      </li>
                    )}
                    {selectedVersion.artist !== comparisonVersion.artist && (
                      <li className="text-amber-600 dark:text-amber-400">
                        <div className="font-semibold mb-1">Artist changed:</div>
                        {getTextDiff(comparisonVersion.artist || 'None', selectedVersion.artist || 'None')}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ) : selectedVersion ? (
              <div className="flex flex-col md:flex-row">
                {/* Card image */}
                <div className="w-full md:w-1/2 flex justify-center mb-4 md:mb-0">
                  <div className="w-64 h-auto">
                    <img 
                      src={selectedVersion.imageUrl ? 
                        `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(selectedVersion.imageUrl)}` : 
                        'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E'
                      }
                      alt={selectedVersion.name || 'Card version'}
                      className="w-full h-full object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22140%22%20viewBox%3D%220%200%20100%20140%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%22%20height%3D%22140%22%20fill%3D%22%23eee%22%3E%3C%2Frect%3E%3Ctext%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2270%22%20style%3D%22fill%3A%23aaa%3Bfont-weight%3Abold%3Bfont-size%3A12px%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%3Bdominant-baseline%3Acentral%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                      }}
                    />
                  </div>
                </div>
                
                {/* Card details */}
                <div className="w-full md:w-1/2 space-y-3">
                  <h3 className="text-xl font-bold">{selectedVersion.name}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span dangerouslySetInnerHTML={{ __html: formatManaCost(selectedVersion.manaCost) }} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedVersion.type}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap">{selectedVersion.text}</div>
                  
                  {(selectedVersion.power || selectedVersion.toughness) && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Power/Toughness: {selectedVersion.power}/{selectedVersion.toughness}
                    </div>
                  )}
                  
                  {selectedVersion.loyalty && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Loyalty: {selectedVersion.loyalty}
                    </div>
                  )}
                  
                  {selectedVersion.artist && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Artist: {selectedVersion.artist}
                    </div>
                  )}
                  
                  {compareMode && !comparisonVersion && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-300 text-center">
                        Select another version to compare with this one
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                {compareMode ? 
                  'Select two versions to compare' : 
                  'Select a version from the list to view details'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
