# Custom Cube - Heroku Deployment Script (PowerShell)
# This script deploys both frontend and backend to their respective Heroku applications

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   CUSTOM CUBE - HEROKU DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will deploy:" -ForegroundColor Yellow
Write-Host "- Frontend (Next.js) to: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/" -ForegroundColor Green
Write-Host "- Backend (Python Flask) to: https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/" -ForegroundColor Green
Write-Host ""

# Set Heroku app names
$FRONTEND_APP = "netn10-custom-cube-885947dcd6aa"
$BACKEND_APP = "netn10-custom-cube-backend-31fb1edb5cb3"

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

# Navigate to backend directory
try {
    Set-Location backend
} catch {
    Write-Host "ERROR: Cannot access backend directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Committing latest backend changes..." -ForegroundColor Yellow
git add .
git commit -m "Backend deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit for backend" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Pushing backend to Heroku..." -ForegroundColor Yellow
git push heroku master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying to push to main branch instead..." -ForegroundColor Yellow
    git push heroku main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to deploy backend to Heroku" -ForegroundColor Red
        Write-Host "Make sure you have the correct Heroku remote configured:" -ForegroundColor Yellow
        Write-Host "  heroku git:remote -a $BACKEND_APP" -ForegroundColor Cyan
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
Write-Host ""

# Go back to root directory
Set-Location ..

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Frontend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/" -ForegroundColor Green
Write-Host "✅ Backend:  https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/" -ForegroundColor Green
Write-Host ""
Write-Host "Both applications have been deployed successfully!" -ForegroundColor Yellow
Write-Host ""

# Optional: Open the deployed applications
Write-Host "Opening deployed applications..." -ForegroundColor Yellow
Start-Process "https://netn10-custom-cube-885947dcd6aa.herokuapp.com/"
Start-Sleep -Seconds 2
Start-Process "https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/"

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
Read-Host "Press Enter to exit" 