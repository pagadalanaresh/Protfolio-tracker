const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Data file paths
const PORTFOLIO_FILE = path.join(__dirname, 'data', 'portfolio.json');
const CLOSED_POSITIONS_FILE = path.join(__dirname, 'data', 'closed-positions.json');

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

// API Routes

// Get portfolio data
app.get('/api/portfolio', async (req, res) => {
    try {
        const data = await fs.readFile(PORTFOLIO_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading portfolio file:', error);
        res.json([]);
    }
});

// Save portfolio data
app.post('/api/portfolio', async (req, res) => {
    try {
        await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Portfolio saved successfully' });
    } catch (error) {
        console.error('Error saving portfolio file:', error);
        res.status(500).json({ success: false, message: 'Error saving portfolio' });
    }
});

// Get closed positions data
app.get('/api/closed-positions', async (req, res) => {
    try {
        const data = await fs.readFile(CLOSED_POSITIONS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading closed positions file:', error);
        res.json([]);
    }
});

// Save closed positions data
app.post('/api/closed-positions', async (req, res) => {
    try {
        await fs.writeFile(CLOSED_POSITIONS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Closed positions saved successfully' });
    } catch (error) {
        console.error('Error saving closed positions file:', error);
        res.status(500).json({ success: false, message: 'Error saving closed positions' });
    }
});

// Start server
async function startServer() {
    await ensureDataDirectory();
    await initializeDataFiles();
    
    app.listen(PORT, () => {
        console.log(`🚀 Indian Stock Portfolio Tracker running on http://localhost:${PORT}`);
        console.log(`📊 Portfolio data will be saved to: ${PORTFOLIO_FILE}`);
        console.log(`📈 Closed positions data will be saved to: ${CLOSED_POSITIONS_FILE}`);
    });
}

startServer().catch(console.error);
