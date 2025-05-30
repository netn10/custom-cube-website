@echo off
setlocal enabledelayedexpansion

echo Deploying Frontend...
git add .
git commit -m "Deployment %date% %time%"
git pull heroku master --rebase
git push heroku master
if errorlevel 1 (
    echo Error deploying frontend. Please resolve any conflicts and try again.
    exit /b 1
)

echo Deploying Backend...
cd backend
git add .
git commit -m "Backend Deployment %date% %time%"
git pull heroku master --rebase
git push heroku master
if errorlevel 1 (
    echo Error deploying backend. Please resolve any conflicts and try again.
    cd ..
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Deployment Complete!
echo Frontend: https://netn10-custom-cube.herokuapp.com/
echo Backend: https://netn10-custom-cube.herokuapp.com/api/
echo ========================================