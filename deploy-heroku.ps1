# Custom Cube - Heroku Deployment Script (PowerShell)
# This script deploys both frontend and backend to their respective Heroku applications

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   CUSTOM CUBE - HEROKU DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will deploy:" -ForegroundColor Yellow
Write-Host "- Frontend (Next.js) to: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/" -ForegroundColor Green
Write-Host "- Backend (Python Flask) to: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/" -ForegroundColor Green
Write-Host ""

# Set Heroku app names (the public URL still uses the old
# netn10-custom-cube-885947dcd6aa subdomain, but the app names for git/CLI are:)
$FRONTEND_APP = "netn10-custom-cube"
$BACKEND_APP = "netn10-custom-cube-backend"

# Check if Heroku CLI is installed
try {
    $herokuVersion = heroku --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Heroku CLI not found"
    }
} catch {
    Write-Host "ERROR: Heroku CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Heroku CLI from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   STEP 1: DEPLOYING FRONTEND" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check Heroku authentication
Write-Host "Checking Heroku authentication..." -ForegroundColor Yellow
try {
    heroku auth:whoami 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Please login to Heroku first..." -ForegroundColor Yellow
        heroku login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to login to Heroku. Exiting..." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
} catch {
    Write-Host "Authentication check failed. Please try logging in manually." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Committing latest frontend changes..." -ForegroundColor Yellow
git add .
git commit -m "Frontend deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit for frontend" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Pushing frontend to Heroku..." -ForegroundColor Yellow
# Ensure the 'heroku' remote points at the current frontend app name
heroku git:remote -a $FRONTEND_APP | Out-Null
git push heroku master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying to push to main branch instead..." -ForegroundColor Yellow
    git push heroku main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to deploy frontend to Heroku" -ForegroundColor Red
        Write-Host "Make sure you have the correct Heroku remote configured:" -ForegroundColor Yellow
        Write-Host "  heroku git:remote -a $FRONTEND_APP" -ForegroundColor Cyan
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   STEP 2: DEPLOYING BACKEND" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# The backend lives in the backend/ subdirectory of THIS same repo (it is not
# a separate git repo). It has its own self-contained Procfile + requirements.txt,
# so it is deployed to the backend app by pushing just that subdirectory via
# git subtree. Any pending changes were already committed in the frontend step
# above (single repo), so we only need to push here.
Write-Host ""
Write-Host "Pushing backend to Heroku..." -ForegroundColor Yellow
# Point a dedicated 'heroku-backend' remote at the backend app (does NOT touch
# the frontend 'heroku' remote).
heroku git:remote -a $BACKEND_APP -r heroku-backend | Out-Null
git subtree push --prefix backend heroku-backend master
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to deploy backend to Heroku" -ForegroundColor Red
    Write-Host "If the push was rejected as non-fast-forward, force it with:" -ForegroundColor Yellow
    Write-Host "  git push heroku-backend ``git subtree split --prefix backend master``:refs/heads/master --force" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Frontend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/" -ForegroundColor Green
Write-Host "✅ Backend:  https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/" -ForegroundColor Green
Write-Host ""
Write-Host "Both applications have been deployed successfully!" -ForegroundColor Yellow
Write-Host ""

# Optional: Open the deployed frontend
Write-Host "Opening deployed application..." -ForegroundColor Yellow
Start-Process "https://netn10-custom-cube-885947dcd6aa.herokuapp.com/"

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
Read-Host "Press Enter to exit" 