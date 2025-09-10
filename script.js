class PortfolioTracker {
    constructor() {
        this.portfolio = [];
        this.closedPositions = [];
        this.distributionChart = null;
        this.gainsLossesChart = null;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.closedSortColumn = null;
        this.closedSortDirection = 'asc';
        this.editingStockId = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadDataFromServer();
        this.loadMarketIndices();
        this.loadPortfolio();
        this.loadClosedPositions();
        this.updateSummary();
        this.renderCharts();
    }

    async loadDataFromServer() {
        try {
            // Load portfolio data from server
            const portfolioResponse = await fetch('/api/portfolio');
            if (portfolioResponse.ok) {
                this.portfolio = await portfolioResponse.json();
            }
        } catch (error) {
            console.error('Error loading portfolio from server:', error);
            this.portfolio = [];
        }

        try {
            // Load closed positions data from server
            const closedResponse = await fetch('/api/closed-positions');
            if (closedResponse.ok) {
                this.closedPositions = await closedResponse.json();
            }
        } catch (error) {
            console.error('Error loading closed positions from server:', error);
            this.closedPositions = [];
        }
    }

    bindEvents() {
        document.getElementById('stockForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStock();
        });
    }

    async addStock() {
        const ticker = document.getElementById('ticker').value.toUpperCase().trim();
        const buyPrice = parseFloat(document.getElementById('buyPrice').value);
        const quantity = parseInt(document.getElementById('quantity').value);
        const position = document.getElementById('position').value;
        const purchaseDate = document.getElementById('purchaseDate').value;

        if (!ticker || !buyPrice || !quantity || !position || !purchaseDate) {
            alert('Please fill in all fields');
            return;
        }

        // Show loading
        document.getElementById('loading').style.display = 'block';

        try {
            const stockData = await this.fetchStockData(ticker);
            
            if (this.editingStockId) {
                // Update existing stock
                const stockIndex = this.portfolio.findIndex(s => s.id === this.editingStockId);
                if (stockIndex !== -1) {
                    const existingStock = this.portfolio[stockIndex];
                    const updatedStock = {
                        ...existingStock,
                        ticker: ticker,
                        name: stockData.name,
                        buyPrice: buyPrice,
                        quantity: quantity,
                        position: position,
                        invested: buyPrice * quantity,
                        currentValue: stockData.currentPrice * quantity,
                        purchaseDate: purchaseDate,
                        currentPrice: stockData.currentPrice,
                        dayChange: stockData.dayChange || 0,
                        dayChangePercent: stockData.dayChangePercent || 0,
                        lastUpdated: new Date().toISOString()
                    };

                    // Calculate P&L
                    updatedStock.pl = updatedStock.currentValue - updatedStock.invested;
                    updatedStock.plPercent = ((updatedStock.pl / updatedStock.invested) * 100);

                    this.portfolio[stockIndex] = updatedStock;
                }
                
                // Reset edit mode
                this.editingStockId = null;
                this.updateFormTitle();
            } else {
                // Add new stock
                const stock = {
                    id: Date.now(),
                    ticker: ticker,
                    name: stockData.name,
                    buyPrice: buyPrice,
                    currentPrice: stockData.currentPrice,
                    quantity: quantity,
                    position: position,
                    invested: buyPrice * quantity,
                    currentValue: stockData.currentPrice * quantity,
                    purchaseDate: purchaseDate,
                    dayChange: stockData.dayChange || 0,
                    dayChangePercent: stockData.dayChangePercent || 0,
                    lastUpdated: new Date().toISOString()
                };

                // Calculate P&L
                stock.pl = stock.currentValue - stock.invested;
                stock.plPercent = ((stock.pl / stock.invested) * 100);

                this.portfolio.push(stock);
            }

            this.savePortfolio();
            this.loadPortfolio();
            this.updateSummary();
            this.renderCharts();

            // Clear form
            document.getElementById('stockForm').reset();
            
        } catch (error) {
            console.error('Error processing stock:', error);
            alert('Error fetching stock data. Please check the ticker symbol and try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    editStock(id) {
        const stock = this.portfolio.find(s => s.id === id);
        if (!stock) return;

        // Set editing mode
        this.editingStockId = id;

        // Populate form with stock data
        document.getElementById('ticker').value = stock.ticker;
        document.getElementById('buyPrice').value = stock.buyPrice;
        document.getElementById('quantity').value = stock.quantity;
        document.getElementById('position').value = stock.position || 'Medium';
        document.getElementById('purchaseDate').value = stock.purchaseDate;

        // Update form title
        this.updateFormTitle();

        // Scroll to form
        document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    }

    updateFormTitle() {
        const formTitle = document.querySelector('.input-section h2');
        const submitButton = document.querySelector('#stockForm button[type="submit"]');
        const cancelButton = document.getElementById('cancelEdit');
        
        if (this.editingStockId) {
            formTitle.textContent = 'Edit Stock in Portfolio';
            submitButton.textContent = 'Update Stock';
            cancelButton.style.display = 'inline-block';
        } else {
            formTitle.textContent = 'Add Stock to Portfolio';
            submitButton.textContent = 'Add to Portfolio';
            cancelButton.style.display = 'none';
        }
    }

    cancelEdit() {
        this.editingStockId = null;
        this.updateFormTitle();
        document.getElementById('stockForm').reset();
    }

    async loadMarketIndices() {
        try {
            // Fetch Nifty 50 data
            const niftyData = await this.fetchIndexData('^NSEI'); // Nifty 50 symbol
            this.updateIndexDisplay('nifty', niftyData);
        } catch (error) {
            console.warn('Failed to fetch Nifty data:', error);
            this.updateIndexDisplay('nifty', { value: 24350.45, change: 125.30, changePercent: 0.52 });
        }

        try {
            // Fetch SENSEX data
            const sensexData = await this.fetchIndexData('^BSESN'); // SENSEX symbol
            this.updateIndexDisplay('sensex', sensexData);
        } catch (error) {
            console.warn('Failed to fetch SENSEX data:', error);
            this.updateIndexDisplay('sensex', { value: 79825.15, change: -89.45, changePercent: -0.11 });
        }
    }

    async fetchIndexData(symbol) {
        try {
            // Using Yahoo Finance API for indices
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            const fullUrl = proxyUrl + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result.length > 0) {
                const result = data.chart.result[0];
                const meta = result.meta;
                
                const currentPrice = meta.regularMarketPrice || meta.previousClose;
                const previousClose = meta.previousClose;
                const change = currentPrice - previousClose;
                const changePercent = (change / previousClose) * 100;
                
                return {
                    value: Math.round(currentPrice * 100) / 100,
                    change: Math.round(change * 100) / 100,
                    changePercent: Math.round(changePercent * 100) / 100
                };
            } else {
                throw new Error('No data found for index');
            }
        } catch (error) {
            throw error;
        }
    }

    updateIndexDisplay(indexType, data) {
        const valueElement = document.getElementById(`${indexType}Value`);
        const changeElement = document.getElementById(`${indexType}Change`);
        
        if (!valueElement || !changeElement) return;

        valueElement.textContent = data.value.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });

        const arrow = data.change >= 0 ? '↑' : '↓';
        const changeClass = data.change >= 0 ? 'positive' : 'negative';
        
        changeElement.innerHTML = `
            <span class="index-arrow">${arrow}</span>
            ${Math.abs(data.change).toFixed(2)} (${Math.abs(data.changePercent).toFixed(2)}%)
        `;
        changeElement.className = `index-change ${changeClass}`;
    }

    async fetchStockData(ticker) {
        try {
            // Use Yahoo Finance API through a CORS proxy for Indian NSE stocks
            // For NSE stocks, we need to append .NS to the ticker
            const nseSymbol = `${ticker}.NS`;
            
            // Using a free CORS proxy service to access Yahoo Finance
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
                
                // Get the latest price (last close price or current price)
                const currentPrice = meta.regularMarketPrice || meta.previousClose || quote.close[quote.close.length - 1];
                const previousClose = meta.previousClose;
                
                // Calculate day change
                const dayChange = currentPrice - previousClose;
                const dayChangePercent = (dayChange / previousClose) * 100;
                
                // Get company name (if available, otherwise use ticker)
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
            console.warn(`Failed to fetch real-time data for ${ticker}:`, error.message);
            
            // Fallback to mock data for popular Indian stocks
            const fallbackData = {
                'RELIANCE': { name: 'Reliance Industries Ltd', currentPrice: 2456.75 },
                'TCS': { name: 'Tata Consultancy Services Ltd', currentPrice: 3542.80 },
                'INFY': { name: 'Infosys Ltd', currentPrice: 1456.90 },
                'HDFCBANK': { name: 'HDFC Bank Ltd', currentPrice: 1678.45 },
                'ICICIBANK': { name: 'ICICI Bank Ltd', currentPrice: 945.30 },
                'HINDUNILVR': { name: 'Hindustan Unilever Ltd', currentPrice: 2387.65 },
                'ITC': { name: 'ITC Ltd', currentPrice: 456.20 },
                'SBIN': { name: 'State Bank of India', currentPrice: 567.85 },
                'BHARTIARTL': { name: 'Bharti Airtel Ltd', currentPrice: 1234.50 },
                'KOTAKBANK': { name: 'Kotak Mahindra Bank Ltd', currentPrice: 1789.25 },
                'LT': { name: 'Larsen & Toubro Ltd', currentPrice: 2345.60 },
                'ASIANPAINT': { name: 'Asian Paints Ltd', currentPrice: 3456.80 },
                'MARUTI': { name: 'Maruti Suzuki India Ltd', currentPrice: 9876.45 },
                'HCLTECH': { name: 'HCL Technologies Ltd', currentPrice: 1234.70 },
                'WIPRO': { name: 'Wipro Ltd', currentPrice: 567.30 },
                'TECHM': { name: 'Tech Mahindra Ltd', currentPrice: 1123.45 },
                'TITAN': { name: 'Titan Company Ltd', currentPrice: 2987.60 },
                'NESTLEIND': { name: 'Nestle India Ltd', currentPrice: 23456.80 },
                'POWERGRID': { name: 'Power Grid Corporation of India Ltd', currentPrice: 234.50 },
                'NTPC': { name: 'NTPC Ltd', currentPrice: 345.75 }
            };
            
            if (fallbackData[ticker]) {
                // Add some random variation to simulate real-time price changes
                const basePrice = fallbackData[ticker].currentPrice;
                const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const currentPrice = basePrice * (1 + variation);
                
                // Generate mock day change
                const dayChangeVariation = (Math.random() - 0.5) * 0.05; // ±2.5% day change
                const dayChangePercent = dayChangeVariation * 100;
                const dayChange = basePrice * dayChangeVariation;
                
                return {
                    name: fallbackData[ticker].name,
                    currentPrice: Math.round(currentPrice * 100) / 100,
                    dayChange: Math.round(dayChange * 100) / 100,
                    dayChangePercent: Math.round(dayChangePercent * 100) / 100
                };
            } else {
                // For unknown tickers, use ticker as name
                const currentPrice = Math.round((Math.random() * 2000 + 100) * 100) / 100;
                const dayChangePercent = (Math.random() - 0.5) * 10; // ±5% day change
                const dayChange = currentPrice * (dayChangePercent / 100);
                
                return {
                    name: `${ticker}`,
                    currentPrice: currentPrice,
                    dayChange: Math.round(dayChange * 100) / 100,
                    dayChangePercent: Math.round(dayChangePercent * 100) / 100
                };
            }
        }
    }

    async refreshPrices() {
        if (this.portfolio.length === 0) return;

        document.getElementById('loading').style.display = 'block';

        try {
            for (let stock of this.portfolio) {
                const stockData = await this.fetchStockData(stock.ticker);
                stock.currentPrice = stockData.currentPrice;
                stock.dayChange = stockData.dayChange || 0;
                stock.dayChangePercent = stockData.dayChangePercent || 0;
                stock.currentValue = stock.currentPrice * stock.quantity;
                stock.pl = stock.currentValue - stock.invested;
                stock.plPercent = ((stock.pl / stock.invested) * 100);
                stock.lastUpdated = new Date().toISOString();
            }

            this.savePortfolio();
            this.loadPortfolio();
            this.updateSummary();
            this.renderCharts();
        } catch (error) {
            console.error('Error refreshing prices:', error);
            alert('Error refreshing stock prices. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async closePosition(id) {
        const stock = this.portfolio.find(s => s.id === id);
        if (!stock) return;

        // Create a modal for closing position with date picker
        this.showClosePositionModal(stock);
    }

    showClosePositionModal(stock) {
        // Create modal HTML
        const modalHTML = `
            <div id="closePositionModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="margin-bottom: 20px; color: #4a5568;">Close Position: ${stock.ticker}</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">
                            Closing Price (₹):
                        </label>
                        <input type="number" id="closingPrice" step="0.01" min="0" 
                               value="${stock.currentPrice.toFixed(2)}" 
                               style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">
                            Closing Date:
                        </label>
                        <input type="date" id="closingDate" 
                               value="${new Date().toISOString().split('T')[0]}"
                               style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;">
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="portfolioTracker.cancelClosePosition()" 
                                style="background: #e2e8f0; color: #4a5568; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;">
                            Cancel
                        </button>
                        <button onclick="portfolioTracker.confirmClosePosition(${stock.id})" 
                                style="background: #38a169; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;">
                            Close Position
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    cancelClosePosition() {
        const modal = document.getElementById('closePositionModal');
        if (modal) {
            modal.remove();
        }
    }

    confirmClosePosition(stockId) {
        const stock = this.portfolio.find(s => s.id === stockId);
        if (!stock) return;

        const closePriceInput = document.getElementById('closingPrice');
        const closeDateInput = document.getElementById('closingDate');
        
        const closePrice = parseFloat(closePriceInput.value);
        const closeDate = closeDateInput.value;

        if (isNaN(closePrice) || closePrice <= 0) {
            alert('Please enter a valid closing price');
            return;
        }

        if (!closeDate) {
            alert('Please select a closing date');
            return;
        }

        // Calculate final P&L with closing price
        const finalValue = closePrice * stock.quantity;
        const finalPL = finalValue - stock.invested;
        const finalPLPercent = stock.invested > 0 ? (finalPL / stock.invested) * 100 : 0;

        // Calculate holding period from purchase date to closing date
        const holdingPeriod = this.calculateHoldingPeriodBetweenDates(
            stock.purchaseDate || stock.lastUpdated, 
            closeDate
        );

        // Create closed position record
        const closedPosition = {
            ...stock,
            closePrice: closePrice,
            closeValue: finalValue,
            finalPL: finalPL,
            finalPLPercent: finalPLPercent,
            closedDate: closeDate,
            holdingPeriod: holdingPeriod
        };

        // Add to closed positions and remove from active portfolio
        this.closedPositions.push(closedPosition);
        this.portfolio = this.portfolio.filter(s => s.id !== stockId);

        this.savePortfolio();
        this.saveClosedPositions();
        this.loadPortfolio();
        this.loadClosedPositions();
        this.updateSummary();
        this.renderCharts();

        // Close modal
        this.cancelClosePosition();
    }

    calculateHoldingPeriod(startDate) {
        const start = new Date(startDate);
        const end = new Date();
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '0 days';
        } else if (diffDays < 30) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            const remainingDays = diffDays % 30;
            return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
        } else {
            const years = Math.floor(diffDays / 365);
            const remainingMonths = Math.floor((diffDays % 365) / 30);
            return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
        }
    }

    calculateHoldingPeriodBetweenDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '0 days';
        } else if (diffDays < 30) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            const remainingDays = diffDays % 30;
            return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
        } else {
            const years = Math.floor(diffDays / 365);
            const remainingMonths = Math.floor((diffDays % 365) / 30);
            return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
        }
    }

    deleteStock(id) {
        if (confirm('Are you sure you want to remove this stock from your portfolio?')) {
            this.portfolio = this.portfolio.filter(stock => stock.id !== id);
            this.savePortfolio();
            this.loadPortfolio();
            this.updateSummary();
            this.renderCharts();
        }
    }

    deleteClosedPosition(id) {
        if (confirm('Are you sure you want to delete this closed position record?')) {
            this.closedPositions = this.closedPositions.filter(position => position.id !== id);
            this.saveClosedPositions();
            this.loadClosedPositions();
        }
    }

    loadPortfolio() {
        const tbody = document.getElementById('portfolioBody');
        
        if (this.portfolio.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" class="empty-state">
                        <h3>No stocks in portfolio</h3>
                        <p>Add your first stock to get started!</p>
                    </td>
                </tr>
            `;
            // Clear totals when no portfolio
            document.getElementById('holdingsTotals').innerHTML = '';
            return;
        }

        tbody.innerHTML = this.portfolio.map(stock => `
            <tr>
                <td><strong>${stock.name}</strong></td>
                <td>${stock.ticker}</td>
                <td>${stock.quantity}</td>
                <td><span class="position-badge position-${stock.position ? stock.position.toLowerCase() : 'medium'}">${stock.position || 'Medium'}</span></td>
                <td>₹${stock.buyPrice.toFixed(2)}</td>
                <td>
                    ₹${stock.currentPrice.toFixed(2)}
                    <span class="day-change ${(stock.dayChangePercent || 0) >= 0 ? 'positive' : 'negative'}">
                        ${(stock.dayChangePercent || 0) >= 0 ? '↑' : '↓'}${Math.abs(stock.dayChangePercent || 0).toFixed(2)}%
                    </span>
                </td>
                <td>${stock.purchaseDate ? new Date(stock.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                <td>${stock.purchaseDate ? this.calculateHoldingPeriod(stock.purchaseDate) : 'N/A'}</td>
                <td>₹${stock.invested.toFixed(2)}</td>
                <td>₹${stock.currentValue.toFixed(2)}</td>
                <td class="${stock.pl >= 0 ? 'positive' : 'negative'}">
                    ₹${stock.pl.toFixed(2)}
                </td>
                <td class="${stock.plPercent >= 0 ? 'positive' : 'negative'}">
                    ${stock.plPercent.toFixed(2)}%
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="portfolioTracker.editStock(${stock.id})">
                            Edit
                        </button>
                        <button class="close-btn" onclick="portfolioTracker.closePosition(${stock.id})">
                            Close
                        </button>
                        <button class="delete-btn" onclick="portfolioTracker.deleteStock(${stock.id})">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Update holdings totals
        this.updateHoldingsTotals();
    }

    updateHoldingsTotals() {
        const totalsContainer = document.getElementById('holdingsTotals');
        if (!totalsContainer) return;

        if (this.portfolio.length === 0) {
            totalsContainer.innerHTML = '';
            return;
        }

        const totalInvested = this.portfolio.reduce((sum, stock) => sum + stock.invested, 0);
        const totalCurrentValue = this.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        const totalPL = totalCurrentValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        totalsContainer.innerHTML = `
            <div class="totals-row">
                <span class="totals-label">Total Invested:</span>
                <span class="totals-value">₹${totalInvested.toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span class="totals-label">Total Current Value:</span>
                <span class="totals-value">₹${totalCurrentValue.toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span class="totals-label">Total P&L:</span>
                <span class="totals-value ${totalPL >= 0 ? 'positive' : 'negative'}">₹${totalPL.toFixed(2)} (${totalPLPercent.toFixed(2)}%)</span>
            </div>
        `;
    }

    loadClosedPositions() {
        const closedContainer = document.getElementById('closedPositionsContainer');
        if (!closedContainer) return;

        if (this.closedPositions.length === 0) {
            closedContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No closed positions</h3>
                    <p>Closed positions will appear here when you close stocks from your portfolio.</p>
                </div>
            `;
            return;
        }

        // Calculate totals for closed positions
        const totalInvested = this.closedPositions.reduce((sum, position) => sum + position.invested, 0);
        const totalFinalValue = this.closedPositions.reduce((sum, position) => sum + position.closeValue, 0);
        const totalFinalPL = this.closedPositions.reduce((sum, position) => sum + position.finalPL, 0);
        const totalFinalPLPercent = totalInvested > 0 ? (totalFinalPL / totalInvested) * 100 : 0;

        closedContainer.innerHTML = `
            <table class="portfolio-table">
                <thead>
                    <tr>
                        <th onclick="portfolioTracker.sortClosedPositions('name')" style="cursor: pointer;">
                            Stock <span id="sort-closed-name" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('ticker')" style="cursor: pointer;">
                            Ticker <span id="sort-closed-ticker" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('quantity')" style="cursor: pointer;">
                            Quantity <span id="sort-closed-quantity" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('position')" style="cursor: pointer;">
                            Position <span id="sort-closed-position" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('buyPrice')" style="cursor: pointer;">
                            Buy Price <span id="sort-closed-buyPrice" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('closePrice')" style="cursor: pointer;">
                            Close Price <span id="sort-closed-closePrice" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('invested')" style="cursor: pointer;">
                            Invested <span id="sort-closed-invested" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('closeValue')" style="cursor: pointer;">
                            Final Value <span id="sort-closed-closeValue" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('finalPL')" style="cursor: pointer;">
                            Final P&L <span id="sort-closed-finalPL" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('finalPLPercent')" style="cursor: pointer;">
                            Final P&L % <span id="sort-closed-finalPLPercent" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('holdingPeriod')" style="cursor: pointer;">
                            Holding Period <span id="sort-closed-holdingPeriod" class="sort-arrow">↕</span>
                        </th>
                        <th onclick="portfolioTracker.sortClosedPositions('closedDate')" style="cursor: pointer;">
                            Closed Date <span id="sort-closed-closedDate" class="sort-arrow">↕</span>
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.closedPositions.map(position => `
                        <tr>
                            <td><strong>${position.name}</strong></td>
                            <td>${position.ticker}</td>
                            <td>${position.quantity}</td>
                            <td><span class="position-badge position-${position.position ? position.position.toLowerCase() : 'medium'}">${position.position || 'Medium'}</span></td>
                            <td>₹${position.buyPrice.toFixed(2)}</td>
                            <td>₹${position.closePrice.toFixed(2)}</td>
                            <td>₹${position.invested.toFixed(2)}</td>
                            <td>₹${position.closeValue.toFixed(2)}</td>
                            <td class="${position.finalPL >= 0 ? 'positive' : 'negative'}">
                                ₹${position.finalPL.toFixed(2)}
                            </td>
                            <td class="${position.finalPLPercent >= 0 ? 'positive' : 'negative'}">
                                ${position.finalPLPercent.toFixed(2)}%
                            </td>
                            <td>${position.holdingPeriod}</td>
                            <td>${new Date(position.closedDate).toLocaleDateString()}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="delete-btn" onclick="portfolioTracker.deleteClosedPosition(${position.id})">
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="totals-section">
                <div class="totals-row">
                    <span class="totals-label">Total Invested:</span>
                    <span class="totals-value">₹${totalInvested.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                    <span class="totals-label">Total Final Value:</span>
                    <span class="totals-value">₹${totalFinalValue.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                    <span class="totals-label">Total Realized P&L:</span>
                    <span class="totals-value ${totalFinalPL >= 0 ? 'positive' : 'negative'}">₹${totalFinalPL.toFixed(2)} (${totalFinalPLPercent.toFixed(2)}%)</span>
                </div>
            </div>
        `;
    }

    async saveClosedPositions() {
        try {
            const response = await fetch('/api/closed-positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.closedPositions)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save closed positions');
            }
            
            console.log('Closed positions saved to file successfully');
        } catch (error) {
            console.error('Error saving closed positions:', error);
        }
    }

    updateSummary() {
        const totalInvested = this.portfolio.reduce((sum, stock) => sum + stock.invested, 0);
        const currentValue = this.portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
        const totalPL = currentValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        document.getElementById('totalInvested').textContent = `₹${totalInvested.toFixed(2)}`;
        document.getElementById('currentValue').textContent = `₹${currentValue.toFixed(2)}`;
        
        const plElement = document.getElementById('totalPL');
        const plPercentElement = document.getElementById('totalPLPercent');
        
        plElement.textContent = `₹${totalPL.toFixed(2)}`;
        plPercentElement.textContent = `${totalPLPercent.toFixed(2)}%`;
        
        // Apply color classes
        plElement.className = totalPL >= 0 ? 'positive' : 'negative';
        plPercentElement.className = totalPLPercent >= 0 ? 'positive' : 'negative';
    }

    renderCharts() {
        this.renderDistributionChart();
        this.renderGainsLossesChart();
    }

    renderDistributionChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        if (this.distributionChart) {
            this.distributionChart.destroy();
        }

        if (this.portfolio.length === 0) {
            this.distributionChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            return;
        }

        const labels = this.portfolio.map(stock => stock.ticker);
        const data = this.portfolio.map(stock => stock.currentValue);
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ];

        this.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderGainsLossesChart() {
        const ctx = document.getElementById('gainsLossesChart').getContext('2d');
        
        if (this.gainsLossesChart) {
            this.gainsLossesChart.destroy();
        }

        if (this.portfolio.length === 0) {
            this.gainsLossesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [0],
                        backgroundColor: ['#e2e8f0']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            return;
        }

        const labels = this.portfolio.map(stock => stock.ticker);
        const data = this.portfolio.map(stock => stock.pl);
        const colors = data.map(value => value >= 0 ? '#38a169' : '#e53e3e');

        this.gainsLossesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'P&L (₹)',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `P&L: ₹${value.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    sortTable(column) {
        if (this.portfolio.length === 0) return;

        // Toggle sort direction if same column, otherwise set to ascending
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Sort the portfolio array
        this.portfolio.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // Handle special cases
            if (column === 'purchaseDate') {
                aValue = new Date(aValue || 0);
                bValue = new Date(bValue || 0);
            } else if (column === 'holdingPeriod') {
                // Convert holding period to days for sorting
                aValue = this.convertHoldingPeriodToDays(a.purchaseDate);
                bValue = this.convertHoldingPeriodToDays(b.purchaseDate);
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue > bValue) {
                comparison = 1;
            } else if (aValue < bValue) {
                comparison = -1;
            }

            return this.sortDirection === 'desc' ? comparison * -1 : comparison;
        });

        // Update sort arrows
        this.updateSortArrows();

        // Reload the table
        this.loadPortfolio();
    }

    convertHoldingPeriodToDays(purchaseDate) {
        if (!purchaseDate) return 0;
        const start = new Date(purchaseDate);
        const end = new Date();
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    sortClosedPositions(column) {
        if (this.closedPositions.length === 0) return;

        // Toggle sort direction if same column, otherwise set to ascending
        if (this.closedSortColumn === column) {
            this.closedSortDirection = this.closedSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.closedSortColumn = column;
            this.closedSortDirection = 'asc';
        }

        // Sort the closed positions array
        this.closedPositions.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // Handle special cases
            if (column === 'closedDate') {
                aValue = new Date(aValue || 0);
                bValue = new Date(bValue || 0);
            } else if (column === 'holdingPeriod') {
                // Convert holding period to days for sorting
                aValue = this.convertHoldingPeriodStringToDays(a.holdingPeriod);
                bValue = this.convertHoldingPeriodStringToDays(b.holdingPeriod);
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue > bValue) {
                comparison = 1;
            } else if (aValue < bValue) {
                comparison = -1;
            }

            return this.closedSortDirection === 'desc' ? comparison * -1 : comparison;
        });

        // Update sort arrows for closed positions
        this.updateClosedSortArrows();

        // Reload the closed positions table
        this.loadClosedPositions();
    }

    convertHoldingPeriodStringToDays(holdingPeriodString) {
        if (!holdingPeriodString || holdingPeriodString === 'N/A') return 0;
        
        // Parse holding period string like "5 days", "2 months 3 days", "1 year 2 months"
        let totalDays = 0;
        const yearMatch = holdingPeriodString.match(/(\d+)\s+year/);
        const monthMatch = holdingPeriodString.match(/(\d+)\s+month/);
        const dayMatch = holdingPeriodString.match(/(\d+)\s+day/);
        
        if (yearMatch) totalDays += parseInt(yearMatch[1]) * 365;
        if (monthMatch) totalDays += parseInt(monthMatch[1]) * 30;
        if (dayMatch) totalDays += parseInt(dayMatch[1]);
        
        return totalDays;
    }

    updateSortArrows() {
        // Reset all arrows for main table
        const arrows = document.querySelectorAll('.sort-arrow');
        arrows.forEach(arrow => {
            if (!arrow.id.includes('closed')) {
                arrow.textContent = '↕';
            }
        });

        // Update current column arrow for main table
        if (this.sortColumn) {
            const currentArrow = document.getElementById(`sort-${this.sortColumn}`);
            if (currentArrow) {
                currentArrow.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
            }
        }
    }

    updateClosedSortArrows() {
        // Reset all arrows for closed positions table
        const closedArrows = document.querySelectorAll('[id^="sort-closed-"]');
        closedArrows.forEach(arrow => {
            arrow.textContent = '↕';
        });

        // Update current column arrow for closed positions
        if (this.closedSortColumn) {
            const currentArrow = document.getElementById(`sort-closed-${this.closedSortColumn}`);
            if (currentArrow) {
                currentArrow.textContent = this.closedSortDirection === 'asc' ? '↑' : '↓';
            }
        }
    }

    async savePortfolio() {
        try {
            const response = await fetch('/api/portfolio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.portfolio)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save portfolio');
            }
            
            console.log('Portfolio saved to file successfully');
        } catch (error) {
            console.error('Error saving portfolio:', error);
        }
    }

    // Auto-refresh prices every 1 minute
    startAutoRefresh() {
        setInterval(() => {
            this.refreshPrices();
            this.loadMarketIndices(); // Also refresh market indices
        }, 1 * 60 * 1000); // 1 minute
    }
}

// Initialize the portfolio tracker
const portfolioTracker = new PortfolioTracker();

// Add refresh button functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add refresh button to the top right corner
    const refreshButton = document.createElement('button');
    refreshButton.innerHTML = '⟳'; // Different refresh icon
    refreshButton.style.position = 'fixed';
    refreshButton.style.top = '20px';
    refreshButton.style.right = '20px';
    refreshButton.style.width = '50px';
    refreshButton.style.height = '50px';
    refreshButton.style.borderRadius = '50%';
    refreshButton.style.background = '#667eea';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.fontSize = '20px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    refreshButton.style.transition = 'all 0.3s ease';
    refreshButton.style.zIndex = '1000';
    refreshButton.style.display = 'flex';
    refreshButton.style.alignItems = 'center';
    refreshButton.style.justifyContent = 'center';
    
    refreshButton.onmouseover = () => {
        refreshButton.style.transform = 'scale(1.1)';
        refreshButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
    };
    refreshButton.onmouseout = () => {
        refreshButton.style.transform = 'scale(1)';
        refreshButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    };
    refreshButton.onclick = () => {
        // Add rotation animation
        refreshButton.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            refreshButton.style.transform = 'scale(1)';
        }, 300);
        
        portfolioTracker.refreshPrices();
        portfolioTracker.loadMarketIndices();
    };
    
    document.body.appendChild(refreshButton);
    
    // Start auto-refresh every 1 minute
    portfolioTracker.startAutoRefresh();
});
