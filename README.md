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
  - WB ETB/Death Value
  - BG Artifacts
  - UR Enchantments
  - RW Self-mill
  - GU Prowess
- **Cube list section** with advanced filtering options (by name, color, type, and source)
- **Card detail pages** with full card information and hover tooltips for tokens and related cards
- **Archetype detail pages** showing strategy and key cards
- **Tokens section** for browsing all tokens in the cube
- **About page** with information about the cube
- **Tools section** with functional tools:
  - Draft Simulator
  - Random Pack Generator
  - Mana Calculator
  - Archetype Finder
- **Interactive hover tooltips** on card detail pages that show images when hovering over:
  - Related tokens (with token images)
  - Related face cards (with card images)
  - Efficient lazy loading to prevent page slowdown

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

### Heroku Deployment Setup

The application is set up with two separate Heroku apps:

1. **Frontend (Next.js)**: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
2. **Backend (Flask)**: https://netn10-custom-cube-backend-81f01bd8d4c4.herokuapp.com/

This two-repository setup allows for independent deployment and scaling of frontend and backend components.

#### Frontend Deployment

The frontend is deployed from the main repository:

```bash
# From the root directory of the project
git add .
git commit -m "Your commit message"
git push heroku master
```

#### Backend Deployment

The backend is deployed from a separate Git repository in the backend directory:

```bash
# Navigate to the backend directory
cd backend

# Make your changes to the backend code
# ...

# Commit those changes
git add .
git commit -m "Your backend changes"

# Push to Heroku to deploy
git push heroku master
```

#### Environment Variables

Make sure to set these environment variables in your Heroku apps:

1. **Frontend (Next.js) Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: URL of your backend API (e.g., https://netn10-custom-cube-backend-81f01bd8d4c4.herokuapp.com/api)
   - `GEMINI_API_KEY`: (If using Google's Gemini API)

2. **Backend (Flask) Environment Variables**:
   - `MONGO_URI`: Your MongoDB connection string
   - `GEMINI_API_KEY`: (If using Google's Gemini API)

#### Setting Environment Variables on Heroku

```bash
# For frontend
heroku config:set NEXT_PUBLIC_API_URL="https://your-backend-app.herokuapp.com/api" --app your-frontend-app-name

# For backend
heroku config:set MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/dbname" --app your-backend-app-name
```

### Deployment Troubleshooting

#### Common Frontend Issues:
- **Build failures**: Check for TypeScript errors in your code
- **Missing environment variables**: Ensure all required environment variables are set
- **CORS issues**: Make sure your backend is configured to accept requests from your frontend domain

#### Common Backend Issues:
- **MongoDB connection errors**: Verify your MongoDB connection string is correct
- **Missing dependencies**: Ensure all required packages are in requirements.txt
- **CORS configuration**: Check that CORS is properly configured to allow requests from your frontend

### Automatic Deployment Script

For convenience, you can create a deployment script that handles both deployments:

```bash
# Create a file named deploy.bat in your project root
@echo off
echo Deploying Frontend...
git add .
git commit -m "Deployment %date% %time%"
git push heroku master

echo Deploying Backend...
cd backend
git add .
git commit -m "Backend Deployment %date% %time%"
git push heroku master
cd ..

echo Deployment Complete!
```

Run this script with `deploy.bat` to deploy both frontend and backend in sequence.

See the [deployment instructions](deployment-instructions.md) for detailed steps on how to deploy both the frontend and backend components.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Magic: The Gathering is owned by Wizards of the Coast
- This project is for educational and personal use only
