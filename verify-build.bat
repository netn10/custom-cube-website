@echo off
echo Verifying build process...

echo 1. Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo Error installing Node.js dependencies
    exit /b 1
)

echo 2. Building Next.js application...
npm run build
if errorlevel 1 (
    echo Error building Next.js application
    exit /b 1
)

echo 3. Exporting static files...
npm run export
if errorlevel 1 (
    echo Error exporting static files
    exit /b 1
)

echo 4. Checking if out directory exists...
if not exist "out" (
    echo Error: out directory not created
    exit /b 1
)

echo 5. Checking if index.html exists...
if not exist "out\index.html" (
    echo Error: index.html not found in out directory
    exit /b 1
)

echo Build verification successful!
echo Ready to deploy to Heroku.
pause 