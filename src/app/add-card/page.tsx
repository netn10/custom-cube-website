'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddCard() {
  const router = useRouter();
  const [inputMethod, setInputMethod] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    manaCost: '',
    type: '',
    rarity: 'Common',
    text: '',
    power: '',
    toughness: '',
    loyalty: null,
    colors: [] as string[],
    custom: true,
    archetypes: [] as string[],
    imageUrl: '',
    flavorText: '',
    artist: '',
    set: 'Custom Cube 1',
    notes: '',
    relatedTokens: [] as string[],
    relatedFace: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const colorOptions = ['W', 'U', 'B', 'R', 'G'];
  const rarityOptions = ['Common', 'Uncommon', 'Rare', 'Mythic'];
  
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
        name: parsedData.name || '',
        manaCost: parsedData.manaCost || '',
        type: parsedData.type || '',
        rarity: parsedData.rarity || 'Common',
        text: parsedData.text || '',
        power: parsedData.power || '',
        toughness: parsedData.toughness || '',
        loyalty: parsedData.loyalty,
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // If using JSON input, try to parse it first
    if (inputMethod === 'json') {
      try {
        const parsedData = JSON.parse(jsonInput);
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/cards/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add card');
      }
      
      const data = await response.json();
      setSuccessMessage('Card added successfully!');
      
      // Reset form and JSON input after successful submission
      setFormData({
        name: '',
        manaCost: '',
        type: '',
        rarity: 'Common',
        text: '',
        power: '',
        toughness: '',
        loyalty: null,
        colors: [],
        custom: true,
        archetypes: [],
        imageUrl: '',
        flavorText: '',
        artist: '',
        set: 'Custom Cube 1',
        notes: '',
        relatedTokens: [],
        relatedFace: null
      });
      setJsonInput('');
      
      // Redirect to the newly created card after a delay
      setTimeout(() => {
        router.push(`/card/${data.id}`);
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
          Card Name *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="manaCost">
          Mana Cost *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="manaCost"
          type="text"
          name="manaCost"
          placeholder="{W}{U}{B}{R}{G}"
          value={formData.manaCost}
          onChange={handleChange}
          required
        />
        <p className="text-xs italic mt-1">Format: {"{W}"}, {"{2}{G}"}, etc.</p>
      </div>
      
      {/* Card Type */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
          Card Type *
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="rarity">
          Rarity *
        </label>
        <select
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="text">
          Card Text *
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="power">
          Power
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="power"
          type="text"
          name="power"
          placeholder="Leave empty for non-creatures"
          value={formData.power}
          onChange={handleChange}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="toughness">
          Toughness
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="loyalty">
          Loyalty
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="loyalty"
          type="number"
          name="loyalty"
          placeholder="For planeswalkers only"
          value={formData.loyalty === null ? '' : formData.loyalty}
          onChange={(e) => {
            const value = e.target.value === '' ? null : parseInt(e.target.value);
            setFormData({ ...formData, loyalty: value });
          }}
        />
      </div>
      
      {/* Colors */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Colors *
        </label>
        <div className="flex flex-wrap gap-4">
          {colorOptions.map(color => (
            <label key={color} className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="archetypes">
          Archetypes
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="archetypes"
          type="text"
          name="archetypes"
          placeholder="Comma-separated archetypes"
          value={formData.archetypes.join(', ')}
          onChange={handleArchetypesChange}
        />
        <p className="text-xs italic mt-1">E.g. "Storm, Control, Aggro"</p>
      </div>
      
      {/* Image URL */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="imageUrl">
          Card Image URL
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="flavorText">
          Flavor Text
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="flavorText"
          name="flavorText"
          rows={2}
          value={formData.flavorText}
          onChange={handleChange}
        />
      </div>
      
      {/* Artist */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="artist">
          Artist
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="artist"
          type="text"
          name="artist"
          value={formData.artist}
          onChange={handleChange}
        />
      </div>
      
      {/* Set */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="set">
          Set
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="set"
          type="text"
          name="set"
          value={formData.set}
          onChange={handleChange}
        />
      </div>
      
      {/* Notes */}
      <div className="mb-4 md:col-span-2">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
          Design Notes
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="relatedTokens">
          Related Tokens
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="relatedTokens"
          type="text"
          name="relatedTokens"
          placeholder="Comma-separated token names"
          value={formData.relatedTokens.join(', ')}
          onChange={handleTokensChange}
        />
        <p className="text-xs italic mt-1">E.g. "Goblin, Treasure, Clue"</p>
      </div>
      
      {/* Submit Button for Form */}
      <div className="flex items-center justify-between mt-6 md:col-span-2">
        <Link href="/" className="text-blue-500 hover:text-blue-700">
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
      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="jsonInput">
        Paste Card JSON
      </label>
      <textarea
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline font-mono"
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
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {inputMethod === 'json' ? renderJsonInput() : renderFormFields()}
      </form>
    </div>
  );
}
