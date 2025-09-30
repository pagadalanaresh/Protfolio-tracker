const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { 
  testConnection, 
  initializeDatabase, 
  userOperations,
  portfolioOperations, 
  closedPositionsOperations,
  watchlistOperations,
  adminOperations
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log request body for POST requests (excluding sensitive data)
  if (req.method === 'POST' && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[HIDDEN]';
    console.log(`[${timestamp}] Request Body:`, JSON.stringify(logBody, null, 2));
  }
  
  next();
});

app.use(express.static('.'));

// Explicit routes for HTML files to ensure they're served correctly
app.get('/auth.html', (req, res) => {
  const timestamp = new Date().toISOString();
  const filePath = path.join(__dirname, 'auth.html');
  console.log(`[${timestamp}] Serving auth.html from: ${filePath}`);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[${timestamp}] Error serving auth.html:`, err);
      res.status(500).send('Error loading authentication page');
    } else {
      console.log(`[${timestamp}] Successfully served auth.html`);
    }
  });
});

app.get('/admin.html', (req, res) => {
  const timestamp = new Date().toISOString();
  const filePath = path.join(__dirname, 'admin.html');
  console.log(`[${timestamp}] Serving admin.html from: ${filePath}`);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[${timestamp}] Error serving admin.html:`, err);
      res.status(500).send('Error loading admin page');
    } else {
      console.log(`[${timestamp}] Successfully served admin.html`);
    }
  });
});

app.get('/index.html', (req, res) => {
  const timestamp = new Date().toISOString();
  const filePath = path.join(__dirname, 'index.html');
  console.log(`[${timestamp}] Serving index.html from: ${filePath}`);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[${timestamp}] Error serving index.html:`, err);
      res.status(500).send('Error loading main page');
    } else {
      console.log(`[${timestamp}] Successfully served index.html`);
    }
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  const timestamp = new Date().toISOString();
  const filePath = path.join(__dirname, 'index.html');
  console.log(`[${timestamp}] Serving root path with index.html from: ${filePath}`);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[${timestamp}] Error serving root index.html:`, err);
      res.status(500).send('Error loading application');
    } else {
      console.log(`[${timestamp}] Successfully served root index.html`);
    }
  });
});

// Authentication middleware
async function authenticateUser(req, res, next) {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ authenticated: false, message: 'No session token' });
    }

    const session = await userOperations.findSession(sessionToken);
    if (!session) {
      return res.status(401).json({ authenticated: false, message: 'Invalid session' });
    }
    
    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Authentication Routes

// Check authentication status
app.get('/api/auth/check', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const sessionToken = req.cookies.sessionToken;
    console.log(`[${timestamp}] Auth check - Session token present: ${!!sessionToken}`);
    
    if (!sessionToken) {
      console.log(`[${timestamp}] Auth check failed - No session token`);
      return res.json({ authenticated: false });
    }

    const session = await userOperations.findSession(sessionToken);
    if (!session) {
      console.log(`[${timestamp}] Auth check failed - Invalid session token`);
      return res.json({ authenticated: false });
    }

    console.log(`[${timestamp}] Auth check successful - User: ${session.username}`);
    res.json({ 
      authenticated: true, 
      user: {
        username: session.username,
        email: session.email
      }
    });
  } catch (error) {
    console.error(`[${timestamp}] Auth check error:`, error);
    throw new Error(`Authentication check failed: ${error.message}`);
  }
});

