# Deployment Guide for Vocal2Gestures

This guide will help you deploy both the frontend and backend components of the Vocal2Gestures application.

## Prerequisites

- Node.js 16+ installed
- Python 3.8+ installed (for backend)
- Git installed
- Docker installed (optional, for containerized deployment)

## Deployment Options

### 1. Using the Deployment Script

We provide a TypeScript-based deployment script that can help automate the deployment process.

\`\`\`bash
# Install ts-node globally if you don't have it
npm install -g ts-node

# Run the deployment script
ts-node scripts/run-deploy.ts
\`\`\`

You can also provide options to the script:

\`\`\`bash
ts-node scripts/run-deploy.ts --type both --backendPlatform railway --frontendPlatform vercel
\`\`\`

Available options:
- `--type`: `frontend`, `backend`, or `both`
- `--backendPlatform`: `heroku`, `railway`, `render`, or `docker`
- `--frontendPlatform`: `vercel`, `netlify`, or `docker`
- `--backendUrl`: URL of an existing backend (optional)

### 2. Manual Deployment

#### Backend Deployment

##### Option A: Heroku

\`\`\`bash
cd python_backend
heroku create vocal2gestures-backend
git init
git add .
git commit -m "Initial deployment"
git push heroku master
\`\`\`

##### Option B: Railway

\`\`\`bash
cd python_backend
railway login
railway init
railway up
\`\`\`

##### Option C: Docker

\`\`\`bash
cd python_backend
docker build -t vocal2gestures-backend .
docker run -d -p 5000:5000 vocal2gestures-backend
\`\`\`

#### Frontend Deployment

##### Option A: Vercel

\`\`\`bash
vercel
\`\`\`

##### Option B: Netlify

\`\`\`bash
netlify deploy
\`\`\`

##### Option C: Docker

\`\`\`bash
docker build -t vocal2gestures-frontend -f Dockerfile.frontend .
docker run -d -p 3000:3000 vocal2gestures-frontend
\`\`\`

## Environment Variables

Make sure to set the following environment variables for your frontend deployment:

- `NEXT_PUBLIC_PYTHON_BACKEND_URL`: URL of your Python backend
- `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_OWNER` (if using GitHub integration)

## Testing Your Deployment

1. Visit your deployed frontend URL
2. Check the server status indicator to ensure the Python backend is connected
3. Test the sign language recognition features
4. Test the model training features

## Troubleshooting

If you encounter issues:

1. **Python Backend Connection Issues**:
   - Check if the backend is running
   - Verify the `NEXT_PUBLIC_PYTHON_BACKEND_URL` is correct
   - Check for CORS issues in the browser console

2. **Model Training Issues**:
   - Ensure TensorFlow is installed correctly
   - Check if the backend has enough memory
   - Review backend logs for errors

3. **Video Processing Issues**:
   - Ensure browser camera permissions are granted
   - Verify MediaPipe installation
   - Check network connectivity between frontend and backend
\`\`\`

Let's update the package.json to include the deployment scripts:
