// Simple Authentication System with Dual Login Support
// Clean, straightforward authentication that supports both admin and client sessions

class SimpleAuth {
    /**
     * Store authentication data for a specific context
     * @param {string} token - JWT token
     * @param {Object} userData - User data object
     * @param {string} context - 'admin' or 'client' (defaults to user's role)
     */
    static storeAuth(token, userData, context = null) {
        console.log(`SimpleAuth.storeAuth: storing token (${token.length} chars)`);
        
        // Determine context based on current page or user role
        const actualContext = context || this.determineContext(userData);
        
        // Store token for the specific context
        localStorage.setItem(`auth_token_${actualContext}`, token);
        localStorage.setItem(`user_data_${actualContext}`, JSON.stringify(userData));
        
        // Also store as default auth for backward compatibility
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        // For admin context, also store in adminToken for compatibility with admin.html
        if (actualContext === 'admin') {
            localStorage.setItem('adminToken', token);
            console.log(`SimpleAuth.storeAuth: also stored as adminToken for admin.html compatibility`);
        }
        
        console.log(`Auth data stored for context: ${actualContext}`);
    }
    
    /**
     * Determine context based on user data and current page
     */
    static determineContext(userData) {
        const currentPage = window.location.pathname.split('/').pop();
        
        // If on admin pages, use admin context
        if (currentPage === 'admin.html' || currentPage === 'admin-chat.html') {
            return 'admin';
        }
        
        // If user is admin but not on admin page, use client context
        // This allows admin users to access client dashboard
        if (userData.role === 'admin' && !currentPage.includes('admin')) {
            return 'client';
        }
        
        // Default to client context
        return 'client';
    }
    
    /**
     * Get authentication token for specific context
     * @param {string} context - 'admin', 'client', or null for auto-detect
     * @returns {string|null} Token or null if not found
     */
    static getToken(context = null) {
        const actualContext = context || this.getCurrentContext();
        
        // Try context-specific token first
        let token = localStorage.getItem(`auth_token_${actualContext}`);
        
        // Fallback to default token if context-specific not found
        if (!token) {
            token = localStorage.getItem('auth_token');
        }
        
        // Special fallbacks for admin context
        if (!token && actualContext === 'admin') {
            // Check for adminToken (used by main admin.html)
            token = localStorage.getItem('adminToken');
            if (token) {
                console.log(`SimpleAuth.getToken: Using adminToken fallback for admin context`);
            }
            
            // Also check for admin_auth_token (used by some admin components)
            if (!token) {
                token = localStorage.getItem('admin_auth_token');
                if (token) {
                    console.log(`SimpleAuth.getToken: Using admin_auth_token fallback for admin context`);
                }
            }
        }
        
        console.log(`SimpleAuth.getToken(${actualContext}): ${token ? `found (${token.length} chars)` : 'not found'}`);
        return token;
    }
    
    /**
     * Get current context based on page
     */
    static getCurrentContext() {
        const currentPage = window.location.pathname.split('/').pop();
        // Check for admin pages
        if (currentPage === 'admin.html' || currentPage === 'admin-chat.html') {
            return 'admin';
        }
        return 'client';
    }
    
    /**
     * Get user data for specific context
     * @param {string} context - 'admin', 'client', or null for auto-detect
     * @returns {Object|null} User data or null if not found
     */
    static getUserData(context = null) {
        const actualContext = context || this.getCurrentContext();
        
        // Try context-specific user data first
        let userData = localStorage.getItem(`user_data_${actualContext}`);
        
        // Fallback to default user data if context-specific not found
        if (!userData) {
            userData = localStorage.getItem('user_data');
        }
        
        // Additional fallback for admin context
        if (!userData && actualContext === 'admin') {
            // Check if there's admin_user_data stored separately
            userData = localStorage.getItem('admin_user_data');
            if (userData) {
                console.log(`SimpleAuth.getUserData: Using admin_user_data fallback for admin context`);
            }
        }
        
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
      /**
     * Check if user is authenticated for specific context
     * @param {string} context - 'admin', 'client', or null for auto-detect
     * @returns {boolean} True if authenticated
     */
    static isAuthenticated(context = null) {
        const token = this.getToken(context);
        if (!token) return false;
        
        // Check token expiration
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp && payload.exp < currentTime) {
                console.log('Token expired, clearing auth');
                this.clearAuth(context);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking token:', error);
            this.clearAuth(context);
            return false;
        }
    }
    
