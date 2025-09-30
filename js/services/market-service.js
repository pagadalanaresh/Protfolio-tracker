// Market Service Module
import { CONSTANTS } from '../utils/constants.js';
import { Formatters } from '../utils/formatters.js';

export class MarketService {
    constructor() {
        this.marketData = this.initializeMarketData();
    }

    initializeMarketData() {
        return {
            nifty: {
                value: 24350.45,
                change: 125.30,
                changePercent: 0.52,
                data: []
            },
            sensex: {
                value: 79825.15,
                change: -89.45,
                changePercent: -0.11,
                data: []
            },
            banknifty: {
                value: 51234.80,
                change: 234.50,
                changePercent: 0.46,
                data: []
            },
            finnifty: {
                value: 23145.60,
                change: 156.20,
                changePercent: 0.68,
                data: []
            }
        };
    }

    isMarketOpen() {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        
        const currentHour = istTime.getHours();
        const currentMinute = istTime.getMinutes();
        const currentTime = currentHour * 100 + currentMinute;
        const dayOfWeek = istTime.getDay();
        
        const isWeekday = CONSTANTS.MARKET.WEEKDAYS.includes(dayOfWeek);
        const isMarketHours = currentTime >= CONSTANTS.MARKET.OPEN_TIME && 
                            currentTime <= CONSTANTS.MARKET.CLOSE_TIME;
        
        return isWeekday && isMarketHours;
    }

    updateMarketStatus() {
        const isOpen = this.isMarketOpen();
        const istTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
        
        this.updateMarketStatusUI(isOpen, istTime);
        
        console.log(`Market Status: ${isOpen ? 'Open' : 'Closed'} at ${istTime}`);
        return isOpen;
    }

    updateMarketStatusUI(isOpen, time) {
        const elements = {
            indicator: document.querySelector('.market-indicator'),
            statusDot: document.querySelector('.status-dot'),
            statusText: document.querySelector('.market-indicator span'),
            timeElement: document.querySelector('.market-time')
        };

        if (Object.values(elements).every(el => el)) {
            if (isOpen) {
                elements.statusDot.className = 'status-dot active';
                elements.statusText.textContent = 'Market Open';
                elements.indicator.style.color = '#10b981';
            } else {
                elements.statusDot.className = 'status-dot inactive';
                elements.statusText.textContent = 'Market Closed';
                elements.indicator.style.color = '#ef4444';
            }
            
            const timeString = Formatters.formatTime(new Date());
            elements.timeElement.textContent = `${timeString} IST`;
        }
    }

    async fetchRealMarketStatus() {
        try {
            const proxyUrl = CONSTANTS.API.YAHOO_FINANCE.PROXY_URL;
            const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/^NSEI';
            const fullUrl = proxyUrl + encodeURIComponent(yahooUrl);
            
            const response = await fetch(fullUrl);
            if (response.ok) {
                const data = await response.json();
                
                if (data.chart?.result?.[0]?.meta) {
                    const meta = data.chart.result[0].meta;
                    const marketState = meta.marketState;
                    const isOpen = marketState === 'REGULAR';
                    
                    this.updateMarketStatusUI(isOpen, new Date());
                    console.log(`Yahoo API Market Status: ${marketState}, Is Open: ${isOpen}`);
                    return isOpen;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch market status from Yahoo API:', error);
        }
        
        return this.updateMarketStatus();
    }

    updateMarketIndices(marketData) {
        Object.keys(marketData).forEach(index => {
            const data = marketData[index];
            const card = document.querySelector(`.index-card.${index}`);
            
            if (card) {
                const valueEl = card.querySelector('.value');
                const changeEl = card.querySelector('.change');
                
                if (valueEl) {
                    valueEl.textContent = Formatters.formatNumber(data.value);
                }
                
                if (changeEl) {
                    const changeClass = data.change >= 0 ? 'positive' : 'negative';
                    const changeIcon = data.change >= 0 ? 'arrow-up' : 'arrow-down';
                    changeEl.className = `change ${changeClass}`;
                    changeEl.innerHTML = `
                        <i class="fas fa-${changeIcon}"></i>
                        <span>${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${Formatters.formatPercentage(data.changePercent)})</span>
                    `;
                }
            }
        });
    }

    getMarketData() {
        return this.marketData;
    }

    setMarketData(data) {
        this.marketData = { ...this.marketData, ...data };
    }
}
