// Data Manager Module
import { Formatters } from '../utils/formatters.js';
import { CONSTANTS } from '../utils/constants.js';

export class DataManager {
    constructor() {
        this.data = {
            portfolio: [],
            watchlist: [],
            closedPositions: []
        };
    }

    // Portfolio Operations
    addToPortfolio(stockData) {
        const newStock = {
            id: Date.now(),
            ...stockData,
            pl: stockData.currentValue - stockData.invested,
            plPercent: ((stockData.currentValue - stockData.invested) / stockData.invested) * 100
        };
        
        this.data.portfolio.push(newStock);
        return newStock;
    }

    updatePortfolioStock(stockId, updates) {
        const stockIndex = this.data.portfolio.findIndex(s => s.id === stockId);
        if (stockIndex === -1) return null;

        const stock = this.data.portfolio[stockIndex];
        Object.assign(stock, updates);
        
        // Recalculate derived values
        stock.invested = stock.buyPrice * stock.quantity;
        stock.currentValue = stock.currentPrice * stock.quantity;
        stock.pl = stock.currentValue - stock.invested;
        stock.plPercent = (stock.pl / stock.invested) * 100;
        
        return stock;
    }

    removeFromPortfolio(stockId) {
        const stockIndex = this.data.portfolio.findIndex(s => s.id === stockId);
        if (stockIndex === -1) return null;
        
        return this.data.portfolio.splice(stockIndex, 1)[0];
    }

    // Watchlist Operations
    addToWatchlist(stockData) {
        const newStock = {
            id: Date.now(),
            ...stockData,
            addedDate: new Date().toISOString().split('T')[0]
        };
        
        this.data.watchlist.push(newStock);
        return newStock;
    }

    updateWatchlistStock(stockId, updates) {
        const stockIndex = this.data.watchlist.findIndex(s => s.id === stockId);
        if (stockIndex === -1) return null;

        Object.assign(this.data.watchlist[stockIndex], updates);
        return this.data.watchlist[stockIndex];
    }

    removeFromWatchlist(stockId) {
        const stockIndex = this.data.watchlist.findIndex(s => s.id === stockId);
        if (stockIndex === -1) return null;
        
        return this.data.watchlist.splice(stockIndex, 1)[0];
    }

    // Closed Positions Operations
    addToClosedPositions(positionData) {
        const newPosition = {
            id: Date.now(),
            ...positionData,
            pl: positionData.realized - positionData.invested,
            plPercent: ((positionData.realized - positionData.invested) / positionData.invested) * 100
        };
        
        this.data.closedPositions.push(newPosition);
        return newPosition;
    }

    // Portfolio Calculations
    getPortfolioSummary() {
        const portfolio = this.data.portfolio;
        
        if (portfolio.length === 0) {
            return {
                totalInvested: 0,
                totalCurrentValue: 0,
                totalPL: 0,
                totalPLPercent: 0,
                todaysPL: 0
            };
        }

        const totalInvested = portfolio.reduce((sum, stock) => sum + (stock.invested || 0), 0);
        const totalCurrentValue = portfolio.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
        const totalPL = totalCurrentValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
        const todaysPL = portfolio.reduce((sum, stock) => 
            sum + ((stock.dayChange || 0) * (stock.quantity || 0)), 0);

        return {
            totalInvested,
            totalCurrentValue,
            totalPL,
            totalPLPercent,
            todaysPL
        };
    }

    getTopPerformers(limit = CONSTANTS.UI.LIMITS.MAX_TOP_PERFORMERS) {
        return [...this.data.portfolio]
            .sort((a, b) => (b.dayChangePercent || 0) - (a.dayChangePercent || 0))
            .slice(0, limit);
    }

    getTopHoldings(limit = CONSTANTS.UI.LIMITS.MAX_TOP_HOLDINGS) {
        return [...this.data.portfolio]
            .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
            .slice(0, limit);
    }

    getSectorAllocation() {
        const sectorTotals = {};
        const totalValue = this.data.portfolio.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
        
        if (totalValue === 0) {
            return { labels: [], values: [] };
        }
        
        this.data.portfolio.forEach(stock => {
            const sector = stock.sector || 'Other';
            if (!sectorTotals[sector]) {
                sectorTotals[sector] = 0;
            }
            sectorTotals[sector] += stock.currentValue || 0;
        });
        
        const labels = Object.keys(sectorTotals);
        const values = labels.map(sector => 
            Math.round((sectorTotals[sector] / totalValue) * 100)
        );
        
        return { labels, values };
    }

    getClosedPositionsSummary() {
        const closedPositions = this.data.closedPositions;
        
        if (closedPositions.length === 0) {
            return {
                totalRealized: 0,
                totalProfit: 0,
                totalPositions: 0,
                averageReturn: 0
            };
        }

        const totalRealized = closedPositions.reduce((sum, pos) => sum + (pos.realized || 0), 0);
        const totalProfit = closedPositions.reduce((sum, pos) => sum + (pos.pl || 0), 0);
        const totalInvested = closedPositions.reduce((sum, pos) => sum + (pos.invested || 0), 0);
        const averageReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        return {
            totalRealized,
            totalProfit,
            totalPositions: closedPositions.length,
            averageReturn
        };
    }

