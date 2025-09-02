# Custom Cube - Heroku Deployment Guide

This guide explains how to deploy both the frontend and backend of the Custom Cube website to Heroku.

## 🚀 Quick Deployment

### For Windows Users

**Option 1: Batch Script (Windows CMD)**
```bash
./deploy-heroku.bat
```

**Option 2: PowerShell Script (Recommended)**
```powershell
./deploy-heroku.ps1
```

## 📋 Prerequisites

1. **Heroku CLI** - Install from [https://devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
2. **Git** - Ensure git is installed and configured
3. **Node.js** - Required for the frontend (Next.js)
4. **Python** - Required for the backend (Flask)

## 🏗️ Project Structure

```
custom-cube-website/
├── src/                    # Frontend source (Next.js/React)
├── public/                 # Static assets
├── backend/               # Backend source (Python Flask)
│   ├── app.py            # Main Flask application
│   ├── Procfile          # Heroku process file for backend
│   └── requirements.txt  # Python dependencies
├── package.json          # Frontend dependencies
├── Procfile              # Heroku process file for frontend
└── deployment scripts...
```

## 🎯 Heroku Applications

- **Frontend**: [netn10-custom-cube-885947dcd6aa.herokuapp.com](https://netn10-custom-cube-885947dcd6aa.herokuapp.com/)
- **Backend**: [netn10-custom-cube-885947dcd6aa.herokuapp.com](https://netn10-custom-cube-885947dcd6aa.herokuapp.com/)

## 🔧 First-Time Setup

If this is your first time deploying or you need to set up Heroku remotes:

1. Run the setup script:
   ```bash
   ./setup-heroku-remotes.bat
   ```

2. This will configure the git remotes for both applications

## 🚀 Deployment Process

The deployment script performs the following steps:

### Frontend Deployment
1. Commits any pending changes
2. Pushes to Heroku remote (tries `master` first, then `main`)
3. Heroku automatically:
   - Installs Node.js dependencies (`npm install`)
   - Builds the Next.js application (`npm run build`)
   - Starts the application (`npm start`)

### Backend Deployment
1. Navigates to the `backend/` directory
2. Commits any pending changes
3. Pushes to Heroku remote
4. Heroku automatically:
   - Installs Python dependencies (`pip install -r requirements.txt`)
   - Starts the Flask application with Gunicorn

## 🔍 Troubleshooting

### Common Issues

**1. "Heroku CLI not found"**
- Install Heroku CLI from the official website
- Restart your terminal after installation

**2. "Authentication failed"**
- Run `heroku login` manually
- Follow the browser authentication flow

**3. "No Heroku remote configured"**
- Run the setup script: `./setup-heroku-remotes.bat`
- Or manually add remotes:
  ```bash
  # For frontend (in root directory)
  heroku git:remote -a netn10-custom-cube-885947dcd6aa
  
  # For backend (in backend/ directory)
  cd backend
  heroku git:remote -a netn10-custom-cube-885947dcd6aa
  ```

**4. "Failed to push to Heroku"**
- Check if you have collaborator access to the Heroku apps
- Verify the app names are correct
- Try pushing manually: `git push heroku main`

### Manual Deployment

If the automated script fails, you can deploy manually:

**Frontend:**
```bash
# In root directory
git add .
git commit -m "Deploy frontend"
git push heroku main
```

**Backend:**
```bash
# In backend/ directory
cd backend
git add .
git commit -m "Deploy backend"
git push heroku main
```

## 📝 Environment Variables

If your applications require environment variables, set them via Heroku CLI:

```bash
# For frontend
heroku config:set VARIABLE_NAME=value -a netn10-custom-cube-885947dcd6aa

# For backend
heroku config:set VARIABLE_NAME=value -a netn10-custom-cube-885947dcd6aa
```

## 🔗 Useful Commands

```bash
# View app logs
heroku logs --tail -a netn10-custom-cube-885947dcd6aa
heroku logs --tail -a netn10-custom-cube-885947dcd6aa

# Open apps in browser
heroku open -a netn10-custom-cube-885947dcd6aa
heroku open -a netn10-custom-cube-885947dcd6aa

# Check app status
heroku ps -a netn10-custom-cube-885947dcd6aa
heroku ps -a netn10-custom-cube-885947dcd6aa
```

## 🎉 Success!

After successful deployment, your applications will be available at:
- Frontend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/
- Backend: https://netn10-custom-cube-885947dcd6aa.herokuapp.com/

The deployment script will automatically open both URLs in your browser.

---

## 📧 Support

If you encounter any issues with deployment, check the Heroku logs for detailed error messages:

```bash
heroku logs --tail -a [APP_NAME]
``` 