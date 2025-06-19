@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo    HEROKU REMOTES SETUP SCRIPT
echo ===========================================
echo.
echo This script will configure Heroku git remotes for:
echo - Frontend: netn10-custom-cube-885947dcd6aa
echo - Backend:  netn10-custom-cube-backend-31fb1edb5cb3
echo.

:: Check if Heroku CLI is installed
heroku --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Heroku CLI is not installed or not in PATH
    echo Please install Heroku CLI from: https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

:: Check authentication
echo Checking Heroku authentication...
heroku auth:whoami >nul 2>&1
if errorlevel 1 (
    echo Please login to Heroku first...
    heroku login
    if errorlevel 1 (
        echo Failed to login to Heroku. Exiting...
        pause
        exit /b 1
    )
)

echo.
echo ===========================================
echo    SETTING UP FRONTEND REMOTE
echo ===========================================
echo.

:: Setup frontend remote
echo Setting up Heroku remote for frontend...
heroku git:remote -a netn10-custom-cube-885947dcd6aa
if errorlevel 1 (
    echo ERROR: Failed to setup frontend Heroku remote
    echo Make sure you have access to the Heroku app: netn10-custom-cube-885947dcd6aa
    pause
    exit /b 1
)

echo ✅ Frontend Heroku remote configured successfully!
echo.

echo ===========================================
echo    SETTING UP BACKEND REMOTE
echo ===========================================
echo.

:: Navigate to backend directory
cd backend
if errorlevel 1 (
    echo ERROR: Cannot access backend directory
    pause
    exit /b 1
)

:: Setup backend remote
echo Setting up Heroku remote for backend...
heroku git:remote -a netn10-custom-cube-backend-31fb1edb5cb3
if errorlevel 1 (
    echo ERROR: Failed to setup backend Heroku remote
    echo Make sure you have access to the Heroku app: netn10-custom-cube-backend-31fb1edb5cb3
    cd ..
    pause
    exit /b 1
)

echo ✅ Backend Heroku remote configured successfully!
echo.

:: Go back to root directory
cd ..

echo ===========================================
echo    SETUP COMPLETE!
echo ===========================================
echo.
echo ✅ Frontend remote: netn10-custom-cube-885947dcd6aa
echo ✅ Backend remote:  netn10-custom-cube-backend-31fb1edb5cb3
echo.
echo You can now run the deployment script!
echo.
pause 