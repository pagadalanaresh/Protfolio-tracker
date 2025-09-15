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
  adminOperations
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Enhanced Request and Response logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Add request ID to request object for tracking
  req.requestId = requestId;
  
  // Log incoming request
  console.log(`\n🔵 [${timestamp}] [${requestId}] INCOMING REQUEST`);
  console.log(`   Method: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`   User-Agent: ${req.get('User-Agent') || 'N/A'}`);
  
  // Log request headers (excluding sensitive ones)
  const headers = { ...req.headers };
  if (headers.authorization) headers.authorization = '[HIDDEN]';
  if (headers.cookie) headers.cookie = '[HIDDEN]';
  console.log(`   Headers:`, JSON.stringify(headers, null, 4));
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query Params:`, JSON.stringify(req.query, null, 4));
  }
  
  // Log request body for POST/PUT/PATCH requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[HIDDEN]';
    if (logBody.sessionToken) logBody.sessionToken = '[HIDDEN]';
    console.log(`   Request Body:`, JSON.stringify(logBody, null, 4));
  }
  
  // Capture original res.json and res.send methods to log responses
  const originalJson = res.json;
  const originalSend = res.send;
  const originalStatus = res.status;
  
  let responseBody = null;
  let statusCode = 200;
  
  // Override res.status to capture status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus.call(this, code);
  };
  
  // Override res.json to capture response body
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Override res.send to capture response body
  res.send = function(body) {
    if (!responseBody) responseBody = body;
    return originalSend.call(this, body);
  };
  
  // Log response when request finishes
  res.on('finish', () => {
    const endTimestamp = new Date().toISOString();
    const duration = Date.now() - new Date(timestamp).getTime();
    
    console.log(`\n🟢 [${endTimestamp}] [${requestId}] OUTGOING RESPONSE`);
    console.log(`   Status: ${res.statusCode || statusCode}`);
    console.log(`   Duration: ${duration}ms`);
    
    // Log response headers
    const responseHeaders = res.getHeaders();
    if (Object.keys(responseHeaders).length > 0) {
      console.log(`   Response Headers:`, JSON.stringify(responseHeaders, null, 4));
    }
    
    // Log response body (limit size and hide sensitive data)
    if (responseBody) {
      let logResponseBody = responseBody;
      
      // If response is an object, sanitize sensitive fields
      if (typeof responseBody === 'object') {
        logResponseBody = { ...responseBody };
        if (logResponseBody.sessionToken) logResponseBody.sessionToken = '[HIDDEN]';
        if (logResponseBody.password) logResponseBody.password = '[HIDDEN]';
      }
      
      // Limit response body size for logging
      const responseStr = JSON.stringify(logResponseBody, null, 4);
      if (responseStr.length > 2000) {
        console.log(`   Response Body: [TRUNCATED - ${responseStr.length} chars]`, responseStr.substring(0, 2000) + '...');
      } else {
        console.log(`   Response Body:`, responseStr);
      }
    }
    
    console.log(`─────────────────────────────────────────────────────────────────`);
  });
  
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

// Serve admin.html for admin portal
app.get('/admin.html', (req, res) => {
  const timestamp = new Date().toISOString();
  const filePath = path.join(__dirname, 'admin.html');
  console.log(`[${timestamp}] Serving admin.html from: ${filePath}`);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[${timestamp}] Error serving admin.html:`, err);
      res.status(500).send('Error loading admin portal');
    } else {
      console.log(`[${timestamp}] Successfully served admin.html`);
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

    if (isDatabaseAvailable) {
      const session = await userOperations.findSession(sessionToken);
      if (!session) {
        return res.status(401).json({ authenticated: false, message: 'Invalid session' });
      }
      
      req.user = {
        id: session.user_id,
        username: session.username,
        email: session.email
      };
    } else {
      // In fallback mode, we can't authenticate users
      return res.status(503).json({ authenticated: false, message: 'Authentication requires database connection' });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ authenticated: false, message: 'Authentication error' });
  }
}

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create default admin user if none exists
async function createDefaultAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...');
    
    const hasAdmin = await adminOperations.hasAnyAdmin();
    if (hasAdmin) {
      console.log('ℹ️  Admin user already exists - skipping default admin creation');
      return;
    }

    console.log('👤 Creating default admin user...');
    
    // Default admin credentials
    const defaultUsername = 'naresh';
    const defaultPassword = 'pagadala';
    const defaultEmail = 'naresh@admin.local';
    
    // Hash password with admin salt
    const passwordHash = crypto.createHash('sha256').update(defaultPassword + 'admin_salt').digest('hex');
    
    // Create default admin
    const newAdmin = await adminOperations.createAdmin(defaultUsername, defaultEmail, passwordHash);
    
    console.log(`✅ Default admin created successfully - Username: ${newAdmin.username}`);
    console.log('🔑 Default Admin Credentials:');
    console.log(`   Username: ${defaultUsername}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log('⚠️  Please change these credentials after first login for security!');
    
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
    // Don't throw error - allow server to start even if default admin creation fails
  }
}

