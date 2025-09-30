// Application Constants
export const CONSTANTS = {
    API: {
        ENDPOINTS: {
            AUTH_CHECK: '/api/auth/check',
            AUTH_LOGOUT: '/api/auth/logout',
            PORTFOLIO: '/api/portfolio',
            WATCHLIST: '/api/watchlist',
            CLOSED_POSITIONS: '/api/closed-positions'
        },
        YAHOO_FINANCE: {
            PROXY_URL: 'https://api.allorigins.win/raw?url=',
            CHART_URL: 'https://query1.finance.yahoo.com/v8/finance/chart/',
            SEARCH_URL: 'https://query1.finance.yahoo.com/v1/finance/search',
            BULK_QUOTE_URL: 'https://query1.finance.yahoo.com/v7/finance/quote'
        },
        HEADERS: {
            'User-Agent': 'curl/7.68.0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
    },
    
    MARKET: {
        OPEN_TIME: 915,  // 9:15 AM
        CLOSE_TIME: 1530, // 3:30 PM
        WEEKDAYS: [1, 2, 3, 4, 5] // Monday to Friday
    },
    
    UI: {
        TIMEOUTS: {
            SEARCH_DEBOUNCE: 500,
            NOTIFICATION_DURATION: 3000,
            ANIMATION_DELAY: 150
        },
        LIMITS: {
            MAX_SUGGESTIONS: 5,
            MAX_TOP_PERFORMERS: 3,
            MAX_TOP_HOLDINGS: 5,
            MAX_RECENT_ACTIVITIES: 6
        }
    },
    
    NOTIFICATIONS: {
        TYPES: {
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info'
        },
        ICONS: {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        },
        COLORS: {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
        }
    }
};
