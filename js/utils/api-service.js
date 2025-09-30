// API Service Module
import { CONSTANTS } from '../utils/constants.js';

export class ApiService {
    constructor() {
        this.searchTimeout = null;
    }

    // Authentication APIs
    async checkAuth() {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.AUTH_CHECK);
            return await response.json();
        } catch (error) {
            console.error('Auth check failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.AUTH_LOGOUT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    // Portfolio APIs
    async getPortfolio() {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.PORTFOLIO);
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            return [];
        }
    }

    async savePortfolio(portfolioData) {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.PORTFOLIO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(portfolioData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save portfolio data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving portfolio:', error);
            throw error;
        }
    }

    // Watchlist APIs
    async getWatchlist() {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.WATCHLIST);
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching watchlist:', error);
            return [];
        }
    }

    async saveWatchlist(watchlistData) {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.WATCHLIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(watchlistData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save watchlist data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving watchlist:', error);
            throw error;
        }
    }

    // Closed Positions APIs
    async getClosedPositions() {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.CLOSED_POSITIONS);
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching closed positions:', error);
            return [];
        }
    }

    async saveClosedPositions(closedPositionsData) {
        try {
            const response = await fetch(CONSTANTS.API.ENDPOINTS.CLOSED_POSITIONS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(closedPositionsData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save closed positions data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving closed positions:', error);
            throw error;
        }
    }

    // Yahoo Finance APIs
    async fetchStockData(ticker) {
        try {
            const yahooUrl = `${CONSTANTS.API.YAHOO_FINANCE.CHART_URL}${ticker}.NS`;
            const fullUrl = CONSTANTS.API.YAHOO_FINANCE.PROXY_URL + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: CONSTANTS.API.HEADERS
            });
            
            if (!response.ok) {
                throw new Error(`Yahoo Finance API error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('No data found for this ticker');
            }
            
            return this.parseStockData(data.chart.result[0], ticker);
        } catch (error) {
            console.error(`Failed to fetch data for ${ticker}:`, error.message);
            throw error;
        }
    }

    async fetchMultipleStockData(symbols) {
        try {
            const yahooSymbols = symbols.map(symbol => `${symbol}.NS`).join(',');
            const yahooUrl = `${CONSTANTS.API.YAHOO_FINANCE.BULK_QUOTE_URL}?symbols=${yahooSymbols}`;
            const fullUrl = CONSTANTS.API.YAHOO_FINANCE.PROXY_URL + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: CONSTANTS.API.HEADERS
            });
            
            if (!response.ok) {
                throw new Error(`Yahoo Finance bulk API error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.quoteResponse || !data.quoteResponse.result) {
                throw new Error('No bulk data received from Yahoo Finance API');
            }
            
            return this.parseBulkStockData(data.quoteResponse.result);
        } catch (error) {
            console.error('Failed to fetch bulk stock data:', error.message);
            throw error;
        }
    }

    async searchStocks(query) {
        try {
            const yahooUrl = `${CONSTANTS.API.YAHOO_FINANCE.SEARCH_URL}?q=${query}`;
            const fullUrl = CONSTANTS.API.YAHOO_FINANCE.PROXY_URL + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: CONSTANTS.API.HEADERS
            });
            
            if (!response.ok) {
                throw new Error(`Yahoo search API error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.quotes && data.quotes.length > 0) {
                return data.quotes
                    .filter(item => item.symbol && item.symbol.includes('.NS'))
                    .slice(0, CONSTANTS.UI.LIMITS.MAX_SUGGESTIONS)
                    .map(item => ({
                        symbol: item.symbol.replace('.NS', ''),
                        name: item.longname || item.shortname || `${item.symbol.replace('.NS', '')} Limited`,
                        exchange: 'NSE'
                    }));
            }
            
            return [];
        } catch (error) {
            console.warn(`Yahoo search failed for ${query}:`, error.message);
            return [];
        }
    }

    // Private helper methods
    parseStockData(result, ticker) {
        const meta = result.meta;
        const quote = result.indicators.quote[0];
        
        const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
        const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
        
        const dayChange = currentPrice - previousClose;
        const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
        
        const companyName = meta.longName || meta.shortName || `${ticker} Limited`;
        const sector = meta.sector || 'Technology';
        
        return {
            name: companyName,
            sector: sector,
            currentPrice: Math.round(currentPrice * 100) / 100,
            dayChange: Math.round(dayChange * 100) / 100,
            dayChangePercent: Math.round(dayChangePercent * 100) / 100
        };
    }

    parseBulkStockData(quotes) {
        const results = {};
        
        quotes.forEach(quote => {
            try {
                const symbol = quote.symbol.replace('.NS', '');
                const currentPrice = quote.regularMarketPrice || quote.previousClose || 0;
                const previousClose = quote.previousClose || quote.regularMarketPreviousClose || currentPrice;
                
                const dayChange = currentPrice - previousClose;
                const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
                
                const companyName = quote.longName || quote.shortName || `${symbol} Limited`;
                const sector = quote.sector || 'Technology';
                
                results[symbol] = {
                    name: companyName,
                    sector: sector,
                    currentPrice: Math.round(currentPrice * 100) / 100,
                    dayChange: Math.round(dayChange * 100) / 100,
                    dayChangePercent: Math.round(dayChangePercent * 100) / 100
                };
            } catch (error) {
                console.warn(`Error processing bulk data for ${quote.symbol}:`, error.message);
                const symbol = quote.symbol.replace('.NS', '');
                results[symbol] = { error: error.message };
            }
        });
        
        return results;
    }
}