    generateRecentActivities(limit = CONSTANTS.UI.LIMITS.MAX_RECENT_ACTIVITIES) {
        const activities = [];
        
        // Portfolio activities
        this.data.portfolio.forEach(stock => {
            if (stock.purchaseDate) {
                const activityDate = new Date(stock.purchaseDate);
                const avgPrice = stock.buyPrice || (stock.invested / stock.quantity);
                
                activities.push({
                    type: 'buy',
                    title: `Bought ${stock.symbol || stock.ticker}`,
                    subtitle: `${stock.quantity} shares at ${Formatters.formatCurrency(avgPrice)}`,
                    time: Formatters.getTimeAgo(activityDate),
                    timestamp: activityDate,
                    symbol: stock.symbol || stock.ticker
                });
            }
        });
        
        // Watchlist activities
        this.data.watchlist.forEach(stock => {
            if (stock.addedDate) {
                const activityDate = new Date(stock.addedDate);
                
                activities.push({
                    type: 'watchlist',
                    title: `Added ${stock.symbol || stock.ticker} to watchlist`,
                    subtitle: `Monitoring at ${Formatters.formatCurrency(stock.currentPrice || 0)}`,
                    time: Formatters.getTimeAgo(activityDate),
                    timestamp: activityDate,
                    symbol: stock.symbol || stock.ticker
                });
            }
        });
        
        // Closed positions activities
        this.data.closedPositions.forEach(position => {
            if (position.sellDate || position.closedDate) {
                const activityDate = new Date(position.sellDate || position.closedDate);
                const pl = position.pl || position.finalPL || 0;
                const plText = pl >= 0 ? `+${Formatters.formatCurrency(pl)} profit` : `${Formatters.formatCurrency(pl)} loss`;
                
                activities.push({
                    type: 'sell',
                    title: `Sold ${position.symbol || position.ticker}`,
                    subtitle: `${position.quantity} shares - ${plText}`,
                    time: Formatters.getTimeAgo(activityDate),
                    timestamp: activityDate,
                    symbol: position.symbol || position.ticker
                });
            }
        });
        
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // Stock price update operations
    updateStockPrices(stockPriceData) {
        let updatedCount = 0;

        // Update portfolio stocks
        this.data.portfolio.forEach(stock => {
            const symbol = stock.ticker || stock.symbol;
            const priceData = stockPriceData[symbol];
            
            if (priceData && !priceData.error) {
                stock.currentPrice = priceData.currentPrice;
                stock.dayChange = priceData.dayChange;
                stock.dayChangePercent = priceData.dayChangePercent;
                stock.currentValue = stock.currentPrice * stock.quantity;
                stock.pl = stock.currentValue - stock.invested;
                stock.plPercent = stock.invested > 0 ? (stock.pl / stock.invested) * 100 : 0;
                stock.name = priceData.name;
                stock.sector = priceData.sector;
                stock.lastUpdated = new Date().toISOString();
                updatedCount++;
            }
        });

        // Update watchlist stocks
        this.data.watchlist.forEach(stock => {
            const symbol = stock.ticker || stock.symbol;
            const priceData = stockPriceData[symbol];
            
            if (priceData && !priceData.error) {
                stock.currentPrice = priceData.currentPrice;
                stock.dayChange = priceData.dayChange;
                stock.dayChangePercent = priceData.dayChangePercent;
                stock.name = priceData.name;
                stock.sector = priceData.sector;
                stock.lastUpdated = new Date().toISOString();
                updatedCount++;
            }
        });

        return updatedCount;
    }

    // Validation methods
    validateStockData(stockData) {
        const required = ['symbol', 'quantity', 'buyPrice'];
        return required.every(field => stockData[field] !== undefined && stockData[field] !== null);
    }

    validateWatchlistData(watchlistData) {
        return watchlistData.symbol !== undefined && watchlistData.symbol !== null;
    }

    // Data getters
    getPortfolio() {
        return this.data.portfolio;
    }

    getWatchlist() {
        return this.data.watchlist;
    }

    getClosedPositions() {
        return this.data.closedPositions;
    }

    setData(newData) {
        this.data = { ...this.data, ...newData };
    }

    findPortfolioStock(stockId) {
        return this.data.portfolio.find(s => s.id === stockId);
    }

    findWatchlistStock(stockId) {
        return this.data.watchlist.find(s => s.id === stockId);
    }

    stockExistsInPortfolio(symbol) {
        return this.data.portfolio.some(s => (s.symbol || s.ticker) === symbol);
    }

    stockExistsInWatchlist(symbol) {
        return this.data.watchlist.some(s => (s.symbol || s.ticker) === symbol);
    }
}
