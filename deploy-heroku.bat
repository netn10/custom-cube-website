@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo    CUSTOM CUBE - HEROKU DEPLOYMENT SCRIPT
echo ===========================================
echo.
echo This script will deploy:
echo - Frontend (Next.js) to: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
echo - Backend (Python Flask) to: https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/
echo.

:: Check if Heroku CLI is installed
heroku --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Heroku CLI is not installed or not in PATH
    echo Please install Heroku CLI from: https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

:: Set Heroku app names
set FRONTEND_APP=netn10-custom-cube-885947dcd6aa
set BACKEND_APP=netn10-custom-cube-backend-31fb1edb5cb3

echo ===========================================
echo    STEP 1: DEPLOYING FRONTEND
echo ===========================================
echo.

:: Deploy Frontend
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
echo Committing latest frontend changes...
git add .
git commit -m "Frontend deployment - %date% %time%" || echo "No changes to commit for frontend"

echo.
echo Pushing frontend to Heroku...
git push heroku master
if errorlevel 1 (
    echo Trying to push to main branch instead...
    git push heroku main
    if errorlevel 1 (
        echo ERROR: Failed to deploy frontend to Heroku
        echo Make sure you have the correct Heroku remote configured:
        echo   heroku git:remote -a %FRONTEND_APP%
        pause
        exit /b 1
    )
)

echo.
echo ✅ Frontend deployed successfully!
echo.

echo ===========================================
echo    STEP 2: DEPLOYING BACKEND
echo ===========================================
echo.

:: Navigate to backend directory
cd backend
if errorlevel 1 (
    echo ERROR: Cannot access backend directory
    pause
    exit /b 1
)

echo.
echo Committing latest backend changes...
git add .
git commit -m "Backend deployment - %date% %time%" || echo "No changes to commit for backend"

echo.
echo Pushing backend to Heroku...
git push heroku master
if errorlevel 1 (
    echo Trying to push to main branch instead...
    git push heroku main
    if errorlevel 1 (
        echo ERROR: Failed to deploy backend to Heroku
        echo Make sure you have the correct Heroku remote configured:
        echo   heroku git:remote -a %BACKEND_APP%
        cd ..
        pause
        exit /b 1
    )
)

echo.
echo ✅ Backend deployed successfully!
echo.

:: Go back to root directory
cd ..

echo ===========================================
echo    DEPLOYMENT COMPLETE!
echo ===========================================
echo.
echo ✅ Frontend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
echo ✅ Backend:  https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/
echo.
echo Both applications have been deployed successfully!
echo.

:: Optional: Open the deployed applications
echo Opening deployed applications...
start https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
timeout /t 2 /nobreak >nul
start https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/

echo.
echo Deployment script completed!
pause 