// Authentication Routes

// Check authentication status
app.get('/api/auth/check', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const sessionToken = req.cookies.sessionToken;
    console.log(`[${timestamp}] Auth check - Session token present: ${!!sessionToken}, DB available: ${isDatabaseAvailable}`);
    
    if (!sessionToken || !isDatabaseAvailable) {
      console.log(`[${timestamp}] Auth check failed - No session token or DB unavailable`);
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
    res.json({ authenticated: false });
  }
});

// User signup
app.post('/api/auth/signup', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Signup attempt - DB available: ${isDatabaseAvailable}`);
    
    if (!isDatabaseAvailable) {
      console.log(`[${timestamp}] Signup failed - Database not available`);
      return res.status(503).json({ success: false, message: 'Database connection required for user registration' });
    }

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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Login attempt - DB available: ${isDatabaseAvailable}`);
    
    if (!isDatabaseAvailable) {
      console.log(`[${timestamp}] Login failed - Database not available`);
      return res.status(503).json({ success: false, message: 'Database connection required for login' });
    }

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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// User logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    if (sessionToken && isDatabaseAvailable) {
      await userOperations.deleteSession(sessionToken);
    }

    res.clearCookie('sessionToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Global variable to track database availability
let isDatabaseAvailable = false;

// API Routes

// Get portfolio data (requires authentication and database)
app.get('/api/portfolio', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] Portfolio request received`);
    
    if (!isDatabaseAvailable) {
      console.log(`[${timestamp}] Portfolio request failed - Database not available`);
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required. Please ensure DATABASE_URL is configured.' 
      });
    }

    // Require authentication for database mode
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      console.log(`[${timestamp}] Portfolio request failed - No session token`);
      return res.status(401).json({ authenticated: false, message: 'Authentication required' });
    }

    console.log(`[${timestamp}] Session token found, validating...`);
    
    let session;
    try {
      session = await userOperations.findSession(sessionToken);
    } catch (sessionError) {
      console.error(`[${timestamp}] Error finding session:`, sessionError);
      return res.status(500).json({ success: false, message: 'Session validation error: ' + sessionError.message });
    }
    
    if (!session) {
      console.log(`[${timestamp}] Portfolio request failed - Invalid session token`);
      return res.status(401).json({ authenticated: false, message: 'Invalid session' });
    }

    console.log(`[${timestamp}] Portfolio request - User: ${session.username}, User ID: ${session.user_id}`);
    console.log(`[${timestamp}] Session object:`, JSON.stringify(session, null, 2));

    let portfolio;
    try {
      portfolio = await portfolioOperations.getAll(session.user_id);
    } catch (portfolioError) {
      console.error(`[${timestamp}] Error in portfolioOperations.getAll:`, portfolioError);
      return res.status(500).json({ success: false, message: 'Portfolio database error: ' + portfolioError.message });
    }
    
    console.log(`[${timestamp}] Retrieved ${portfolio.length} portfolio items for user ${session.username} (ID: ${session.user_id})`);
    res.json(portfolio);
  } catch (error) {
    console.error(`[${timestamp}] Unexpected error in portfolio endpoint:`, error);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error in portfolio endpoint: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Save portfolio data (requires authentication and database)
app.post('/api/portfolio', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required. Please ensure DATABASE_URL is configured.' 
      });
    }

    // Require authentication for database mode
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      console.log(`[${timestamp}] Portfolio save failed - No session token`);
      return res.status(401).json({ authenticated: false, message: 'Authentication required' });
    }

    const session = await userOperations.findSession(sessionToken);
    if (!session) {
      console.log(`[${timestamp}] Portfolio save failed - Invalid session token`);
      return res.status(401).json({ authenticated: false, message: 'Invalid session' });
    }

    console.log(`[${timestamp}] Portfolio save - User: ${session.username}, User ID: ${session.user_id}, Items: ${req.body.length}`);
    console.log(`[${timestamp}] Session object:`, JSON.stringify(session, null, 2));

    await portfolioOperations.saveAll(session.user_id, req.body);
    console.log(`[${timestamp}] Portfolio saved successfully for user ${session.username} (ID: ${session.user_id})`);
    res.json({ success: true, message: 'Portfolio saved successfully' });
  } catch (error) {
    console.error(`[${timestamp}] Error saving portfolio data:`, error);
    res.status(500).json({ success: false, message: 'Error saving portfolio data: ' + error.message });
  }
});

// Get closed positions data (requires authentication and database)
app.get('/api/closed-positions', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required. Please ensure DATABASE_URL is configured.' 
      });
    }

    // Require authentication for database mode
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      console.log(`[${timestamp}] Closed positions request failed - No session token`);
      return res.status(401).json({ authenticated: false, message: 'Authentication required' });
    }

    const session = await userOperations.findSession(sessionToken);
    if (!session) {
      console.log(`[${timestamp}] Closed positions request failed - Invalid session token`);
      return res.status(401).json({ authenticated: false, message: 'Invalid session' });
    }

    console.log(`[${timestamp}] Closed positions request - User: ${session.username}, User ID: ${session.user_id}`);

    const closedPositions = await closedPositionsOperations.getAll(session.user_id);
    console.log(`[${timestamp}] Retrieved ${closedPositions.length} closed positions for user ${session.username} (ID: ${session.user_id})`);
    res.json(closedPositions);
  } catch (error) {
    console.error(`[${timestamp}] Error fetching closed positions data:`, error);
    res.status(500).json({ success: false, message: 'Error fetching closed positions data: ' + error.message });
  }
});

// Save closed positions data (requires authentication and database)
app.post('/api/closed-positions', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required. Please ensure DATABASE_URL is configured.' 
      });
    }

    // Require authentication for database mode
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      console.log(`[${timestamp}] Closed positions save failed - No session token`);
      return res.status(401).json({ authenticated: false, message: 'Authentication required' });
    }

    const session = await userOperations.findSession(sessionToken);
    if (!session) {
      console.log(`[${timestamp}] Closed positions save failed - Invalid session token`);
      return res.status(401).json({ authenticated: false, message: 'Invalid session' });
    }

    console.log(`[${timestamp}] Closed positions save - User: ${session.username}, User ID: ${session.user_id}, Items: ${req.body.length}`);

    await closedPositionsOperations.saveAll(session.user_id, req.body);
    console.log(`[${timestamp}] Closed positions saved successfully for user ${session.username} (ID: ${session.user_id})`);
    res.json({ success: true, message: 'Closed positions saved successfully' });
  } catch (error) {
    console.error(`[${timestamp}] Error saving closed positions data:`, error);
    res.status(500).json({ success: false, message: 'Error saving closed positions data: ' + error.message });
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

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Admin Authentication Routes

// Check if any admin exists (for initial setup)
app.get('/api/admin/setup-required', async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const hasAdmin = await adminOperations.hasAnyAdmin();
    res.json({ setupRequired: !hasAdmin });
  } catch (error) {
    console.error('Error checking admin setup:', error);
    res.status(500).json({ success: false, message: 'Error checking admin setup' });
  }
});

// Create first admin (only if no admin exists)
app.post('/api/admin/setup', async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    // Check if admin already exists
    const hasAdmin = await adminOperations.hasAnyAdmin();
    if (hasAdmin) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Hash password
    const passwordHash = crypto.createHash('sha256').update(password + 'admin_salt').digest('hex');

    // Create admin
    const newAdmin = await adminOperations.createAdmin(username, email, passwordHash);
    
    res.json({ 
      success: true, 
      message: 'Admin account created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email
      }
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ success: false, message: 'Database connection required' });
    }

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Find admin
    const admin = await adminOperations.findByUsername(username);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Verify password
    const hashedPassword = crypto.createHash('sha256').update(password + 'admin_salt').digest('hex');
    if (hashedPassword !== admin.password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Create admin session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await adminOperations.createSession(admin.id, sessionToken, expiresAt);

    // Set admin cookie
    res.cookie('adminSessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    res.json({ 
      success: true, 
      message: 'Admin login successful',
      admin: {
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin logout
app.post('/api/admin/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.adminSessionToken;
    
    if (sessionToken && isDatabaseAvailable) {
      await adminOperations.deleteSession(sessionToken);
    }

    res.clearCookie('adminSessionToken');
    res.json({ success: true, message: 'Admin logged out successfully' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Check admin authentication status
app.get('/api/admin/auth/check', async (req, res) => {
  try {
    const sessionToken = req.cookies.adminSessionToken;
    
    if (!sessionToken || !isDatabaseAvailable) {
      return res.json({ authenticated: false });
    }

    const session = await adminOperations.findSession(sessionToken);
    if (!session) {
      return res.json({ authenticated: false });
    }

    res.json({ 
      authenticated: true, 
      admin: {
        username: session.username,
        email: session.email
      }
    });
  } catch (error) {
    console.error('Admin auth check error:', error);
    res.json({ authenticated: false });
  }
});

// Admin API Routes (Requires admin authentication)

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  try {
    const sessionToken = req.cookies.adminSessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ authenticated: false, message: 'Admin authentication required' });
    }

    if (isDatabaseAvailable) {
      const session = await adminOperations.findSession(sessionToken);
      if (!session) {
        return res.status(401).json({ authenticated: false, message: 'Invalid admin session' });
      }
      
      req.admin = {
        id: session.admin_id,
        username: session.username,
        email: session.email
      };
    } else {
      return res.status(503).json({ authenticated: false, message: 'Database connection required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ authenticated: false, message: 'Admin authentication error' });
  }
}

// Get admin dashboard statistics
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const client = await require('./database').pool.connect();
    
    try {
      // Get total users
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Get total portfolio items
      const portfolioResult = await client.query('SELECT COUNT(*) as count FROM portfolio');
      const totalPortfolioItems = parseInt(portfolioResult.rows[0].count);

      // Get total closed positions
      const closedResult = await client.query('SELECT COUNT(*) as count FROM closed_positions');
      const totalClosedPositions = parseInt(closedResult.rows[0].count);

      // Get active sessions (not expired)
      const sessionsResult = await client.query('SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()');
      const activeSessions = parseInt(sessionsResult.rows[0].count);

      res.json({
        totalUsers,
        totalPortfolioItems,
        totalClosedPositions,
        activeSessions
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get all users for admin
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const client = await require('./database').pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, username, email, phone, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
      `);
      
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Get user's portfolio data for admin
app.get('/api/admin/users/:userId/portfolio', authenticateAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const userId = parseInt(req.params.userId);
    console.log(`[${timestamp}] Admin requesting portfolio data for user ID: ${userId}, Admin: ${req.admin.username}`);

    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      console.log(`[${timestamp}] Invalid user ID: ${req.params.userId}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const portfolio = await portfolioOperations.getAll(userId);
    console.log(`[${timestamp}] Retrieved ${portfolio.length} portfolio items for user ID: ${userId}`);
    res.json(portfolio);
  } catch (error) {
    console.error(`[${timestamp}] Error fetching user portfolio:`, error);
    res.status(500).json({ success: false, message: 'Error fetching portfolio data: ' + error.message });
  }
});

// Get user's closed positions for admin
app.get('/api/admin/users/:userId/closed-positions', authenticateAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const userId = parseInt(req.params.userId);
    console.log(`[${timestamp}] Admin requesting closed positions for user ID: ${userId}, Admin: ${req.admin.username}`);

    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      console.log(`[${timestamp}] Invalid user ID: ${req.params.userId}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const closedPositions = await closedPositionsOperations.getAll(userId);
    console.log(`[${timestamp}] Retrieved ${closedPositions.length} closed positions for user ID: ${userId}`);
    res.json(closedPositions);
  } catch (error) {
    console.error(`[${timestamp}] Error fetching user closed positions:`, error);
    res.status(500).json({ success: false, message: 'Error fetching closed positions: ' + error.message });
  }
});

