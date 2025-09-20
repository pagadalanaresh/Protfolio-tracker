// Portfolio Pro - Demo Version with Rich UI and Dummy Data
// This version showcases the redesigned UI with interactive features and sample data

class PortfolioProDemo {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.dummyData = this.initializeData();
        this.init();
    }

    // Initialize the application
    async init() {
        console.log('Initializing Portfolio Pro - Rich UI Version with API Integration');
        
        // Show loading overlay
        this.showLoadingOverlay('Loading portfolio data...');
        
        try {
            // Check authentication and load user data
            await this.loadUserData();
            
            // Load data from APIs
            await this.loadDataFromAPIs();
            
            this.bindEvents();
            this.renderDashboard();
            this.initializeCharts();
            this.startAnimations();
            
            // Update market status
            await this.fetchMarketStatus();
            
            // Show initial section
            this.showSection('overview');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize application', 'error');
        } finally {
            // Hide loading overlay
            this.hideLoadingOverlay();
        }
    }

    // Show loading overlay
    showLoadingOverlay(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    // Hide loading overlay
    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    // Initialize data structure
    initializeData() {
        return {
            portfolio: [],
            watchlist: [],
            closedPositions: [],
            marketIndices: {
                nifty: {
                    value: 24350.45,
                    change: 125.30,
                    changePercent: 0.52,
                    data: this.generateChartData(24350.45, 30)
                },
                sensex: {
                    value: 79825.15,
                    change: -89.45,
                    changePercent: -0.11,
                    data: this.generateChartData(79825.15, 30)
                },
                banknifty: {
                    value: 51234.80,
                    change: 234.50,
                    changePercent: 0.46,
                    data: this.generateChartData(51234.80, 30)
                },
                finnifty: {
                    value: 23145.60,
                    change: 156.20,
                    changePercent: 0.68,
                    data: this.generateChartData(23145.60, 30)
                }
            },
            news: [
                {
                    title: 'Nifty 50 hits new all-time high',
                    subtitle: 'Index crosses 24,400 mark amid strong buying in IT and banking stocks',
                    time: '30m ago',
                    category: 'market'
                },
                {
                    title: 'RBI keeps repo rate unchanged at 6.5%',
                    subtitle: 'Monetary policy committee maintains status quo, focuses on inflation control',
                    time: '2h ago',
                    category: 'policy'
                },
                {
                    title: 'IT sector shows strong momentum',
                    subtitle: 'TCS, Infosys, and Wipro lead the rally with strong Q3 results',
                    time: '4h ago',
                    category: 'sector'
                },
                {
                    title: 'Foreign investors turn bullish on Indian markets',
                    subtitle: 'FII inflows reach ₹15,000 crores in the current month',
                    time: '6h ago',
                    category: 'investment'
                }
            ]
        };
    }

    // Load user data and check authentication
    async loadUserData() {
        try {
            const response = await fetch('/api/auth/check');
            if (response.ok) {
                const authData = await response.json();
                if (authData.authenticated && authData.user) {
                    this.currentUser = authData.user;
                    this.updateUserInterface();
                    console.log('User authenticated:', authData.user.username);
                } else {
                    console.log('User not authenticated, using default user data');
                    this.currentUser = { username: 'Guest User', email: 'guest@example.com' };
                    this.updateUserInterface();
                }
            } else {
                console.log('Auth check failed, using default user data');
                this.currentUser = { username: 'Guest User', email: 'guest@example.com' };
                this.updateUserInterface();
            }
        } catch (error) {
            console.error('Error checking authentication:', error);
            this.currentUser = { username: 'Guest User', email: 'guest@example.com' };
            this.updateUserInterface();
        }
    }

    // Update user interface with real user data
    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user name in navigation
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) {
            userNameEl.textContent = this.currentUser.username;
        }

        // Update welcome message in hero section
        const heroTextEl = document.querySelector('.hero-text h1');
        if (heroTextEl) {
            const firstName = this.currentUser.username.split(' ')[0];
            heroTextEl.textContent = `Welcome back, ${firstName}!`;
        }

        console.log('User interface updated with:', this.currentUser.username);
    }

    // Check market status using Indian market timings
    updateMarketStatus() {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        
        const currentHour = istTime.getHours();
        const currentMinute = istTime.getMinutes();
        const currentTime = currentHour * 100 + currentMinute; // Convert to HHMM format
        const dayOfWeek = istTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Indian stock market timings (Monday to Friday)
        const marketOpenTime = 915;  // 9:15 AM
        const marketCloseTime = 1530; // 3:30 PM
        
        // Check if it's a weekday (Monday to Friday)
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        
        // Check if current time is within market hours
        const isMarketHours = currentTime >= marketOpenTime && currentTime <= marketCloseTime;
        
        const isMarketOpen = isWeekday && isMarketHours;
        
        // Update market status indicator
        const marketIndicator = document.querySelector('.market-indicator');
        const statusDot = document.querySelector('.status-dot');
        const marketStatusText = document.querySelector('.market-indicator span');
        const marketTimeEl = document.querySelector('.market-time');
        
        if (marketIndicator && statusDot && marketStatusText && marketTimeEl) {
            if (isMarketOpen) {
                statusDot.className = 'status-dot active';
                marketStatusText.textContent = 'Market Open';
                marketIndicator.style.color = '#10b981'; // Green color
            } else {
                statusDot.className = 'status-dot inactive';
                marketStatusText.textContent = 'Market Closed';
                marketIndicator.style.color = '#ef4444'; // Red color
            }
            
            // Update current IST time
            const timeString = istTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            });
            marketTimeEl.textContent = `${timeString} IST`;
        }
        
        // Log market status for debugging
        console.log(`Market Status: ${isMarketOpen ? 'Open' : 'Closed'} at ${istTime.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
        
        return isMarketOpen;
    }

    // Fetch real market status from Yahoo Finance API
    async fetchMarketStatus() {
        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/^NSEI'; // Nifty 50 index
            const fullUrl = proxyUrl + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl);
            if (response.ok) {
                const data = await response.json();
                
                if (data.chart && data.chart.result && data.chart.result.length > 0) {
                    const result = data.chart.result[0];
                    const meta = result.meta;
                    
                    // Check if market is currently in session
                    const marketState = meta.marketState; // Can be 'REGULAR', 'CLOSED', 'PRE', 'POST'
                    const isMarketOpen = marketState === 'REGULAR';
                    
                    // Get current market time from Yahoo
                    const marketTime = new Date(meta.regularMarketTime * 1000);
                    
                    // Update market status with real data
                    const marketIndicator = document.querySelector('.market-indicator');
                    const statusDot = document.querySelector('.status-dot');
                    const marketStatusText = document.querySelector('.market-indicator span');
                    const marketTimeEl = document.querySelector('.market-time');
                    
                    if (marketIndicator && statusDot && marketStatusText && marketTimeEl) {
                        if (isMarketOpen) {
                            statusDot.className = 'status-dot active';
                            marketStatusText.textContent = 'Market Open';
                            marketIndicator.style.color = '#10b981';
                        } else {
                            statusDot.className = 'status-dot inactive';
                            marketStatusText.textContent = 'Market Closed';
                            marketIndicator.style.color = '#ef4444';
                        }
                        
                        // Update with current IST time
                        const istTime = new Date().toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                        });
                        marketTimeEl.textContent = `${istTime} IST`;
                    }
                    
                    console.log(`Yahoo API Market Status: ${marketState}, Is Open: ${isMarketOpen}`);
                    return isMarketOpen;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch market status from Yahoo API:', error);
        }
        
        // Fallback to local time-based calculation
        return this.updateMarketStatus();
    }

    // Load data from APIs
    async loadDataFromAPIs() {
        try {
            // Load portfolio data
            const portfolioResponse = await fetch('/api/portfolio');
            if (portfolioResponse.ok) {
                this.dummyData.portfolio = await portfolioResponse.json();
            }

            // Load watchlist data
            const watchlistResponse = await fetch('/api/watchlist');
            if (watchlistResponse.ok) {
                this.dummyData.watchlist = await watchlistResponse.json();
            }

            // Load closed positions data
            const closedPositionsResponse = await fetch('/api/closed-positions');
            if (closedPositionsResponse.ok) {
                this.dummyData.closedPositions = await closedPositionsResponse.json();
            }

            console.log('Data loaded from APIs:', {
                portfolio: this.dummyData.portfolio.length,
                watchlist: this.dummyData.watchlist.length,
                closedPositions: this.dummyData.closedPositions.length
            });

        } catch (error) {
            console.error('Error loading data from APIs:', error);
            this.showNotification('Failed to load data from server', 'error');
        }
    }

    // Save portfolio data to API
    async savePortfolioData() {
        try {
            const response = await fetch('/api/portfolio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.dummyData.portfolio)
            });

            if (!response.ok) {
                throw new Error('Failed to save portfolio data');
            }

            const result = await response.json();
            console.log('Portfolio data saved:', result);
        } catch (error) {
            console.error('Error saving portfolio data:', error);
            this.showNotification('Failed to save portfolio data', 'error');
        }
    }

    // Save watchlist data to API
    async saveWatchlistData() {
        try {
            const response = await fetch('/api/watchlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.dummyData.watchlist)
            });

            if (!response.ok) {
                throw new Error('Failed to save watchlist data');
            }

            const result = await response.json();
            console.log('Watchlist data saved:', result);
        } catch (error) {
            console.error('Error saving watchlist data:', error);
            this.showNotification('Failed to save watchlist data', 'error');
        }
    }

    // Save closed positions data to API
    async saveClosedPositionsData() {
        try {
            const response = await fetch('/api/closed-positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.dummyData.closedPositions)
            });

            if (!response.ok) {
                throw new Error('Failed to save closed positions data');
            }

            const result = await response.json();
            console.log('Closed positions data saved:', result);
        } catch (error) {
            console.error('Error saving closed positions data:', error);
            this.showNotification('Failed to save closed positions data', 'error');
        }
    }

    // Fetch stock data from Yahoo Finance API
    async fetchStockData(ticker) {
        try {
            const nseSymbol = `${ticker}.NS`;
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            
            // First, get basic stock data
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}`;
            const chartFullUrl = proxyUrl + encodeURIComponent(chartUrl);
            
            const chartResponse = await fetch(chartFullUrl);
            
            if (!chartResponse.ok) {
                throw new Error(`HTTP error! status: ${chartResponse.status}`);
            }
            
            const chartData = await chartResponse.json();
            
            if (!chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
                throw new Error('No chart data found for this ticker');
            }
            
            const result = chartData.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];
            
            const currentPrice = meta.regularMarketPrice || meta.previousClose || quote.close[quote.close.length - 1];
            const previousClose = meta.previousClose;
            
            const dayChange = currentPrice - previousClose;
            const dayChangePercent = (dayChange / previousClose) * 100;
            
            const companyName = meta.longName || meta.shortName || `${ticker} Limited`;
            
            // Now fetch detailed company information including sector
            let sector = 'Unknown';
            try {
                // Try multiple Yahoo Finance endpoints for comprehensive sector data
                const endpoints = [
                    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${nseSymbol}?modules=assetProfile,summaryProfile,industryTrend`,
                    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${nseSymbol}?modules=assetProfile`,
                    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${nseSymbol}`
                ];
                
                for (const endpoint of endpoints) {
                    try {
                        const summaryFullUrl = proxyUrl + encodeURIComponent(endpoint);
                        const summaryResponse = await fetch(summaryFullUrl);
                        
                        if (summaryResponse.ok) {
                            const summaryData = await summaryResponse.json();
                            
                            // Handle quoteSummary response
                            if (summaryData.quoteSummary && summaryData.quoteSummary.result && summaryData.quoteSummary.result.length > 0) {
                                const profile = summaryData.quoteSummary.result[0];
                                
                                // Try to get sector from multiple sources in order of preference
                                if (profile.assetProfile && profile.assetProfile.sector) {
                                    sector = profile.assetProfile.sector;
                                    break;
                                } else if (profile.summaryProfile && profile.summaryProfile.sector) {
                                    sector = profile.summaryProfile.sector;
                                    break;
                                } else if (profile.assetProfile && profile.assetProfile.industry) {
                                    sector = profile.assetProfile.industry;
                                    break;
                                } else if (profile.industryTrend && profile.industryTrend.sector) {
                                    sector = profile.industryTrend.sector;
                                    break;
                                }
                            }
                            
                            // Handle quote response (alternative format)
                            if (summaryData.quoteResponse && summaryData.quoteResponse.result && summaryData.quoteResponse.result.length > 0) {
                                const quote = summaryData.quoteResponse.result[0];
                                if (quote.sector) {
                                    sector = quote.sector;
                                    break;
                                } else if (quote.industry) {
                                    sector = quote.industry;
                                    break;
                                }
                            }
                        }
                    } catch (endpointError) {
                        console.warn(`Endpoint ${endpoint} failed:`, endpointError.message);
                        continue; // Try next endpoint
                    }
                }
                
                // If still no sector found, try one more alternative approach
                if (sector === 'Unknown') {
                    try {
                        const alternativeUrl = `https://finance.yahoo.com/quote/${nseSymbol}/profile`;
                        const alternativeFullUrl = proxyUrl + encodeURIComponent(alternativeUrl);
                        const alternativeResponse = await fetch(alternativeFullUrl);
                        
                        if (alternativeResponse.ok) {
                            const htmlContent = await alternativeResponse.text();
                            // Try to extract sector from HTML content using regex
                            const sectorMatch = htmlContent.match(/Sector[^>]*>([^<]+)</i);
                            if (sectorMatch && sectorMatch[1]) {
                                sector = sectorMatch[1].trim();
                            }
                        }
                    } catch (htmlError) {
                        console.warn(`HTML parsing approach failed for ${ticker}:`, htmlError.message);
                    }
                }
                
            } catch (sectorError) {
                console.warn(`Could not fetch sector data for ${ticker}:`, sectorError.message);
                // Keep sector as 'Unknown' - no hardcoded fallback
            }
            
            return {
                name: companyName,
                sector: sector,
                currentPrice: Math.round(currentPrice * 100) / 100,
                dayChange: Math.round(dayChange * 100) / 100,
                dayChangePercent: Math.round(dayChangePercent * 100) / 100
            };
            
        } catch (error) {
            console.error(`Failed to fetch data for ${ticker}:`, error.message);
            throw error;
        }
    }

    // Refresh stock prices using Yahoo Finance API
    async refreshStockPrices() {
        if (this.dummyData.portfolio.length === 0 && this.dummyData.watchlist.length === 0) {
            this.showNotification('No stocks to refresh', 'info');
            return;
        }

        this.showLoadingOverlay('Refreshing stock prices...');
        
        try {
            const allSymbols = [
                ...this.dummyData.portfolio.map(stock => stock.symbol),
                ...this.dummyData.watchlist.map(stock => stock.symbol)
            ];
            
            const uniqueSymbols = [...new Set(allSymbols)];
            let successCount = 0;
            let errorCount = 0;

            for (const symbol of uniqueSymbols) {
                try {
                    const stockData = await this.fetchStockData(symbol);
                    
                    // Update portfolio stocks
                    this.dummyData.portfolio.forEach(stock => {
                        if (stock.symbol === symbol) {
                            stock.currentPrice = stockData.currentPrice;
                            stock.dayChange = stockData.dayChange;
                            stock.dayChangePercent = stockData.dayChangePercent;
                            stock.currentValue = stock.currentPrice * stock.quantity;
                            stock.pl = stock.currentValue - stock.invested;
                            stock.plPercent = Math.round((stock.pl / stock.invested) * 100 * 100) / 100;
                            stock.name = stockData.name; // Update company name
                            stock.sector = stockData.sector; // Update sector from API
                        }
                    });
                    
                    // Update watchlist stocks
                    this.dummyData.watchlist.forEach(stock => {
                        if (stock.symbol === symbol) {
                            stock.currentPrice = stockData.currentPrice;
                            stock.dayChange = stockData.dayChange;
                            stock.dayChangePercent = stockData.dayChangePercent;
                            stock.name = stockData.name; // Update company name
                            stock.sector = stockData.sector; // Update sector from API
                        }
                    });
                    
                    successCount++;
                } catch (error) {
                    console.error(`Failed to refresh ${symbol}:`, error);
                    errorCount++;
                }
            }

            // Save updated data to APIs
            await this.savePortfolioData();
            await this.saveWatchlistData();
            
            // Update UI
            this.renderDashboard();
            this.renderSectionContent(this.currentSection);
            
            if (errorCount === 0) {
                this.showNotification(`Successfully refreshed ${successCount} stocks`, 'success');
            } else {
                this.showNotification(`Refreshed ${successCount} stocks, ${errorCount} failed`, 'warning');
            }
            
        } catch (error) {
            console.error('Error refreshing stock prices:', error);
            this.showNotification('Failed to refresh stock prices', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Generate chart data for demonstrations
    generateChartData(baseValue, points = 30) {
        const data = [];
        let currentValue = baseValue;
        
        for (let i = 0; i < points; i++) {
            const change = (Math.random() - 0.5) * (baseValue * 0.02);
            currentValue += change;
            data.push({
                x: new Date(Date.now() - (points - i) * 24 * 60 * 60 * 1000),
                y: Math.round(currentValue * 100) / 100
            });
        }
        
        return data;
    }

    // Bind all event listeners
    bindEvents() {
        // User profile dropdown
        this.bindUserProfileEvents();

        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Mobile navigation
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.handleFilterChange(e.currentTarget, filter);
            });
        });

        // Time range selectors
        document.querySelectorAll('.range-btn, .control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleTimeRangeChange(e.currentTarget);
            });
        });

        // Search functionality
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleSearch(e.target);
            });
        });

        // Button interactions
        document.querySelectorAll('.btn, .holding-btn, .watchlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleButtonClick(e.currentTarget);
            });
        });

        // Modal event listeners
        this.bindModalEvents();

        // Card hover effects
        document.querySelectorAll('.dashboard-card, .holding-card, .watchlist-card').forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                this.handleCardHover(e.currentTarget, true);
            });
            
            card.addEventListener('mouseleave', (e) => {
                this.handleCardHover(e.currentTarget, false);
            });
        });

        // Responsive sidebar toggle
        this.setupResponsiveNavigation();
    }

    // Setup responsive navigation
    setupResponsiveNavigation() {
        // Add hamburger menu for mobile
        const navBrand = document.querySelector('.nav-brand');
        if (navBrand && window.innerWidth <= 1200) {
            const hamburger = document.createElement('button');
            hamburger.className = 'hamburger-btn';
            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
            hamburger.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('open');
            });
            navBrand.appendChild(hamburger);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Handle window resize
    handleResize() {
        if (this.charts.portfolioValue) {
            this.charts.portfolioValue.resize();
        }
        if (this.charts.sectorChart) {
            this.charts.sectorChart.resize();
        }
    }

    // Show specific section
    showSection(sectionName) {
        // Update current section
        this.currentSection = sectionName;

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation states
        this.updateNavigationState(sectionName);

        // Render section-specific content
        this.renderSectionContent(sectionName);
    }

    // Update navigation active states
    updateNavigationState(activeSection) {
        // Update sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            }
        });

        // Update mobile nav
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            }
        });
    }

    // Render section-specific content
    renderSectionContent(sectionName) {
        switch (sectionName) {
            case 'overview':
                this.renderOverview();
                break;
            case 'holdings':
                this.renderHoldings();
                break;
            case 'watchlist':
                this.renderWatchlist();
                break;
            case 'closed-positions':
                this.renderClosedPositions();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            default:
                console.log(`Rendering ${sectionName} section`);
        }
    }

    // Render main dashboard overview
    renderDashboard() {
        this.updatePortfolioSummary();
        this.updateMarketIndices();
        this.updateTopPerformers();
        this.updateRecentActivity();
        this.updateMarketNews();
        this.updateSidebarStats();
    }

    // Update portfolio summary cards
    updatePortfolioSummary() {
        const totalInvested = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.invested, 0);
        const totalCurrentValue = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        const totalPL = totalCurrentValue - totalInvested;
        const totalPLPercent = (totalPL / totalInvested) * 100;
        const todaysPL = this.dummyData.portfolio.reduce((sum, stock) => 
            sum + (stock.dayChange * stock.quantity), 0);

        // Update main value
        const mainValueEl = document.querySelector('.main-value');
        if (mainValueEl) {
            mainValueEl.textContent = this.formatCurrency(totalCurrentValue);
        }

        // Update value change
        const valueChangeEl = document.querySelector('.value-change');
        if (valueChangeEl) {
            const changeClass = todaysPL >= 0 ? 'positive' : 'negative';
            const changeIcon = todaysPL >= 0 ? 'trending-up' : 'trending-down';
            valueChangeEl.className = `value-change ${changeClass}`;
            valueChangeEl.innerHTML = `
                <i class="fas fa-${changeIcon}"></i>
                <span>${todaysPL >= 0 ? '+' : ''}${this.formatCurrency(todaysPL)} (${(todaysPL/totalCurrentValue*100).toFixed(2)}%) today</span>
            `;
        }

        // Update summary stats
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Total Invested</span>
                    <span class="stat-value">${this.formatCurrency(totalInvested)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Current Value</span>
                    <span class="stat-value">${this.formatCurrency(totalCurrentValue)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Gains</span>
                    <span class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(totalPL)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Overall Return</span>
                    <span class="stat-value ${totalPLPercent >= 0 ? 'positive' : 'negative'}">${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%</span>
                </div>
            `;
        }
    }

    // Update market indices
    updateMarketIndices() {
        Object.keys(this.dummyData.marketIndices).forEach(index => {
            const data = this.dummyData.marketIndices[index];
            const card = document.querySelector(`.index-card.${index}`);
            
            if (card) {
                const valueEl = card.querySelector('.value');
                const changeEl = card.querySelector('.change');
                
                if (valueEl) {
                    valueEl.textContent = this.formatNumber(data.value);
                }
                
                if (changeEl) {
                    const changeClass = data.change >= 0 ? 'positive' : 'negative';
                    const changeIcon = data.change >= 0 ? 'arrow-up' : 'arrow-down';
                    changeEl.className = `change ${changeClass}`;
                    changeEl.innerHTML = `
                        <i class="fas fa-${changeIcon}"></i>
                        <span>${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)</span>
                    `;
                }
            }
        });
    }

    // Update top performers
    updateTopPerformers() {
        const performersList = document.getElementById('topPerformersList');
        if (!performersList) return;

        // Check if portfolio is empty
        if (this.dummyData.portfolio.length === 0) {
            performersList.innerHTML = this.renderEmptyState('performers');
            return;
        }

        const topPerformers = [...this.dummyData.portfolio]
            .sort((a, b) => b.dayChangePercent - a.dayChangePercent)
            .slice(0, 3);

        performersList.innerHTML = topPerformers.map(stock => `
            <div class="performer-item">
                <div class="performer-info">
                    <div class="performer-symbol">${stock.symbol}</div>
                    <div class="performer-name">${stock.name}</div>
                </div>
                <div class="performer-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                    ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%
                </div>
            </div>
        `).join('');
    }

    // Update recent activity
    updateRecentActivity() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        // Check if portfolio is empty (no activity to show)
        if (this.dummyData.portfolio.length === 0 && this.dummyData.watchlist.length === 0 && this.dummyData.closedPositions.length === 0) {
            activityList.innerHTML = this.renderEmptyState('activity');
            return;
        }

        const activities = [
            {
                type: 'buy',
                title: 'Bought HDFC Bank',
                subtitle: '50 shares at ₹1,650',
                time: '2h ago'
            },
            {
                type: 'sell',
                title: 'Sold Wipro',
                subtitle: '100 shares at ₹425',
                time: '1d ago'
            },
            {
                type: 'watchlist',
                title: 'Added to Watchlist',
                subtitle: 'Asian Paints',
                time: '2d ago'
            }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${activity.type === 'buy' ? 'arrow-up' : activity.type === 'sell' ? 'arrow-down' : 'eye'}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${activity.subtitle}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }

    // Update market news
    updateMarketNews() {
        const newsList = document.querySelector('.news-list');
        if (newsList) {
            newsList.innerHTML = this.dummyData.news.map(news => `
                <div class="news-item">
                    <div class="news-title">${news.title}</div>
                    <div class="news-subtitle">${news.subtitle}</div>
                    <div class="news-time">${news.time}</div>
                </div>
            `).join('');
        }
    }

    // Update sidebar quick stats
    updateSidebarStats() {
        const totalValue = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        const todaysPL = this.dummyData.portfolio.reduce((sum, stock) => 
            sum + (stock.dayChange * stock.quantity), 0);
        const totalInvested = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.invested, 0);
        const overallReturn = ((totalValue - totalInvested) / totalInvested) * 100;

        // Update holdings count
        const holdingsCount = document.querySelector('.holdings-count');
        if (holdingsCount) {
            holdingsCount.textContent = this.dummyData.portfolio.length;
        }

        // Update watchlist count
        const watchlistCount = document.querySelector('.watchlist-count');
        if (watchlistCount) {
            watchlistCount.textContent = this.dummyData.watchlist.length;
        }

        // Update closed positions count
        const closedCount = document.querySelector('.closed-count');
        if (closedCount) {
            closedCount.textContent = this.dummyData.closedPositions.length;
        }

        // Update quick stats
        const quickStats = document.querySelectorAll('.quick-stat');
        if (quickStats.length >= 3) {
            quickStats[0].querySelector('.stat-value').textContent = this.formatCurrency(totalValue, true);
            
            const todaysPLEl = quickStats[1].querySelector('.stat-value');
            todaysPLEl.textContent = `${todaysPL >= 0 ? '+' : ''}${this.formatCurrency(todaysPL, true)}`;
            todaysPLEl.className = `stat-value ${todaysPL >= 0 ? 'positive' : 'negative'}`;
            
            const overallReturnEl = quickStats[2].querySelector('.stat-value');
            overallReturnEl.textContent = `${overallReturn >= 0 ? '+' : ''}${overallReturn.toFixed(1)}%`;
            overallReturnEl.className = `stat-value ${overallReturn >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // Render overview section
    renderOverview() {
        this.renderDashboard();
        setTimeout(() => {
            this.initializeCharts();
        }, 100);
    }

    // Render empty state
    renderEmptyState(type) {
        const emptyStates = {
            holdings: `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <div class="empty-state-content">
                        <h3>No Holdings Yet</h3>
                        <p>Start building your portfolio by adding your first stock investment.</p>
                        <button class="btn btn-primary" onclick="portfolioProDemo.showAddStockModal()">
                            <i class="fas fa-plus"></i>
                            Add Your First Stock
                        </button>
                    </div>
                </div>
            `,
            watchlist: `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="empty-state-content">
                        <h3>No Stocks in Watchlist</h3>
                        <p>Add stocks to your watchlist to track their performance and get insights.</p>
                        <button class="btn btn-primary" onclick="portfolioProDemo.showAddWatchlistModal()">
                            <i class="fas fa-plus"></i>
                            Add to Watchlist
                        </button>
                    </div>
                </div>
            `,
            closedPositions: `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="empty-state-content">
                        <h3>No Closed Positions</h3>
                        <p>Your completed trades and sold positions will appear here.</p>
                        <button class="btn btn-secondary" onclick="portfolioProDemo.showSection('holdings')">
                            <i class="fas fa-chart-pie"></i>
                            View Holdings
                        </button>
                    </div>
                </div>
            `,
            performers: `
                <div class="empty-state-small">
                    <div class="empty-state-icon-small">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="empty-state-text">
                        <p>Add stocks to see top performers</p>
                    </div>
                </div>
            `,
            activity: `
                <div class="empty-state-small">
                    <div class="empty-state-icon-small">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="empty-state-text">
                        <p>Your trading activity will appear here</p>
                    </div>
                </div>
            `
        };
        
        return emptyStates[type] || '';
    }

    // Render holdings section
    renderHoldings() {
        const holdingsGrid = document.getElementById('holdingsGrid');
        if (!holdingsGrid) return;

        // Check if portfolio is empty
        if (this.dummyData.portfolio.length === 0) {
            holdingsGrid.innerHTML = this.renderEmptyState('holdings');
            return;
        }

        holdingsGrid.innerHTML = this.dummyData.portfolio.map(stock => `
            <div class="holding-card" data-stock-id="${stock.id}">
                <div class="holding-header">
                    <div class="holding-info">
                        <div class="holding-symbol">${stock.symbol}</div>
                        <div class="holding-name">${stock.name}</div>
                    </div>
                    <div class="holding-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%
                    </div>
                </div>
                <div class="holding-stats">
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Price</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentPrice)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Quantity</div>
                        <div class="holding-stat-value">${stock.quantity}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Invested</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.invested)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Value</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentValue)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L</div>
                        <div class="holding-stat-value ${stock.pl >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(stock.pl)}
                        </div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L %</div>
                        <div class="holding-stat-value ${stock.plPercent >= 0 ? 'positive' : 'negative'}">
                            ${stock.plPercent >= 0 ? '+' : ''}${stock.plPercent.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div class="holding-actions">
                    <button class="holding-btn" onclick="portfolioProDemo.showEditStockModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="holding-btn primary" onclick="portfolioProDemo.showSellStockModal(${stock.id})">
                        <i class="fas fa-arrow-down"></i>
                        Sell
                    </button>
                    <button class="holding-btn danger" onclick="portfolioProDemo.showDeleteConfirmation(${stock.id}, '${stock.symbol}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render watchlist section
    renderWatchlist() {
        const watchlistGrid = document.getElementById('watchlistGrid');
        if (!watchlistGrid) return;

        // Check if watchlist is empty
        if (this.dummyData.watchlist.length === 0) {
            watchlistGrid.innerHTML = this.renderEmptyState('watchlist');
            return;
        }

        watchlistGrid.innerHTML = this.dummyData.watchlist.map(stock => `
            <div class="watchlist-card" data-stock-id="${stock.id}">
                <div class="watchlist-header">
                    <div class="watchlist-info">
                        <div class="watchlist-symbol">${stock.symbol}</div>
                        <div class="watchlist-name">${stock.name}</div>
                    </div>
                    <div class="watchlist-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%
                    </div>
                </div>
                <div class="watchlist-stats">
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Current Price</div>
                        <div class="watchlist-stat-value">${this.formatCurrency(stock.currentPrice)}</div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Day Change</div>
                        <div class="watchlist-stat-value ${stock.dayChange >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(stock.dayChange)}
                        </div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Target Price</div>
                        <div class="watchlist-stat-value">
                            ${stock.targetPrice ? this.formatCurrency(stock.targetPrice) : 'Not set'}
                        </div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Stop Loss</div>
                        <div class="watchlist-stat-value">
                            ${stock.stopLoss ? this.formatCurrency(stock.stopLoss) : 'Not set'}
                        </div>
                    </div>
                </div>
                <div class="watchlist-actions">
                    <button class="watchlist-btn success" onclick="portfolioProDemo.showBuyFromWatchlistModal(${stock.id})">
                        <i class="fas fa-plus"></i>
                        Buy
                    </button>
                    <button class="watchlist-btn" onclick="portfolioProDemo.showEditWatchlistModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="watchlist-btn danger" onclick="portfolioProDemo.showRemoveWatchlistConfirmation(${stock.id}, '${stock.symbol}')">
                        <i class="fas fa-eye-slash"></i>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render closed positions section
    renderClosedPositions() {
        const closedPositionsGrid = document.getElementById('closedPositionsGrid');
        if (!closedPositionsGrid) return;

        // Update closed positions summary
        this.updateClosedPositionsSummary();

        closedPositionsGrid.innerHTML = this.dummyData.closedPositions.map(position => `
            <div class="closed-position-card ${position.pl >= 0 ? 'profit' : 'loss'}" data-position-id="${position.id}">
                <div class="closed-header">
                    <div class="closed-info">
                        <div class="closed-symbol">${position.symbol}</div>
                        <div class="closed-name">${position.name}</div>
                    </div>
                    <div class="closed-pl ${position.pl >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${position.pl >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${position.pl >= 0 ? '+' : ''}${position.plPercent.toFixed(2)}%
                    </div>
                </div>
                <div class="closed-stats">
                    <div class="closed-stat">
                        <div class="closed-stat-label">Buy Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.buyPrice)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Sell Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.sellPrice)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Quantity</div>
                        <div class="closed-stat-value">${position.quantity}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Invested</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.invested)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Realized</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.realized)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">P&L</div>
                        <div class="closed-stat-value ${position.pl >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(position.pl)}
                        </div>
                    </div>
                </div>
                <div class="closed-dates">
                    <div class="closed-date-item">
                        <div class="closed-date-label">Buy Date</div>
                        <div class="closed-date-value">${new Date(position.buyDate).toLocaleDateString()}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Sell Date</div>
                        <div class="closed-date-value">${new Date(position.sellDate).toLocaleDateString()}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Holding Period</div>
                        <div class="closed-date-value">${position.holdingPeriod} days</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update closed positions summary
    updateClosedPositionsSummary() {
        const totalRealized = this.dummyData.closedPositions.reduce((sum, pos) => sum + pos.realized, 0);
        const totalProfit = this.dummyData.closedPositions.reduce((sum, pos) => sum + pos.pl, 0);
        const totalPositions = this.dummyData.closedPositions.length;
        
        // Calculate average return
        const totalInvested = this.dummyData.closedPositions.reduce((sum, pos) => sum + pos.invested, 0);
        const averageReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        // Update summary cards in closed positions section
        const summaryCards = document.querySelectorAll('.closed-summary-grid .main-value');
        if (summaryCards.length >= 2) {
            summaryCards[0].textContent = this.formatCurrency(totalRealized);
            summaryCards[1].textContent = this.formatCurrency(totalProfit);
            summaryCards[1].className = `main-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
        }

        // Update the dynamic text content in the summary cards
        const valueChangeElements = document.querySelectorAll('.closed-summary-grid .value-change');
        if (valueChangeElements.length >= 2) {
            // Update positions count
            valueChangeElements[0].innerHTML = `
                <i class="fas fa-trending-up"></i>
                <span>${totalPositions} positions closed</span>
            `;
            
            // Update average return
            valueChangeElements[1].innerHTML = `
                <i class="fas fa-percentage"></i>
                <span>${averageReturn >= 0 ? '+' : ''}${averageReturn.toFixed(1)}% average return</span>
            `;
        }
    }

    // Render analytics section
    renderAnalytics() {
        console.log('Rendering analytics section with advanced charts');
        setTimeout(() => {
            this.initializeAnalyticsCharts();
        }, 100);
    }

    // Initialize all charts
    initializeCharts() {
        this.initializeHeroChart();
        this.initializePortfolioValueChart();
        this.initializeSectorChart();
        this.initializeIndexCharts();
    }

    // Initialize hero portfolio chart
    initializeHeroChart() {
        const canvas = document.getElementById('heroPortfolioChart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.charts.heroChart) {
            this.charts.heroChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const portfolioData = this.generatePortfolioTrendData();

        this.charts.heroChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: portfolioData.labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: portfolioData.values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Initialize portfolio value chart
    initializePortfolioValueChart() {
        const canvas = document.getElementById('portfolioValueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const portfolioData = this.generatePortfolioTrendData();

        this.charts.portfolioValue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: portfolioData.labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: portfolioData.values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                }
            }
        });
    }

    // Initialize sector allocation chart
    initializeSectorChart() {
        const canvas = document.getElementById('sectorChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const sectorData = this.calculateSectorAllocation();

        this.charts.sectorChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sectorData.labels,
                datasets: [{
                    data: sectorData.values,
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#06b6d4'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
    }

    // Initialize index charts
    initializeIndexCharts() {
        ['nifty', 'sensex', 'banknifty', 'finnifty'].forEach(index => {
            const canvas = document.getElementById(`${index}Chart`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const data = this.dummyData.marketIndices[index].data;

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.x),
                    datasets: [{
                        data: data.map(d => d.y),
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            display: false
                        }
                    }
                }
            });
        });
    }

    // Initialize analytics charts
    initializeAnalyticsCharts() {
        this.initializePerformanceChart();
    }

    // Initialize performance chart
    initializePerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const performanceData = this.generatePerformanceData();

        this.charts.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: performanceData.labels,
                datasets: [{
                    label: 'Portfolio',
                    data: performanceData.portfolio,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4
                }, {
                    label: 'Nifty 50',
                    data: performanceData.benchmark,
                    borderColor: '#6b7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // Generate portfolio trend data
    generatePortfolioTrendData() {
        const labels = [];
        const values = [];
        const totalValue = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            
            const variation = (Math.random() - 0.5) * 0.1;
            const value = totalValue * (1 + variation);
            values.push(Math.round(value));
        }
        
        return { labels, values };
    }

    // Calculate sector allocation
    calculateSectorAllocation() {
        const sectorTotals = {};
        const totalValue = this.dummyData.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        
        this.dummyData.portfolio.forEach(stock => {
            if (!sectorTotals[stock.sector]) {
                sectorTotals[stock.sector] = 0;
            }
            sectorTotals[stock.sector] += stock.currentValue;
        });
        
        const labels = Object.keys(sectorTotals);
        const values = labels.map(sector => 
            Math.round((sectorTotals[sector] / totalValue) * 100)
        );
        
        return { labels, values };
    }

    // Generate performance data
    generatePerformanceData() {
        const labels = [];
        const portfolio = [];
        const benchmark = [];
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            
            const portfolioReturn = Math.random() * 20 - 5; // -5% to 15%
            const benchmarkReturn = Math.random() * 15 - 3; // -3% to 12%
            
            portfolio.push(portfolioReturn);
            benchmark.push(benchmarkReturn);
        }
        
        return { labels, portfolio, benchmark };
    }

    // Handle filter changes
    handleFilterChange(element, filter) {
        // Update active state
        element.parentElement.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        element.classList.add('active');
        
        // Apply filter logic based on current section
        console.log(`Applying filter: ${filter} in section: ${this.currentSection}`);
        
        // Get current search term
        const searchInput = document.querySelector(`#${this.currentSection}-section input[type="text"]`);
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        // Apply filter with current search term
        if (this.currentSection === 'holdings') {
            this.filterHoldings(searchTerm);
        } else if (this.currentSection === 'watchlist') {
            this.filterWatchlist(searchTerm);
        } else if (this.currentSection === 'closed-positions') {
            this.filterClosedPositions(searchTerm);
        }
    }

    // Handle time range changes
    handleTimeRangeChange(element) {
        // Update active state
        element.parentElement.querySelectorAll('.range-btn, .control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');
        
        const range = element.dataset.range || element.dataset.period;
        console.log(`Time range changed to: ${range}`);
        
        // Update charts with new time range
        this.updateChartsForTimeRange(range);
    }

    // Update charts for time range
    updateChartsForTimeRange(range) {
        // This would typically fetch new data based on the time range
        console.log(`Updating charts for time range: ${range}`);
    }

    // Handle search functionality
    handleSearch(input) {
        const searchTerm = input.value.toLowerCase();
        const section = this.currentSection;
        
        console.log(`Searching for: ${searchTerm} in section: ${section}`);
        
        // Apply search filter based on current section
        if (section === 'holdings') {
            this.filterHoldings(searchTerm);
        } else if (section === 'watchlist') {
            this.filterWatchlist(searchTerm);
        } else if (section === 'closed-positions') {
            this.filterClosedPositions(searchTerm);
        }
    }

    // Filter holdings with current filter tab consideration
    filterHoldings(searchTerm = '') {
        const activeFilter = document.querySelector('.holdings-section .filter-tab.active')?.dataset.filter || 'all';
        let filteredData = [...this.dummyData.portfolio];
        
        // Apply filter tab logic
        if (activeFilter === 'gainers') {
            filteredData = filteredData.filter(stock => stock.pl > 0);
        } else if (activeFilter === 'losers') {
            filteredData = filteredData.filter(stock => stock.pl < 0);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredData = filteredData.filter(stock => 
                stock.symbol.toLowerCase().includes(searchTerm) || 
                stock.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Re-render with filtered data
        this.renderFilteredHoldings(filteredData);
    }

    // Filter watchlist with current filter tab consideration
    filterWatchlist(searchTerm = '') {
        const activeFilter = document.querySelector('.watchlist-section .filter-tab.active')?.dataset.filter || 'all';
        let filteredData = [...this.dummyData.watchlist];
        
        // Apply filter tab logic
        if (activeFilter === 'gainers') {
            filteredData = filteredData.filter(stock => stock.dayChange > 0);
        } else if (activeFilter === 'losers') {
            filteredData = filteredData.filter(stock => stock.dayChange < 0);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredData = filteredData.filter(stock => 
                stock.symbol.toLowerCase().includes(searchTerm) || 
                stock.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Re-render with filtered data
        this.renderFilteredWatchlist(filteredData);
    }

    // Filter closed positions with current filter tab consideration
    filterClosedPositions(searchTerm = '') {
        const activeFilter = document.querySelector('.closed-positions-section .filter-tab.active')?.dataset.filter || 'all';
        let filteredData = [...this.dummyData.closedPositions];
        
        // Apply filter tab logic
        if (activeFilter === 'profit') {
            filteredData = filteredData.filter(position => position.pl > 0);
        } else if (activeFilter === 'loss') {
            filteredData = filteredData.filter(position => position.pl < 0);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredData = filteredData.filter(position => 
                position.symbol.toLowerCase().includes(searchTerm) || 
                position.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Re-render with filtered data
        this.renderFilteredClosedPositions(filteredData);
    }

    // Handle button clicks
    handleButtonClick(button) {
        const buttonText = button.textContent.trim();
        console.log(`Button clicked: ${buttonText}`);
        
        // Add click animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        // Show notification for demo purposes
        this.showNotification(`${buttonText} functionality coming soon!`, 'info');
    }

    // Handle card hover effects
    handleCardHover(card, isHovering) {
        if (isHovering) {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        } else {
            card.style.transform = '';
            card.style.boxShadow = '';
        }
    }

    // Start animations
    startAnimations() {
        // Animate counters
        this.animateCounters();
        
        // Start periodic updates
        setInterval(() => {
            this.updateRealTimeData();
        }, 30000); // Update every 30 seconds
        
        // Update market status every minute
        setInterval(() => {
            this.fetchMarketStatus();
        }, 60000); // Update every 60 seconds
    }

    // Animate counters
    animateCounters() {
        const counters = document.querySelectorAll('.main-value, .stat-value');
        counters.forEach(counter => {
            const target = parseFloat(counter.textContent.replace(/[₹,]/g, ''));
            if (isNaN(target)) return;
            
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (counter.classList.contains('main-value')) {
                    counter.textContent = this.formatCurrency(current);
                } else {
                    counter.textContent = this.formatCurrency(current);
                }
            }, 20);
        });
    }

    // Update real-time data
    updateRealTimeData() {
        // Simulate real-time price updates
        this.dummyData.portfolio.forEach(stock => {
            const change = (Math.random() - 0.5) * 0.02; // ±2% change
            stock.currentPrice *= (1 + change);
            stock.dayChange = stock.currentPrice - (stock.currentPrice / (1 + change));
            stock.dayChangePercent = (stock.dayChange / (stock.currentPrice - stock.dayChange)) * 100;
            stock.currentValue = stock.currentPrice * stock.quantity;
            stock.pl = stock.currentValue - stock.invested;
            stock.plPercent = (stock.pl / stock.invested) * 100;
        });
        
        // Update watchlist
        this.dummyData.watchlist.forEach(stock => {
            const change = (Math.random() - 0.5) * 0.02;
            stock.currentPrice *= (1 + change);
            stock.dayChange = stock.currentPrice * change;
            stock.dayChangePercent = change * 100;
        });
        
        // Update market indices
        Object.keys(this.dummyData.marketIndices).forEach(index => {
            const data = this.dummyData.marketIndices[index];
            const change = (Math.random() - 0.5) * 0.01;
            data.value *= (1 + change);
            data.change = data.value * change;
            data.changePercent = change * 100;
        });
        
        // Re-render current section
        this.renderSectionContent(this.currentSection);
    }

    // Utility functions
    formatCurrency(amount, short = false) {
        if (short && Math.abs(amount) >= 1000) {
            if (Math.abs(amount) >= 10000000) {
                return `₹${(amount / 10000000).toFixed(1)}Cr`;
            } else if (Math.abs(amount) >= 100000) {
                return `₹${(amount / 100000).toFixed(1)}L`;
            } else {
                return `₹${(amount / 1000).toFixed(1)}K`;
            }
        }
        
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 350px;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    getNotificationColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
        };
        return colors[type] || colors.info;
    }

    // Bind modal event listeners
    bindModalEvents() {
        // Set default purchase date to today
        const today = new Date().toISOString().split('T')[0];
        const purchaseDateInput = document.getElementById('purchaseDate');
        if (purchaseDateInput) {
            purchaseDateInput.value = today;
        }

        // Add Stock button events
        const addStockBtns = document.querySelectorAll('#addStockBtn, #addHoldingBtn');
        addStockBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showAddStockModal());
        });

        // Add Watchlist button events
        const addWatchlistBtns = document.querySelectorAll('#addWatchlistBtn');
        addWatchlistBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showAddWatchlistModal());
        });

        // Refresh button event
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshStockPrices());

        // Modal close events
        document.getElementById('closeBuyFromWatchlistModal')?.addEventListener('click', () => this.hideBuyFromWatchlistModal());
        document.getElementById('cancelBuyFromWatchlist')?.addEventListener('click', () => this.hideBuyFromWatchlistModal());
        document.getElementById('closeAddStockModal')?.addEventListener('click', () => this.hideAddStockModal());
        document.getElementById('cancelAddStock')?.addEventListener('click', () => this.hideAddStockModal());
        document.getElementById('closeEditStockModal')?.addEventListener('click', () => this.hideEditStockModal());
        document.getElementById('cancelEditStock')?.addEventListener('click', () => this.hideEditStockModal());
        document.getElementById('closeEditWatchlistModal')?.addEventListener('click', () => this.hideEditWatchlistModal());
        document.getElementById('cancelEditWatchlist')?.addEventListener('click', () => this.hideEditWatchlistModal());
        document.getElementById('closeSellStockModal')?.addEventListener('click', () => this.hideSellStockModal());
        document.getElementById('cancelSellStock')?.addEventListener('click', () => this.hideSellStockModal());
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => this.hideDeleteConfirmation());
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.hideDeleteConfirmation());
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.handleDeleteStock());
        document.getElementById('closeRemoveWatchlistModal')?.addEventListener('click', () => this.hideRemoveWatchlistConfirmation());
        document.getElementById('cancelRemoveWatchlist')?.addEventListener('click', () => this.hideRemoveWatchlistConfirmation());
        document.getElementById('confirmRemoveWatchlist')?.addEventListener('click', () => this.handleRemoveWatchlist());
        document.getElementById('closeAddWatchlistModal')?.addEventListener('click', () => this.hideAddWatchlistModal());
        document.getElementById('cancelAddWatchlist')?.addEventListener('click', () => this.hideAddWatchlistModal());

        // Form submit events
        document.getElementById('buyFromWatchlistForm')?.addEventListener('submit', (e) => this.handleBuyFromWatchlist(e));
        document.getElementById('addStockForm')?.addEventListener('submit', (e) => this.handleAddStock(e));
        document.getElementById('editStockForm')?.addEventListener('submit', (e) => this.handleEditStock(e));
        document.getElementById('editWatchlistForm')?.addEventListener('submit', (e) => this.handleEditWatchlist(e));
        document.getElementById('sellStockForm')?.addEventListener('submit', (e) => this.handleSellStock(e));
        document.getElementById('addWatchlistForm')?.addEventListener('submit', (e) => this.handleAddWatchlist(e));

        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideAllModals();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    // Show Add Stock Modal
    showAddStockModal() {
        const modal = document.getElementById('addStockModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Set default date
            const today = new Date().toISOString().split('T')[0];
            const purchaseDateInput = document.getElementById('purchaseDate');
            if (purchaseDateInput) {
                purchaseDateInput.value = today;
            }
        }
    }

    // Hide Add Stock Modal
    hideAddStockModal() {
        const modal = document.getElementById('addStockModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form
            const form = document.getElementById('addStockForm');
            if (form) {
                form.reset();
            }
        }
    }

    // Show Add Watchlist Modal
    showAddWatchlistModal() {
        const modal = document.getElementById('addWatchlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Hide Add Watchlist Modal
    hideAddWatchlistModal() {
        const modal = document.getElementById('addWatchlistModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form
            const form = document.getElementById('addWatchlistForm');
            if (form) {
                form.reset();
            }
        }
    }

    // Hide all modals
    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // Handle Add Stock form submission
    async handleAddStock(e) {
        e.preventDefault();
        
        const symbol = document.getElementById('stockSymbol').value.toUpperCase().trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const buyPrice = parseFloat(document.getElementById('buyPrice').value);
        const targetPrice = parseFloat(document.getElementById('targetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('stopLoss').value) || null;
        const purchaseDate = document.getElementById('purchaseDate').value;

        if (!symbol || !quantity || !buyPrice || !purchaseDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Check if stock already exists
        if (this.dummyData.portfolio.find(stock => stock.symbol === symbol)) {
            this.showNotification('Stock already exists in portfolio!', 'warning');
            return;
        }

        this.showLoadingOverlay('Fetching stock data...');

        try {
            // Fetch real stock data from Yahoo Finance API
            const stockData = await this.fetchStockData(symbol);
            
            const newStock = {
                id: Date.now(),
                symbol: symbol,
                name: stockData.name,
                sector: stockData.sector,
                quantity: quantity,
                buyPrice: buyPrice,
                currentPrice: stockData.currentPrice,
                invested: buyPrice * quantity,
                currentValue: stockData.currentPrice * quantity,
                dayChange: stockData.dayChange,
                dayChangePercent: stockData.dayChangePercent,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                purchaseDate: purchaseDate
            };

            // Calculate P&L
            newStock.pl = newStock.currentValue - newStock.invested;
            newStock.plPercent = Math.round((newStock.pl / newStock.invested) * 100 * 100) / 100;

            // Add to portfolio
            this.dummyData.portfolio.push(newStock);
            
            // Save to API
            await this.savePortfolioData();
            
            // Update UI
            this.renderDashboard();
            if (this.currentSection === 'holdings') {
                this.renderHoldings();
            }
            
            this.hideAddStockModal();
            this.showNotification(`${symbol} added to portfolio successfully!`, 'success');
            
        } catch (error) {
            console.error('Error adding stock:', error);
            this.showNotification('Error fetching stock data. Please check the ticker symbol.', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Handle Add Watchlist form submission
    async handleAddWatchlist(e) {
        e.preventDefault();
        
        const symbol = document.getElementById('watchlistSymbol').value.toUpperCase().trim();
        const targetPrice = parseFloat(document.getElementById('watchlistTargetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('watchlistStopLoss').value) || null;
        const notes = document.getElementById('watchlistNotes').value.trim() || null;

        if (!symbol) {
            this.showNotification('Please enter a stock symbol', 'error');
            return;
        }

        // Check if stock already exists in watchlist
        if (this.dummyData.watchlist.find(stock => stock.symbol === symbol)) {
            this.showNotification('Stock already exists in watchlist!', 'warning');
            return;
        }

        this.showLoadingOverlay('Fetching stock data...');

        try {
            // Fetch real stock data from Yahoo Finance API
            const stockData = await this.fetchStockData(symbol);
            
            const newWatchlistItem = {
                id: Date.now(),
                symbol: symbol,
                name: stockData.name,
                sector: stockData.sector,
                currentPrice: stockData.currentPrice,
                dayChange: stockData.dayChange,
                dayChangePercent: stockData.dayChangePercent,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                notes: notes
            };

            // Add to watchlist
            this.dummyData.watchlist.push(newWatchlistItem);
            
            // Save to API
            await this.saveWatchlistData();
            
            // Update UI
            this.updateSidebarStats();
            if (this.currentSection === 'watchlist') {
                this.renderWatchlist();
            }
            
            this.hideAddWatchlistModal();
            this.showNotification(`${symbol} added to watchlist successfully!`, 'success');
            
        } catch (error) {
            console.error('Error adding watchlist stock:', error);
            this.showNotification('Error fetching stock data. Please check the ticker symbol.', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Show Edit Stock Modal
    showEditStockModal(stockId) {
        const stock = this.dummyData.portfolio.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found!', 'error');
            return;
        }

        const modal = document.getElementById('editStockModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Populate form with current stock data
            document.getElementById('editStockSymbol').value = stock.symbol;
            document.getElementById('editQuantity').value = stock.quantity;
            document.getElementById('editBuyPrice').value = stock.buyPrice;
            document.getElementById('editTargetPrice').value = stock.targetPrice || '';
            document.getElementById('editStopLoss').value = stock.stopLoss || '';
            document.getElementById('editPurchaseDate').value = stock.purchaseDate;
            
            // Store the stock ID for later use
            this.editingStockId = stockId;
        }
    }

    // Hide Edit Stock Modal
    hideEditStockModal() {
        const modal = document.getElementById('editStockModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form and clear editing ID
            const form = document.getElementById('editStockForm');
            if (form) {
                form.reset();
            }
            this.editingStockId = null;
        }
    }

    // Handle Edit Stock form submission
    async handleEditStock(e) {
        e.preventDefault();
        
        if (!this.editingStockId) {
            this.showNotification('No stock selected for editing', 'error');
            return;
        }

        const quantity = parseInt(document.getElementById('editQuantity').value);
        const buyPrice = parseFloat(document.getElementById('editBuyPrice').value);
        const targetPrice = parseFloat(document.getElementById('editTargetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('editStopLoss').value) || null;
        const purchaseDate = document.getElementById('editPurchaseDate').value;

        if (!quantity || !buyPrice || !purchaseDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Find and update the stock
        const stockIndex = this.dummyData.portfolio.findIndex(s => s.id === this.editingStockId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in portfolio', 'error');
            return;
        }

        const stock = this.dummyData.portfolio[stockIndex];
        
        // Update stock data
        stock.quantity = quantity;
        stock.buyPrice = buyPrice;
        stock.targetPrice = targetPrice;
        stock.stopLoss = stopLoss;
        stock.purchaseDate = purchaseDate;
        
        // Recalculate values
        stock.invested = buyPrice * quantity;
        stock.currentValue = stock.currentPrice * quantity;
        stock.pl = stock.currentValue - stock.invested;
        stock.plPercent = Math.round((stock.pl / stock.invested) * 100 * 100) / 100;

        // Save updated portfolio to API
        await this.savePortfolioData();

        // Update UI
        this.renderDashboard();
        if (this.currentSection === 'holdings') {
            this.renderHoldings();
        }
        
        this.hideEditStockModal();
        this.showNotification(`${stock.symbol} updated successfully!`, 'success');
    }

    // Show Edit Watchlist Modal
    showEditWatchlistModal(stockId) {
        const stock = this.dummyData.watchlist.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found in watchlist!', 'error');
            return;
        }

        const modal = document.getElementById('editWatchlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Populate form with current watchlist data
            document.getElementById('editWatchlistSymbol').value = stock.symbol;
            document.getElementById('editWatchlistTargetPrice').value = stock.targetPrice || '';
            document.getElementById('editWatchlistStopLoss').value = stock.stopLoss || '';
            document.getElementById('editWatchlistNotes').value = stock.notes || '';
            
            // Store the stock ID for later use
            this.editingWatchlistId = stockId;
        }
    }

    // Hide Edit Watchlist Modal
    hideEditWatchlistModal() {
        const modal = document.getElementById('editWatchlistModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form and clear editing ID
            const form = document.getElementById('editWatchlistForm');
            if (form) {
                form.reset();
            }
            this.editingWatchlistId = null;
        }
    }

    // Handle Edit Watchlist form submission
    async handleEditWatchlist(e) {
        e.preventDefault();
        
        if (!this.editingWatchlistId) {
            this.showNotification('No stock selected for editing', 'error');
            return;
        }

        const targetPrice = parseFloat(document.getElementById('editWatchlistTargetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('editWatchlistStopLoss').value) || null;
        const notes = document.getElementById('editWatchlistNotes').value.trim() || null;

        // Find and update the watchlist stock
        const stockIndex = this.dummyData.watchlist.findIndex(s => s.id === this.editingWatchlistId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in watchlist', 'error');
            return;
        }

        const stock = this.dummyData.watchlist[stockIndex];
        
        // Update watchlist stock data
        stock.targetPrice = targetPrice;
        stock.stopLoss = stopLoss;
        stock.notes = notes;

        // Save to API
        await this.saveWatchlistData();

        // Update UI
        if (this.currentSection === 'watchlist') {
            this.renderWatchlist();
        }
        
        this.hideEditWatchlistModal();
        this.showNotification(`${stock.symbol} watchlist updated successfully!`, 'success');
    }

    // Show Sell Stock Modal
    showSellStockModal(stockId) {
        const stock = this.dummyData.portfolio.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found!', 'error');
            return;
        }

        const modal = document.getElementById('sellStockModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Populate stock info
            const sellStockInfo = document.getElementById('sellStockInfo');
            sellStockInfo.innerHTML = `
                <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 700;">${stock.symbol} - ${stock.name}</h4>
                <div class="sell-info-item">
                    <span class="sell-info-label">Available Quantity</span>
                    <span class="sell-info-value">${stock.quantity} shares</span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Buy Price</span>
                    <span class="sell-info-value">${this.formatCurrency(stock.buyPrice)}</span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Current Price</span>
                    <span class="sell-info-value">${this.formatCurrency(stock.currentPrice)}</span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Current P&L</span>
                    <span class="sell-info-value ${stock.pl >= 0 ? 'positive' : 'negative'}" style="color: ${stock.pl >= 0 ? '#10b981' : '#ef4444'}">
                        ${this.formatCurrency(stock.pl)} (${stock.plPercent >= 0 ? '+' : ''}${stock.plPercent.toFixed(2)}%)
                    </span>
                </div>
            `;
            
            // Set default values
            document.getElementById('sellQuantity').value = stock.quantity;
            document.getElementById('sellQuantity').max = stock.quantity;
            document.getElementById('sellPrice').value = stock.currentPrice.toFixed(2);
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('sellDate').value = today;
            
            // Store the stock ID for later use
            this.sellingStockId = stockId;
            
            // Update sell summary
            this.updateSellSummary();
            
            // Add real-time P&L calculation
            document.getElementById('sellQuantity').addEventListener('input', () => this.updateSellSummary());
            document.getElementById('sellPrice').addEventListener('input', () => this.updateSellSummary());
        }
    }

    // Hide Sell Stock Modal
    hideSellStockModal() {
        const modal = document.getElementById('sellStockModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form and clear selling ID
            const form = document.getElementById('sellStockForm');
            if (form) {
                form.reset();
            }
            this.sellingStockId = null;
        }
    }

    // Update sell summary with P&L calculation
    updateSellSummary() {
        if (!this.sellingStockId) return;
        
        const stock = this.dummyData.portfolio.find(s => s.id === this.sellingStockId);
        if (!stock) return;
        
        const sellQuantity = parseInt(document.getElementById('sellQuantity').value) || 0;
        const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
        
        if (sellQuantity > 0 && sellPrice > 0) {
            const invested = stock.buyPrice * sellQuantity;
            const realized = sellPrice * sellQuantity;
            const pl = realized - invested;
            const plPercent = (pl / invested) * 100;
            
            const sellSummary = document.getElementById('sellSummary');
            sellSummary.innerHTML = `
                <h4>Transaction Summary</h4>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Quantity to Sell</span>
                    <span class="sell-summary-value">${sellQuantity} shares</span>
                </div>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Total Invested</span>
                    <span class="sell-summary-value">${this.formatCurrency(invested)}</span>
                </div>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Total Realized</span>
                    <span class="sell-summary-value">${this.formatCurrency(realized)}</span>
                </div>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Profit/Loss</span>
                    <span class="sell-summary-value ${pl >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(pl)} (${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%)
                    </span>
                </div>
            `;
        }
    }

    // Handle Sell Stock form submission
    async handleSellStock(e) {
        e.preventDefault();
        
        if (!this.sellingStockId) {
            this.showNotification('No stock selected for selling', 'error');
            return;
        }

        const sellQuantity = parseInt(document.getElementById('sellQuantity').value);
        const sellPrice = parseFloat(document.getElementById('sellPrice').value);
        const sellDate = document.getElementById('sellDate').value;
        const sellNotes = document.getElementById('sellNotes').value.trim() || null;

        if (!sellQuantity || !sellPrice || !sellDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Find the stock
        const stockIndex = this.dummyData.portfolio.findIndex(s => s.id === this.sellingStockId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in portfolio', 'error');
            return;
        }

        const stock = this.dummyData.portfolio[stockIndex];
        
        if (sellQuantity > stock.quantity) {
            this.showNotification('Cannot sell more than available quantity', 'error');
            return;
        }

        // Calculate holding period
        const buyDate = new Date(stock.purchaseDate);
        const sellDateObj = new Date(sellDate);
        const holdingPeriod = Math.floor((sellDateObj - buyDate) / (1000 * 60 * 60 * 24));

        // Create closed position
        const closedPosition = {
            id: Date.now(),
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            quantity: sellQuantity,
            buyPrice: stock.buyPrice,
            sellPrice: sellPrice,
            invested: stock.buyPrice * sellQuantity,
            realized: sellPrice * sellQuantity,
            pl: (sellPrice * sellQuantity) - (stock.buyPrice * sellQuantity),
            plPercent: Math.round(((sellPrice - stock.buyPrice) / stock.buyPrice) * 100 * 100) / 100,
            buyDate: stock.purchaseDate,
            sellDate: sellDate,
            holdingPeriod: holdingPeriod,
            notes: sellNotes
        };

        // Add to closed positions
        this.dummyData.closedPositions.push(closedPosition);

        // Update or remove from portfolio
        if (sellQuantity === stock.quantity) {
            // Remove completely
            this.dummyData.portfolio.splice(stockIndex, 1);
        } else {
            // Update remaining quantity
            stock.quantity -= sellQuantity;
            stock.invested = stock.buyPrice * stock.quantity;
            stock.currentValue = stock.currentPrice * stock.quantity;
            stock.pl = stock.currentValue - stock.invested;
            stock.plPercent = Math.round((stock.pl / stock.invested) * 100 * 100) / 100;
        }

        // Save updated data to APIs
        await this.savePortfolioData();
        await this.saveClosedPositionsData();

        // Update UI
        this.renderDashboard();
        if (this.currentSection === 'holdings') {
            this.renderHoldings();
        }
        
        this.hideSellStockModal();
        this.showNotification(`${sellQuantity} shares of ${stock.symbol} sold successfully!`, 'success');
    }

    // Show Delete Confirmation Modal
    showDeleteConfirmation(stockId, stockSymbol) {
        const stock = this.dummyData.portfolio.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found!', 'error');
            return;
        }

        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update modal content
            document.getElementById('deleteTitle').textContent = `Delete ${stockSymbol}`;
            document.getElementById('deleteMessage').textContent = `Are you sure you want to delete ${stockSymbol} from your portfolio? This will permanently remove the stock and all its data. This action cannot be undone.`;
            
            // Populate stock info
            const deleteStockInfo = document.getElementById('deleteStockInfo');
            deleteStockInfo.innerHTML = `
                <div class="stock-info-item">
                    <span class="stock-info-label">Stock Name</span>
                    <span class="stock-info-value">${stock.name}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Quantity</span>
                    <span class="stock-info-value">${stock.quantity} shares</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Invested Amount</span>
                    <span class="stock-info-value">${this.formatCurrency(stock.invested)}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Current Value</span>
                    <span class="stock-info-value">${this.formatCurrency(stock.currentValue)}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Current P&L</span>
                    <span class="stock-info-value" style="color: ${stock.pl >= 0 ? '#10b981' : '#ef4444'}">
                        ${this.formatCurrency(stock.pl)} (${stock.plPercent >= 0 ? '+' : ''}${stock.plPercent.toFixed(2)}%)
                    </span>
                </div>
            `;
            
            // Store the stock ID for deletion
            this.deletingStockId = stockId;
        }
    }

    // Hide Delete Confirmation Modal
    hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.deletingStockId = null;
        }
    }

    // Handle Delete Stock
    async handleDeleteStock() {
        if (!this.deletingStockId) {
            this.showNotification('No stock selected for deletion', 'error');
            return;
        }

        // Find and remove the stock
        const stockIndex = this.dummyData.portfolio.findIndex(s => s.id === this.deletingStockId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in portfolio', 'error');
            return;
        }

        const stock = this.dummyData.portfolio[stockIndex];
        const stockSymbol = stock.symbol;
        
        // Remove from portfolio
        this.dummyData.portfolio.splice(stockIndex, 1);

        // Save updated portfolio to API
        await this.savePortfolioData();

        // Update UI
        this.renderDashboard();
        if (this.currentSection === 'holdings') {
            this.renderHoldings();
        }
        
        this.hideDeleteConfirmation();
        this.showNotification(`${stockSymbol} deleted from portfolio successfully!`, 'success');
    }

    // Show Remove Watchlist Confirmation Modal
    showRemoveWatchlistConfirmation(stockId, stockSymbol) {
        const stock = this.dummyData.watchlist.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found in watchlist!', 'error');
            return;
        }

        const modal = document.getElementById('removeWatchlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update modal content
            document.getElementById('removeWatchlistTitle').textContent = `Remove ${stockSymbol}`;
            document.getElementById('removeWatchlistMessage').textContent = `Are you sure you want to remove ${stockSymbol} from your watchlist? You will no longer track its performance and price movements.`;
            
            // Populate stock info
            const removeWatchlistInfo = document.getElementById('removeWatchlistInfo');
            removeWatchlistInfo.innerHTML = `
                <div class="stock-info-item">
                    <span class="stock-info-label">Stock Name</span>
                    <span class="stock-info-value">${stock.name}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Current Price</span>
                    <span class="stock-info-value">${this.formatCurrency(stock.currentPrice)}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Day Change</span>
                    <span class="stock-info-value" style="color: ${stock.dayChange >= 0 ? '#10b981' : '#ef4444'}">
                        ${this.formatCurrency(stock.dayChange)} (${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%)
                    </span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Target Price</span>
                    <span class="stock-info-value">${stock.targetPrice ? this.formatCurrency(stock.targetPrice) : 'Not set'}</span>
                </div>
                <div class="stock-info-item">
                    <span class="stock-info-label">Stop Loss</span>
                    <span class="stock-info-value">${stock.stopLoss ? this.formatCurrency(stock.stopLoss) : 'Not set'}</span>
                </div>
            `;
            
            // Store the stock ID for removal
            this.removingWatchlistId = stockId;
        }
    }

    // Hide Remove Watchlist Confirmation Modal
    hideRemoveWatchlistConfirmation() {
        const modal = document.getElementById('removeWatchlistModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.removingWatchlistId = null;
        }
    }

    // Handle Remove Watchlist
    async handleRemoveWatchlist() {
        if (!this.removingWatchlistId) {
            this.showNotification('No stock selected for removal', 'error');
            return;
        }

        // Find and remove the stock from watchlist
        const stockIndex = this.dummyData.watchlist.findIndex(s => s.id === this.removingWatchlistId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in watchlist', 'error');
            return;
        }

        const stock = this.dummyData.watchlist[stockIndex];
        const stockSymbol = stock.symbol;
        
        // Remove from watchlist
        this.dummyData.watchlist.splice(stockIndex, 1);

        // Save updated watchlist to API
        await this.saveWatchlistData();

        // Update UI
        this.updateSidebarStats();
        if (this.currentSection === 'watchlist') {
            this.renderWatchlist();
        }
        
        this.hideRemoveWatchlistConfirmation();
        this.showNotification(`${stockSymbol} removed from watchlist successfully!`, 'success');
    }

    // Render filtered holdings
    renderFilteredHoldings(filteredData) {
        const holdingsGrid = document.getElementById('holdingsGrid');
        if (!holdingsGrid) return;

        holdingsGrid.innerHTML = filteredData.map(stock => `
            <div class="holding-card" data-stock-id="${stock.id}">
                <div class="holding-header">
                    <div class="holding-info">
                        <div class="holding-symbol">${stock.symbol}</div>
                        <div class="holding-name">${stock.name}</div>
                    </div>
                    <div class="holding-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%
                    </div>
                </div>
                <div class="holding-stats">
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Price</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentPrice)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Quantity</div>
                        <div class="holding-stat-value">${stock.quantity}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Invested</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.invested)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Value</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentValue)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L</div>
                        <div class="holding-stat-value ${stock.pl >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(stock.pl)}
                        </div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L %</div>
                        <div class="holding-stat-value ${stock.plPercent >= 0 ? 'positive' : 'negative'}">
                            ${stock.plPercent >= 0 ? '+' : ''}${stock.plPercent.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div class="holding-actions">
                    <button class="holding-btn" onclick="portfolioProDemo.showEditStockModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="holding-btn primary" onclick="portfolioProDemo.showSellStockModal(${stock.id})">
                        <i class="fas fa-arrow-down"></i>
                        Sell
                    </button>
                    <button class="holding-btn danger" onclick="portfolioProDemo.showDeleteConfirmation(${stock.id}, '${stock.symbol}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render filtered watchlist
    renderFilteredWatchlist(filteredData) {
        const watchlistGrid = document.getElementById('watchlistGrid');
        if (!watchlistGrid) return;

        watchlistGrid.innerHTML = filteredData.map(stock => `
            <div class="watchlist-card" data-stock-id="${stock.id}">
                <div class="watchlist-header">
                    <div class="watchlist-info">
                        <div class="watchlist-symbol">${stock.symbol}</div>
                        <div class="watchlist-name">${stock.name}</div>
                    </div>
                    <div class="watchlist-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%
                    </div>
                </div>
                <div class="watchlist-stats">
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Current Price</div>
                        <div class="watchlist-stat-value">${this.formatCurrency(stock.currentPrice)}</div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Day Change</div>
                        <div class="watchlist-stat-value ${stock.dayChange >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(stock.dayChange)}
                        </div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Target Price</div>
                        <div class="watchlist-stat-value">
                            ${stock.targetPrice ? this.formatCurrency(stock.targetPrice) : 'Not set'}
                        </div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Stop Loss</div>
                        <div class="watchlist-stat-value">
                            ${stock.stopLoss ? this.formatCurrency(stock.stopLoss) : 'Not set'}
                        </div>
                    </div>
                </div>
                <div class="watchlist-actions">
                    <button class="watchlist-btn success" onclick="portfolioProDemo.showNotification('Buy functionality coming soon!', 'info')">
                        <i class="fas fa-plus"></i>
                        Buy
                    </button>
                    <button class="watchlist-btn" onclick="portfolioProDemo.showEditWatchlistModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="watchlist-btn danger" onclick="portfolioProDemo.showRemoveWatchlistConfirmation(${stock.id}, '${stock.symbol}')">
                        <i class="fas fa-eye-slash"></i>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render filtered closed positions
    renderFilteredClosedPositions(filteredData) {
        const closedPositionsGrid = document.getElementById('closedPositionsGrid');
        if (!closedPositionsGrid) return;

        closedPositionsGrid.innerHTML = filteredData.map(position => `
            <div class="closed-position-card ${position.pl >= 0 ? 'profit' : 'loss'}" data-position-id="${position.id}">
                <div class="closed-header">
                    <div class="closed-info">
                        <div class="closed-symbol">${position.symbol}</div>
                        <div class="closed-name">${position.name}</div>
                    </div>
                    <div class="closed-pl ${position.pl >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${position.pl >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${position.pl >= 0 ? '+' : ''}${position.plPercent.toFixed(2)}%
                    </div>
                </div>
                <div class="closed-stats">
                    <div class="closed-stat">
                        <div class="closed-stat-label">Buy Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.buyPrice)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Sell Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.sellPrice)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Quantity</div>
                        <div class="closed-stat-value">${position.quantity}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Invested</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.invested)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Realized</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.realized)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">P&L</div>
                        <div class="closed-stat-value ${position.pl >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(position.pl)}
                        </div>
                    </div>
                </div>
                <div class="closed-dates">
                    <div class="closed-date-item">
                        <div class="closed-date-label">Buy Date</div>
                        <div class="closed-date-value">${new Date(position.buyDate).toLocaleDateString()}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Sell Date</div>
                        <div class="closed-date-value">${new Date(position.sellDate).toLocaleDateString()}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Holding Period</div>
                        <div class="closed-date-value">${position.holdingPeriod} days</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Bind user profile events
    bindUserProfileEvents() {
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfile && userDropdown) {
            // Toggle dropdown on profile click
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                userProfile.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userProfile.contains(e.target)) {
                    userProfile.classList.remove('active');
                }
            });

            // Handle logout button click
            document.getElementById('logoutBtn')?.addEventListener('click', () => {
                this.handleLogout();
                userProfile.classList.remove('active');
            });
        }
    }

    // Handle logout
    async handleLogout() {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = 'Logging out...';
            }
        }

        try {
            // Call logout API to clear session from server
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Logout API response:', result);
            } else {
                console.warn('Logout API failed, but continuing with client-side logout');
            }
        } catch (error) {
            console.error('Error calling logout API:', error);
            // Continue with client-side logout even if API fails
        }

        // Clear any stored data (in a real app, this would clear tokens, etc.)
        localStorage.removeItem('portfolioData');
        sessionStorage.clear();
        
        // Show logout success notification
        this.showNotification('Successfully logged out!', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            // In a real application, this would redirect to login page
            // For demo purposes, we'll redirect to auth.html if it exists
            if (document.querySelector('link[href*="auth"]') || this.checkIfFileExists('auth.html')) {
                window.location.href = 'auth.html';
            } else {
                // Fallback: reload the page and show a login message
                window.location.reload();
            }
        }, 1500);
    }

    // Check if file exists (helper method)
    checkIfFileExists(filename) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', filename, false);
            xhr.send();
            return xhr.status === 200;
        } catch (e) {
            return false;
        }
    }

    // Show Buy from Watchlist Modal
    showBuyFromWatchlistModal(stockId) {
        const stock = this.dummyData.watchlist.find(s => s.id === stockId);
        if (!stock) {
            this.showNotification('Stock not found in watchlist!', 'error');
            return;
        }

        const modal = document.getElementById('buyFromWatchlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Populate stock info
            const buyStockInfo = document.getElementById('buyStockInfo');
            buyStockInfo.innerHTML = `
                <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 700;">${stock.symbol} - ${stock.name}</h4>
                <div class="sell-info-item">
                    <span class="sell-info-label">Current Price</span>
                    <span class="sell-info-value">${this.formatCurrency(stock.currentPrice)}</span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Day Change</span>
                    <span class="sell-info-value ${stock.dayChange >= 0 ? 'positive' : 'negative'}" style="color: ${stock.dayChange >= 0 ? '#10b981' : '#ef4444'}">
                        ${this.formatCurrency(stock.dayChange)} (${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%)
                    </span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Target Price</span>
                    <span class="sell-info-value">${stock.targetPrice ? this.formatCurrency(stock.targetPrice) : 'Not set'}</span>
                </div>
                <div class="sell-info-item">
                    <span class="sell-info-label">Stop Loss</span>
                    <span class="sell-info-value">${stock.stopLoss ? this.formatCurrency(stock.stopLoss) : 'Not set'}</span>
                </div>
            `;
            
            // Set default values
            document.getElementById('buyQuantity').value = 100;
            document.getElementById('buyPrice').value = stock.currentPrice.toFixed(2);
            document.getElementById('buyTargetPrice').value = stock.targetPrice || '';
            document.getElementById('buyStopLoss').value = stock.stopLoss || '';
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('buyPurchaseDate').value = today;
            
            // Store the stock ID for later use
            this.buyingStockId = stockId;
            
            // Update buy summary
            this.updateBuySummary();
            
            // Add real-time investment calculation
            document.getElementById('buyQuantity').addEventListener('input', () => this.updateBuySummary());
            document.getElementById('buyPrice').addEventListener('input', () => this.updateBuySummary());
        }
    }

    // Hide Buy from Watchlist Modal
    hideBuyFromWatchlistModal() {
        const modal = document.getElementById('buyFromWatchlistModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form and clear buying ID
            const form = document.getElementById('buyFromWatchlistForm');
            if (form) {
                form.reset();
            }
            this.buyingStockId = null;
        }
    }

    // Update buy summary with investment calculation
    updateBuySummary() {
        if (!this.buyingStockId) return;
        
        const stock = this.dummyData.watchlist.find(s => s.id === this.buyingStockId);
        if (!stock) return;
        
        const buyQuantity = parseInt(document.getElementById('buyQuantity').value) || 0;
        const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
        
        if (buyQuantity > 0 && buyPrice > 0) {
            const totalInvestment = buyPrice * buyQuantity;
            
            const buySummary = document.getElementById('buySummary');
            buySummary.innerHTML = `
                <h4>Investment Summary</h4>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Quantity to Buy</span>
                    <span class="sell-summary-value">${buyQuantity} shares</span>
                </div>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Price per Share</span>
                    <span class="sell-summary-value">${this.formatCurrency(buyPrice)}</span>
                </div>
                <div class="sell-summary-item">
                    <span class="sell-summary-label">Total Investment</span>
                    <span class="sell-summary-value">${this.formatCurrency(totalInvestment)}</span>
                </div>
            `;
        }
    }

    // Handle Buy from Watchlist form submission
    async handleBuyFromWatchlist(e) {
        e.preventDefault();
        
        if (!this.buyingStockId) {
            this.showNotification('No stock selected for buying', 'error');
            return;
        }

        const buyQuantity = parseInt(document.getElementById('buyQuantity').value);
        const buyPrice = parseFloat(document.getElementById('buyPrice').value);
        const buyTargetPrice = parseFloat(document.getElementById('buyTargetPrice').value) || null;
        const buyStopLoss = parseFloat(document.getElementById('buyStopLoss').value) || null;
        const buyPurchaseDate = document.getElementById('buyPurchaseDate').value;

        if (!buyQuantity || !buyPrice || !buyPurchaseDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Find the watchlist stock
        const watchlistStockIndex = this.dummyData.watchlist.findIndex(s => s.id === this.buyingStockId);
        if (watchlistStockIndex === -1) {
            this.showNotification('Stock not found in watchlist', 'error');
            return;
        }

        const watchlistStock = this.dummyData.watchlist[watchlistStockIndex];

        // Check if stock already exists in portfolio
        const existingStock = this.dummyData.portfolio.find(stock => stock.symbol === watchlistStock.symbol);
        if (existingStock) {
            // Add to existing position
            const totalQuantity = existingStock.quantity + buyQuantity;
            const totalInvested = existingStock.invested + (buyPrice * buyQuantity);
            const avgBuyPrice = totalInvested / totalQuantity;
            
            existingStock.quantity = totalQuantity;
            existingStock.buyPrice = avgBuyPrice;
            existingStock.invested = totalInvested;
            existingStock.currentValue = existingStock.currentPrice * totalQuantity;
            existingStock.pl = existingStock.currentValue - existingStock.invested;
            existingStock.plPercent = Math.round((existingStock.pl / existingStock.invested) * 100 * 100) / 100;
            
            this.showNotification(`Added ${buyQuantity} more shares to existing ${watchlistStock.symbol} position!`, 'success');
        } else {
            // Create new portfolio entry
            const newStock = {
                id: Date.now(),
                symbol: watchlistStock.symbol,
                name: watchlistStock.name,
                sector: watchlistStock.sector,
                quantity: buyQuantity,
                buyPrice: buyPrice,
                currentPrice: watchlistStock.currentPrice,
                invested: buyPrice * buyQuantity,
                currentValue: watchlistStock.currentPrice * buyQuantity,
                dayChange: watchlistStock.dayChange,
                dayChangePercent: watchlistStock.dayChangePercent,
                targetPrice: buyTargetPrice,
                stopLoss: buyStopLoss,
                purchaseDate: buyPurchaseDate
            };

            // Calculate P&L
            newStock.pl = newStock.currentValue - newStock.invested;
            newStock.plPercent = Math.round((newStock.pl / newStock.invested) * 100 * 100) / 100;

            // Add to portfolio
            this.dummyData.portfolio.push(newStock);
            
            this.showNotification(`${watchlistStock.symbol} bought and added to portfolio!`, 'success');
        }

        // Remove stock from watchlist after successful addition to portfolio
        this.dummyData.watchlist.splice(watchlistStockIndex, 1);

        // Save to APIs
        await this.savePortfolioData();
        await this.saveWatchlistData();
        
        // Update UI
        this.renderDashboard();
        if (this.currentSection === 'holdings') {
            this.renderHoldings();
        }
        if (this.currentSection === 'watchlist') {
            this.renderWatchlist();
        }
        
        this.hideBuyFromWatchlistModal();
    }


}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioProDemo = new PortfolioProDemo();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.portfolioProDemo) {
        window.portfolioProDemo.updateRealTimeData();
    }
});
