# Deployment Guide for Custom Cube Website

## Quick Deployment Steps

1. **First-time setup** (only needed once):
   ```bash
   # Ensure you have the Heroku remote configured
   git remote add heroku https://git.heroku.com/netn10-custom-cube-885947dcd6aa.git
   
   # Set the multi-buildpack
   heroku buildpacks:set https://github.com/heroku/heroku-buildpack-multi.git --app netn10-custom-cube-885947dcd6aa
   ```

2. **Deploy using the deploy.bat script**:
   ```bash
   ./deploy.bat
   ```

## What the deployment does:

1. **Node.js Build Phase** (handled by `heroku-postbuild` in package.json):
   - Runs `npm run build` to build the Next.js app
   - Runs `npm run export` to create static files in `/out` directory

2. **Python Runtime Phase**:
   - Installs Flask and dependencies from `requirements.txt`
   - Runs the Flask backend with `gunicorn`

3. **Flask Backend**:
   - Serves the API endpoints at `/api/*`
   - Serves the static Next.js files for all other routes
   - Handles SPA routing by serving `index.html` for frontend routes

## Environment Variables

The following environment variables should be set in Heroku:

```bash
# Required for MongoDB connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mtgcube

# Required for authentication
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here

# Optional API keys (if using ChatGPT/Gemini features)
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## File Structure After Build:

```
/
├── out/                    # Next.js static build (served by Flask)
│   ├── index.html         # Main app entry point
│   ├── _next/             # Next.js assets (CSS, JS)
│   └── [other pages]/     # Static pages
├── backend/
│   ├── app.py            # Flask server (serves API + static files)
│   └── requirements.txt  # Python dependencies
├── package.json          # Node.js config with heroku-postbuild
├── requirements.txt      # Root Python dependencies (for Heroku)
├── Procfile             # Tells Heroku to run Flask server
└── .buildpacks          # Tells Heroku to use Node.js + Python
```

## API Configuration:

- **Development**: Frontend calls `http://127.0.0.1:5000/api`
- **Production**: Frontend calls `/api` (same domain, served by Flask)

## Troubleshooting:

1. **Build fails**: Run `verify-build.bat` locally to test the build process
2. **API not working**: Check Heroku logs with `heroku logs --tail --app netn10-custom-cube-885947dcd6aa`
3. **Frontend not loading**: Ensure the `out/` directory is created during build
4. **Database issues**: Verify MONGO_URI environment variable is set correctly

## Manual Heroku Commands:

```bash
# Check app status
heroku ps --app netn10-custom-cube-885947dcd6aa

# View logs
heroku logs --tail --app netn10-custom-cube-885947dcd6aa

# Set environment variables
heroku config:set MONGO_URI="your_connection_string" --app netn10-custom-cube-885947dcd6aa

# Force rebuild
heroku builds:create --app netn10-custom-cube-885947dcd6aa
``` 