'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCardById } from '@/lib/api';
import { Card } from '@/types/types';

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      // Fetch card data from API
      const fetchCard = async () => {
        try {
          const data = await getCardById(params.id as string);
          setCard(data);
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
        <Link href="/cube-list" className="btn-primary">
          Back to Cube List
        </Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Card Not Found</h2>
        <p className="mb-6 dark:text-gray-300">The card you're looking for doesn't exist or has been removed.</p>
        <Link href="/cube-list" className="btn-primary">
          Back to Cube List
        </Link>
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

  // Function to format mana cost with colored symbols
  const formatManaCost = (manaCost: string) => {
    return manaCost.replace(/\{([WUBRGC0-9]+)\}/g, (match, symbol) => {
      const colorClass = symbol.length === 1 && 'WUBRG'.includes(symbol)
        ? colorMap[symbol]
        : 'bg-mtg-colorless text-black';
      
      return `<span class="inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass} mx-0.5">${symbol}</span>`;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button 
          onClick={() => router.back()} 
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
          <div className="md:w-1/3 p-4">
            <div className="bg-gray-300 dark:bg-gray-700 rounded-lg aspect-[2.5/3.5] flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Card Image</span>
            </div>
          </div>
          
          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold dark:text-white">{card.name}</h1>
              <div 
                className="mana-cost" 
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
            
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <p className="whitespace-pre-line dark:text-white">{card.text}</p>
            </div>
            
            {(card.power && card.toughness) && (
              <div className="mb-4">
                <p className="text-lg font-semibold dark:text-white">
                  Power/Toughness: {card.power}/{card.toughness}
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 italic">"{card.flavorText}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Illustrated by {card.artist}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-6">
              {card.custom && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  Custom Card
                </span>
              )}
              
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                {card.rarity}
              </span>
              
              {card.archetypes.map((archetype: string) => {
                const archetypeName = archetype.split('-').pop();
                return (
                  <Link 
                    key={archetype} 
                    href={`/archetypes/${archetype}`}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {archetypeName?.charAt(0).toUpperCase() + archetypeName?.slice(1)} Archetype
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Related Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* This would be populated with actual related cards in a real implementation */}
          {Array(4).fill(null).map((_, index) => (
            <div 
              key={index} 
              className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <p className="font-medium dark:text-white">Related Card {index + 1}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Creature</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
