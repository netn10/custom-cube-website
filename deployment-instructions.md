# Deployment Instructions for MTG Custom Cube Website

This document provides instructions for deploying both the frontend (Next.js) and backend (Flask) components of the MTG Custom Cube Website.

## Frontend Deployment (Next.js)

### Deploy to Vercel (Recommended)

1. Create an account on [Vercel](https://vercel.com/) if you don't have one already.
2. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
3. Navigate to your project directory and run:
   ```
   vercel login
   vercel
   ```
4. Follow the prompts to deploy your application.
5. Set the environment variable `NEXT_PUBLIC_API_URL` to point to your deployed backend API.

### Alternative: Deploy to Netlify

1. Create an account on [Netlify](https://www.netlify.com/) if you don't have one already.
2. Install the Netlify CLI:
   ```
   npm install -g netlify-cli
   ```
3. Navigate to your project directory and run:
   ```
   netlify login
   netlify deploy
   ```
4. Follow the prompts to deploy your application.
5. Set the environment variable `NEXT_PUBLIC_API_URL` to point to your deployed backend API.

## Backend Deployment (Flask)

### Deploy to Render

1. Create an account on [Render](https://render.com/) if you don't have one already.
2. Create a new Web Service.
3. Connect your GitHub repository or upload your code directly.
4. Configure the service:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
5. Add the environment variable `MONGO_URI` with your MongoDB connection string.
6. Deploy the service.

### Alternative: Deploy to Heroku

1. Create an account on [Heroku](https://www.heroku.com/) if you don't have one already.
2. Install the Heroku CLI:
   ```
   npm install -g heroku
   ```
3. Navigate to your backend directory and run:
   ```
   heroku login
   heroku create
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku master
   ```
4. Add the environment variable `MONGO_URI` with your MongoDB connection string:
   ```
   heroku config:set MONGO_URI=your_mongodb_connection_string
   ```

## Connecting Frontend and Backend

After deploying both the frontend and backend, you need to update the frontend to use the deployed backend API:

1. Get the URL of your deployed backend API (e.g., `https://mtgcube-api.onrender.com`).
2. Set the environment variable `NEXT_PUBLIC_API_URL` in your frontend deployment platform to point to this URL.
3. Redeploy your frontend if necessary.

## MongoDB Database

Your application uses MongoDB for data storage. Make sure your MongoDB instance is:

1. Accessible from your deployed backend (check network rules).
2. Has the necessary collections and data.
3. The connection string is properly set in the backend environment variables.

## Testing the Deployment

After deploying both components:

1. Visit your frontend URL to ensure the website loads properly.
2. Test the various features to ensure they're working correctly.
3. Check the backend logs if you encounter any issues.

## Troubleshooting

If you encounter issues:

1. Check the logs in your deployment platform.
2. Verify that all environment variables are set correctly.
3. Ensure your MongoDB instance is accessible from your deployed backend.
4. Test API endpoints directly to isolate frontend vs. backend issues.
