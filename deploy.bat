@echo off
setlocal enabledelayedexpansion

echo Pushing to GitHub Repository...
git add .
git commit -m "Deployment %date% %time%"
git pull origin master --rebase
git push origin master
if errorlevel 1 (
    echo Error pushing to GitHub. Please resolve any conflicts and try again.
    exit /b 1
)

echo Successfully pushed to GitHub!
pause