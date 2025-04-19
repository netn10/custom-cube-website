# Magic: The Gathering Custom Cube Website

A web application for managing and exploring a custom Magic: The Gathering cube with unique archetypes and cards.

## Features

- **Dark mode by default** with light mode toggle
- **Home page** showcasing 10 unique archetypes:
  - WU Storm
  - UB Broken Cipher
  - BR Token Collection
  - RG Control
  - GW Vehicles
  - WB Blink/ETB/Value
  - BG Artifacts
  - UR Enchantments
  - RW Self-mill
  - GU Prowess
- **Cube list section** with advanced filtering options (by name, color, type, and source)
- **Card detail pages** with full card information
- **Archetype detail pages** showing strategy and key cards
- **Tokens section** for browsing all tokens in the cube
- **About page** with information about the cube
- **Tools section** with functional tools:
  - Draft Simulator
  - Random Pack Generator
  - Mana Calculator
  - Archetype Finder

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Flask (Python), MongoDB
- **Deployment**: Instructions for Netlify/Vercel (frontend) and Render/Heroku (backend)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Python (v3.8 or later)
- MongoDB

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/netn10/custom-cube-website.git
   cd custom-cube-website
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file in the backend directory with your MongoDB connection string:
     ```
     MONGO_URI=your_mongodb_connection_string
     ```

5. Seed the database:
   ```
   python seed_db.py
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   python app.py
   ```

2. In a separate terminal, start the frontend development server:
   ```
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Deployment

See the [deployment instructions](deployment-instructions.md) for detailed steps on how to deploy both the frontend and backend components.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Magic: The Gathering is owned by Wizards of the Coast
- This project is for educational and personal use only
