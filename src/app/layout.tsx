import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import HideDevTools from '@/components/HideDevTools';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Custom MTG Cube',
  description: 'A website for a custom Magic: The Gathering cube with weird archetypes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        <HideDevTools />
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="bg-gray-800 dark:bg-gray-900 text-white p-4">
              <div className="container mx-auto text-center">
                <p> {new Date().getFullYear()} Custom MTG Cube. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
