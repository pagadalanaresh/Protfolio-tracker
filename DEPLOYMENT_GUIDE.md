# Database Migration & Render Deployment Guide

## Overview
Your Indian Portfolio Tracker has been successfully migrated from JSON file storage to PostgreSQL database storage, making it ready for deployment on Render.

## What Changed

### 1. Database Configuration
- **Added**: `database.js` - PostgreSQL connection and operations
- **Added**: `.env` - Environment variables configuration
- **Updated**: `server.js` - Now uses database instead of JSON files
- **Added**: `migrate.js` - Standalone migration script
- **Added**: `render.yaml` - Render deployment configuration

### 2. New Dependencies
- `pg` - PostgreSQL client for Node.js
- `dotenv` - Environment variables management

### 3. Database Schema
Two tables are created automatically:
- `portfolio` - Stores active portfolio positions
- `closed_positions` - Stores historical closed positions

## Local Development

### Without Database (Fallback Mode)
The application will run in fallback mode if no database is configured:
```bash
npm start
```

### With Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `portfolio_tracker`
3. Set environment variable:
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/portfolio_tracker"
   ```
4. Run migration:
   ```bash
   npm run migrate
   ```
5. Start server:
   ```bash
   npm start
   ```

## Render Deployment

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Connect your GitHub repository

### Step 2: Deploy Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   - **Name**: `portfolio-tracker-db`
   - **Database**: `portfolio_tracker`
   - **User**: `portfolio_user`
   - **Plan**: Free
4. Click "Create Database"
5. Note the connection string (DATABASE_URL)

### Step 3: Deploy Web Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `indian-portfolio-tracker`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 4: Set Environment Variables
In your web service settings, add:
- **NODE_ENV**: `production`
- **DATABASE_URL**: (Copy from your PostgreSQL service)

### Step 5: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Your app will be available at: `https://your-app-name.onrender.com`

## Automatic Features

### Health Checks
- **Health endpoint**: `/health`
- **Database status**: `/api/db-status`

### Automatic Migration
The server automatically:
1. Tests database connection on startup
2. Creates tables if they don't exist
3. Migrates existing JSON data to database (if available)
4. Falls back to error handling if database is unavailable

### API Endpoints
All existing API endpoints remain the same:
- `GET /api/portfolio` - Get portfolio data
- `POST /api/portfolio` - Save portfolio data
- `GET /api/closed-positions` - Get closed positions
- `POST /api/closed-positions` - Save closed positions

## Manual Migration (Optional)
If you want to run migration separately:
```bash
npm run migrate
```

## Troubleshooting

### Database Connection Issues
1. Check DATABASE_URL format: `postgresql://user:password@host:port/database`
2. Ensure database service is running
3. Check firewall/network settings

### Render Deployment Issues
1. Check build logs in Render dashboard
2. Verify environment variables are set
3. Ensure all dependencies are in package.json

### Data Migration Issues
1. Check if JSON files exist in `/data` folder
2. Verify database permissions
3. Check server logs for migration status

## Benefits of Database Storage

### Scalability
- No file system limitations
- Better concurrent access
- Automatic backups (on Render)

### Performance
- Faster queries and updates
- Better indexing capabilities
- Reduced memory usage

### Reliability
- ACID transactions
- Data integrity constraints
- Automatic failover (on managed services)

### Production Ready
- Environment-based configuration
- Health monitoring
- Graceful error handling

## Next Steps

1. **Deploy to Render** following the steps above
2. **Test the deployment** using the health endpoints
3. **Monitor performance** through Render dashboard
4. **Set up monitoring** for production alerts
5. **Consider backups** for critical data

Your application is now production-ready and can scale with your needs!