// User signup
app.post('/api/auth/signup', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Signup attempt`);

    const { username, email, phone, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      console.log(`[${timestamp}] Signup failed - Missing required fields`);
      return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      console.log(`[${timestamp}] Signup failed - Password too short`);
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    console.log(`[${timestamp}] Checking if user exists - Username: ${username}, Email: ${email}`);

    // Check if user already exists
    const existingUser = await userOperations.findByUsername(username);
    if (existingUser) {
      console.log(`[${timestamp}] Signup failed - Username already exists: ${username}`);
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const existingEmail = await userOperations.findByEmail(email);
    if (existingEmail) {
      console.log(`[${timestamp}] Signup failed - Email already registered: ${email}`);
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password using crypto
    const passwordHash = crypto.createHash('sha256').update(password + 'salt').digest('hex');
    console.log(`[${timestamp}] Password hashed successfully`);

    // Create user
    const newUser = await userOperations.createUser(username, email, phone, passwordHash);
    console.log(`[${timestamp}] User created successfully - ID: ${newUser.id}, Username: ${newUser.username}`);

    res.json({ 
      success: true, 
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error(`[${timestamp}] Signup error:`, error);
    throw new Error(`User signup failed: ${error.message}`);
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Login attempt`);

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log(`[${timestamp}] Login failed - Missing credentials`);
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    console.log(`[${timestamp}] Looking up user: ${username}`);

    // Find user
    const user = await userOperations.findByUsername(username);
    if (!user) {
      console.log(`[${timestamp}] Login failed - User not found: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    console.log(`[${timestamp}] User found - ID: ${user.id}, verifying password`);

    // Verify password using crypto
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex');
    if (hashedPassword !== user.password_hash) {
      console.log(`[${timestamp}] Login failed - Invalid password for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    console.log(`[${timestamp}] Password verified - Creating session for user: ${username}`);

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await userOperations.createSession(user.id, sessionToken, expiresAt);
    console.log(`[${timestamp}] Session created - Token: ${sessionToken.substring(0, 8)}..., Expires: ${expiresAt}`);

    // Set cookie
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    console.log(`[${timestamp}] Login successful - User: ${username}`);
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error(`[${timestamp}] Login error:`, error);
    throw new Error(`User login failed: ${error.message}`);
  }
});

// User logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    if (sessionToken) {
      await userOperations.deleteSession(sessionToken);
    }

    res.clearCookie('sessionToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error(`User logout failed: ${error.message}`);
  }
});

// Admin Authentication Routes

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  try {
    const adminSessionToken = req.cookies.adminSessionToken;
    
    if (!adminSessionToken) {
      return res.status(401).json({ authenticated: false, message: 'No admin session token' });
    }

    // Check if database is available
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        authenticated: false, 
        message: 'Database connection unavailable. Admin features require database access.' 
      });
    }

    const session = await adminOperations.findSession(adminSessionToken);
    if (!session) {
      return res.status(401).json({ authenticated: false, message: 'Invalid admin session' });
    }
    
    req.admin = {
      id: session.admin_id,
      username: session.username,
      email: session.email
    };
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      authenticated: false, 
      message: 'Database error during authentication. Please check database connection.' 
    });
  }
}

// Check admin authentication status
app.get('/api/admin/auth/check', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const adminSessionToken = req.cookies.adminSessionToken;
    console.log(`[${timestamp}] Admin auth check - Session token present: ${!!adminSessionToken}`);
    
    if (!adminSessionToken) {
      console.log(`[${timestamp}] Admin auth check failed - No session token`);
      return res.json({ authenticated: false });
    }

    // Check if database is available
    if (!isDatabaseAvailable) {
      console.log(`[${timestamp}] Admin auth check failed - Database not connected`);
      return res.json({ 
        authenticated: false, 
        message: 'Database connection unavailable. Admin features require database access.' 
      });
    }

    const session = await adminOperations.findSession(adminSessionToken);
    if (!session) {
      console.log(`[${timestamp}] Admin auth check failed - Invalid session token`);
      return res.json({ authenticated: false });
    }

    console.log(`[${timestamp}] Admin auth check successful - Admin: ${session.username}`);
    res.json({ 
      authenticated: true, 
      admin: {
        username: session.username,
        email: session.email
      }
    });
  } catch (error) {
    console.error(`[${timestamp}] Admin auth check error:`, error);
    res.status(500).json({ 
      authenticated: false, 
      message: 'Database error during authentication check. Please check database connection.' 
    });
  }
});

