@echo off
echo.
echo ========================================
echo    Custom Cube - Deployment Script
echo ========================================
echo.

echo Deploying frontend to Heroku...
echo.

REM Check if git is clean
git status --porcelain > nul 2>&1
if errorlevel 1 (
    echo Error: Git repository has issues. Please check git status.
    pause
    exit /b 1
)

REM Add and commit any changes
git add .
git commit -m "Deploy: %date% %time%" 2>nul

REM Deploy frontend
echo Pushing to Heroku frontend...
git push heroku main
if errorlevel 1 (
    echo Trying with master branch...
    git push heroku master
)

echo.
echo Frontend deployment initiated!
echo.

REM Deploy backend
echo Deploying backend to Heroku...
cd backend
git add .
git commit -m "Deploy backend: %date% %time%" 2>nul
git push heroku main
if errorlevel 1 (
    echo Trying with master branch...
    git push heroku master
)
cd ..

echo.
echo ========================================
echo         Deployment Complete!
echo ========================================
echo.
echo Frontend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
echo Backend:  https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/
echo.

pause 