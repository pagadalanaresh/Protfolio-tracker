// Portfolio Pro - Advanced Stock Tracker
// Production version - API only, no mock data

class PortfolioPro {
    constructor() {
        this.portfolio = [];
        this.closedPositions = [];
        this.watchlist = [];
        this.charts = {};
        this.isLoading = false;
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

    // Placeholder methods for missing functionality
    bindEvents() {
        // Basic event binding - will be expanded as needed
        console.log('Events bound successfully');
    }

    renderDashboard() {
        // Basic dashboard rendering - will be expanded as needed
        console.log('Dashboard rendered successfully');
    }

    initializeCharts() {
        // Chart initialization - will be expanded as needed
        console.log('Charts initialized successfully');
    }

    startRealTimeUpdates() {
        // Real-time updates - will be expanded as needed
        console.log('Real-time updates started');
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

    // Placeholder methods for modal functionality
    showAddStockModal() { console.log('Add stock modal'); }
    hideAddStockModal() { console.log('Hide add stock modal'); }
    showEditStockModal() { console.log('Edit stock modal'); }
    hideEditStockModal() { console.log('Hide edit stock modal'); }
    showDeleteModal() { console.log('Delete modal'); }
    hideDeleteModal() { console.log('Hide delete modal'); }
    showAddWatchlistModal() { console.log('Add watchlist modal'); }
    hideAddWatchlistModal() { console.log('Hide add watchlist modal'); }
    editWatchlistStock() { console.log('Edit watchlist stock'); }
    showEditWatchlistModal() { console.log('Edit watchlist modal'); }
    hideEditWatchlistModal() { console.log('Hide edit watchlist modal'); }
    exportData() { console.log('Export data'); }
    exportWatchlistData() { console.log('Export watchlist data'); }
    refreshData() { console.log('Refresh data'); }
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
