// Portfolio Pro - Advanced Stock Tracker
// Production version - API only, no mock data

class PortfolioPro {
    constructor() {
        this.portfolio = [];
        this.closedPositions = [];
        this.watchlist = [];
        this.charts = {};
        this.isLoading = false;
        this.currentSection = 'overview';
        this.currentFilter = 'all';
        this.closedFilter = 'all';
        this.holdingsFilter = 'all';
        this.watchlistFilter = 'all';
        this.searchTerm = '';
        this.closedSearchTerm = '';
        this.holdingsSearchTerm = '';
        this.watchlistSearchTerm = '';
        this.authenticated = false;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.watchlistSortColumn = null;
        this.watchlistSortDirection = 'asc';
        this.editingStockId = null;
        this.editingWatchlistId = null;
        this.sellingStockId = null;
        this.deletingStockId = null;
        this.removingWatchlistId = null;
        this.buyingStockId = null;
        this.tempWatchlistStock = null;
        this.currentUser = null;
        
        this.init();
    }

    // Initialize the application
    async init() {
        console.log('Initializing Portfolio Pro - Production Mode');
        
        // Check authentication first
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            return; // Will redirect to auth page
        }

        this.bindEvents();
        await this.loadDataFromServer();
        this.renderDashboard();
        this.initializeCharts();
        this.startRealTimeUpdates();
        
