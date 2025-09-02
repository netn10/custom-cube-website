@echo off
echo Setting up environment files for Custom Cube Website...
echo.

echo Creating frontend environment file...
if not exist ".env.local" (
    copy "env.example" ".env.local"
    echo Created .env.local from env.example
) else (
    echo .env.local already exists, skipping...
)

echo.
echo Creating backend environment file...
if not exist "backend\.env" (
    copy "backend\env.example" "backend\.env"
    echo Created backend\.env from backend\env.example
) else (
    echo backend\.env already exists, skipping...
)

echo.
echo Creating python_scripts environment file...
if not exist "python_scripts\.env" (
    copy "python_scripts\env.example" "python_scripts\.env"
    echo Created python_scripts\.env from python_scripts\env.example
) else (
    echo python_scripts\.env already exists, skipping...
)

echo.
echo Environment files created successfully!
echo.
echo Next steps:
echo 1. Edit .env.local and update NEXT_PUBLIC_API_URL if needed
echo 2. Edit backend\.env and add your MongoDB URI and OpenAI API key
echo 3. Edit python_scripts\.env if you plan to use the Python scripts
echo.
echo See README.md for detailed instructions on getting API keys.
pause
