const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { 
  testConnection, 
  initializeDatabase, 
  portfolioOperations, 
  closedPositionsOperations 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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

// Get portfolio data
app.get('/api/portfolio', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const portfolio = await portfolioOperations.getAll();
      res.json(portfolio);
    } else {
      // Fallback to JSON file
      const data = await fs.readFile(PORTFOLIO_FILE, 'utf8');
      res.json(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    // Try fallback if database fails
    if (isDatabaseAvailable) {
      try {
        const data = await fs.readFile(PORTFOLIO_FILE, 'utf8');
        res.json(JSON.parse(data));
      } catch (fallbackError) {
        res.json([]);
      }
    } else {
      res.json([]);
    }
  }
});

// Save portfolio data
app.post('/api/portfolio', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      await portfolioOperations.saveAll(req.body);
    } else {
      // Fallback to JSON file
      await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(req.body, null, 2));
    }
    res.json({ success: true, message: 'Portfolio saved successfully' });
  } catch (error) {
    console.error('Error saving portfolio data:', error);
    // Try fallback if database fails
    if (isDatabaseAvailable) {
      try {
        await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Portfolio saved successfully (fallback)' });
      } catch (fallbackError) {
        res.status(500).json({ success: false, message: 'Error saving portfolio' });
      }
    } else {
      res.status(500).json({ success: false, message: 'Error saving portfolio' });
    }
  }
});

// Get closed positions data
app.get('/api/closed-positions', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const closedPositions = await closedPositionsOperations.getAll();
      res.json(closedPositions);
    } else {
      // Fallback to JSON file
      const data = await fs.readFile(CLOSED_POSITIONS_FILE, 'utf8');
      res.json(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error fetching closed positions data:', error);
    // Try fallback if database fails
    if (isDatabaseAvailable) {
      try {
        const data = await fs.readFile(CLOSED_POSITIONS_FILE, 'utf8');
        res.json(JSON.parse(data));
      } catch (fallbackError) {
        res.json([]);
      }
    } else {
      res.json([]);
    }
  }
});

// Save closed positions data
app.post('/api/closed-positions', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      await closedPositionsOperations.saveAll(req.body);
    } else {
      // Fallback to JSON file
      await fs.writeFile(CLOSED_POSITIONS_FILE, JSON.stringify(req.body, null, 2));
    }
    res.json({ success: true, message: 'Closed positions saved successfully' });
  } catch (error) {
    console.error('Error saving closed positions data:', error);
    // Try fallback if database fails
    if (isDatabaseAvailable) {
      try {
        await fs.writeFile(CLOSED_POSITIONS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Closed positions saved successfully (fallback)' });
      } catch (fallbackError) {
        res.status(500).json({ success: false, message: 'Error saving closed positions' });
      }
    } else {
      res.status(500).json({ success: false, message: 'Error saving closed positions' });
    }
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
      await migrateJsonToDatabase();
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
