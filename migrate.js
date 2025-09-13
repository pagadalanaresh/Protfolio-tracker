#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { 
  testConnection, 
  initializeDatabase, 
  portfolioOperations, 
  closedPositionsOperations 
} = require('./database');

// Data file paths
const PORTFOLIO_FILE = path.join(__dirname, 'data', 'portfolio.json');
const CLOSED_POSITIONS_FILE = path.join(__dirname, 'data', 'closed-positions.json');

async function migrate() {
  console.log('🚀 Starting migration process...\n');
  
  try {
    // Test database connection
    console.log('1️⃣  Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }
    
    // Initialize database tables
    console.log('2️⃣  Initializing database tables...');
    await initializeDatabase();
    
    // Migrate portfolio data
    console.log('3️⃣  Migrating portfolio data...');
    try {
      const portfolioData = await fs.readFile(PORTFOLIO_FILE, 'utf8');
      const portfolio = JSON.parse(portfolioData);
      
      if (portfolio.length > 0) {
        await portfolioOperations.saveAll(portfolio);
        console.log(`   ✅ Successfully migrated ${portfolio.length} portfolio items`);
      } else {
        console.log('   ℹ️  No portfolio data to migrate');
      }
    } catch (error) {
      console.log('   ⚠️  No portfolio.json file found - skipping portfolio migration');
    }
    
    // Migrate closed positions data
    console.log('4️⃣  Migrating closed positions data...');
    try {
      const closedPositionsData = await fs.readFile(CLOSED_POSITIONS_FILE, 'utf8');
      const closedPositions = JSON.parse(closedPositionsData);
      
      if (closedPositions.length > 0) {
        await closedPositionsOperations.saveAll(closedPositions);
        console.log(`   ✅ Successfully migrated ${closedPositions.length} closed positions`);
      } else {
        console.log('   ℹ️  No closed positions data to migrate');
      }
    } catch (error) {
      console.log('   ⚠️  No closed-positions.json file found - skipping closed positions migration');
    }
    
    // Verify migration
    console.log('5️⃣  Verifying migration...');
    const portfolioCount = (await portfolioOperations.getAll()).length;
    const closedPositionsCount = (await closedPositionsOperations.getAll()).length;
    
    console.log(`   📊 Portfolio items in database: ${portfolioCount}`);
    console.log(`   📈 Closed positions in database: ${closedPositionsCount}`);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy your application to Render');
    console.log('   2. Set up PostgreSQL database on Render');
    console.log('   3. Set DATABASE_URL environment variable on Render');
    console.log('   4. Your app will automatically use the database for data storage');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
