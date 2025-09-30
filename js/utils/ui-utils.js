// UI Utilities Module
import { CONSTANTS } from './constants.js';

export class UIUtils {
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${CONSTANTS.NOTIFICATIONS.ICONS[type]}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${CONSTANTS.NOTIFICATIONS.COLORS[type]};
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
        }, CONSTANTS.UI.TIMEOUTS.NOTIFICATION_DURATION);
    }

    static showLoadingOverlay(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    static hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            return modal;
        }
        return null;
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
            
            return modal;
        }
        return null;
    }

    static hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    static updateActiveState(container, activeElement) {
        container.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
        activeElement.classList.add('active');
    }

    static animateCounter(element, targetValue, formatter = null) {
        const startValue = 0;
        const increment = targetValue / 100;
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            
            element.textContent = formatter ? formatter(currentValue) : currentValue.toFixed(0);
        }, 20);
    }

    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static addClickAnimation(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, CONSTANTS.UI.TIMEOUTS.ANIMATION_DELAY);
    }

    static scrollToElement(element, behavior = 'smooth') {
        element.scrollIntoView({ behavior, block: 'nearest' });
    }

    static isMobile() {
        return window.innerWidth <= 768;
    }

    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    static isDesktop() {
        return window.innerWidth > 1024;
    }

    static getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    static validateForm(formId, requiredFields) {
        const form = document.getElementById(formId);
        if (!form) return false;

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                return false;
            }
        }
        return true;
    }

    static getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    static setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;

        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"], #${key}`);
            if (field && data[key] !== null && data[key] !== undefined) {
                field.value = data[key];
            }
        });
    }
}
