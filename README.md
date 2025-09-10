# Indian Stock Portfolio Tracker

A comprehensive portfolio management application for Indian stock market investments with real-time data from NSE.

## Features

- **Real-time Stock Data**: Fetches live prices from Yahoo Finance API for NSE stocks
- **Market Indices**: Live NIFTY 50 and SENSEX data with change indicators
- **Day Change Tracking**: Shows daily stock performance with color-coded arrows
- **Position Management**: Track Long, Medium, and Short positions
- **Complete CRUD Operations**: Add, Edit, Close, and Delete stock positions
- **Advanced Sorting**: Sort all table columns with visual indicators
- **Date Picker Integration**: Professional closing position modal with date selection
- **Comprehensive Analytics**: Portfolio distribution and P&L charts
- **Auto-refresh**: Updates every minute automatically
- **File-based Storage**: Data saved to JSON files on the server
- **Responsive Design**: Works on all devices

## Installation & Deployment

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Setup Instructions

1. **Navigate to the project directory:**
   ```bash
   cd indian-portfolio-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and go to: `http://localhost:3001`

### Data Storage

- Portfolio data is saved to: `data/portfolio.json`
- Closed positions data is saved to: `data/closed-positions.json`
- Data files are automatically created when the server starts
- All data persists across server restarts

### API Endpoints

- `GET /api/portfolio` - Retrieve portfolio data
- `POST /api/portfolio` - Save portfolio data
- `GET /api/closed-positions` - Retrieve closed positions data
- `POST /api/closed-positions` - Save closed positions data

## Usage

1. **Add Stocks**: Use the form to add stocks with ticker, price, quantity, position type, and purchase date
2. **View Portfolio**: See all holdings with real-time prices and day changes
3. **Edit Stocks**: Click Edit button to modify existing stock details
4. **Close Positions**: Use the Close button to move stocks to closed positions
5. **Sort Data**: Click any table header to sort by that column
6. **Monitor Market**: View NIFTY 50 and SENSEX indices at the top
7. **Auto-refresh**: Data updates automatically every minute

## Technical Details

- **Frontend**: HTML, CSS, JavaScript with Chart.js for analytics
- **Backend**: Node.js with Express.js
- **Data Storage**: JSON files on the server
- **Real-time Data**: Yahoo Finance API integration
- **Auto-refresh**: 1-minute intervals for live updates

## File Structure

```
indian-portfolio-tracker/
├── index.html          # Main HTML file
├── script.js           # Frontend JavaScript
├── styles.css          # CSS styling
├── server.js           # Node.js server
├── package.json        # Node.js dependencies
├── data/               # Data directory (auto-created)
│   ├── portfolio.json  # Portfolio data
│   └── closed-positions.json # Closed positions data
└── README.md           # This file
```

## Development

The application uses a client-server architecture:
- **Client**: Handles UI, user interactions, and real-time data fetching
- **Server**: Manages data persistence and serves static files
- **Storage**: JSON files for reliable data persistence

## Support

For issues or questions, check the console logs in your browser's developer tools for detailed error information.
