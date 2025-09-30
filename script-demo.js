// Portfolio Pro - Optimized Demo Version
// Modular architecture following good coding standards

import { CONSTANTS } from './js/utils/constants.js';
import { Formatters } from './js/utils/formatters.js';
import { UIUtils } from './js/utils/ui-utils.js';
import { ApiService } from './js/services/api-service.js';
import { MarketService } from './js/services/market-service.js';
import { DataManager } from './js/services/data-manager.js';

class PortfolioProDemo {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.currentUser = null;
        this.searchTimeout = null;
        this.stockUpdateInterval = null;
        
        // Initialize services
        this.apiService = new ApiService();
        this.marketService = new MarketService();
        this.dataManager = new DataManager();
        
        // Bind methods to preserve context
        this.handleStockSymbolInput = this.handleStockSymbolInput.bind(this);
        
        this.init();
    }

    async init() {
        console.log('Initializing Portfolio Pro - Optimized Version');
        
        UIUtils.showLoadingOverlay('Loading portfolio data...');
        
        try {
            await this.loadUserData();
            await this.loadDataFromAPIs();
            
            this.bindEvents();
            this.renderDashboard();
            this.initializeCharts();
            this.startServices();
            this.showSection('overview');
            
        } catch (error) {
            console.error('Initialization error:', error);
            UIUtils.showNotification('Failed to initialize application', CONSTANTS.NOTIFICATIONS.TYPES.ERROR);
        } finally {
            UIUtils.hideLoadingOverlay();
        }
    }

    async loadUserData() {
        try {
            const authData = await this.apiService.checkAuth();
            this.currentUser = authData.authenticated ? authData.user : 
                             { username: 'Guest User', email: 'guest@example.com' };
            this.updateUserInterface();
        } catch (error) {
            console.error('Error checking authentication:', error);
            this.currentUser = { username: 'Guest User', email: 'guest@example.com' };
            this.updateUserInterface();
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) {
            userNameEl.textContent = this.currentUser.username;
        }

        const heroTextEl = document.querySelector('.hero-text h1');
        if (heroTextEl) {
            const firstName = this.currentUser.username.split(' ')[0];
            heroTextEl.textContent = `Welcome back, ${firstName}!`;
        }
    }

    async loadDataFromAPIs() {
        try {
            const [portfolio, watchlist, closedPositions] = await Promise.all([
                this.apiService.getPortfolio(),
                this.apiService.getWatchlist(),
                this.apiService.getClosedPositions()
            ]);

            this.dataManager.setData({ portfolio, watchlist, closedPositions });
            
            console.log('Data loaded from APIs:', {
                portfolio: portfolio.length,
                watchlist: watchlist.length,
                closedPositions: closedPositions.length
            });
        } catch (error) {
            console.error('Error loading data from APIs:', error);
            UIUtils.showNotification('Failed to load data from server', CONSTANTS.NOTIFICATIONS.TYPES.ERROR);
        }
    }

    startServices() {
        // Start market status updates
        this.marketService.fetchRealMarketStatus();
        setInterval(() => {
            this.marketService.fetchRealMarketStatus();
        }, 60000);

        // Start real-time stock price updates
        this.startRealTimeStockUpdates();
        
        // Start animations
        this.animateCounters();
    }

    startRealTimeStockUpdates() {
        console.log('Starting real-time stock price updates...');
        
        this.stockUpdateInterval = setInterval(async () => {
            await this.updateStockPricesFromAPI();
        }, 60000); // 1 minute
        
        setTimeout(() => {
            this.updateStockPricesFromAPI();
        }, 5000);
    }

    async updateStockPricesFromAPI() {
        const portfolio = this.dataManager.getPortfolio();
        const watchlist = this.dataManager.getWatchlist();
        
        if (portfolio.length === 0 && watchlist.length === 0) {
            return;
        }

        console.log('Updating stock prices from API...');
        
        try {
            const allSymbols = [
                ...portfolio.map(stock => stock.ticker || stock.symbol),
                ...watchlist.map(stock => stock.ticker || stock.symbol)
            ];
            
            const uniqueSymbols = [...new Set(allSymbols)];
            const bulkStockData = await this.apiService.fetchMultipleStockData(uniqueSymbols);
            
            const updatedCount = this.dataManager.updateStockPrices(bulkStockData);
            
            if (updatedCount > 0) {
                // Save updated data
                await Promise.all([
                    this.apiService.savePortfolio(this.dataManager.getPortfolio()),
                    this.apiService.saveWatchlist(this.dataManager.getWatchlist())
                ]);
                
                // Update UI
                this.renderDashboard();
                this.renderSectionContent(this.currentSection);
                
                console.log(`Background update completed: ${updatedCount} stocks updated`);
            }
        } catch (error) {
            console.error('Error in background stock price update:', error);
        }
    }

    bindEvents() {
        this.bindNavigationEvents();
        this.bindModalEvents();
        this.bindFilterEvents();
        this.bindUserProfileEvents();
        this.bindResponsiveEvents();
    }

    bindNavigationEvents() {
        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) this.showSection(section);
            });
        });

        // Mobile navigation
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) this.showSection(section);
            });
        });
    }

    bindModalEvents() {
        // Add Stock/Watchlist buttons
        document.querySelectorAll('#addStockBtn, #addHoldingBtn').forEach(btn => {
            btn.addEventListener('click', () => this.showAddStockModal());
        });

        document.querySelectorAll('#addWatchlistBtn').forEach(btn => {
            btn.addEventListener('click', () => this.showAddWatchlistModal());
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                UIUtils.hideAllModals();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UIUtils.hideAllModals();
            }
        });
    }

    bindFilterEvents() {
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.handleFilterChange(e.currentTarget, filter);
            });
        });
    }

    bindUserProfileEvents() {
        const userProfile = document.getElementById('userProfile');
        if (userProfile) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                userProfile.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!userProfile.contains(e.target)) {
                    userProfile.classList.remove('active');
                }
            });
        }

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    bindResponsiveEvents() {
        window.addEventListener('resize', UIUtils.throttle(() => {
            this.handleResize();
        }, 250));
    }

    showSection(sectionName) {
        this.currentSection = sectionName;

        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.updateNavigationState(sectionName);
        this.renderSectionContent(sectionName);
    }

    updateNavigationState(activeSection) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === activeSection);
        });

        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === activeSection);
        });
    }

    renderSectionContent(sectionName) {
        const renderMethods = {
            'overview': () => this.renderOverview(),
            'holdings': () => this.renderHoldings(),
            'watchlist': () => this.renderWatchlist(),
            'closed-positions': () => this.renderClosedPositions(),
            'analytics': () => this.renderAnalytics()
        };

        const renderMethod = renderMethods[sectionName];
        if (renderMethod) {
            renderMethod();
        } else {
            console.log(`Rendering ${sectionName} section`);
        }
    }

    renderDashboard() {
        this.updatePortfolioSummary();
        this.updateMarketIndices();
        this.updateTopPerformers();
        this.updateRecentActivity();
        this.updateTopHoldings();
        this.updateSidebarStats();
    }

    updatePortfolioSummary() {
        const summary = this.dataManager.getPortfolioSummary();
        
        const mainValueEl = document.querySelector('.main-value');
        if (mainValueEl) {
            mainValueEl.textContent = Formatters.formatCurrency(summary.totalCurrentValue);
        }

        const valueChangeEl = document.querySelector('.value-change');
        if (valueChangeEl) {
            const changeClass = summary.todaysPL >= 0 ? 'positive' : 'negative';
            const changeIcon = summary.todaysPL >= 0 ? 'trending-up' : 'trending-down';
            valueChangeEl.className = `value-change ${changeClass}`;
            valueChangeEl.innerHTML = `
                <i class="fas fa-${changeIcon}"></i>
                <span>${summary.todaysPL >= 0 ? '+' : ''}${Formatters.formatCurrency(summary.todaysPL)} (${Formatters.formatPercentage(summary.todaysPL/summary.totalCurrentValue*100)}) today</span>
            `;
        }

        this.updateSummaryStats(summary);
    }

    updateSummaryStats(summary) {
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Total Invested</span>
                    <span class="stat-value">${Formatters.formatCurrency(summary.totalInvested)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Current Value</span>
                    <span class="stat-value">${Formatters.formatCurrency(summary.totalCurrentValue)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Gains</span>
                    <span class="stat-value ${summary.totalPL >= 0 ? 'positive' : 'negative'}">${Formatters.formatCurrency(summary.totalPL)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Overall Return</span>
                    <span class="stat-value ${summary.totalPLPercent >= 0 ? 'positive' : 'negative'}">${Formatters.formatPercentage(summary.totalPLPercent)}</span>
                </div>
            `;
        }
    }

    updateMarketIndices() {
        this.marketService.updateMarketIndices(this.marketService.getMarketData());
    }

    updateTopPerformers() {
        const performersList = document.getElementById('topPerformersList');
        if (!performersList) return;

        const topPerformers = this.dataManager.getTopPerformers();
        
        if (topPerformers.length === 0) {
            performersList.innerHTML = this.renderEmptyState('performers');
            return;
        }

        performersList.innerHTML = topPerformers.map(stock => `
            <div class="performer-item">
                <div class="performer-info">
                    <div class="performer-symbol">${stock.symbol}</div>
                    <div class="performer-name">${stock.name}</div>
                </div>
                <div class="performer-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                    ${Formatters.formatPercentage(stock.dayChangePercent)}
                </div>
            </div>
        `).join('');
    }

    updateRecentActivity() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        const activities = this.dataManager.generateRecentActivities();

        if (activities.length === 0) {
            activityList.innerHTML = this.renderEmptyState('activity');
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${activity.subtitle}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            buy: 'arrow-up',
            sell: 'arrow-down',
            watchlist: 'eye'
        };
        return icons[type] || 'circle';
    }

    updateTopHoldings() {
        const topHoldingsList = document.getElementById('topHoldingsList');
        if (!topHoldingsList) return;

        const topHoldings = this.dataManager.getTopHoldings();

        if (topHoldings.length === 0) {
            topHoldingsList.innerHTML = this.renderEmptyState('holdings-small');
            return;
        }

        topHoldingsList.innerHTML = topHoldings.map(stock => `
            <div class="holding-item" onclick="portfolioProDemo.showSection('holdings')">
                <div class="holding-item-info">
                    <div class="holding-item-symbol">${stock.symbol}</div>
                    <div class="holding-item-name">${stock.name}</div>
                </div>
                <div class="holding-item-stats">
                    <div class="holding-item-value">
                        <div class="holding-item-current">${Formatters.formatCurrency(stock.currentValue)}</div>
                        <div class="holding-item-pl ${stock.plPercent >= 0 ? 'positive' : 'negative'}">
                            ${Formatters.formatPercentage(stock.plPercent)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateSidebarStats() {
        const summary = this.dataManager.getPortfolioSummary();
        
        // Update counts
        const elements = {
            holdingsCount: document.querySelector('.holdings-count'),
            watchlistCount: document.querySelector('.watchlist-count'),
            closedCount: document.querySelector('.closed-count')
        };

        if (elements.holdingsCount) elements.holdingsCount.textContent = this.dataManager.getPortfolio().length;
        if (elements.watchlistCount) elements.watchlistCount.textContent = this.dataManager.getWatchlist().length;
        if (elements.closedCount) elements.closedCount.textContent = this.dataManager.getClosedPositions().length;

        // Update quick stats
        const quickStats = document.querySelectorAll('.quick-stat');
        if (quickStats.length >= 3) {
            quickStats[0].querySelector('.stat-value').textContent = Formatters.formatCurrency(summary.totalCurrentValue, true);
            
            const todaysPLEl = quickStats[1].querySelector('.stat-value');
            todaysPLEl.textContent = `${summary.todaysPL >= 0 ? '+' : ''}${Formatters.formatCurrency(summary.todaysPL, true)}`;
            todaysPLEl.className = `stat-value ${summary.todaysPL >= 0 ? 'positive' : 'negative'}`;
            
            const overallReturnEl = quickStats[2].querySelector('.stat-value');
            overallReturnEl.textContent = Formatters.formatPercentage(summary.totalPLPercent);
            overallReturnEl.className = `stat-value ${summary.totalPLPercent >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // Section Renderers
    renderOverview() {
        this.renderDashboard();
        setTimeout(() => this.initializeCharts(), 100);
    }

    renderHoldings() {
        const holdingsGrid = document.getElementById('holdingsGrid');
        if (!holdingsGrid) return;

        const portfolio = this.dataManager.getPortfolio();
        
        if (portfolio.length === 0) {
            holdingsGrid.innerHTML = this.renderEmptyState('holdings');
            return;
        }

        holdingsGrid.innerHTML = portfolio.map(stock => this.createHoldingCard(stock)).join('');
    }

    renderWatchlist() {
        const watchlistGrid = document.getElementById('watchlistGrid');
        if (!watchlistGrid) return;

        const watchlist = this.dataManager.getWatchlist();
        
        if (watchlist.length === 0) {
            watchlistGrid.innerHTML = this.renderEmptyState('watchlist');
            return;
        }

        watchlistGrid.innerHTML = watchlist.map(stock => this.createWatchlistCard(stock)).join('');
    }

    renderClosedPositions() {
        const closedPositionsGrid = document.getElementById('closedPositionsGrid');
        if (!closedPositionsGrid) return;

        this.updateClosedPositionsSummary();

        const closedPositions = this.dataManager.getClosedPositions();
        
        if (closedPositions.length === 0) {
            closedPositionsGrid.innerHTML = this.renderEmptyState('closedPositions');
            return;
        }

        closedPositionsGrid.innerHTML = closedPositions.map(position => this.createClosedPositionCard(position)).join('');
    }

    renderAnalytics() {
        console.log('Rendering analytics section');
        setTimeout(() => this.initializeAnalyticsCharts(), 100);
    }

    // Card Creators
    createHoldingCard(stock) {
        return `
            <div class="holding-card" data-stock-id="${stock.id}">
                <div class="holding-header">
                    <div class="holding-info">
                        <div class="holding-symbol">${stock.symbol}</div>
                        <div class="holding-name">${stock.name}</div>
                    </div>
                    <div class="holding-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Formatters.formatPercentage(stock.dayChangePercent)}
                    </div>
                </div>
                <div class="holding-stats">
                    ${this.createStockStats(stock)}
                </div>
                <div class="holding-actions">
                    ${this.createHoldingActions(stock)}
                </div>
            </div>
        `;
    }

    createWatchlistCard(stock) {
        return `
            <div class="watchlist-card" data-stock-id="${stock.id}">
                <div class="watchlist-header">
                    <div class="watchlist-info">
                        <div class="watchlist-symbol">${stock.symbol}</div>
                        <div class="watchlist-name">${stock.name}</div>
                    </div>
                    <div class="watchlist-change ${stock.dayChangePercent >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stock.dayChangePercent >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Formatters.formatPercentage(stock.dayChangePercent)}
                    </div>
                </div>
                <div class="watchlist-stats">
                    ${this.createWatchlistStats(stock)}
                </div>
                <div class="watchlist-actions">
                    ${this.createWatchlistActions(stock)}
                </div>
            </div>
        `;
    }

    createClosedPositionCard(position) {
        return `
            <div class="closed-position-card ${position.pl >= 0 ? 'profit' : 'loss'}" data-position-id="${position.id}">
                <div class="closed-header">
                    <div class="closed-info">
                        <div class="closed-symbol">${position.symbol || position.ticker}</div>
                        <div class="closed-name">${position.name}</div>
                    </div>
                    <div class="closed-pl ${position.pl >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${position.pl >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Formatters.formatPercentage(position.plPercent)}
                    </div>
                </div>
                <div class="closed-stats">
                    ${this.createClosedPositionStats(position)}
                </div>
                <div class="closed-dates">
                    ${this.createClosedPositionDates(position)}
                </div>
            </div>
        `;
    }

    // Helper methods for card creation
    createStockStats(stock) {
        const stats = [
            { label: 'Current Price', value: Formatters.formatCurrency(stock.currentPrice) },
            { label: 'Quantity', value: stock.quantity },
            { label: 'Invested', value: Formatters.formatCurrency(stock.invested) },
            { label: 'Current Value', value: Formatters.formatCurrency(stock.currentValue) },
            { label: 'P&L', value: Formatters.formatCurrency(stock.pl), class: stock.pl >= 0 ? 'positive' : 'negative' },
            { label: 'P&L %', value: Formatters.formatPercentage(stock.plPercent), class: stock.plPercent >= 0 ? 'positive' : 'negative' }
        ];

        return stats.map(stat => `
            <div class="holding-stat">
                <div class="holding-stat-label">${stat.label}</div>
                <div class="holding-stat-value ${stat.class || ''}">${stat.value}</div>
            </div>
        `).join('');
    }

    createWatchlistStats(stock) {
        const stats = [
            { label: 'Current Price', value: Formatters.formatCurrency(stock.currentPrice) },
            { label: 'Day Change', value: Formatters.formatCurrency(stock.dayChange), class: stock.dayChange >= 0 ? 'positive' : 'negative' },
            { label: 'Target Price', value: stock.targetPrice ? Formatters.formatCurrency(stock.targetPrice) : 'Not set' },
            { label: 'Stop Loss', value: stock.stopLoss ? Formatters.formatCurrency(stock.stopLoss) : 'Not set' }
        ];

        return stats.map(stat => `
            <div class="watchlist-stat">
                <div class="watchlist-stat-label">${stat.label}</div>
                <div class="watchlist-stat-value ${stat.class || ''}">${stat.value}</div>
            </div>
        `).join('');
    }

    createClosedPositionStats(position) {
        const stats = [
            { label: 'Buy Price', value: Formatters.formatCurrency(position.buyPrice) },
            { label: 'Sell Price', value: Formatters.formatCurrency(position.sellPrice) },
            { label: 'Quantity', value: position.quantity },
            { label: 'Invested', value: Formatters.formatCurrency(position.invested) },
            { label: 'Realized', value: Formatters.formatCurrency(position.realized) },
            { label: 'P&L', value: Formatters.formatCurrency(position.pl), class: position.pl >= 0 ? 'positive' : 'negative' }
        ];

        return stats.map(stat => `
            <div class="closed-stat">
                <div class="closed-stat-label">${stat.label}</div>
                <div class="closed-stat-value ${stat.class || ''}">${stat.value}</div>
            </div>
        `).join('');
    }

    createClosedPositionDates(position) {
        return `
            <div class="closed-date-item">
                <div class="closed-date-label">Buy Date</div>
                <div class="closed-date-value">${position.buyDate ? Formatters.formatDate(position.buyDate) : 'N/A'}</div>
            </div>
            <div class="closed-date-item">
                <div class="closed-date-label">Sell Date</div>
                <div class="closed-date-value">${position.sellDate ? Formatters.formatDate(position.sellDate) : 'N/A'}</div>
            </div>
            <div class="closed-date-item">
                <div class="closed-date-label">Holding Period</div>
                <div class="closed-date-value">${position.holdingPeriod || 'N/A'}</div>
            </div>
        `;
    }

    createHoldingActions(stock) {
        return `
            <button class="holding-btn" onclick="portfolioProDemo.showEditStockModal(${stock.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="holding-btn primary" onclick="portfolioProDemo.showSellStockModal(${stock.id})">
                <i class="fas fa-arrow-down"></i> Sell
            </button>
            <button class="holding-btn danger" onclick="portfolioProDemo.showDeleteConfirmation(${stock.id}, '${stock.symbol}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
    }

    createWatchlistActions(stock) {
        return `
            <button class="watchlist-btn success" onclick="portfolioProDemo.showBuyFromWatchlistModal(${stock.id})">
                <i class="fas fa-plus"></i> Buy
            </button>
            <button class="watchlist-btn" onclick="portfolioProDemo.showEditWatchlistModal(${stock.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="watchlist-btn danger" onclick="portfolioProDemo.showRemoveWatchlistConfirmation(${stock.id}, '${stock.symbol}')">
                <i class="fas fa-eye-slash"></i> Remove
            </button>
        `;
    }

    // Modal Operations
    showAddStockModal() {
        const modal = UIUtils.showModal('addStockModal');
        if (modal) {
            UIUtils.setFormData('addStockForm', { purchaseDate: UIUtils.getTodayDate() });
            this.initializeStockAutocomplete();
        }
    }

    showAddWatchlistModal() {
        const modal = UIUtils.showModal('addWatchlistModal');
        if (modal) {
            this.initializeWatchlistAutocomplete();
        }
    }

    // Initialize watchlist autocomplete
    initializeWatchlistAutocomplete() {
        const watchlistSymbolInput = document.getElementById('watchlistSymbol');
        if (!watchlistSymbolInput) return;

        watchlistSymbolInput.removeEventListener('input', this.handleWatchlistSymbolInput);
        watchlistSymbolInput.addEventListener('input', this.handleWatchlistSymbolInput.bind(this));
        
        this.createWatchlistSuggestionsDropdown(watchlistSymbolInput);
    }

    createWatchlistSuggestionsDropdown(input) {
        let suggestionsDropdown = document.getElementById('watchlistSuggestions');
        if (!suggestionsDropdown) {
            suggestionsDropdown = UIUtils.createElement('div', 'stock-suggestions');
            suggestionsDropdown.id = 'watchlistSuggestions';
            input.parentNode.appendChild(suggestionsDropdown);
        }
    }

    async handleWatchlistSymbolInput(e) {
        const input = e.target;
        const query = input.value.toUpperCase().trim();
        const suggestionsDropdown = document.getElementById('watchlistSuggestions');
        
        if (this.watchlistSearchTimeout) {
            clearTimeout(this.watchlistSearchTimeout);
        }
        
        if (query.length < 3) {
            suggestionsDropdown.style.display = 'none';
            return;
        }

        suggestionsDropdown.innerHTML = '<div class="suggestion-loading">Searching stocks...</div>';
        suggestionsDropdown.style.display = 'block';

        this.watchlistSearchTimeout = setTimeout(async () => {
            try {
                const suggestions = await this.apiService.searchStocks(query);
                this.displayWatchlistSuggestions(suggestions, suggestionsDropdown);
            } catch (error) {
                console.error('Error fetching watchlist suggestions:', error);
                suggestionsDropdown.innerHTML = '<div class="suggestion-error">Error fetching suggestions</div>';
            }
        }, CONSTANTS.UI.TIMEOUTS.SEARCH_DEBOUNCE);
    }

    displayWatchlistSuggestions(suggestions, dropdown) {
        if (suggestions.length === 0) {
            dropdown.innerHTML = '<div class="suggestion-empty">No stocks found</div>';
            return;
        }

        dropdown.innerHTML = suggestions.map(stock => `
            <div class="suggestion-item" onclick="portfolioProDemo.selectWatchlistStock('${stock.symbol}', '${stock.name}')">
                <div class="suggestion-left">
                    <div class="suggestion-symbol">${stock.symbol}</div>
                    <div class="suggestion-name">${stock.name}</div>
                </div>
                <div class="suggestion-exchange">${stock.exchange}</div>
            </div>
        `).join('');
    }

    async selectWatchlistStock(symbol, name) {
        const watchlistSymbolInput = document.getElementById('watchlistSymbol');
        const suggestionsDropdown = document.getElementById('watchlistSuggestions');
        
        watchlistSymbolInput.value = symbol;
        suggestionsDropdown.style.display = 'none';
        
        // Store the selected stock name for later use
        this.selectedWatchlistStockName = name;
        
        UIUtils.showNotification(`Selected ${symbol} for watchlist`, CONSTANTS.NOTIFICATIONS.TYPES.SUCCESS);
    }

    showEditStockModal(stockId) {
        const stock = this.dataManager.findPortfolioStock(stockId);
        if (!stock) {
            UIUtils.showNotification('Stock not found!', CONSTANTS.NOTIFICATIONS.TYPES.ERROR);
            return;
        }

        const modal = UIUtils.showModal('editStockModal');
        if (modal) {
            UIUtils.setFormData('editStockForm', {
                editStockSymbol: stock.symbol,
                editQuantity: stock.quantity,
                editBuyPrice: stock.buyPrice,
                editTargetPrice: stock.targetPrice || '',
                editStopLoss: stock.stopLoss || '',
                editPurchaseDate: stock.purchaseDate
            });
            this.editingStockId = stockId;
        }
    }

    // Stock Autocomplete
    initializeStockAutocomplete() {
        const stockSymbolInput = document.getElementById('stockSymbol');
        if (!stockSymbolInput) return;

        stockSymbolInput.removeEventListener('input', this.handleStockSymbolInput);
        stockSymbolInput.addEventListener('input', this.handleStockSymbolInput);
        
        this.createSuggestionsDropdown(stockSymbolInput);
    }

    createSuggestionsDropdown(input) {
        let suggestionsDropdown = document.getElementById('stockSuggestions');
        if (!suggestionsDropdown) {
            suggestionsDropdown = UIUtils.createElement('div', 'stock-suggestions');
            suggestionsDropdown.id = 'stockSuggestions';
            input.parentNode.appendChild(suggestionsDropdown);
        }
    }

    async handleStockSymbolInput(e) {
        const input = e.target;
        const query = input.value.toUpperCase().trim();
        const suggestionsDropdown = document.getElementById('stockSuggestions');
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (query.length < 3) {
            suggestionsDropdown.style.display = 'none';
            return;
        }

        suggestionsDropdown.innerHTML = '<div class="suggestion-loading">Searching stocks...</div>';
        suggestionsDropdown.style.display = 'block';

        this.searchTimeout = setTimeout(async () => {
            try {
                const suggestions = await this.apiService.searchStocks(query);
                this.displayStockSuggestions(suggestions, suggestionsDropdown);
            } catch (error) {
                console.error('Error fetching stock suggestions:', error);
                suggestionsDropdown.innerHTML = '<div class="suggestion-error">Error fetching suggestions</div>';
            }
        }, CONSTANTS.UI.TIMEOUTS.SEARCH_DEBOUNCE);
    }

    displayStockSuggestions(suggestions, dropdown) {
        if (suggestions.length === 0) {
            dropdown.innerHTML = '<div class="suggestion-empty">No stocks found</div>';
            return;
        }

        dropdown.innerHTML = suggestions.map(stock => `
            <div class="suggestion-item" onclick="portfolioProDemo.selectStock('${stock.symbol}', '${stock.name}')">
                <div class="suggestion-left">
                    <div class="suggestion-symbol">${stock.symbol}</div>
                    <div class="suggestion-name">${stock.name}</div>
                </div>
                <div class="suggestion-exchange">${stock.exchange}</div>
            </div>
        `).join('');
    }

    async selectStock(symbol, name) {
        const stockSymbolInput = document.getElementById('stockSymbol');
        const suggestionsDropdown = document.getElementById('stockSuggestions');
        
        stockSymbolInput.value = symbol;
        suggestionsDropdown.style.display = 'none';
        
        UIUtils.showLoadingOverlay('Fetching stock data...');
        
        try {
            const stockData = await this.apiService.fetchStockData(symbol);
            document.getElementById('buyPrice').value = stockData.currentPrice.toFixed(2);
            UIUtils.showNotification(`Stock data loaded for ${symbol}`, CONSTANTS.NOTIFICATIONS.TYPES.SUCCESS);
        } catch (error) {
            console.error('Error fetching stock data:', error);
            UIUtils.showNotification('Error fetching stock data', CONSTANTS.NOTIFICATIONS.TYPES.ERROR);
        } finally {
            UIUtils.hideLoadingOverlay();
        }
    }

    // Chart Initialization
    initializeCharts() {
        this.initializeHeroChart();
        this.initializePortfolioValueChart();
        this.initializeSectorChart();
        this.initializeIndexCharts();
    }

    initializeHeroChart() {
        const canvas = document.getElementById('heroPortfolioChart');
        if (!canvas) return;

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
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }

    initializePortfolioValueChart() {
        const canvas = document.getElementById('portfolioValueChart');
        if (!canvas) return;

        if (this.charts.portfolioValue) {
            this.charts.portfolioValue.destroy();
        }

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
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    initializeSectorChart() {
        const canvas = document.getElementById('sectorChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const sectorData = this.dataManager.getSectorAllocation();

        if (this.charts.sectorChart) {
            this.charts.sectorChart.destroy();
        }

        this.charts.sectorChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sectorData.labels,
                datasets: [{
                    data: sectorData.values,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '70%'
            }
        });

        this.updateSectorLegend(sectorData);
    }

    initializeIndexCharts() {
        ['nifty', 'sensex', 'banknifty', 'finnifty'].forEach(index => {
            const canvas = document.getElementById(`${index}Chart`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const data = this.marketService.getMarketData()[index].data;

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
                    plugins: { legend: { display: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        });
    }

    initializeAnalyticsCharts() {
        // Analytics charts implementation
        console.log('Initializing analytics charts');
    }

    // Utility Methods
    generatePortfolioTrendData() {
        const labels = [];
        const values = [];
        const summary = this.dataManager.getPortfolioSummary();
        
        if (summary.totalCurrentValue === 0) {
            return { labels: [], values: [] };
        }
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            values.push(summary.totalCurrentValue);
        }
        
        return { labels, values };
    }

    updateSectorLegend(sectorData) {
        const sectorLegend = document.getElementById('sectorLegend');
        if (!sectorLegend) return;

        if (sectorData.labels.length === 0) {
            sectorLegend.innerHTML = this.renderEmptyState('sectorLegend');
            return;
        }

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

        sectorLegend.innerHTML = sectorData.labels.map((sector, index) => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colors[index % colors.length]};"></div>
                <span class="legend-label">${sector}</span>
                <span class="legend-value">${sectorData.values[index]}%</span>
            </div>
        `).join('');
    }

    updateClosedPositionsSummary() {
        const summary = this.dataManager.getClosedPositionsSummary();
        
        const summaryCards = document.querySelectorAll('.closed-summary-grid .main-value');
        if (summaryCards.length >= 2) {
            summaryCards[0].textContent = Formatters.formatCurrency(summary.totalRealized);
            summaryCards[1].textContent = Formatters.formatCurrency(summary.totalProfit);
            summaryCards[1].className = `main-value ${summary.totalProfit >= 0 ? 'positive' : 'negative'}`;
        }

        const valueChangeElements = document.querySelectorAll('.closed-summary-grid .value-change');
        if (valueChangeElements.length >= 2) {
            valueChangeElements[0].innerHTML = `
                <i class="fas fa-trending-up"></i>
                <span>${summary.totalPositions} positions closed</span>
            `;
            
            valueChangeElements[1].innerHTML = `
                <i class="fas fa-percentage"></i>
                <span>${Formatters.formatPercentage(summary.averageReturn)} average return</span>
            `;
        }
    }

    handleFilterChange(element, filter) {
        UIUtils.updateActiveState(element.parentElement, element);
        console.log(`Applying filter: ${filter} in section: ${this.currentSection}`);
        // Filter logic would be implemented here
    }

    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    async handleLogout() {
        UIUtils.showLoadingOverlay('Logging out...');
        
        try {
            await this.apiService.logout();
            localStorage.clear();
            sessionStorage.clear();
            
            UIUtils.showNotification('Successfully logged out!', CONSTANTS.NOTIFICATIONS.TYPES.SUCCESS);
            
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1500);
        } catch (error) {
            console.error('Logout error:', error);
            UIUtils.showNotification('Logout failed', CONSTANTS.NOTIFICATIONS.TYPES.ERROR);
        } finally {
            UIUtils.hideLoadingOverlay();
        }
    }

    animateCounters() {
        const counters = document.querySelectorAll('.main-value, .stat-value');
        counters.forEach(counter => {
            const target = parseFloat(counter.textContent.replace(/[₹,]/g, ''));
            if (!isNaN(target)) {
                UIUtils.animateCounter(counter, target, (value) => {
                    return counter.classList.contains('main-value') ? 
                           Formatters.formatCurrency(value) : 
                           Formatters.formatCurrency(value);
                });
            }
        });
    }

    renderEmptyState(type) {
        const emptyStates = {
            holdings: `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-chart-pie"></i></div>
                    <div class="empty-state-content">
                        <h3>No Holdings Yet</h3>
                        <p>Start building your portfolio by adding your first stock investment.</p>
                        <button class="btn btn-primary" onclick="portfolioProDemo.showAddStockModal()">
                            <i class="fas fa-plus"></i> Add Your First Stock
                        </button>
                    </div>
                </div>
            `,
            watchlist: `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-eye"></i></div>
                    <div class="empty-state-content">
                        <h3>No Stocks in Watchlist</h3>
                        <p>Add stocks to your watchlist to track their performance and get insights.</p>
                        <button class="btn btn-primary" onclick="portfolioProDemo.showAddWatchlistModal()">
                            <i class="fas fa-plus"></i> Add to Watchlist
                        </button>
                    </div>
                </div>
            `,
            closedPositions: `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-history"></i></div>
                    <div class="empty-state-content">
                        <h3>No Closed Positions</h3>
                        <p>Your completed trades and sold positions will appear here.</p>
                        <button class="btn btn-secondary" onclick="portfolioProDemo.showSection('holdings')">
                            <i class="fas fa-chart-pie"></i> View Holdings
                        </button>
                    </div>
                </div>
            `,
            performers: `<div class="empty-state-small"><div class="empty-state-icon-small"><i class="fas fa-chart-line"></i></div><div class="empty-state-text"><p>Add stocks to see top performers</p></div></div>`,
            activity: `<div class="empty-state-small"><div class="empty-state-icon-small"><i class="fas fa-clock"></i></div><div class="empty-state-text"><p>Your trading activity will appear here</p></div></div>`,
            'holdings-small': `<div class="empty-state-small"><div class="empty-state-icon-small"><i class="fas fa-chart-pie"></i></div><div class="empty-state-text"><p>Add stocks to see your top holdings</p></div></div>`,
            sectorLegend: `<div class="empty-state-small"><div class="empty-state-icon-small"><i class="fas fa-chart-line"></i></div><div class="empty-state-text"><p>Add stocks to see sector allocation</p></div></div>`
        };
        
        return emptyStates[type] || '';
    }

    // Placeholder methods for modal operations (to be implemented)
    showSellStockModal(stockId) {
        UIUtils.showNotification('Sell functionality coming soon!', CONSTANTS.NOTIFICATIONS.TYPES.INFO);
    }

    showDeleteConfirmation(stockId, symbol) {
        UIUtils.showNotification('Delete functionality coming soon!', CONSTANTS.NOTIFICATIONS.TYPES.INFO);
    }

    showBuyFromWatchlistModal(stockId) {
        UIUtils.showNotification('Buy from watchlist functionality coming soon!', CONSTANTS.NOTIFICATIONS.TYPES.INFO);
    }

    showRemoveWatchlistConfirmation(stockId, symbol) {
        UIUtils.showNotification('Remove from watchlist functionality coming soon!', CONSTANTS.NOTIFICATIONS.TYPES.INFO);
    }

    showEditWatchlistModal(stockId) {
        UIUtils.showNotification('Edit watchlist functionality coming soon!', CONSTANTS.NOTIFICATIONS.TYPES.INFO);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioProDemo = new PortfolioProDemo();
});

// Handle page visibility changes for background updates
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.portfolioProDemo) {
        window.portfolioProDemo.updateStockPricesFromAPI();
    }
});
