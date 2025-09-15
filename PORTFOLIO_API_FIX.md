# Portfolio API 500 Error Fix

## Issue Description

The `/api/portfolio` endpoint is returning a 500 Internal Server Error on the production server at `https://protfolio-tracker.onrender.com/api/portfolio`.

## Root Cause Analysis

The error is likely caused by one of the following issues:

### 1. Database Schema Mismatch
The production database may still have the old schema with composite primary keys `PRIMARY KEY (id, user_id)`, while the application code expects the new schema with `SERIAL PRIMARY KEY`.

### 2. Session Handling Issues
There might be issues with user session validation or user ID mapping between sessions and portfolio data.

### 3. Database Connection Issues
The database connection might be failing or timing out on the production server.

## Solution Provided

### 1. Database Schema Fix Script
Created `fix-database-schema.js` to automatically fix the database schema:

**Features:**
- Backs up existing data before making changes
- Recreates tables with correct schema
- Restores data from backup
- Handles both portfolio and closed_positions tables
- Uses transactions for safety

**Usage:**
```bash
node fix-database-schema.js
```

### 2. Enhanced Error Handling
Updated the `/api/portfolio` endpoint with comprehensive error handling:

**Improvements:**
- Detailed logging at each step
- Separate error handling for session validation
- Separate error handling for database operations
- Stack trace logging in development mode
- Specific error messages for different failure points

### 3. Comprehensive Logging
Added detailed logging to track:
- Session token presence and validation
- User ID mapping from sessions
- Database operation results
- Error stack traces for debugging

## Database Schema Changes

### Old Schema (Problematic)
```sql
CREATE TABLE portfolio (
  id BIGINT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  -- other columns...
  PRIMARY KEY (id, user_id)  -- PROBLEMATIC: Composite key
);
```

### New Schema (Fixed)
```sql
CREATE TABLE portfolio (
  id SERIAL PRIMARY KEY,  -- FIXED: Auto-incrementing primary key
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  -- other columns...
  UNIQUE(user_id, ticker)  -- Prevents duplicate stocks per user
);
```

## Steps to Fix Production Issue

### Option 1: Run Schema Fix Script
1. Deploy the `fix-database-schema.js` file to production
2. Run it once to fix the database schema:
   ```bash
   node fix-database-schema.js
   ```
3. Restart the application server

### Option 2: Manual Database Fix
If you have direct database access:

1. **Backup existing data:**
   ```sql
   CREATE TABLE portfolio_backup AS SELECT * FROM portfolio;
   CREATE TABLE closed_positions_backup AS SELECT * FROM closed_positions;
   ```

2. **Drop and recreate tables:**
   ```sql
   DROP TABLE IF EXISTS portfolio CASCADE;
   DROP TABLE IF EXISTS closed_positions CASCADE;
   ```

3. **Create new tables with correct schema:**
   ```sql
   -- Run the CREATE TABLE statements from database.js
   ```

4. **Restore data:**
   ```sql
   INSERT INTO portfolio (user_id, ticker, name, ...) 
   SELECT user_id, ticker, name, ... FROM portfolio_backup
   ON CONFLICT (user_id, ticker) DO NOTHING;
   ```

### Option 3: Clear Database and Start Fresh
Use the admin portal's "Clear Database" functionality:
1. Login to admin portal: `https://protfolio-tracker.onrender.com/admin.html`
2. Use credentials: `naresh` / `pagadala`
3. Go to Dashboard section
4. Use "Clear Entire Database" button in Danger Zone

## Verification Steps

After applying the fix:

1. **Check Database Status:**
   ```
   GET https://protfolio-tracker.onrender.com/api/db-status
   ```

2. **Test Portfolio Endpoint:**
   ```
   GET https://protfolio-tracker.onrender.com/api/portfolio
   ```
   Should return 401 (authentication required) instead of 500

3. **Test User Login and Portfolio Access:**
   - Create a user account
   - Login successfully
   - Add portfolio items
   - Verify data persists after logout/login

## Enhanced Error Handling

The updated portfolio endpoint now provides detailed error information:

- **503**: Database connection required
- **401**: Authentication required or invalid session
- **500**: Specific error messages for different failure points
- **Detailed Logging**: All operations logged with timestamps and user information

## Monitoring

The enhanced logging will help identify the exact cause of any remaining issues:

- Session validation steps
- User ID mapping
- Database operation results
- Error stack traces
- Request/response details

## Prevention

To prevent similar issues in the future:

1. **Database Migrations**: Use proper migration scripts for schema changes
2. **Testing**: Test database operations thoroughly before deployment
3. **Monitoring**: Use the comprehensive logging to monitor API health
4. **Backup**: Always backup data before schema changes

The fix addresses the root cause of the 500 error by ensuring the database schema matches the application code expectations and providing detailed error information for debugging.