// Delete portfolio item for admin
app.delete('/api/admin/portfolio/:itemId', authenticateAdmin, async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const itemId = parseInt(req.params.itemId);
    const client = await require('./database').pool.connect();
    
    try {
      await client.query('DELETE FROM portfolio WHERE id = $1', [itemId]);
      res.json({ success: true, message: 'Portfolio item deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ success: false, message: 'Error deleting portfolio item' });
  }
});

// Delete closed position for admin
app.delete('/api/admin/closed-positions/:itemId', authenticateAdmin, async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const itemId = parseInt(req.params.itemId);
    const client = await require('./database').pool.connect();
    
    try {
      await client.query('DELETE FROM closed_positions WHERE id = $1', [itemId]);
      res.json({ success: true, message: 'Closed position deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting closed position:', error);
    res.status(500).json({ success: false, message: 'Error deleting closed position' });
  }
});

// Update user information for admin
app.put('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const userId = parseInt(req.params.userId);
    const { username, email, phone } = req.body;

    // Validate input
    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email are required' });
    }

    const client = await require('./database').pool.connect();
    
    try {
      // Check if username or email already exists for other users
      const existingUser = await client.query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3', 
        [username, email, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Username or email already exists' });
      }

      // Update user information
      await client.query(`
        UPDATE users 
        SET username = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4
      `, [username, email, phone || null, userId]);

      res.json({ success: true, message: 'User updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user and all associated data for admin
app.delete('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    const userId = parseInt(req.params.userId);
    console.log(`[${timestamp}] Admin delete user request - User ID: ${userId}, Admin: ${req.admin.username}`);

    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      console.log(`[${timestamp}] Delete user failed - Invalid user ID: ${req.params.userId}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const client = await require('./database').pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(`[${timestamp}] Starting user deletion transaction for user ID: ${userId}`);
      
      // First check if user exists
      const userCheck = await client.query('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        console.log(`[${timestamp}] Delete user failed - User not found with ID: ${userId}`);
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const userToDelete = userCheck.rows[0];
      console.log(`[${timestamp}] Found user to delete: ${userToDelete.username} (ID: ${userId})`);
      
      // Delete user sessions
      const sessionsResult = await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
      console.log(`[${timestamp}] Deleted ${sessionsResult.rowCount} user sessions`);
      
      // Delete portfolio data
      const portfolioResult = await client.query('DELETE FROM portfolio WHERE user_id = $1', [userId]);
      console.log(`[${timestamp}] Deleted ${portfolioResult.rowCount} portfolio items`);
      
      // Delete closed positions
      const closedResult = await client.query('DELETE FROM closed_positions WHERE user_id = $1', [userId]);
      console.log(`[${timestamp}] Deleted ${closedResult.rowCount} closed positions`);
      
      // Delete user
      const userResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log(`[${timestamp}] Deleted ${userResult.rowCount} user record`);
      
      await client.query('COMMIT');
      console.log(`[${timestamp}] User deletion transaction completed successfully`);
      
      res.json({ 
        success: true, 
        message: `User "${userToDelete.username}" and all associated data deleted successfully`,
        deletedData: {
          sessions: sessionsResult.rowCount,
          portfolioItems: portfolioResult.rowCount,
          closedPositions: closedResult.rowCount,
          user: userResult.rowCount
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(`[${timestamp}] User deletion transaction rolled back due to error`);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${timestamp}] Error deleting user:`, error);
    res.status(500).json({ success: false, message: 'Error deleting user: ' + error.message });
  }
});

// Clear entire database (DANGEROUS - requires admin authentication)
app.post('/api/admin/clear-database', authenticateAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    console.log(`[${timestamp}] ⚠️  CRITICAL: Database clear request by admin: ${req.admin.username}`);

    const client = await require('./database').pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(`[${timestamp}] Starting database clear transaction`);
      
      // Get counts before deletion for reporting
      const userCountResult = await client.query('SELECT COUNT(*) as count FROM users');
      const portfolioCountResult = await client.query('SELECT COUNT(*) as count FROM portfolio');
      const closedCountResult = await client.query('SELECT COUNT(*) as count FROM closed_positions');
      const sessionCountResult = await client.query('SELECT COUNT(*) as count FROM user_sessions');
      const adminSessionCountResult = await client.query('SELECT COUNT(*) as count FROM admin_sessions');
      
      const beforeCounts = {
        users: parseInt(userCountResult.rows[0].count),
        portfolioItems: parseInt(portfolioCountResult.rows[0].count),
        closedPositions: parseInt(closedCountResult.rows[0].count),
        userSessions: parseInt(sessionCountResult.rows[0].count),
        adminSessions: parseInt(adminSessionCountResult.rows[0].count)
      };
      
      console.log(`[${timestamp}] Database contents before clearing:`, beforeCounts);
      
      // Clear all user sessions (but keep current admin session)
      const currentAdminSession = req.cookies.adminSessionToken;
      if (currentAdminSession) {
        await client.query('DELETE FROM user_sessions');
        await client.query('DELETE FROM admin_sessions WHERE session_token != $1', [currentAdminSession]);
        console.log(`[${timestamp}] Cleared all sessions except current admin session`);
      } else {
        await client.query('DELETE FROM user_sessions');
        await client.query('DELETE FROM admin_sessions');
        console.log(`[${timestamp}] Cleared all sessions`);
      }
      
      // Clear all portfolio data
      await client.query('DELETE FROM portfolio');
      console.log(`[${timestamp}] Cleared all portfolio data`);
      
      // Clear all closed positions
      await client.query('DELETE FROM closed_positions');
      console.log(`[${timestamp}] Cleared all closed positions`);
      
      // Clear all users
      await client.query('DELETE FROM users');
      console.log(`[${timestamp}] Cleared all users`);
      
      await client.query('COMMIT');
      console.log(`[${timestamp}] ✅ Database clear transaction completed successfully`);
      
      res.json({ 
        success: true, 
        message: 'Database cleared successfully - all user data has been permanently deleted',
        clearedData: beforeCounts
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(`[${timestamp}] Database clear transaction rolled back due to error`);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Error clearing database:`, error);
    res.status(500).json({ success: false, message: 'Error clearing database: ' + error.message });
  }
});

// Reset entire database schema (EXTREMELY DANGEROUS - requires admin authentication)
app.post('/api/admin/reset-schema', authenticateAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    if (!isDatabaseAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection required' 
      });
    }

    console.log(`[${timestamp}] 🚨 EXTREMELY CRITICAL: Database schema reset request by admin: ${req.admin.username}`);

    const client = await require('./database').pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(`[${timestamp}] Starting database schema reset transaction`);
      
      // Get list of all tables before dropping
      const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
      `);
      
      const tableNames = tablesResult.rows.map(row => row.tablename);
      console.log(`[${timestamp}] Found tables to drop:`, tableNames);
      
      // Drop all tables in correct order (handle foreign key dependencies)
      const tablesToDrop = [
        'user_sessions',
        'admin_sessions', 
        'portfolio',
        'closed_positions',
        'users',
        'admins'
      ];
      
      for (const tableName of tablesToDrop) {
        if (tableNames.includes(tableName)) {
          await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
          console.log(`[${timestamp}] Dropped table: ${tableName}`);
        }
      }
      
      // Drop any remaining tables
      for (const tableName of tableNames) {
        if (!tablesToDrop.includes(tableName)) {
          await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
          console.log(`[${timestamp}] Dropped additional table: ${tableName}`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`[${timestamp}] ✅ Database schema reset transaction completed successfully`);
      
      // Now reinitialize the database with correct schema
      console.log(`[${timestamp}] 🏗️ Reinitializing database with correct schema...`);
      await initializeDatabase();
      
      // Recreate default admin
      console.log(`[${timestamp}] 👤 Recreating default admin...`);
      await createDefaultAdmin();
      
      res.json({ 
        success: true, 
        message: 'Database schema reset successfully - all tables dropped and recreated with correct schema',
        droppedTables: tableNames,
        recreatedTables: ['users', 'portfolio', 'closed_positions', 'user_sessions', 'admins', 'admin_sessions']
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(`[${timestamp}] Database schema reset transaction rolled back due to error`);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Error resetting database schema:`, error);
    res.status(500).json({ success: false, message: 'Error resetting database schema: ' + error.message });
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

// Start server
async function startServer() {
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const isConnected = await testConnection();
    isDatabaseAvailable = isConnected;
    
    if (!isConnected) {
      console.log('❌ Database not connected - application requires database');
      console.log('💡 Please set DATABASE_URL environment variable and restart');
      console.log('🚫 Server will start but API endpoints will return 503 errors');
    } else {
      // Initialize database tables
      console.log('🏗️  Initializing database tables...');
      await initializeDatabase();
      
      // Create default admin user if none exists
      await createDefaultAdmin();
      
      console.log('✅ Database ready for fresh data - no migration performed');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Indian Stock Portfolio Tracker running on http://localhost:${PORT}`);
      console.log(`📊 Using ${isConnected ? 'PostgreSQL database' : 'DATABASE REQUIRED'} for data storage`);
      console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
      console.log(`🔍 Database status at: http://localhost:${PORT}/api/db-status`);
      
      if (!isConnected) {
        console.log('');
        console.log('⚠️  IMPORTANT: Database connection required for full functionality');
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
