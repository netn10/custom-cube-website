'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addCard } from '@/lib/api';
import { Card } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

export default function AddCard(): JSX.Element {
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
  const [formData, setFormData] = useState<Card>({
    id: '', // Add empty id field to satisfy Card type
    name: '',
    manaCost: '',
    type: '',
    rarity: 'Common',
    text: '',
    power: '',
    toughness: '',
    loyalty: undefined,
    colors: [] as string[],
    custom: true,
    archetypes: [] as string[],
    imageUrl: '',
    flavorText: '',
    artist: '',
    set: 'Custom Cube 1',
    notes: '',
    relatedTokens: [] as string[],
    relatedFace: undefined
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const colorOptions = ['W', 'U', 'B', 'R', 'G'];
  const rarityOptions = ['Common', 'Uncommon', 'Rare', 'Mythic'];
  
  // Add state for image upload and Gemini result
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [geminiJson, setGeminiJson] = useState<string>('');
  const [geminiError, setGeminiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  // Handle archetypes input (comma-separated)
  const handleArchetypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archetypes = e.target.value.split(',').map(a => a.trim()).filter(a => a);
    setFormData({ ...formData, archetypes });
  };
  
  // Handle related tokens input (comma-separated)
  const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tokens = e.target.value.split(',').map(t => t.trim()).filter(t => t);
    setFormData({ ...formData, relatedTokens: tokens });
  };

  // Parse JSON input and set form data
  const handleJsonParse = () => {
    setJsonError('');
    try {
      const parsedData = JSON.parse(jsonInput);
      
      // Validate required fields
      if (!parsedData.name) throw new Error('Card name is required');
      if (!parsedData.manaCost) throw new Error('Mana cost is required');
      if (!parsedData.type) throw new Error('Card type is required');
      if (!parsedData.text) throw new Error('Card text is required');
      if (!parsedData.colors || !Array.isArray(parsedData.colors)) {
        throw new Error('Colors must be provided as an array');
      }
      
      // Set form data from parsed JSON
      setFormData({
        ...parsedData,
        // Ensure loyalty is properly typed
        loyalty: parsedData.loyalty === null ? undefined : parsedData.loyalty,
        power: parsedData.power || '',
        toughness: parsedData.toughness || '',
        colors: Array.isArray(parsedData.colors) ? parsedData.colors : [],
        custom: parsedData.custom !== undefined ? parsedData.custom : true,
        archetypes: Array.isArray(parsedData.archetypes) ? parsedData.archetypes : [],
        imageUrl: parsedData.imageUrl || '',
        flavorText: parsedData.flavorText || '',
        artist: parsedData.artist || '',
        set: parsedData.set || 'Custom Cube 1',
        notes: parsedData.notes || '',
        relatedTokens: Array.isArray(parsedData.relatedTokens) ? parsedData.relatedTokens : [],
        relatedFace: parsedData.relatedFace
      });
      
      // Switch to form view to show parsed data
      setInputMethod('form');
      setSuccessMessage('JSON successfully parsed! You can review the card details in the form.');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  // Handle drag-and-drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setGeminiError('');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setUploadedImage(file);
    await analyzeImageWithGemini(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiError('');
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImage(file);
    await analyzeImageWithGemini(file);
  };

  const analyzeImageWithGemini = async (file: File) => {
    setAnalyzing(true);
    setGeminiJson('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('http://localhost:5000/api/gemini-analyze-card', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to analyze image');
      const data = await res.json();
      setGeminiJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setGeminiError(err.message || 'Error analyzing image');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleJsonUse = () => {
    if (geminiJson) {
      setJsonInput(geminiJson);
      setInputMethod('json');
      setSuccessMessage('Gemini JSON loaded! You can review/edit it below.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Check for missing set and imageUrl in form data
    if (inputMethod === 'form') {
      let warnings = [];
      if (!formData.set) warnings.push('Set is missing');
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
        
        // Check for missing set and imageUrl in JSON data
        let warnings = [];
        if (!parsedData.set) warnings.push('Set is missing');
        if (!parsedData.imageUrl) warnings.push('Image URL is missing');
        
        if (warnings.length > 0) {
          const proceed = window.confirm(`Warning: ${warnings.join(' and ')}. Continue anyway?`);
          if (!proceed) {
            setIsSubmitting(false);
            return;
          }
        }
        
        // Use the parsed data instead of form data
        await submitCard(parsedData);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Invalid JSON format');
        setIsSubmitting(false);
      }
    } else {
      // Using form input
      await submitCard(formData);
    }
  };
  
  // Function to submit card data to API
  const submitCard = async (cardData: any) => {
    try {
      if (!token) {
        throw new Error('You must be logged in as an admin to add cards');
      }
      
      // Use the API function with token
      const data = await addCard(cardData, token);
      setSuccessMessage('Card added successfully!');
      
      // Reset form and JSON input after successful submission
      setFormData({
        id: '', // Empty id field for new form
        name: '',
        manaCost: '',
        type: '',
        rarity: 'Common',
        text: '',
        power: '',
        toughness: '',
        loyalty: undefined,
        colors: [],
        custom: true,
        archetypes: [],
        imageUrl: '',
        flavorText: '',
        artist: '',
        set: 'Custom Cube 1',
        notes: '',
        relatedTokens: [],
        relatedFace: undefined
      });
      setJsonInput('');
      
      // Redirect to the newly created card after a delay
      setTimeout(() => {
        router.push(`/card/${encodeURIComponent(data.name)}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error adding card:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form fields
  const renderFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card Name */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="name">
          Card Name *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Mana Cost */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="manaCost">
          Mana Cost *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="manaCost"
          type="text"
          name="manaCost"
          placeholder="{W}{U}{B}{R}{G}"
          value={formData.manaCost}
          onChange={handleChange}
          required
        />
        <p className="text-xs italic mt-1 text-gray-600 dark:text-gray-400">Format: {"{W}"}, {"{2}{G}"}, etc.</p>
      </div>
      
      {/* Card Type */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="type">
          Card Type *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="type"
          type="text"
          name="type"
          placeholder="Creature — Human Wizard"
          value={formData.type}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Rarity */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="rarity">
          Rarity *
        </label>
        <select
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="rarity"
          name="rarity"
          value={formData.rarity}
          onChange={handleChange}
          required
        >
          {rarityOptions.map(rarity => (
            <option key={rarity} value={rarity}>{rarity}</option>
          ))}
        </select>
      </div>
      
      {/* Card Text */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="text">
          Card Text *
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="text"
          name="text"
          rows={4}
          value={formData.text}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Power/Toughness (for creatures) */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="power">
          Power
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="power"
          type="text"
          name="power"
          placeholder="Leave empty for non-creatures"
          value={formData.power}
          onChange={handleChange}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="toughness">
          Toughness
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="toughness"
          type="text"
          name="toughness"
          placeholder="Leave empty for non-creatures"
          value={formData.toughness}
          onChange={handleChange}
        />
      </div>
      
      {/* Loyalty (for planeswalkers) */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="loyalty">
          Loyalty
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="loyalty"
          type="number"
          name="loyalty"
          placeholder="For planeswalkers only"
          value={formData.loyalty === undefined ? '' : String(formData.loyalty)}
          onChange={(e) => {
            // When empty, set as undefined (which is compatible with the optional number type)
            if (e.target.value === '') {
              setFormData({ ...formData, loyalty: undefined });
            } else {
              setFormData({ ...formData, loyalty: Number(e.target.value) });
            }
          }}
        />
      </div>
      
      {/* Colors */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
          Colors *
        </label>
        <div className="flex flex-wrap gap-4">
          {colorOptions.map(color => (
            <label key={color} className="inline-flex items-center text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
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
      
      {/* Archetypes */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="archetypes">
          Archetypes
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="archetypes"
          type="text"
          name="archetypes"
          placeholder="Comma-separated archetypes"
          value={formData.archetypes.join(', ')}
          onChange={handleArchetypesChange}
        />
        <p className="text-xs italic mt-1 text-gray-600 dark:text-gray-400">E.g. "Storm, Control, Aggro"</p>
      </div>
      
      {/* Image URL */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="imageUrl">
          Card Image URL
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="imageUrl"
          type="url"
          name="imageUrl"
          placeholder="https://example.com/image.jpg"
          value={formData.imageUrl}
          onChange={handleChange}
        />
      </div>
      
      {/* Flavor Text */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="flavorText">
          Flavor Text
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="flavorText"
          name="flavorText"
          rows={2}
          value={formData.flavorText}
          onChange={handleChange}
        />
      </div>
      
      {/* Artist */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="artist">
          Artist
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="artist"
          type="text"
          name="artist"
          value={formData.artist}
          onChange={handleChange}
        />
      </div>
      
      {/* Set */}
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="set">
          Set
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="set"
          type="text"
          name="set"
          value={formData.set}
          onChange={handleChange}
        />
      </div>
      
      {/* Notes */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="notes">
          Design Notes
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="notes"
          name="notes"
          rows={3}
          placeholder="Add notes about the card design, power level, etc."
          value={formData.notes}
          onChange={handleChange}
        />
      </div>
      
      {/* Related Tokens */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="relatedTokens">
          Related Tokens
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400"
          id="relatedTokens"
          type="text"
          name="relatedTokens"
          placeholder="Comma-separated token names"
          value={formData.relatedTokens?.join(', ') || ''}
          onChange={handleTokensChange}
        />
        <p className="text-xs italic mt-1 text-gray-600 dark:text-gray-400">E.g. "Goblin, Treasure, Clue"</p>
      </div>
      
      {/* Submit Button for Form */}
      <div className="flex items-center justify-between mt-6 md:col-span-2">
        <Link href="/" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Cancel
        </Link>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Add Card'}
        </button>
      </div>
    </div>
  );

  // Render JSON input
  const renderJsonInput = () => (
    <div className="mb-4">
      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="jsonInput">
        Paste Card JSON
      </label>
      <textarea
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 dark:focus:border-blue-400 font-mono"
        id="jsonInput"
        rows={20}
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder={`{
  "name": "Altruistic Channeler",
  "manaCost": "{W}",
  "type": "Creature — Human Druid",
  "rarity": "Rare",
  "text": "{T}: Add {W}{W}{W}. Spend this mana only to cast spells. Whenever you cast a spell this way, target opponent gains control of it. If it has targets, that player may choose new targets for it.",
  "power": "1",
  "toughness": "1",
  "colors": ["W"],
  "custom": true,
  "archetypes": ["Storm"],
  "imageUrl": "https://i.imgur.com/example.png"
}`}
        required
      />
      {jsonError && (
        <p className="text-red-500 text-xs italic mt-2">{jsonError}</p>
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
          <p>You must be logged in as an admin to add new cards.</p>
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
      <h1 className="text-3xl font-bold mb-6">Add New Card</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          type="button"
          className={`py-2 px-4 ${inputMethod === 'form' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => setInputMethod('form')}
        >
          Form Input
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${inputMethod === 'json' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => setInputMethod('json')}
        >
          JSON Input
        </button>
      </div>
      
      {/* Gemini AI Drag-and-Drop Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Analyze Card Image (Gemini AI)</h2>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-400 rounded-md p-6 text-center cursor-pointer bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadedImage ? (
            <div>
              <p className="mb-2">Uploaded: {uploadedImage.name}</p>
              <img
                src={URL.createObjectURL(uploadedImage)}
                alt="Uploaded card"
                className="mx-auto mb-2 max-h-48"
              />
            </div>
          ) : (
            <p>Drag and drop a card image here, or click to select a file</p>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        {analyzing && <p className="text-blue-600 mt-2">Analyzing image with Gemini AI...</p>}
        {geminiError && <p className="text-red-600 mt-2">{geminiError}</p>}
        {geminiJson && (
          <div className="mt-4">
            <h3 className="font-semibold mb-1">Generated Card JSON:</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto max-h-64 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">{geminiJson}</pre>
            <button
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleJsonUse}
            >
              Use this JSON
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-900 shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {inputMethod === 'json' ? renderJsonInput() : renderFormFields()}
      </form>
    </div>
  );
}
