'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaFilePdf, FaDownload } from 'react-icons/fa';

export default function ResourcesPage() {
  const [cardsLastUpdated, setCardsLastUpdated] = useState<string>('');
  const [tokensLastUpdated, setTokensLastUpdated] = useState<string>('');

  useEffect(() => {
    // In a real implementation, you might fetch this information from an API
    // For now, we'll use static dates or could be updated when PDFs are generated
    const fetchLastUpdated = async () => {
      try {
        // This could be replaced with an actual API call to get the last updated dates
        setCardsLastUpdated(new Date().toLocaleDateString());
        setTokensLastUpdated(new Date().toLocaleDateString());
      } catch (error) {
        console.error('Error fetching last updated dates:', error);
      }
    };

    fetchLastUpdated();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Resources</h1>
      
      {/* Historic Set Viewing */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <h2 className="text-xl font-semibold mb-4">Historic Set Viewing</h2>
        <p className="mb-4">
          View cards as they existed in previous sets. This is useful for seeing how cards have evolved over time.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/cube-list?historicMode=true&set=Set%201" 
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            Historic Set 1
          </Link>
          <Link 
            href="/cube-list?historicMode=true&set=Set%202" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            Historic Set 2
          </Link>
          <Link 
            href="/cube-list?combinedHistoric=true&set=combined" 
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md transition-colors"
          >
            Historic Set 1 + Set 2
          </Link>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cards PDF */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <FaFilePdf className="text-red-500 text-4xl mr-4" />
            <div>
              <h2 className="text-xl font-semibold">All Cards PDF</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Last updated: {cardsLastUpdated}
              </p>
            </div>
          </div>
          
          <p className="mb-4">
            Download a complete PDF containing images of all cards in the cube. 
            Perfect for offline reference or printing.
          </p>
          
          <Link 
            href="/resources/all_cards.pdf" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <FaDownload className="mr-2" />
            Download Cards PDF
          </Link>
        </div>
        
        {/* Tokens PDF */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <FaFilePdf className="text-red-500 text-4xl mr-4" />
            <div>
              <h2 className="text-xl font-semibold">All Tokens PDF</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Last updated: {tokensLastUpdated}
              </p>
            </div>
          </div>
          
          <p className="mb-4">
            Download a complete PDF containing images of all tokens used in the cube.
            Essential for representing token creatures during gameplay.
          </p>
          
          <Link 
            href="/resources/my_tokens.pdf" 
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            <FaDownload className="mr-2" />
            Download Tokens PDF
          </Link>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">About These Resources</h3>
        <p>
          These PDFs are automatically generated from the latest card and token data in our database.
          They contain high-quality images arranged in a printable format, perfect for reference during gameplay
          or for creating physical proxies of the cards.
        </p>
      </div>
    </div>
  );
}
