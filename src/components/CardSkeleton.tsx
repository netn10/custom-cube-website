'use client';

export default function CardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          {/* Image skeleton */}
          <div className="md:w-1/3 p-4">
            <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Content skeleton */}
          <div className="md:w-2/3 p-6">
            {/* Title and mana cost */}
            <div className="flex justify-between items-start mb-4">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
            
            {/* Type line */}
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4 animate-pulse"></div>
            
            {/* Colors */}
            <div className="flex mb-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full mr-1 animate-pulse"></div>
              ))}
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-2 mb-4">
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            </div>
            
            {/* Card text */}
            <div className="mb-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
            </div>
            
            {/* Power/Toughness */}
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse"></div>
            
            {/* Flavor text */}
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
            
            {/* Set and artist */}
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse"></div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-300 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 