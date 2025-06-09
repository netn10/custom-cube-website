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

