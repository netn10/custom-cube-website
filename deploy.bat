@echo off
setlocal enabledelayedexpansion

echo Deploying Frontend...
git add .
git commit -m "Deployment %date% %time%"
git push origin master

echo Deploying Backend...
cd backend
git add .
git commit -m "Backend Deployment %date% %time%"
git push origin master

echo.
echo ========================================
echo Backend code pushed to GitHub.
echo To complete the backend deployment on Render:
echo 1. Go to your Render Dashboard
echo 2. Select the 'mtgcube-api' service
echo 3. Click on 'Manual Deploy' -> 'Deploy latest commit'
echo ========================================
echo.

cd ..
echo Frontend deployment to GitHub complete!
echo Backend code pushed to GitHub. Follow the steps above to deploy to Render.