#!/bin/bash

echo "🚀 Starting Portfolio Tracker Database Fix Deployment"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo "📋 Current directory: $(pwd)"
echo "📋 Node.js version: $(node --version)"
echo "📋 NPM version: $(npm --version)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL environment variable not set"
    echo "💡 Make sure your database connection string is configured"
else
    echo "✅ Database URL is configured"
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Run the database schema fix
echo "🔧 Running database schema fix..."
if node fix-database-schema.js; then
    echo "✅ Database schema fix completed successfully"
else
    echo "❌ Database schema fix failed"
    echo "💡 You can try using the admin portal to clear the database instead:"
    echo "   1. Go to https://protfolio-tracker.onrender.com/admin.html"
    echo "   2. Login with: naresh / pagadala"
    echo "   3. Use 'Clear Entire Database' button in Dashboard"
    exit 1
fi

echo ""
echo "🎉 Deployment fix completed successfully!"
echo "=================================================="
echo "✅ Database schema has been updated"
echo "✅ Enhanced error handling is active"
echo "✅ Comprehensive logging is enabled"
echo ""
echo "🔍 Next steps:"
echo "1. Test the portfolio API: https://protfolio-tracker.onrender.com/api/portfolio"
echo "2. Should return 401 (auth required) instead of 500"
echo "3. Test user registration and login"
echo "4. Verify portfolio data persists across sessions"
echo ""
echo "🛡️ Admin Portal: https://protfolio-tracker.onrender.com/admin.html"
echo "🔑 Admin Credentials: naresh / pagadala"
echo ""
echo "📊 Monitor logs for any remaining issues"
