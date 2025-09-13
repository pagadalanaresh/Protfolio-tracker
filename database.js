const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create portfolio table with user_id foreign key
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id BIGINT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ticker VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        buy_price DECIMAL(10,2) NOT NULL,
        current_price DECIMAL(10,2),
        quantity INTEGER NOT NULL,
        invested DECIMAL(12,2) NOT NULL,
        current_value DECIMAL(12,2),
        purchase_date DATE NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pl DECIMAL(12,2),
        pl_percent DECIMAL(8,4),
        day_change DECIMAL(8,2),
        day_change_percent DECIMAL(8,4),
        target_price DECIMAL(10,2),
        stop_loss DECIMAL(10,2),
        position VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, user_id)
      )
    `);

    // Create closed_positions table with user_id foreign key
    await client.query(`
      CREATE TABLE IF NOT EXISTS closed_positions (
        id BIGINT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ticker VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        buy_price DECIMAL(10,2) NOT NULL,
        current_price DECIMAL(10,2),
        quantity INTEGER NOT NULL,
        invested DECIMAL(12,2) NOT NULL,
        current_value DECIMAL(12,2),
        purchase_date DATE NOT NULL,
        last_updated TIMESTAMP,
        pl DECIMAL(12,2),
        pl_percent DECIMAL(8,4),
        close_price DECIMAL(10,2) NOT NULL,
        close_value DECIMAL(12,2) NOT NULL,
        final_pl DECIMAL(12,2) NOT NULL,
        final_pl_percent DECIMAL(8,4) NOT NULL,
        closed_date DATE NOT NULL,
        holding_period VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, user_id)
      )
    `);

    // Create sessions table for user authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// User authentication operations
const userOperations = {
  // Create new user
  async createUser(username, email, phone, passwordHash) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO users (username, email, phone, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, phone, created_at
      `, [username, email, phone, passwordHash]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Find user by username
  async findByUsername(username) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },

  // Find user by email
  async findByEmail(email) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },

  // Create session
  async createSession(userId, sessionToken, expiresAt) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES ($1, $2, $3)
      `, [userId, sessionToken, expiresAt]);
    } finally {
      client.release();
    }
  },

  // Find session
  async findSession(sessionToken) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, u.username, u.email 
        FROM user_sessions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.session_token = $1 AND s.expires_at > NOW()
      `, [sessionToken]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },

  // Delete session
  async deleteSession(sessionToken) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM user_sessions WHERE session_token = $1', [sessionToken]);
    } finally {
      client.release();
    }
  },

  // Clean expired sessions
  async cleanExpiredSessions() {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
    } finally {
      client.release();
    }
  }
};

// Portfolio operations
const portfolioOperations = {
  // Get all portfolio items for a user
  async getAll(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return result.rows.map(row => ({
        id: parseInt(row.id),
        ticker: row.ticker,
        name: row.name,
        buyPrice: parseFloat(row.buy_price),
        currentPrice: row.current_price ? parseFloat(row.current_price) : null,
        quantity: row.quantity,
        invested: parseFloat(row.invested),
        currentValue: row.current_value ? parseFloat(row.current_value) : null,
        purchaseDate: row.purchase_date,
        lastUpdated: row.last_updated,
        pl: row.pl ? parseFloat(row.pl) : null,
        plPercent: row.pl_percent ? parseFloat(row.pl_percent) : null,
        dayChange: row.day_change ? parseFloat(row.day_change) : null,
        dayChangePercent: row.day_change_percent ? parseFloat(row.day_change_percent) : null,
        targetPrice: row.target_price ? parseFloat(row.target_price) : null,
        stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : null,
        position: row.position
      }));
    } finally {
      client.release();
    }
  },

  // Save all portfolio items for a user (replace all)
  async saveAll(userId, portfolioData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear existing data for this user
      await client.query('DELETE FROM portfolio WHERE user_id = $1', [userId]);
      
      // Insert new data
      for (const item of portfolioData) {
        await client.query(`
          INSERT INTO portfolio (
            id, user_id, ticker, name, buy_price, current_price, quantity, invested, 
            current_value, purchase_date, last_updated, pl, pl_percent, 
            day_change, day_change_percent, target_price, stop_loss, position
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          item.id, userId, item.ticker, item.name, item.buyPrice, item.currentPrice,
          item.quantity, item.invested, item.currentValue, item.purchaseDate,
          item.lastUpdated, item.pl, item.plPercent, item.dayChange,
          item.dayChangePercent, item.targetPrice, item.stopLoss, item.position
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

// Closed positions operations
const closedPositionsOperations = {
  // Get all closed positions for a user
  async getAll(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM closed_positions WHERE user_id = $1 ORDER BY closed_date DESC', [userId]);
      return result.rows.map(row => ({
        id: parseInt(row.id),
        ticker: row.ticker,
        name: row.name,
        buyPrice: parseFloat(row.buy_price),
        currentPrice: row.current_price ? parseFloat(row.current_price) : null,
        quantity: row.quantity,
        invested: parseFloat(row.invested),
        currentValue: row.current_value ? parseFloat(row.current_value) : null,
        purchaseDate: row.purchase_date,
        lastUpdated: row.last_updated,
        pl: row.pl ? parseFloat(row.pl) : null,
        plPercent: row.pl_percent ? parseFloat(row.pl_percent) : null,
        closePrice: parseFloat(row.close_price),
        closeValue: parseFloat(row.close_value),
        finalPL: parseFloat(row.final_pl),
        finalPLPercent: parseFloat(row.final_pl_percent),
        closedDate: row.closed_date,
        holdingPeriod: row.holding_period
      }));
    } finally {
      client.release();
    }
  },

  // Save all closed positions for a user (replace all)
  async saveAll(userId, closedPositionsData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear existing data for this user
      await client.query('DELETE FROM closed_positions WHERE user_id = $1', [userId]);
      
      // Insert new data
      for (const item of closedPositionsData) {
        await client.query(`
          INSERT INTO closed_positions (
            id, user_id, ticker, name, buy_price, current_price, quantity, invested,
            current_value, purchase_date, last_updated, pl, pl_percent,
            close_price, close_value, final_pl, final_pl_percent,
            closed_date, holding_period
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          item.id, userId, item.ticker, item.name, item.buyPrice, item.currentPrice,
          item.quantity, item.invested, item.currentValue, item.purchaseDate,
          item.lastUpdated, item.pl, item.plPercent, item.closePrice,
          item.closeValue, item.finalPL, item.finalPLPercent, item.closedDate,
          item.holdingPeriod
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  userOperations,
  portfolioOperations,
  closedPositionsOperations
};