        // Set current date for purchase date input
        const today = new Date().toISOString().split('T')[0];
        const purchaseDateInput = document.getElementById('purchaseDate');
        if (purchaseDateInput) {
            purchaseDateInput.value = today;
        }
    }

    // Check authentication status
    async checkAuth() {
        try {
            const response = await fetch('api/auth/check');
            const result = await response.json();
            
            if (result.authenticated) {
                this.authenticated = true;
                this.showUserInfo(result.user);
                return true;
            } else {
                window.location.href = 'auth.html';
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'auth.html';
            return false;
        }
    }

    // Show user information in header
    showUserInfo(user) {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && user.username) {
            userNameElement.textContent = user.username;
        }
    }

    // Load all data from server
    async loadDataFromServer() {
        this.showLoading();
        
        try {
            // Load portfolio data
            const portfolioResponse = await fetch('api/portfolio');
            if (portfolioResponse.ok) {
                this.portfolio = await portfolioResponse.json();
            }

            // Load closed positions data
            const closedResponse = await fetch('api/closed-positions');
            if (closedResponse.ok) {
                this.closedPositions = await closedResponse.json();
            }

            // Load watchlist data
            const watchlistResponse = await fetch('api/watchlist');
            if (watchlistResponse.ok) {
                this.watchlist = await watchlistResponse.json();
            }

            console.log(`Loaded: ${this.portfolio.length} portfolio items, ${this.closedPositions.length} closed positions, ${this.watchlist.length} watchlist items`);
        } catch (error) {
            console.error('Error loading data from server:', error);
            this.showNotification('Error loading data from server', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Fetch stock data from Yahoo Finance API
    async fetchStockData(ticker) {
        try {
            const nseSymbol = `${ticker}.NS`;
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}`;
            const fullUrl = proxyUrl + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result.length > 0) {
                const result = data.chart.result[0];
                const meta = result.meta;
                const quote = result.indicators.quote[0];
                
                const currentPrice = meta.regularMarketPrice || meta.previousClose || quote.close[quote.close.length - 1];
                const previousClose = meta.previousClose;
                
                const dayChange = currentPrice - previousClose;
                const dayChangePercent = (dayChange / previousClose) * 100;
                
                const companyName = meta.longName || meta.shortName || `${ticker} Ltd`;
                
                return {
                    name: companyName,
                    currentPrice: Math.round(currentPrice * 100) / 100,
                    dayChange: Math.round(dayChange * 100) / 100,
                    dayChangePercent: Math.round(dayChangePercent * 100) / 100
                };
            } else {
                throw new Error('No data found for this ticker');
            }
            
        } catch (error) {
            console.error(`Failed to fetch data for ${ticker}:`, error.message);
            throw error;
        }
    }

    // Save portfolio to server
    async savePortfolio() {
        try {
            const response = await fetch('api/portfolio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.portfolio)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save portfolio');
            }
            
            console.log('Portfolio saved to server successfully');
        } catch (error) {
            console.error('Error saving portfolio:', error);
            this.showNotification('Error saving portfolio data', 'error');
        }
    }

    // Save closed positions to server
    async saveClosedPositions() {
        try {
            const response = await fetch('api/closed-positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.closedPositions)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save closed positions');
            }
            
            console.log('Closed positions saved to server successfully');
        } catch (error) {
            console.error('Error saving closed positions:', error);
            this.showNotification('Error saving closed positions data', 'error');
        }
    }

    // Save watchlist to server
    async saveWatchlist() {
        try {
            const response = await fetch('api/watchlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.watchlist)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save watchlist');
            }
            
            console.log('Watchlist saved to server successfully');
        } catch (error) {
            console.error('Error saving watchlist:', error);
            this.showNotification('Error saving watchlist data', 'error');
        }
    }

    // Add watchlist stock to portfolio and remove from watchlist
    async addWatchlistToPortfolio(id) {
        const watchlistStock = this.watchlist.find(s => s.id === id);
        if (!watchlistStock) {
            this.showNotification('Stock not found in watchlist!', 'error');
            return;
        }

        // Check if stock already exists in portfolio
        if (this.portfolio.find(s => s.ticker === watchlistStock.ticker)) {
            this.showNotification('Stock already exists in portfolio!', 'warning');
            return;
        }

        // Show modal to get quantity and buy price
        this.showAddToPortfolioModal(watchlistStock);
    }

    // Show add to portfolio modal
    showAddToPortfolioModal(watchlistStock) {
        const modalHTML = `
            <div id="addToPortfolioModal" class="modal-overlay active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Move ${watchlistStock.ticker} to Portfolio</h3>
                        <button class="modal-close" onclick="portfolioPro.hideAddToPortfolioModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="stock-info">
                            <div class="stock-info-item">
                                <span class="stock-info-label">Stock Name</span>
                                <span class="stock-info-value">${watchlistStock.name}</span>
                            </div>
                            <div class="stock-info-item">
                                <span class="stock-info-label">Current Price</span>
                                <span class="stock-info-value">${this.formatCurrency(watchlistStock.currentPrice)}</span>
                            </div>
                            <div class="stock-info-item">
                                <span class="stock-info-label">Target Price</span>
                                <span class="stock-info-value">${watchlistStock.targetPrice ? this.formatCurrency(watchlistStock.targetPrice) : 'Not set'}</span>
                            </div>
                        </div>
                        
                        <form id="addToPortfolioForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="portfolioQuantity">Quantity</label>
                                    <input type="number" id="portfolioQuantity" placeholder="100" required>
                                </div>
                                <div class="form-group">
                                    <label for="portfolioBuyPrice">Buy Price</label>
                                    <input type="number" id="portfolioBuyPrice" step="0.01" value="${watchlistStock.currentPrice.toFixed(2)}" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="portfolioPurchaseDate">Purchase Date</label>
                                <input type="date" id="portfolioPurchaseDate" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn secondary" onclick="portfolioPro.hideAddToPortfolioModal()">Cancel</button>
                                <button type="submit" class="btn primary">Move to Portfolio</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('addToPortfolioModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        // Store the watchlist stock for later use
        this.tempWatchlistStock = watchlistStock;

        // Bind form submit event
        document.getElementById('addToPortfolioForm').addEventListener('submit', (e) => this.handleAddToPortfolio(e));
    }

    // Hide add to portfolio modal
    hideAddToPortfolioModal() {
        const modal = document.getElementById('addToPortfolioModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
            this.tempWatchlistStock = null;
        }
    }

    // Handle add to portfolio (move from watchlist)
    async handleAddToPortfolio(e) {
        e.preventDefault();
        
        if (!this.tempWatchlistStock) {
            this.showNotification('No watchlist stock selected', 'error');
            return;
        }

        const quantity = parseInt(document.getElementById('portfolioQuantity').value);
        const buyPrice = parseFloat(document.getElementById('portfolioBuyPrice').value);
        const purchaseDate = document.getElementById('portfolioPurchaseDate').value;

        if (!quantity || !buyPrice || !purchaseDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const watchlistStock = this.tempWatchlistStock;
        
        // Create portfolio stock from watchlist stock
        const portfolioStock = {
            id: Date.now(),
            ticker: watchlistStock.ticker,
            name: watchlistStock.name,
            sector: watchlistStock.sector,
            quantity: quantity,
            buyPrice: buyPrice,
            currentPrice: watchlistStock.currentPrice,
            targetPrice: watchlistStock.targetPrice,
            stopLoss: watchlistStock.stopLoss,
            invested: buyPrice * quantity,
            currentValue: watchlistStock.currentPrice * quantity,
            dayChange: watchlistStock.dayChange,
            dayChangePercent: watchlistStock.dayChangePercent,
            purchaseDate: purchaseDate,
            lastUpdated: new Date().toISOString()
        };

        // Calculate P&L
        portfolioStock.pl = portfolioStock.currentValue - portfolioStock.invested;
        portfolioStock.plPercent = ((portfolioStock.pl / portfolioStock.invested) * 100);

        // Add to portfolio
        this.portfolio.push(portfolioStock);
        
        // Remove from watchlist
        this.watchlist = this.watchlist.filter(s => s.id !== watchlistStock.id);

        // Save both portfolio and watchlist
        await this.savePortfolio();
        await this.saveWatchlist();
        
        // Update UI
        this.renderDashboard();
        this.renderWatchlist();
        this.hideAddToPortfolioModal();
        
        this.showNotification(`${watchlistStock.ticker} moved to portfolio successfully!`, 'success');
    }

    // Watchlist functionality
    renderWatchlist() {
        const watchlistTable = document.getElementById('watchlistTable');
        const watchlistTableBody = document.getElementById('watchlistTableBody');
        const watchlistEmptyState = document.getElementById('watchlistEmptyState');
        
        if (!watchlistTable || !watchlistTableBody || !watchlistEmptyState) return;

        const filteredWatchlist = this.getFilteredWatchlist();

        if (filteredWatchlist.length === 0) {
            watchlistTable.style.display = 'none';
            watchlistEmptyState.classList.add('active');
            return;
        }

        watchlistTable.style.display = 'table';
        watchlistEmptyState.classList.remove('active');

        const sortedWatchlist = this.sortWatchlist(filteredWatchlist);
        watchlistTableBody.innerHTML = sortedWatchlist.map(stock => this.createWatchlistRow(stock)).join('');

        document.querySelectorAll('.watchlist-table th.sortable').forEach(th => {
            th.addEventListener('click', (e) => this.handleWatchlistSort(e));
        });
    }

    getFilteredWatchlist() {
        let filtered = [...this.watchlist];

        if (this.watchlistFilter === 'gainers') {
            filtered = filtered.filter(stock => (stock.dayChangePercent || 0) > 0);
        } else if (this.watchlistFilter === 'losers') {
            filtered = filtered.filter(stock => (stock.dayChangePercent || 0) < 0);
        }

        if (this.watchlistSearchTerm) {
            const term = this.watchlistSearchTerm.toLowerCase();
            filtered = filtered.filter(stock => 
                (stock.ticker || '').toLowerCase().includes(term) ||
                (stock.name || '').toLowerCase().includes(term) ||
                (stock.sector || '').toLowerCase().includes(term)
            );
        }

        return filtered;
    }

    sortWatchlist(watchlist) {
        if (!this.watchlistSortColumn) return watchlist;

        return [...watchlist].sort((a, b) => {
            let aVal = a[this.watchlistSortColumn];
            let bVal = b[this.watchlistSortColumn];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return this.watchlistSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.watchlistSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    createWatchlistRow(stock) {
        const dayChangeClass = (stock.dayChangePercent || 0) >= 0 ? 'positive' : 'negative';
        const notes = stock.notes || '';
        const truncatedNotes = notes.length > 50 ? notes.substring(0, 50) + '...' : notes;

        return `
            <tr data-watchlist-id="${stock.id}">
                <td><div class="watchlist-symbol">${stock.ticker}</div></td>
                <td><div class="watchlist-company-name" title="${stock.name}">${stock.name}</div></td>
                <td><div class="watchlist-price">${this.formatCurrency(stock.currentPrice || 0)}</div></td>
                <td>
                    <div class="watchlist-change ${dayChangeClass}">
                        <i class="fas fa-arrow-${(stock.dayChange || 0) >= 0 ? 'up' : 'down'}"></i>
                        ${this.formatCurrency(Math.abs(stock.dayChange || 0))}
                    </div>
                </td>
                <td>
                    <div class="watchlist-change-percent ${dayChangeClass}">
                        <i class="fas fa-arrow-${(stock.dayChangePercent || 0) >= 0 ? 'up' : 'down'}"></i>
                        ${(stock.dayChangePercent || 0) >= 0 ? '+' : ''}${(stock.dayChangePercent || 0).toFixed(2)}%
                    </div>
                </td>
                <td><div class="watchlist-target-price">${stock.targetPrice ? this.formatCurrency(stock.targetPrice) : '-'}</div></td>
                <td><div class="watchlist-stop-loss">${stock.stopLoss ? this.formatCurrency(stock.stopLoss) : '-'}</div></td>
                <td><div class="watchlist-notes" title="${notes}">${truncatedNotes || '-'}</div></td>
                <td>
                    <div class="watchlist-actions">
                        <button class="watchlist-btn success" onclick="portfolioPro.addWatchlistToPortfolio(${stock.id})" title="Move to Portfolio">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="watchlist-btn primary" onclick="portfolioPro.editWatchlistStock(${stock.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="watchlist-btn danger" onclick="portfolioPro.deleteWatchlistStock(${stock.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    handleWatchlistSort(e) {
        const column = e.currentTarget.dataset.sort;
        
        if (this.watchlistSortColumn === column) {
            this.watchlistSortDirection = this.watchlistSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.watchlistSortColumn = column;
            this.watchlistSortDirection = 'asc';
        }

        document.querySelectorAll('.watchlist-table th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });

        e.currentTarget.classList.add(`sorted-${this.watchlistSortDirection}`);
        this.renderWatchlist();
    }

    // Add watchlist stock
    async handleAddWatchlistStock(e) {
        e.preventDefault();
        
        const ticker = document.getElementById('watchlistStockSymbol').value.toUpperCase().trim();
        const targetPrice = parseFloat(document.getElementById('watchlistTargetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('watchlistStopLoss').value) || null;
        const notes = document.getElementById('watchlistNotes').value.trim() || null;

        if (!ticker) {
            this.showNotification('Please enter a stock symbol', 'error');
            return;
        }

        // Check if stock already exists in watchlist
        if (this.watchlist.find(s => s.ticker === ticker)) {
            this.showNotification('Stock already exists in watchlist!', 'warning');
            return;
        }

        this.showLoading();

        try {
            const stockData = await this.fetchStockData(ticker);
            
            const watchlistStock = {
                id: Date.now(),
                ticker: ticker,
                name: stockData.name,
                sector: 'Technology', // Default sector
                currentPrice: stockData.currentPrice,
                dayChange: stockData.dayChange || 0,
                dayChangePercent: stockData.dayChangePercent || 0,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                notes: notes,
                addedDate: new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString()
            };

            this.watchlist.push(watchlistStock);
            await this.saveWatchlist();
            this.renderWatchlist();
            this.hideAddWatchlistModal();
            
            this.showNotification('Stock added to watchlist successfully!', 'success');
        } catch (error) {
            console.error('Error processing watchlist stock:', error);
            this.showNotification('Error fetching stock data. Please check the ticker symbol.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Edit watchlist stock
    async handleEditWatchlistStock(e) {
        e.preventDefault();
        
        if (!this.editingWatchlistId) {
            this.showNotification('No stock selected for editing', 'error');
            return;
        }

        const targetPrice = parseFloat(document.getElementById('editWatchlistTargetPrice').value) || null;
        const stopLoss = parseFloat(document.getElementById('editWatchlistStopLoss').value) || null;
        const notes = document.getElementById('editWatchlistNotes').value.trim() || null;

        const stockIndex = this.watchlist.findIndex(s => s.id === this.editingWatchlistId);
        if (stockIndex === -1) {
            this.showNotification('Stock not found in watchlist', 'error');
            return;
        }

        const stock = this.watchlist[stockIndex];
        
        // Update stock data
        stock.targetPrice = targetPrice;
        stock.stopLoss = stopLoss;
        stock.notes = notes;
        stock.lastUpdated = new Date().toISOString();

        await this.saveWatchlist();
        this.renderWatchlist();
        this.hideEditWatchlistModal();
        
        this.showNotification(`Successfully updated ${stock.ticker} in watchlist!`, 'success');
    }

    // Delete watchlist stock
    deleteWatchlistStock(id) {
        const stock = this.watchlist.find(s => s.id === id);
        if (!stock) {
            this.showNotification('Stock not found in watchlist!', 'error');
            return;
        }
        
        if (confirm(`Are you sure you want to remove ${stock.ticker} from your watchlist?`)) {
            this.watchlist = this.watchlist.filter(s => s.id !== id);
            this.saveWatchlist();
            this.renderWatchlist();
            this.showNotification(`${stock.ticker} removed from watchlist!`, 'success');
        }
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
            top: 90px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
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
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // Event binding for UI interactions
    bindEvents() {
        // User dropdown events
        const userProfile = document.getElementById('userProfile');
        if (userProfile) {
            userProfile.addEventListener('click', (e) => this.toggleUserDropdown(e));
        }

        // Outside click to close dropdowns
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Search inputs
        const holdingsSearch = document.getElementById('holdingsSearch');
        if (holdingsSearch) {
            holdingsSearch.addEventListener('input', (e) => {
                this.holdingsSearchTerm = e.target.value;
                this.renderDashboard();
            });
        }

        const watchlistSearch = document.getElementById('watchlistSearch');
        if (watchlistSearch) {
            watchlistSearch.addEventListener('input', (e) => {
                this.watchlistSearchTerm = e.target.value;
                this.renderWatchlist();
            });
        }

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                const section = e.target.closest('.content-section');
                
                if (section && section.id === 'watchlist-section') {
                    this.watchlistFilter = filter;
                    this.updateFilterTabs(e.target);
                    this.renderWatchlist();
                } else if (section && section.id === 'holdings-section') {
                    this.holdingsFilter = filter;
                    this.updateFilterTabs(e.target);
                    this.renderDashboard();
                }
            });
        });

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

        console.log('Events bound successfully');
    }

    // Update filter tab active state
    updateFilterTabs(activeTab) {
        const parentContainer = activeTab.closest('.filter-tabs');
        if (parentContainer) {
            parentContainer.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            activeTab.classList.add('active');
        }
    }

    // Render dashboard with portfolio data
    renderDashboard() {
        this.updatePortfolioSummary();
        this.renderPortfolioHoldings();
        this.updateQuickStats();
        console.log('Dashboard rendered successfully');
    }

    // Update portfolio summary statistics
    updatePortfolioSummary() {
        if (this.portfolio.length === 0) return;

        const totalInvested = this.portfolio.reduce((sum, stock) => sum + (stock.invested || 0), 0);
        const totalCurrentValue = this.portfolio.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
        const totalPL = totalCurrentValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        // Update main portfolio value
        const portfolioValueElement = document.querySelector('.portfolio-value .main-value');
        if (portfolioValueElement) {
            portfolioValueElement.textContent = this.formatCurrency(totalCurrentValue);
        }

        // Update portfolio change
        const portfolioChangeElement = document.querySelector('.portfolio-value .value-change span');
        if (portfolioChangeElement) {
            const changeClass = totalPL >= 0 ? 'positive' : 'negative';
            const changeIcon = totalPL >= 0 ? 'trending-up' : 'trending-down';
            portfolioChangeElement.parentElement.className = `value-change ${changeClass}`;
            portfolioChangeElement.parentElement.innerHTML = `
                <i class="fas fa-${changeIcon}"></i>
                <span>${totalPL >= 0 ? '+' : ''}${this.formatCurrency(totalPL)} (${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%) today</span>
            `;
        }

        // Update investment summary
        const summaryStats = document.querySelector('.investment-summary .summary-stats');
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

    // Render portfolio holdings
    renderPortfolioHoldings() {
        const holdingsGrid = document.getElementById('holdingsGrid');
        if (!holdingsGrid) return;

        const filteredHoldings = this.getFilteredHoldings();

        if (filteredHoldings.length === 0) {
            holdingsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <h3>No Holdings Found</h3>
                    <p>Start building your portfolio by adding your first stock.</p>
                    <button class="btn btn-primary" onclick="portfolioPro.showAddStockModal()">
                        <i class="fas fa-plus"></i>
                        Add Your First Stock
                    </button>
                </div>
            `;
            return;
        }

        holdingsGrid.innerHTML = filteredHoldings.map(stock => this.createHoldingCard(stock)).join('');
    }

    // Get filtered holdings based on current filter and search
    getFilteredHoldings() {
        let filtered = [...this.portfolio];

        // Apply filter
        if (this.holdingsFilter === 'gainers') {
            filtered = filtered.filter(stock => (stock.plPercent || 0) > 0);
        } else if (this.holdingsFilter === 'losers') {
            filtered = filtered.filter(stock => (stock.plPercent || 0) < 0);
        }

        // Apply search
        if (this.holdingsSearchTerm) {
            const term = this.holdingsSearchTerm.toLowerCase();
            filtered = filtered.filter(stock => 
                (stock.ticker || '').toLowerCase().includes(term) ||
                (stock.name || '').toLowerCase().includes(term)
            );
        }

        return filtered;
    }

    // Create holding card HTML
    createHoldingCard(stock) {
        const plClass = (stock.plPercent || 0) >= 0 ? 'positive' : 'negative';
        const dayChangeClass = (stock.dayChangePercent || 0) >= 0 ? 'positive' : 'negative';

        return `
            <div class="holding-card">
                <div class="holding-header">
                    <div class="holding-info">
                        <h3 class="holding-symbol">${stock.ticker}</h3>
                        <p class="holding-name">${stock.name}</p>
                    </div>
                    <div class="holding-actions">
                        <button class="action-btn edit" onclick="portfolioPro.editStock(${stock.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="portfolioPro.deleteStock(${stock.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="holding-metrics">
                    <div class="metric">
                        <span class="metric-label">Current Price</span>
                        <span class="metric-value">${this.formatCurrency(stock.currentPrice || 0)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Quantity</span>
                        <span class="metric-value">${stock.quantity || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Invested</span>
                        <span class="metric-value">${this.formatCurrency(stock.invested || 0)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Current Value</span>
                        <span class="metric-value">${this.formatCurrency(stock.currentValue || 0)}</span>
                    </div>
                </div>
                <div class="holding-performance">
                    <div class="performance-item">
                        <span class="performance-label">P&L</span>
                        <span class="performance-value ${plClass}">
                            ${(stock.pl || 0) >= 0 ? '+' : ''}${this.formatCurrency(stock.pl || 0)}
                            (${(stock.plPercent || 0) >= 0 ? '+' : ''}${(stock.plPercent || 0).toFixed(2)}%)
                        </span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Day Change</span>
                        <span class="performance-value ${dayChangeClass}">
                            ${(stock.dayChangePercent || 0) >= 0 ? '+' : ''}${(stock.dayChangePercent || 0).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // Update quick stats in sidebar
    updateQuickStats() {
        if (this.portfolio.length === 0) return;

        const totalValue = this.portfolio.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
        const totalInvested = this.portfolio.reduce((sum, stock) => sum + (stock.invested || 0), 0);
        const totalPL = totalValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        // Update sidebar quick stats
        const quickStats = document.querySelectorAll('.quick-stat');
        if (quickStats.length >= 3) {
            quickStats[0].querySelector('.stat-value').textContent = this.formatCurrency(totalValue, true);
            
            const plElement = quickStats[1].querySelector('.stat-value');
            plElement.textContent = `${totalPL >= 0 ? '+' : ''}${this.formatCurrency(totalPL, true)}`;
            plElement.className = `stat-value ${totalPL >= 0 ? 'positive' : 'negative'}`;
            
            const returnElement = quickStats[2].querySelector('.stat-value');
            returnElement.textContent = `${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(1)}%`;
            returnElement.className = `stat-value ${totalPLPercent >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // Initialize charts (basic implementation)
    initializeCharts() {
        // Initialize basic charts - can be expanded later
        this.initializePortfolioChart();
        this.initializeMarketCharts();
        console.log('Charts initialized successfully');
    }

    // Initialize portfolio chart
    initializePortfolioChart() {
        const ctx = document.getElementById('heroPortfolioChart');
        if (!ctx) return;

        // Simple line chart showing portfolio growth
        const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Portfolio Value',
                data: [100000, 120000, 115000, 135000, 140000, 145000],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
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

    // Initialize market index charts
    initializeMarketCharts() {
        const chartIds = ['niftyChart', 'sensexChart', 'bankniftyChart', 'finniftyChart'];
        
        chartIds.forEach(chartId => {
            const ctx = document.getElementById(chartId);
            if (!ctx) return;

            // Simple line chart for market indices
            const data = {
                labels: Array.from({length: 20}, (_, i) => i),
                datasets: [{
                    data: Array.from({length: 20}, () => Math.random() * 100 + 50),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            };

            new Chart(ctx, {
                type: 'line',
                data: data,
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

    // Refresh data manually
    refreshData() {
        this.showLoading();
        this.loadDataFromServer().then(() => {
            this.updateStockPrices();
            this.showNotification('Data refreshed successfully!', 'success');
        }).catch(error => {
            console.error('Error refreshing data:', error);
            this.showNotification('Error refreshing data', 'error');
        }).finally(() => {
            this.hideLoading();
        });
    }

    startRealTimeUpdates() {
        console.log('Starting real-time stock price updates...');
        
        // Update stock prices every 1 minute (60000 ms)
        this.priceUpdateInterval = setInterval(async () => {
            await this.updateStockPrices();
        }, 60000); // 1 minute
        
        // Also update immediately on start
        setTimeout(() => {
            this.updateStockPrices();
        }, 5000); // Wait 5 seconds after page load
        
        console.log('Real-time updates started - prices will refresh every 1 minute');
    }

    // Update stock prices for portfolio and watchlist
    async updateStockPrices() {
        if (this.isLoading) {
            console.log('Skipping price update - already loading');
            return;
        }

        console.log('Updating stock prices in background...');
        
        try {
            // Update portfolio prices
            if (this.portfolio.length > 0) {
                await this.updatePortfolioPrices();
            }
            
            // Update watchlist prices
            if (this.watchlist.length > 0) {
                await this.updateWatchlistPrices();
            }
            
            // Re-render dashboard and watchlist with updated prices
            this.renderDashboard();
            this.renderWatchlist();
            
            console.log('Stock prices updated successfully');
        } catch (error) {
            console.error('Error updating stock prices:', error);
        }
    }

    // Update portfolio stock prices
    async updatePortfolioPrices() {
        const updatePromises = this.portfolio.map(async (stock) => {
            try {
                const stockData = await this.fetchStockData(stock.ticker);
                
                // Update stock data
                stock.currentPrice = stockData.currentPrice;
                stock.dayChange = stockData.dayChange;
                stock.dayChangePercent = stockData.dayChangePercent;
                stock.currentValue = stock.currentPrice * stock.quantity;
                stock.pl = stock.currentValue - stock.invested;
                stock.plPercent = ((stock.pl / stock.invested) * 100);
                stock.lastUpdated = new Date().toISOString();
                
                return true;
            } catch (error) {
                console.error(`Failed to update price for ${stock.ticker}:`, error.message);
                return false;
            }
        });

        const results = await Promise.allSettled(updatePromises);
        const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
        
        if (successCount > 0) {
            await this.savePortfolio();
            console.log(`Updated prices for ${successCount}/${this.portfolio.length} portfolio stocks`);
        }
    }

    // Update watchlist stock prices
    async updateWatchlistPrices() {
        const updatePromises = this.watchlist.map(async (stock) => {
            try {
                const stockData = await this.fetchStockData(stock.ticker);
                
                // Update stock data
                stock.currentPrice = stockData.currentPrice;
                stock.dayChange = stockData.dayChange;
                stock.dayChangePercent = stockData.dayChangePercent;
                stock.lastUpdated = new Date().toISOString();
                
                return true;
            } catch (error) {
                console.error(`Failed to update price for ${stock.ticker}:`, error.message);
                return false;
            }
        });

        const results = await Promise.allSettled(updatePromises);
        const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
        
        if (successCount > 0) {
            await this.saveWatchlist();
            console.log(`Updated prices for ${successCount}/${this.watchlist.length} watchlist stocks`);
        }
    }

    // Stop real-time updates (useful for cleanup)
    stopRealTimeUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
            console.log('Real-time updates stopped');
        }
    }

    renderClosedPositions() {
        // Closed positions rendering - will be expanded as needed
        console.log('Closed positions rendered');
    }

    renderClosedPositionsSummary() {
        // Closed positions summary - will be expanded as needed
        console.log('Closed positions summary rendered');
    }

    toggleAnalyticsVisibility() {
        // Analytics visibility toggle - will be expanded as needed
        console.log('Analytics visibility toggled');
    }

    toggleClosedPositionsSummaryVisibility() {
        // Closed positions summary visibility - will be expanded as needed
        console.log('Closed positions summary visibility toggled');
    }

    renderAnalytics() {
        // Analytics rendering - will be expanded as needed
        console.log('Analytics rendered');
    }

    // User dropdown functionality
    toggleUserDropdown(e) {
        e.stopPropagation();
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfile && userDropdown) {
            const isActive = userProfile.classList.contains('active');
            
            if (isActive) {
                this.hideUserDropdown();
            } else {
                this.showUserDropdown();
            }
        }
    }

    showUserDropdown() {
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfile && userDropdown) {
            userProfile.classList.add('active');
            userDropdown.classList.add('active');
        }
    }

    hideUserDropdown() {
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfile && userDropdown) {
            userProfile.classList.remove('active');
            userDropdown.classList.remove('active');
        }
    }

    handleOutsideClick(e) {
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfile && userDropdown && !userProfile.contains(e.target)) {
            this.hideUserDropdown();
        }
    }

    // Handle logout functionality
    async handleLogout() {
        this.hideUserDropdown();
        
        try {
            this.showLoading();
            
            const response = await fetch('api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.authenticated = false;
                this.showNotification('Logged out successfully!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 1000);
            } else {
                throw new Error(result.message || 'Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Error during logout. Please try again.', 'error');
            
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 2000);
        } finally {
            this.hideLoading();
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
                this.renderWatchlistSection();
                break;
            case 'closed-positions':
                this.renderClosedPositionsSection();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'analytics':
                this.renderAnalyticsSection();
                break;
            default:
                console.log(`Rendering ${sectionName} section`);
        }
    }

    // Render overview section
    renderOverview() {
        this.renderDashboard();
        setTimeout(() => {
            this.initializeCharts();
        }, 100);
    }

    // Render holdings section
    renderHoldings() {
        const holdingsGrid = document.getElementById('holdingsGrid');
        if (!holdingsGrid) return;

        const filteredHoldings = this.getFilteredHoldings();

        if (filteredHoldings.length === 0) {
            holdingsGrid.innerHTML = this.renderEmptyState('holdings');
            return;
        }

        holdingsGrid.innerHTML = filteredHoldings.map(stock => this.createDetailedHoldingCard(stock)).join('');
    }

    // Create detailed holding card for holdings section
    createDetailedHoldingCard(stock) {
        const plClass = (stock.plPercent || 0) >= 0 ? 'positive' : 'negative';
        const dayChangeClass = (stock.dayChangePercent || 0) >= 0 ? 'positive' : 'negative';

        return `
            <div class="holding-card" data-stock-id="${stock.id}">
                <div class="holding-header">
                    <div class="holding-info">
                        <div class="holding-symbol">${stock.ticker || stock.symbol}</div>
                        <div class="holding-name">${stock.name}</div>
                    </div>
                    <div class="holding-change ${dayChangeClass}">
                        <i class="fas fa-${(stock.dayChangePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${(stock.dayChangePercent || 0) >= 0 ? '+' : ''}${(stock.dayChangePercent || 0).toFixed(2)}%
                    </div>
                </div>
                <div class="holding-stats">
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Price</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentPrice || 0)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Quantity</div>
                        <div class="holding-stat-value">${stock.quantity || 0}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Invested</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.invested || 0)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">Current Value</div>
                        <div class="holding-stat-value">${this.formatCurrency(stock.currentValue || 0)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L</div>
                        <div class="holding-stat-value ${plClass}">
                            ${this.formatCurrency(stock.pl || 0)}
                        </div>
                    </div>
                    <div class="holding-stat">
                        <div class="holding-stat-label">P&L %</div>
                        <div class="holding-stat-value ${plClass}">
                            ${(stock.plPercent || 0) >= 0 ? '+' : ''}${(stock.plPercent || 0).toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div class="holding-actions">
                    <button class="holding-btn" onclick="portfolioPro.showEditStockModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="holding-btn primary" onclick="portfolioPro.showSellStockModal(${stock.id})">
                        <i class="fas fa-arrow-down"></i>
                        Sell
                    </button>
                    <button class="holding-btn danger" onclick="portfolioPro.showDeleteConfirmation(${stock.id}, '${stock.ticker || stock.symbol}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    // Render watchlist section
    renderWatchlistSection() {
        const watchlistGrid = document.getElementById('watchlistGrid');
        if (!watchlistGrid) return;

        const filteredWatchlist = this.getFilteredWatchlist();

        if (filteredWatchlist.length === 0) {
            watchlistGrid.innerHTML = this.renderEmptyState('watchlist');
            return;
        }

        watchlistGrid.innerHTML = filteredWatchlist.map(stock => this.createWatchlistCard(stock)).join('');
    }

    // Create watchlist card for watchlist section
    createWatchlistCard(stock) {
        const dayChangeClass = (stock.dayChangePercent || 0) >= 0 ? 'positive' : 'negative';

        return `
            <div class="watchlist-card" data-stock-id="${stock.id}">
                <div class="watchlist-header">
                    <div class="watchlist-info">
                        <div class="watchlist-symbol">${stock.ticker || stock.symbol}</div>
                        <div class="watchlist-name">${stock.name}</div>
                    </div>
                    <div class="watchlist-change ${dayChangeClass}">
                        <i class="fas fa-${(stock.dayChangePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${(stock.dayChangePercent || 0) >= 0 ? '+' : ''}${(stock.dayChangePercent || 0).toFixed(2)}%
                    </div>
                </div>
                <div class="watchlist-stats">
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Current Price</div>
                        <div class="watchlist-stat-value">${this.formatCurrency(stock.currentPrice || 0)}</div>
                    </div>
                    <div class="watchlist-stat">
                        <div class="watchlist-stat-label">Day Change</div>
                        <div class="watchlist-stat-value ${dayChangeClass}">
                            ${this.formatCurrency(stock.dayChange || 0)}
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
                    <button class="watchlist-btn success" onclick="portfolioPro.showBuyFromWatchlistModal(${stock.id})">
                        <i class="fas fa-plus"></i>
                        Buy
                    </button>
                    <button class="watchlist-btn" onclick="portfolioPro.showEditWatchlistModal(${stock.id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="watchlist-btn danger" onclick="portfolioPro.showRemoveWatchlistConfirmation(${stock.id}, '${stock.ticker || stock.symbol}')">
                        <i class="fas fa-eye-slash"></i>
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    // Render closed positions section
    renderClosedPositionsSection() {
        const closedPositionsGrid = document.getElementById('closedPositionsGrid');
        if (!closedPositionsGrid) return;

        if (this.closedPositions.length === 0) {
            closedPositionsGrid.innerHTML = this.renderEmptyState('closedPositions');
            return;
        }

        closedPositionsGrid.innerHTML = this.closedPositions.map(position => this.createClosedPositionCard(position)).join('');
    }

    // Create closed position card
    createClosedPositionCard(position) {
        const pl = position.pl || position.finalPL || 0;
        const plPercent = position.plPercent || position.finalPLPercent || 0;
        const plClass = pl >= 0 ? 'positive' : 'negative';

        return `
            <div class="closed-position-card ${pl >= 0 ? 'profit' : 'loss'}" data-position-id="${position.id}">
                <div class="closed-header">
                    <div class="closed-info">
                        <div class="closed-symbol">${position.ticker || position.symbol}</div>
                        <div class="closed-name">${position.name}</div>
                    </div>
                    <div class="closed-pl ${plClass}">
                        <i class="fas fa-${pl >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%
                    </div>
                </div>
                <div class="closed-stats">
                    <div class="closed-stat">
                        <div class="closed-stat-label">Buy Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.buyPrice || 0)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Sell Price</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.sellPrice || position.closePrice || 0)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Quantity</div>
                        <div class="closed-stat-value">${position.quantity || 0}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Invested</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.invested || 0)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">Realized</div>
                        <div class="closed-stat-value">${this.formatCurrency(position.realized || position.closeValue || 0)}</div>
                    </div>
                    <div class="closed-stat">
                        <div class="closed-stat-label">P&L</div>
                        <div class="closed-stat-value ${plClass}">
                            ${this.formatCurrency(pl)}
                        </div>
                    </div>
                </div>
                <div class="closed-dates">
                    <div class="closed-date-item">
                        <div class="closed-date-label">Buy Date</div>
                        <div class="closed-date-value">${position.buyDate ? new Date(position.buyDate).toLocaleDateString() : (position.purchaseDate ? new Date(position.purchaseDate).toLocaleDateString() : 'N/A')}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Sell Date</div>
                        <div class="closed-date-value">${position.sellDate ? new Date(position.sellDate).toLocaleDateString() : (position.closedDate ? new Date(position.closedDate).toLocaleDateString() : 'N/A')}</div>
                    </div>
                    <div class="closed-date-item">
                        <div class="closed-date-label">Holding Period</div>
                        <div class="closed-date-value">${position.holdingPeriod || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render transactions section
    renderTransactions() {
        console.log('Rendering transactions section - Coming Soon!');
    }

    // Render analytics section
    renderAnalyticsSection() {
        console.log('Rendering analytics section - Coming Soon!');
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
                        <button class="btn btn-primary" onclick="portfolioPro.showAddStockModal()">
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
                        <button class="btn btn-primary" onclick="portfolioPro.showAddWatchlistModal()">
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
                        <button class="btn btn-secondary" onclick="portfolioPro.showSection('holdings')">
                            <i class="fas fa-chart-pie"></i>
                            View Holdings
                        </button>
                    </div>
                </div>
            `
        };
        
        return emptyStates[type] || '';
    }

    // Modal functionality
    showAddStockModal() { 
        this.showNotification('Add stock functionality coming soon!', 'info');
    }
    
    hideAddStockModal() { 
        console.log('Hide add stock modal'); 
    }
    
    showEditStockModal(stockId) { 
        this.showNotification('Edit stock functionality coming soon!', 'info');
    }
    
    hideEditStockModal() { 
        console.log('Hide edit stock modal'); 
    }
    
    showSellStockModal(stockId) { 
        this.showNotification('Sell stock functionality coming soon!', 'info');
    }
    
    showDeleteConfirmation(stockId, symbol) { 
        this.showNotification('Delete stock functionality coming soon!', 'info');
    }
    
    showDeleteModal() { 
        console.log('Delete modal'); 
    }
    
    hideDeleteModal() { 
        console.log('Hide delete modal'); 
    }
    
    showAddWatchlistModal() { 
        this.showNotification('Add watchlist functionality coming soon!', 'info');
    }
    
    hideAddWatchlistModal() { 
        console.log('Hide add watchlist modal'); 
    }
    
    editWatchlistStock(stockId) { 
        this.showEditWatchlistModal(stockId);
    }
    
    showEditWatchlistModal(stockId) { 
        this.showNotification('Edit watchlist functionality coming soon!', 'info');
    }
    
    hideEditWatchlistModal() { 
        console.log('Hide edit watchlist modal'); 
    }
    
    showBuyFromWatchlistModal(stockId) { 
        this.showNotification('Buy from watchlist functionality coming soon!', 'info');
    }
    
    showRemoveWatchlistConfirmation(stockId, symbol) { 
        this.showNotification('Remove watchlist functionality coming soon!', 'info');
    }
    
    exportData() { 
        this.showNotification('Export functionality coming soon!', 'info');
    }
    
    exportWatchlistData() { 
        this.showNotification('Export watchlist functionality coming soon!', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioPro = new PortfolioPro();
});

// Handle modal clicks outside content
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Handle escape key for modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});
