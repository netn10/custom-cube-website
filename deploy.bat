@echo off
setlocal enabledelayedexpansion

echo Preparing for Heroku deployment...

REM First, let's commit any changes
echo Adding and committing changes...
git add .
git commit -m "Deployment %date% %time%" --allow-empty

REM Pull latest changes and push to GitHub
echo Pulling latest changes from GitHub...
git pull origin master --rebase
if errorlevel 1 (
    echo Error pulling from GitHub. Please resolve any conflicts and try again.
    exit /b 1
)

echo Pushing to GitHub Repository...
git push origin master
if errorlevel 1 (
    echo Error pushing to GitHub. Please resolve any conflicts and try again.
    exit /b 1
)

REM Deploy to Heroku
echo Deploying to Heroku...
git push heroku master
if errorlevel 1 (
    echo Error deploying to Heroku. Check the error messages above.
    exit /b 1
)

echo Successfully deployed to Heroku!
echo Your app should be available at: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/

pause

