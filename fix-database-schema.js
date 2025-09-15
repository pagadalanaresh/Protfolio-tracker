const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database schema fix...');
    
    // Check if portfolio table exists and get its structure
    const portfolioTableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'portfolio' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current portfolio table structure:', portfolioTableCheck.rows);
    
    // Check if we need to recreate the portfolio table
    const primaryKeyCheck = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'portfolio' AND constraint_type = 'PRIMARY KEY'
    `);
    
    console.log('Current primary key constraints:', primaryKeyCheck.rows);
    
    // If the table has the old composite primary key, we need to fix it
    if (portfolioTableCheck.rows.length > 0) {
      console.log('📋 Portfolio table exists, checking if schema update is needed...');
      
      // Start transaction
      await client.query('BEGIN');
      
      try {
        // Create backup table
        console.log('💾 Creating backup of existing portfolio data...');
        await client.query(`
          CREATE TABLE portfolio_backup AS 
          SELECT * FROM portfolio
        `);
        
        // Drop the old table
        console.log('🗑️ Dropping old portfolio table...');
        await client.query('DROP TABLE IF EXISTS portfolio CASCADE');
        
        // Create new portfolio table with correct schema
        console.log('🏗️ Creating new portfolio table with correct schema...');
        await client.query(`
          CREATE TABLE portfolio (
            id SERIAL PRIMARY KEY,
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
            UNIQUE(user_id, ticker)
          )
        `);
        
        // Restore data from backup (if any exists)
        const backupDataCheck = await client.query('SELECT COUNT(*) as count FROM portfolio_backup');
        const backupCount = parseInt(backupDataCheck.rows[0].count);
        
        if (backupCount > 0) {
          console.log(`📥 Restoring ${backupCount} portfolio items from backup...`);
          await client.query(`
            INSERT INTO portfolio (
              user_id, ticker, name, buy_price, current_price, quantity, invested,
              current_value, purchase_date, last_updated, pl, pl_percent,
              day_change, day_change_percent, target_price, stop_loss, position,
              created_at, updated_at
            )
            SELECT 
              user_id, ticker, name, buy_price, current_price, quantity, invested,
              current_value, purchase_date, last_updated, pl, pl_percent,
              day_change, day_change_percent, target_price, stop_loss, position,
              created_at, updated_at
            FROM portfolio_backup
            ON CONFLICT (user_id, ticker) DO NOTHING
          `);
          console.log('✅ Portfolio data restored successfully');
        }
        
        // Drop backup table
        await client.query('DROP TABLE portfolio_backup');
        console.log('🧹 Backup table cleaned up');
        
        await client.query('COMMIT');
        console.log('✅ Portfolio table schema fix completed successfully');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during schema fix, rolling back:', error);
        throw error;
      }
    }
    
    // Do the same for closed_positions table
    const closedPositionsTableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'closed_positions' 
      ORDER BY ordinal_position
    `);
    
    if (closedPositionsTableCheck.rows.length > 0) {
      console.log('📋 Closed positions table exists, checking if schema update is needed...');
      
      // Check if it has the old composite primary key
      const closedPrimaryKeyCheck = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = 'closed_positions' AND constraint_type = 'PRIMARY KEY'
      `);
      
      // If it needs fixing, do the same process
      if (closedPrimaryKeyCheck.rows.some(row => row.constraint_name.includes('pkey'))) {
        await client.query('BEGIN');
        
        try {
          // Create backup table
          console.log('💾 Creating backup of existing closed positions data...');
          await client.query(`
            CREATE TABLE closed_positions_backup AS 
            SELECT * FROM closed_positions
          `);
          
          // Drop the old table
          console.log('🗑️ Dropping old closed_positions table...');
          await client.query('DROP TABLE IF EXISTS closed_positions CASCADE');
          
          // Create new closed_positions table with correct schema
          console.log('🏗️ Creating new closed_positions table with correct schema...');
          await client.query(`
            CREATE TABLE closed_positions (
              id SERIAL PRIMARY KEY,
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
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Restore data from backup (if any exists)
          const closedBackupDataCheck = await client.query('SELECT COUNT(*) as count FROM closed_positions_backup');
          const closedBackupCount = parseInt(closedBackupDataCheck.rows[0].count);
          
          if (closedBackupCount > 0) {
            console.log(`📥 Restoring ${closedBackupCount} closed position items from backup...`);
            await client.query(`
              INSERT INTO closed_positions (
                user_id, ticker, name, buy_price, current_price, quantity, invested,
                current_value, purchase_date, last_updated, pl, pl_percent,
                close_price, close_value, final_pl, final_pl_percent,
                closed_date, holding_period, created_at
              )
              SELECT 
                user_id, ticker, name, buy_price, current_price, quantity, invested,
                current_value, purchase_date, last_updated, pl, pl_percent,
                close_price, close_value, final_pl, final_pl_percent,
                closed_date, holding_period, created_at
              FROM closed_positions_backup
            `);
            console.log('✅ Closed positions data restored successfully');
          }
          
          // Drop backup table
          await client.query('DROP TABLE closed_positions_backup');
          console.log('🧹 Closed positions backup table cleaned up');
          
          await client.query('COMMIT');
          console.log('✅ Closed positions table schema fix completed successfully');
          
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('❌ Error during closed positions schema fix, rolling back:', error);
          throw error;
        }
      }
    }
    
    console.log('🎉 Database schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('✅ Database schema fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database schema fix failed:', error);
    process.exit(1);
  });
