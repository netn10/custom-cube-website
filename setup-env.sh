#!/bin/bash

echo "Setting up environment files for Custom Cube Website..."
echo

echo "Creating frontend environment file..."
if [ ! -f ".env.local" ]; then
    cp "env.example" ".env.local"
    echo "Created .env.local from env.example"
else
    echo ".env.local already exists, skipping..."
fi

echo
echo "Creating backend environment file..."
if [ ! -f "backend/.env" ]; then
    cp "backend/env.example" "backend/.env"
    echo "Created backend/.env from backend/env.example"
else
    echo "backend/.env already exists, skipping..."
fi

echo
echo "Creating python_scripts environment file..."
if [ ! -f "python_scripts/.env" ]; then
    cp "python_scripts/env.example" "python_scripts/.env"
    echo "Created python_scripts/.env from python_scripts/env.example"
else
    echo "python_scripts/.env already exists, skipping..."
fi

echo
echo "Environment files created successfully!"
echo
echo "Next steps:"
echo "1. Edit .env.local and update NEXT_PUBLIC_API_URL if needed"
echo "2. Edit backend/.env and add your MongoDB URI and OpenAI API key"
echo "3. Edit python_scripts/.env if you plan to use the Python scripts"
echo
echo "See README.md for detailed instructions on getting API keys."
