// Formatting Utilities
export class Formatters {
    static formatCurrency(amount, short = false) {
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

    static formatNumber(number) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    static formatPercentage(value, showSign = true) {
        const sign = showSign && value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }

    static getTimeAgo(timestamp) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - timestamp) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else if (diffInSeconds < 2592000) { // 30 days
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        } else {
            const months = Math.floor(diffInSeconds / 2592000);
            return `${months}mo ago`;
        }
    }

    static formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    }

    static formatTime(date, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        };
        return new Date(date).toLocaleTimeString('en-IN', { ...defaultOptions, ...options });
    }
}
