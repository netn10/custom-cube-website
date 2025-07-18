'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addToken } from '@/lib/api';
import { Token } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

export default function AddToken(): JSX.Element {
  const router = useRouter();
  const { isAuthenticated, isAdmin, token } = useAuth();
  const [inputMethod, setInputMethod] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated, redirect to login
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState<Token>({
    id: '', // Add empty id field to satisfy Token type
    name: '',
    type: 'Token',
    colors: [] as string[],
    power: '',
    toughness: '',
    abilities: [] as string[],
    imageUrl: '',
    artist: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const colorOptions = ['W', 'U', 'B', 'R', 'G'];
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle color checkbox changes
  const handleColorChange = (color: string) => {
    const newColors = [...formData.colors];
    if (newColors.includes(color)) {
      // Remove color if already selected
      const index = newColors.indexOf(color);
      newColors.splice(index, 1);
    } else {
      // Add color if not selected
      newColors.push(color);
    }
    setFormData({ ...formData, colors: newColors });
  };
  
  // Handle abilities input (comma-separated)
  const handleAbilitiesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const abilities = e.target.value.split('\n').filter(a => a);
    setFormData({ ...formData, abilities });
  };

  // Parse JSON input and set form data
  const handleJsonParse = () => {
    setJsonError('');
    try {
      const parsedData = JSON.parse(jsonInput);
      
      // Validate required fields
      if (!parsedData.name) throw new Error('Token name is required');
      if (!parsedData.type) throw new Error('Token type is required');
      if (parsedData.colors && !Array.isArray(parsedData.colors)) {
        throw new Error('Colors must be provided as an array');
      }
      // Ensure colors is an array even if not provided (colorless token)
      if (!parsedData.colors) {
        parsedData.colors = [];
      }
      
      // Set form data from parsed JSON
      setFormData({
        ...parsedData,
        power: parsedData.power || '',
        toughness: parsedData.toughness || '',
        colors: Array.isArray(parsedData.colors) ? parsedData.colors : [],
        abilities: Array.isArray(parsedData.abilities) ? parsedData.abilities : [],
        imageUrl: parsedData.imageUrl || '',
        artist: parsedData.artist || '',
      });
      
      // Switch to form view to show parsed data
      setInputMethod('form');
      setSuccessMessage('JSON successfully parsed! You can review the token details in the form.');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Check for missing imageUrl in form data
    if (inputMethod === 'form') {
      let warnings = [];
      if (!formData.imageUrl) warnings.push('Image URL is missing');
      
      if (warnings.length > 0) {
        const proceed = window.confirm(`Warning: ${warnings.join(' and ')}. Continue anyway?`);
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }
    }
    
    // If using JSON input, try to parse it first
    if (inputMethod === 'json') {
      try {
        const parsedData = JSON.parse(jsonInput);
        
        // Check for missing imageUrl in JSON data
        let warnings = [];
        if (!parsedData.imageUrl) warnings.push('Image URL is missing');
        
        if (warnings.length > 0) {
          const proceed = window.confirm(`Warning: ${warnings.join(' and ')}. Continue anyway?`);
          if (!proceed) {
            setIsSubmitting(false);
            return;
          }
        }
        
        // Use the parsed data instead of form data
        await submitToken(parsedData);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Invalid JSON format');
        setIsSubmitting(false);
      }
    } else {
      // Using form input
      await submitToken(formData);
    }
  };
  
  // Function to submit token data to API
  const submitToken = async (tokenData: any) => {
    try {
      if (!token) {
        throw new Error('You must be logged in as an admin to add tokens');
      }
      
      // Use the API function with token
      const data = await addToken(tokenData, token);
      setSuccessMessage('Token added successfully!');
      
      // Reset form and JSON input after successful submission
      setFormData({
        id: '', // Empty id field for new form
        name: '',
        type: 'Token',
        colors: [],
        power: '',
        toughness: '',
        abilities: [],
        imageUrl: '',
        artist: ''
      });
      setJsonInput('');
      
      // Redirect to the new token's detail page immediately
      if (data && data.name) {
        router.push(`/token/${encodeURIComponent(data.name)}`);
      } else {
        router.push('/tokens'); // fallback
      }
      
    } catch (error) {
      console.error('Error adding token:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form fields
  const renderFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Token Name */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="name">
          Token Name *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Token Type */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="type">
          Token Type *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="type"
          type="text"
          name="type"
          placeholder="Token Creature — Human Soldier"
          value={formData.type}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Power/Toughness (for creature tokens) */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="power">
          Power
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="power"
          type="text"
          name="power"
          placeholder="Leave empty for non-creature tokens"
          value={formData.power}
          onChange={handleChange}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="toughness">
          Toughness
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="toughness"
          type="text"
          name="toughness"
          placeholder="Leave empty for non-creature tokens"
          value={formData.toughness}
          onChange={handleChange}
        />
      </div>
      
      {/* Colors */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2">
          Colors
        </label>
        <p className="text-xs italic mb-2 dark:text-gray-300">Select colors for the token or leave empty for colorless tokens</p>
        <div className="flex flex-wrap gap-4">
          {colorOptions.map(color => (
            <label key={color} className="inline-flex items-center dark:text-gray-100">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 dark:bg-gray-900 dark:border-gray-600"
                checked={formData.colors.includes(color)}
                onChange={() => handleColorChange(color)}
              />
              <span className="ml-2">
                {color === 'W' ? 'White' : 
                 color === 'U' ? 'Blue' : 
                 color === 'B' ? 'Black' : 
                 color === 'R' ? 'Red' : 'Green'}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Abilities */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="abilities">
          Abilities
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="abilities"
          name="abilities"
          rows={4}
          placeholder="Enter each ability on a new line"
          value={formData.abilities?.join('\n') || ''}
          onChange={handleAbilitiesChange}
        />
        <p className="text-xs italic mt-1 dark:text-gray-300">Enter each ability on a new line, e.g. "Flying", "Lifelink"</p>
      </div>
      
      {/* Artist */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="artist">
          Artist
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="artist"
          type="text"
          name="artist"
          value={formData.artist}
          onChange={handleChange}
        />
      </div>

      {/* Image URL */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="imageUrl">
          Token Image URL
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline"
          id="imageUrl"
          type="url"
          name="imageUrl"
          placeholder="https://example.com/image.jpg"
          value={formData.imageUrl}
          onChange={handleChange}
        />
      </div>
      
      {/* Submit Button for Form */}
      <div className="flex items-center justify-between mt-6 md:col-span-2">
        <Link href="/tokens" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Cancel
        </Link>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Add Token'}
        </button>
      </div>
    </div>
  );

  // Render JSON input
  const renderJsonInput = () => (
    <div className="mb-4">
      <label className="block text-gray-700 dark:text-gray-100 text-sm font-bold mb-2" htmlFor="jsonInput">
        Paste Token JSON
      </label>
      <textarea
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline font-mono"
        id="jsonInput"
        rows={15}
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder={`{
  "name": "Soldier",
  "type": "Token Creature — Human Soldier",
  "colors": ["W"],
  "power": "1",
  "toughness": "1",
  "abilities": ["Vigilance"],
  "imageUrl": "https://i.imgur.com/example.png",
  "artist": "MTG Artist"
}`}
        required
      />
      {jsonError && (
        <p className="text-red-500 dark:text-red-300 text-xs italic mt-2">{jsonError}</p>
      )}
      <div className="mt-4 flex">
        <button
          type="button"
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
          onClick={handleJsonParse}
        >
          Parse JSON
        </button>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit JSON'}
        </button>
      </div>
    </div>
  );

  // If not authenticated or not admin, show message
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Access Denied</p>
          <p>You must be logged in as an admin to add new tokens.</p>
          <div className="mt-4">
            <Link href="/login" className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">
              Log In
            </Link>
            <Link href="/" className="inline-block bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Add New Token</h1>
      
      {errorMessage && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          type="button"
          className={`py-2 px-4 ${inputMethod === 'form' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}`}
          onClick={() => setInputMethod('form')}
        >
          Form Input
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${inputMethod === 'json' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}`}
          onClick={() => setInputMethod('json')}
        >
          JSON Input
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {inputMethod === 'json' ? renderJsonInput() : renderFormFields()}
      </form>
    </div>
  );
}
