'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';
import { FaSun, FaMoon, FaBars, FaTimes, FaUser, FaSignOutAlt, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();

  // Filter navLinks based on authentication status
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Cube List', path: '/cube-list' },
    { name: 'Archetypes', path: '/archetypes' },
    { name: 'Tokens', path: '/tokens' },
    { name: 'Tools', path: '/tools' },
    { name: 'About', path: '/about' },
  ];
  
  // Only admin users can add/edit cards
  const adminLinks = [
    { name: 'Add Card', path: '/add-card' },
  ];
  
  const handleLogout = () => {
    logout();
    // Redirect to home page after logout
    router.push('/');
  };

  return (
    <nav className="bg-gray-800 dark:bg-gray-900 text-white shadow-md text-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center">
            <Link href="/" className="text-lg font-bold">
              Custom MTG Cube
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-link ${
                  pathname === link.path ? 'bg-gray-700 text-white' : 'text-gray-300'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            {/* Admin only links */}
            {isAdmin && 
              adminLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`nav-link ${
                    pathname === link.path ? 'bg-green-700 text-white' : 'text-green-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))
            }
            
            {/* Authentication links */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:bg-gray-700 hover:text-white flex items-center px-3 py-2 rounded-md text-sm font-medium"
              >
                <FaSignOutAlt className="mr-1" /> Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`nav-link ${
                    pathname === '/login' ? 'bg-gray-700 text-white' : 'text-gray-300'
                  }`}
                >
                  <FaUser className="mr-1 inline" /> Login
                </Link>
                <Link
                  href="/register"
                  className={`nav-link ${
                    pathname === '/register' ? 'bg-gray-700 text-white' : 'text-gray-300'
                  }`}
                >
                  <FaUserPlus className="mr-1 inline" /> Register
                </Link>
              </>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Navigation Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200 mr-2"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block py-2 px-4 ${
                  pathname === link.path ? 'bg-gray-700 text-white' : 'text-gray-300'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {/* Admin only links - Mobile */}
            {isAdmin && 
              adminLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`block py-2 px-4 ${
                    pathname === link.path ? 'bg-green-700 text-white' : 'text-green-400'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))
            }
            
            {/* Authentication links - Mobile */}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left py-2 px-4 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <FaSignOutAlt className="mr-1 inline" /> Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`block py-2 px-4 ${
                    pathname === '/login' ? 'bg-gray-700 text-white' : 'text-gray-300'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaUser className="mr-1 inline" /> Login
                </Link>
                <Link
                  href="/register"
                  className={`block py-2 px-4 ${
                    pathname === '/register' ? 'bg-gray-700 text-white' : 'text-gray-300'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaUserPlus className="mr-1 inline" /> Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