    /**
     * Check if user has admin role in any context
     * @returns {boolean} True if user is admin
     */
    static isAdmin() {
        // Check admin context first
        if (this.isAuthenticated('admin')) {
            const userData = this.getUserData('admin');
            if (userData && userData.role === 'admin') {
                return true;
            }
        }
        
        // Check client context for admin user
        if (this.isAuthenticated('client')) {
            const userData = this.getUserData('client');
            if (userData && userData.role === 'admin') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Clear authentication data for specific context
     * @param {string} context - 'admin', 'client', or null for all
     */
    static clearAuth(context = null) {
        if (context === 'admin') {
            // Clear all admin-related tokens
            localStorage.removeItem('auth_token_admin');
            localStorage.removeItem('user_data_admin');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin_auth_token');
            console.log(`Auth data cleared for context: ${context}`);
        } else if (context === 'client') {
            // Clear client-specific tokens
            localStorage.removeItem('auth_token_client');
            localStorage.removeItem('user_data_client');
            console.log(`Auth data cleared for context: ${context}`);
        } else {
            // Clear all authentication data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('auth_token_admin');
            localStorage.removeItem('user_data_admin');
            localStorage.removeItem('auth_token_client');
            localStorage.removeItem('user_data_client');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin_auth_token');
            console.log('All auth data cleared');
        }
    }
      /**
     * Get authentication status with user data for current context
     * @param {string} context - 'admin', 'client', or null for auto-detect
     * @returns {Object|null} Auth data or null if not authenticated
     */
    static getAuthData(context = null) {
        if (!this.isAuthenticated(context)) {
            return null;
        }
        
        return {
            token: this.getToken(context),
            user: this.getUserData(context),
            isAdmin: this.isAdmin(),
            context: context || this.getCurrentContext()
        };
    }
    
    /**
     * Check if user can access admin features
     * @returns {boolean} True if user has admin access
     */
    static canAccessAdmin() {
        return this.isAdmin() && (this.isAuthenticated('admin') || this.isAuthenticated('client'));
    }
    
    /**
     * Get authentication status for all contexts
     * @returns {Object} Status for admin and client contexts
     */
    static getAllAuthStatus() {
        return {
            admin: {
                authenticated: this.isAuthenticated('admin'),
                userData: this.getUserData('admin')
            },
            client: {
                authenticated: this.isAuthenticated('client'),
                userData: this.getUserData('client')
            },
            hasAdminAccess: this.canAccessAdmin()
        };
    }    /**
     * Make authenticated API request
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @param {string} context - 'admin', 'client', or null for auto-detect
     * @returns {Promise} Fetch promise
     */
    static async authenticatedFetch(url, options = {}, context = null) {
        const token = this.getToken(context);
        
        if (!token) {
            console.warn('No token available for API request');
            if (typeof showNotification === 'function') {
                showNotification('Please login to access this feature.', 'warning');
            }
            throw new Error('No authentication token available');
        }
        
        // Ensure we have the base URL
        const baseUrl = window.API_BASE_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '');
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers
            });
              // Handle 401 responses - redirect to login
            if (response.status === 401) {
                console.warn('API request returned 401 - token expired or invalid');
                this.clearAuth(); // Clear all auth data
                if (typeof showNotification === 'function') {
                    showNotification('Logged out. Log in again', 'warning');
                }
                // Redirect to login after showing notification
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                throw new Error('Authentication expired - redirecting to login');
            }
            
            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

// Make SimpleAuth available globally
window.SimpleAuth = SimpleAuth;

// Compatibility functions for existing code
window.isAuthenticated = (context = null) => {
    const authData = SimpleAuth.getAuthData(context);
    return authData ? authData : null;
};

window.getAuthToken = (context = null) => SimpleAuth.getToken(context);

window.fetchWithAuth = async (url, options = {}) => {
    return SimpleAuth.authenticatedFetch(url, options);
};

// Enhanced authentication check that doesn't redirect
window.checkAuthentication = (options = {}) => {
    const {
        adminRequired = false,
        silent = false,
        context = null
    } = options;
    
    const authData = SimpleAuth.getAuthData(context);
    
    if (!authData) {
        if (!silent && typeof showNotification === 'function') {
            showNotification('Authentication required for full access. Please login.', 'info');
        }
        console.log('No authentication - returning limited access');
        return {
            token: null,
            user: {},
            isAdmin: false,
            hasLimitedAccess: true,
            message: 'Please login for full access'
        };
    }
    
    if (adminRequired && !authData.isAdmin) {
        if (!silent && typeof showNotification === 'function') {
            showNotification('Admin privileges required for this feature.', 'warning');
        }
        console.log('Admin required but user is not admin - returning limited access');
        return {
            ...authData,
            hasLimitedAccess: true,
            message: 'Admin privileges required'
        };
    }
    
    console.log('Authentication check passed');
    return authData;
};

console.log('SimpleAuth system loaded');
