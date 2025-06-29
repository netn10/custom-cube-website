'use client';

import { FaFilePdf, FaDownload, FaExternalLinkAlt, FaLayerGroup } from 'react-icons/fa';

export default function ResourcesPage() {
  const resources = [
    {
      title: 'All Cards PDF',
      description: 'Download a complete PDF containing images of all cards in the cube.',
      href: 'https://www.dropbox.com/scl/fi/03jns9bvjryvt3tb8z5we/all_cards.pdf?rlkey=vj2oz2frut3aqpx28cx9rgfmy&st=3833iohz&dl=0',
      icon: <FaFilePdf className="text-red-500 text-4xl" aria-label="PDF icon" />,
      buttonLabel: 'Download Cards PDF',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      external: false,
    },
    {
      title: 'All Tokens PDF',
      description: 'Download a complete PDF containing images of all tokens used in the cube.',
      href: '/resources/my_tokens.pdf',
      icon: <FaFilePdf className="text-red-500 text-4xl" aria-label="PDF icon" />,
      buttonLabel: 'Download Tokens PDF',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      external: false,
    },
    {
      title: 'Printable Archetypes Printout',
      description: 'An easy way to reference all the archetypes in the cube.',
      href: 'https://imgur.com/a/LKg5DDS',
      icon: <FaLayerGroup className="text-blue-500 text-4xl" aria-label="Layer icon" />,
      buttonLabel: 'View Printable Cards',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      external: true,
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-8 text-center">Resources</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((res, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-full"
          >
                         <div className="flex flex-col items-center mb-4">
               <div className="w-16 h-16 flex items-center justify-center mb-3">{res.icon}</div>
               <div className="text-center min-h-[3.5rem] flex items-center">
                 <h2 className="text-xl font-semibold">{res.title}</h2>
               </div>
             </div>

                         <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 flex-grow text-center">
               {res.description}
             </p>

                         <a
               href={res.href}
               target={res.href.startsWith('http') ? '_blank' : '_self'}
               rel={res.href.startsWith('http') ? 'noopener noreferrer' : undefined}
               className={`inline-flex items-center justify-center px-4 py-2 ${res.buttonColor} text-white rounded-md transition-colors mt-auto`}
             >
               {res.href.startsWith('http') ? (
                 <FaExternalLinkAlt className="mr-2" aria-hidden="true" />
               ) : (
                 <FaDownload className="mr-2" aria-hidden="true" />
               )}
               {res.buttonLabel}
             </a>
          </div>
        ))}
      </div>
    </main>
  );
}
