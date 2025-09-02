#!/usr/bin/env python3
"""
Environment Setup Script for Custom Cube Website
This script creates environment files from example templates.
"""

import os
import shutil
from pathlib import Path


def setup_env_files():
    """Create environment files from example templates."""
    print("Setting up environment files for Custom Cube Website...")
    print()

    # Define the files to create
    env_files = [
        {
            "example": "env.example",
            "target": ".env.local",
            "description": "frontend environment file",
        },
        {
            "example": "backend/env.example",
            "target": "backend/.env",
            "description": "backend environment file",
        },
        {
            "example": "python_scripts/env.example",
            "target": "python_scripts/.env",
            "description": "python_scripts environment file",
        },
    ]

    for env_file in env_files:
        example_path = Path(env_file["example"])
        target_path = Path(env_file["target"])

        print(f"Creating {env_file['description']}...")

        if not example_path.exists():
            print(f"  Warning: {example_path} not found, skipping...")
            continue

        if target_path.exists():
            print(f"  {target_path} already exists, skipping...")
        else:
            # Create parent directory if it doesn't exist
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Copy the example file
            shutil.copy2(example_path, target_path)
            print(f"  Created {target_path} from {example_path}")

    print()
    print("Environment files created successfully!")
    print()
    print("Next steps:")
    print("1. Edit .env.local and update NEXT_PUBLIC_API_URL if needed")
    print("2. Edit backend/.env and add your MongoDB URI and OpenAI API key")
    print("3. Edit python_scripts/.env if you plan to use the Python scripts")
    print()
    print("See README.md for detailed instructions on getting API keys.")


if __name__ == "__main__":
    setup_env_files()
