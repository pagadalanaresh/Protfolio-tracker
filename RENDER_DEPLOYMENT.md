# Render Deployment Guide - Essential Changes Only

## Files Modified for Database Storage

### 1. **database.js** (NEW)
- PostgreSQL connection and operations
- Required for Render deployment

### 2. **server.js** (MODIFIED)
- Updated to use database when available
- Falls back to JSON files for local development
- No changes needed - works in both modes

### 3. **package.json** (MODIFIED)
- Added database dependencies: `pg` and `dotenv`

### 4. **.env** (NEW)
- Environment variables for database configuration
- Not used locally, required for production

### 5. **render.yaml** (NEW)
- Render deployment configuration
- Defines web service and PostgreSQL database

## What You Need to Do Before Deployment

### Step 1: Update package.json (ALREADY DONE)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
```

### Step 2: No Code Changes Required
Your current `server.js` already handles both:
- **Local development**: Uses JSON files (current behavior)
- **Production**: Uses PostgreSQL database (automatic when DATABASE_URL is set)

## Render Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add database support for Render deployment"
git push origin main
```

### 2. Create Render Services

#### A. Create PostgreSQL Database
1. Go to [render.com](https://render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `portfolio-tracker-db`
   - **Database**: `portfolio_tracker`
   - **User**: `portfolio_user`
   - **Plan**: Free
4. Click "Create Database"
5. **Copy the DATABASE_URL** (you'll need this)

#### B. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `indian-portfolio-tracker`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

#### C. Set Environment Variables
In your web service settings, add:
- **NODE_ENV**: `production`
- **DATABASE_URL**: (paste from PostgreSQL service)

### 3. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy
- Your app will be available at: `https://your-app-name.onrender.com`

## What Happens Automatically

### On First Deployment:
1. ✅ Server detects DATABASE_URL
2. ✅ Connects to PostgreSQL database
3. ✅ Creates tables automatically
4. ✅ Migrates your JSON data to database
5. ✅ Switches to database storage mode

### Benefits:
- **Scalable**: Handles multiple users
- **Reliable**: Database transactions and backups
- **Fast**: Optimized database queries
- **Monitored**: Health check endpoints

## Files You Can Ignore
- `migrate.js` - Optional manual migration script
- `DEPLOYMENT_GUIDE.md` - Detailed documentation
- `.env` - Only used if you want local database testing

## Verification
After deployment, check:
- **App URL**: Your portfolio tracker should load
- **Health Check**: `https://your-app.onrender.com/health`
- **Database Status**: `https://your-app.onrender.com/api/db-status`

## Rollback Plan
If anything goes wrong:
1. Your local version still works with JSON files
2. Your data is safe in the JSON files
3. You can redeploy anytime

**That's it! Your app is ready for Render deployment with database storage.** 🚀