// Admin login
app.post('/api/admin/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Admin login attempt`);

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log(`[${timestamp}] Admin login failed - Missing credentials`);
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    console.log(`[${timestamp}] Looking up admin: ${username}`);

    // Check if database is available
    if (!isDatabaseAvailable) {
      console.log(`[${timestamp}] Admin login failed - Database not connected`);
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection unavailable. Please check database configuration and try again.' 
      });
    }

    // Find admin
    const admin = await adminOperations.findByUsername(username);
    if (!admin) {
      console.log(`[${timestamp}] Admin login failed - Admin not found: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    console.log(`[${timestamp}] Admin found - ID: ${admin.id}, verifying password`);

    // Verify password using bcrypt (since we used bcrypt for admin password)
    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      console.log(`[${timestamp}] Admin login failed - Invalid password for admin: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    console.log(`[${timestamp}] Admin password verified - Creating session for admin: ${username}`);

    // Create admin session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await adminOperations.createSession(admin.id, sessionToken, expiresAt);
    console.log(`[${timestamp}] Admin session created - Token: ${sessionToken.substring(0, 8)}..., Expires: ${expiresAt}`);

    // Set admin cookie
    res.cookie('adminSessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    console.log(`[${timestamp}] Admin login successful - Admin: ${username}`);
    res.json({ 
      success: true, 
      message: 'Admin login successful',
      admin: {
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    console.error(`[${timestamp}] Admin login error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error occurred during login. Please check database connection.' 
    });
  }
});

// Admin logout
app.post('/api/admin/auth/logout', async (req, res) => {
  try {
    const adminSessionToken = req.cookies.adminSessionToken;
    
    if (adminSessionToken) {
      await adminOperations.deleteSession(adminSessionToken);
    }

    res.clearCookie('adminSessionToken');
    res.json({ success: true, message: 'Admin logged out successfully' });
  } catch (error) {
    console.error('Admin logout error:', error);
    throw new Error(`Admin logout failed: ${error.message}`);
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    // If database is not available, return proper error
    if (!isDatabaseAvailable) {
      console.log('Database not available - cannot fetch users');
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection unavailable. Cannot fetch user data.' 
      });
    }

    const users = await adminOperations.getAllUsers();
    
    // Get stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      try {
        const stats = await adminOperations.getUserStats(user.id);
        return {
          ...user,
          stats
        };
      } catch (statsError) {
        console.error(`Error getting stats for user ${user.id}:`, statsError);
        return {
          ...user,
          stats: {
            portfolioCount: 0,
            closedPositionsCount: 0,
            watchlistCount: 0,
            totalInvested: 0,
            totalCurrentValue: 0
          }
        };
      }
    }));
    
    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error occurred while fetching users. Please check database connection.' 
    });
  }
});

// Impersonate user (admin only)
app.post('/api/admin/impersonate/:userId', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Find the user
    const user = await userOperations.findByUsername(''); // We need to get user by ID, let's add this method
    
    // Create a user session for the admin to impersonate
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    await userOperations.createSession(userId, sessionToken, expiresAt);
    
    // Set user session cookie
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });
    
    res.json({ success: true, message: 'User impersonation started' });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ success: false, message: 'Error impersonating user' });
  }
});

// Data file paths (for migration purposes)
const PORTFOLIO_FILE = path.join(__dirname, 'data', 'portfolio.json');
const CLOSED_POSITIONS_FILE = path.join(__dirname, 'data', 'closed-positions.json');

// Migration function to move JSON data to database
async function migrateJsonToDatabase() {
  try {
    console.log('🔄 Starting migration from JSON to database...');
    
    // Check if JSON files exist and migrate data
    try {
      const portfolioData = await fs.readFile(PORTFOLIO_FILE, 'utf8');
      const portfolio = JSON.parse(portfolioData);
      if (portfolio.length > 0) {
        await portfolioOperations.saveAll(portfolio);
        console.log(`✅ Migrated ${portfolio.length} portfolio items to database`);
      }
    } catch (error) {
      console.log('ℹ️  No portfolio.json file found or empty - skipping portfolio migration');
    }

    try {
      const closedPositionsData = await fs.readFile(CLOSED_POSITIONS_FILE, 'utf8');
      const closedPositions = JSON.parse(closedPositionsData);
      if (closedPositions.length > 0) {
        await closedPositionsOperations.saveAll(closedPositions);
        console.log(`✅ Migrated ${closedPositions.length} closed positions to database`);
      }
    } catch (error) {
      console.log('ℹ️  No closed-positions.json file found or empty - skipping closed positions migration');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    // Don't throw error - allow server to start even if migration fails
  }
}

// Global variable to track database availability
let isDatabaseAvailable = false;

// API Routes

// Get portfolio data (requires authentication)
app.get('/api/portfolio', authenticateUser, async (req, res) => {
  try {
    const portfolio = await portfolioOperations.getAll(req.user.id);
    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw new Error(`Failed to fetch portfolio data: ${error.message}`);
  }
});

// Save portfolio data (requires authentication)
app.post('/api/portfolio', authenticateUser, async (req, res) => {
  try {
    await portfolioOperations.saveAll(req.user.id, req.body);
    res.json({ success: true, message: 'Portfolio saved successfully' });
  } catch (error) {
    console.error('Error saving portfolio data:', error);
    throw new Error(`Failed to save portfolio data: ${error.message}`);
  }
});

// Get closed positions data (requires authentication)
app.get('/api/closed-positions', authenticateUser, async (req, res) => {
  try {
    const closedPositions = await closedPositionsOperations.getAll(req.user.id);
    res.json(closedPositions);
  } catch (error) {
    console.error('Error fetching closed positions data:', error);
    throw new Error(`Failed to fetch closed positions data: ${error.message}`);
  }
});

// Save closed positions data (requires authentication)
app.post('/api/closed-positions', authenticateUser, async (req, res) => {
  try {
    await closedPositionsOperations.saveAll(req.user.id, req.body);
    res.json({ success: true, message: 'Closed positions saved successfully' });
  } catch (error) {
    console.error('Error saving closed positions data:', error);
    throw new Error(`Failed to save closed positions data: ${error.message}`);
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check file existence
app.get('/debug/files', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Debug files endpoint called`);
  
  try {
    const files = {
      'auth.html': false,
      'index.html': false,
      'script.js': false,
      'styles.css': false,
      'server.js': false
    };
    
    for (const filename of Object.keys(files)) {
      try {
        await fs.access(path.join(__dirname, filename));
        files[filename] = true;
        console.log(`[${timestamp}] File exists: ${filename}`);
      } catch (error) {
        console.log(`[${timestamp}] File missing: ${filename}`);
      }
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      workingDirectory: __dirname,
      files: files,
      isDatabaseAvailable: isDatabaseAvailable
    });
  } catch (error) {
    console.error(`[${timestamp}] Debug files error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Watchlist API Routes

// Get watchlist data (requires authentication)
app.get('/api/watchlist', authenticateUser, async (req, res) => {
  try {
    const watchlist = await watchlistOperations.getAll(req.user.id);
    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist data:', error);
    throw new Error(`Failed to fetch watchlist data: ${error.message}`);
  }
});

// Save watchlist data (requires authentication)
app.post('/api/watchlist', authenticateUser, async (req, res) => {
  try {
    await watchlistOperations.saveAll(req.user.id, req.body);
    res.json({ success: true, message: 'Watchlist saved successfully' });
  } catch (error) {
    console.error('Error saving watchlist data:', error);
    throw new Error(`Failed to save watchlist data: ${error.message}`);
  }
});

// Stock search endpoint for auto-suggestions
app.get('/api/stocks/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Use Yahoo Finance search API
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const yahooSearchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const fullUrl = proxyUrl + encodeURIComponent(yahooSearchUrl);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.quotes) {
      // Filter for Indian stocks (NSE/BSE) and format results
      const indianStocks = data.quotes
        .filter(quote => 
          quote.symbol && 
          (quote.symbol.endsWith('.NS') || quote.symbol.endsWith('.BO')) &&
          quote.shortname
        )
        .map(quote => ({
          symbol: quote.symbol.replace('.NS', '').replace('.BO', ''),
          name: quote.shortname || quote.longname,
          exchange: quote.symbol.endsWith('.NS') ? 'NSE' : 'BSE',
          fullSymbol: quote.symbol
        }))
        .slice(0, 8); // Limit to 8 suggestions
      
      res.json(indianStocks);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Stock search error:', error);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      isDatabaseAvailable: isDatabaseAvailable,
      environment: process.env.NODE_ENV || 'development',
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      postgresUrl: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET'
    });
  } catch (error) {
    res.status(500).json({ 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      isDatabaseAvailable: isDatabaseAvailable,
      environment: process.env.NODE_ENV || 'development',
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      postgresUrl: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET'
    });
  }
});

// Admin debug endpoint
app.get('/api/admin/debug', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Admin debug endpoint called`);
  
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      isDatabaseAvailable: isDatabaseAvailable,
      environment: process.env.NODE_ENV || 'development',
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      postgresUrl: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET'
    };

    // Test database connection in real-time
    try {
      const isConnected = await testConnection();
      debugInfo.realTimeDbTest = isConnected ? 'connected' : 'disconnected';
    } catch (dbError) {
      debugInfo.realTimeDbTest = 'error';
      debugInfo.dbError = dbError.message;
    }

    // Test admin operations if database is available
    if (isDatabaseAvailable) {
      try {
        const adminCount = await adminOperations.getAllUsers();
        debugInfo.adminOperationsTest = 'working';
        debugInfo.userCount = adminCount.length;
      } catch (adminError) {
        debugInfo.adminOperationsTest = 'error';
        debugInfo.adminError = adminError.message;
      }
    } else {
      debugInfo.adminOperationsTest = 'skipped - database not available';
    }

    res.json(debugInfo);
  } catch (error) {
    console.error(`[${timestamp}] Admin debug error:`, error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all route for any unmatched routes - serve index.html for SPA behavior
app.get('*', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Catch-all route hit for: ${req.url}`);
  
  // If it's an API route that wasn't matched, return 404
  if (req.url.startsWith('/api/')) {
    console.log(`[${timestamp}] API route not found: ${req.url}`);
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For HTML files, try to serve them directly
  if (req.url.endsWith('.html')) {
    const filePath = path.join(__dirname, req.url);
    console.log(`[${timestamp}] Attempting to serve HTML file: ${filePath}`);
    
    return res.sendFile(filePath, (err) => {
      if (err) {
        console.log(`[${timestamp}] HTML file not found: ${filePath}, serving index.html instead`);
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
  }
  
  // For all other routes, serve index.html (SPA behavior)
  console.log(`[${timestamp}] Serving index.html for route: ${req.url}`);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    } catch (error) {
        console.log('Data directory already exists or error creating:', error.message);
    }
}

// Initialize data files if they don't exist
async function initializeDataFiles() {
    try {
        await fs.access(PORTFOLIO_FILE);
    } catch (error) {
        await fs.writeFile(PORTFOLIO_FILE, JSON.stringify([], null, 2));
        console.log('Created portfolio.json file');
    }

    try {
        await fs.access(CLOSED_POSITIONS_FILE);
    } catch (error) {
        await fs.writeFile(CLOSED_POSITIONS_FILE, JSON.stringify([], null, 2));
        console.log('Created closed-positions.json file');
    }
}

// Start server
async function startServer() {
  try {
    // Ensure data directory and files exist for fallback
    await ensureDataDirectory();
    await initializeDataFiles();
    
    // Test database connection
    console.log('🔍 Testing database connection...');
    const isConnected = await testConnection();
    isDatabaseAvailable = isConnected;
    
    if (!isConnected) {
      console.log('⚠️  Database not connected - running in fallback mode');
      console.log('💡 Make sure to set DATABASE_URL environment variable for production');
    } else {
      // Initialize database tables
      console.log('🏗️  Initializing database tables...');
      await initializeDatabase();
      
      // Migrate existing JSON data if database is available
      // await migrateJsonToDatabase();
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Indian Stock Portfolio Tracker running on http://localhost:${PORT}`);
      console.log(`📊 Using ${isConnected ? 'PostgreSQL database' : 'JSON files (fallback mode)'} for data storage`);
      console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
      console.log(`🔍 Database status at: http://localhost:${PORT}/api/db-status`);
      
      if (!isConnected) {
        console.log('');
        console.log('📝 To enable database storage:');
        console.log('   1. Set up a PostgreSQL database');
        console.log('   2. Set DATABASE_URL environment variable');
        console.log('   3. Restart the server');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);
