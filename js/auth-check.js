// Central authentication management for the frontend
// This file provides reusable authentication utilities
//
// *** PRODUCTION MODE - REDIRECTS ENABLED ***
// - 401 error redirects are now active
// - Authentication failures will redirect to login page
// - Users will be automatically logged out on auth failures
// *** END NOTE ***

/**
 * Central authentication check function with dual auth support
 * @param {Object} options - Configuration options
 * @param {boolean} options.adminRequired - Whether admin role is required
 * @param {string} options.redirectPath - Custom redirect path (default: 'login.html')
 * @param {boolean} options.silent - Whether to suppress notifications
 * @returns {Object|null} User data if authenticated, null if redirected
 */
function checkAuthentication(options = {}) {
    const {
        adminRequired = false,
        redirectPath = 'login.html',
        silent = false
    } = options;

    // Use SimpleAuth if available
    if (typeof SimpleAuth !== 'undefined') {
        console.log('checkAuthentication: Using SimpleAuth system');
        
        const authData = SimpleAuth.getAuthData();
        
        if (!authData) {
            if (!silent && typeof showNotification === 'function') {
                showNotification('Authentication required. Redirecting to login...', 'warning');
            }
            console.warn('Auth Check: No authentication data - redirecting to login');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1000);
            return null;
        }
        
        // Check admin requirement
        if (adminRequired && !authData.isAdmin) {
            if (!silent && typeof showNotification === 'function') {
                showNotification('Admin access required. Redirecting to login...', 'warning');
            }
            console.warn('Auth Check: Admin required but user is not admin - redirecting to login');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1000);
            return null;
        }
        
        console.log('Auth Check: Authentication successful via SimpleAuth');
        return authData;
    }

    console.log('checkAuthentication: Using legacy authentication system');

    // Legacy authentication system (fallback)
    let token = localStorage.getItem('admin_auth_token'); // Try standardized admin token first
    
    // Fallback to regular auth token if no admin token found
    if (!token && adminRequired) {
        token = localStorage.getItem('auth_token');
        // If found in old location, migrate it for admin users
        if (token) {
            localStorage.setItem('admin_auth_token', token);
            console.log('Migrated admin token to standardized location');
        }
    } else if (!adminRequired) {
        // For non-admin users, use the regular auth token
        token = localStorage.getItem('auth_token');
    }
    
    console.log(`Legacy token: ${token ? `found (${token.length} chars)` : 'not found'}`);
      if (!token) {
        if (!silent && typeof showNotification === 'function') {
            showNotification('Authentication required. Redirecting to login...', 'warning');
        }
        console.warn('Auth Check: No token found - redirecting to login');
        setTimeout(() => {
            window.location.href = redirectPath;
        }, 1000);
        return null;
    }

    // Parse token to check expiration and role
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;        // Check if token is expired
        if (payload.exp && payload.exp < currentTime) {
            // Preserve drive session data before clearing localStorage
            const driveSessionData = localStorage.getItem('current_drive_session');
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            
            // Restore drive session data after clearing auth data
            if (driveSessionData) {
                localStorage.setItem('current_drive_session', driveSessionData);
            }
            
            if (!silent && typeof showNotification === 'function') {
                showNotification('Session expired. Redirecting to login...', 'warning');
            }
            console.warn('Auth Check: Token expired - redirecting to login');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1000);
            return null;
        }

        // Get user data from localStorage for role checking
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
          // Check admin requirement
        if (adminRequired && userData.role !== 'admin') {
            if (!silent && typeof showNotification === 'function') {
                showNotification('Admin access required. Redirecting to login...', 'warning');
            }
            console.warn('Auth Check: Admin required but user is not admin - redirecting to login');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1000);
            return null;
        }

        // Return user data if authentication successful
        return {
            token,
            user: userData,
            isAdmin: userData.role === 'admin'
        };
    } catch (error) {
        console.error('Error parsing token:', error);
        // Preserve drive session data before clearing localStorage
        const driveSessionData = localStorage.getItem('current_drive_session');
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
          // Restore drive session data after clearing auth data
        if (driveSessionData) {
            localStorage.setItem('current_drive_session', driveSessionData);
        }
        
        if (!silent && typeof showNotification === 'function') {
            showNotification('Authentication data is invalid. Redirecting to login...', 'warning');
        }
        console.warn('Auth Check: Invalid token data - redirecting to login');
        setTimeout(() => {
            window.location.href = redirectPath;
        }, 1000);
        return null;
    }
}

/**
 * Quick authentication check for protected pages
 * @param {boolean} adminRequired - Whether admin role is required
 * @returns {Object|null} User data if authenticated, null if redirected
 */
function requireAuth(adminRequired = false) {
    return checkAuthentication({ 
        adminRequired,
        silent: false
    });
}

/**
 * Silent authentication check (no notifications)
 * @param {boolean} adminRequired - Whether admin role is required
 * @returns {Object|null} User data if authenticated, null if not
 */
function isAuthenticated(adminRequired = false) {
    return checkAuthentication({ 
        adminRequired,
        silent: true
    });
}

/**
 * Check if current user has admin privileges
 * @returns {boolean} True if user is admin
 */
function isAdmin() {
    const authData = isAuthenticated();
    return authData && authData.isAdmin;
}

/**
 * Clear authentication data and redirect to login
 * @param {string} message - Optional logout message
 * @param {boolean} forceRedirect - Whether to force redirect (default: true)
 */
function clearAuthAndRedirect(message = 'Logged out successfully.', forceRedirect = true) {
    // Preserve drive session data before clearing localStorage
    const driveSessionData = localStorage.getItem('current_drive_session');
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    // Restore drive session data after clearing auth data
    if (driveSessionData) {
        localStorage.setItem('current_drive_session', driveSessionData);
    }
    
    if (typeof showNotification === 'function') {
        const messageType = forceRedirect ? 'success' : 'warning';
        showNotification(message, messageType);
    }
    
    if (forceRedirect) {
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

/**
 * Enhanced fetchWithAuth that uses centralized auth checking
 * This extends the existing fetchWithAuth with better error handling
 */
function enhancedFetchWithAuth(url, options = {}) {
    // Check authentication before making request
    const authData = isAuthenticated();
    if (!authData) {
        if (typeof showNotification === 'function') {
            showNotification('Authentication check failed. Please login for API access.', 'warning');
        }
        return Promise.reject(new Error('Not authenticated'));
    }

    // Check if there are missing requirements
    if (authData.missingRequirement) {
        if (typeof showNotification === 'function') {
            const messages = {
                'authentication_token': 'Authentication token missing. Please login to access this feature.',
                'valid_session': 'Session expired. Please login to access this feature.',
                'admin_privileges': 'Admin privileges required. Some features may be unavailable.',
                'valid_token_data': 'Authentication data invalid. Please login to access this feature.'
            };
            showNotification(messages[authData.missingRequirement] || 'Authentication issue detected.', 'warning');
        }
        return Promise.reject(new Error(`Missing requirement: ${authData.missingRequirement}`));
    }

    // Use the existing fetchWithAuth function if available
    if (typeof fetchWithAuth === 'function') {
        return fetchWithAuth(url, options);
    }

    // Fallback implementation
    const token = authData.token;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    return fetch(`${API_BASE_URL || ''}${url}`, {
        ...options,
        headers,    }).then(response => {
        if (response.status === 401) {
            console.error('=== 401 AUTH ERROR ===');
            console.error('URL that returned 401:', url);
            console.error('Request options:', options);
            console.error('Current auth token:', authData.token ? `${authData.token.substring(0, 20)}...` : 'no token');
            console.error('User data:', authData.user);
            console.error('=== END 401 DEBUG ===');
              // Show notification and redirect to login
            if (typeof showNotification === 'function') {
                showNotification('Session expired. Redirecting to login...', 'error');
            }
            
            // Clear auth data and redirect
            clearAuthAndRedirect('Authentication failed. Please login again.', true);
            
            throw new Error(`401 Unauthorized from ${url}`);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    });
}

/**
 * Make authenticated API request with appropriate token
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {string} panelType - 'client' or 'admin' (auto-detected if not provided)
 * @returns {Promise} Fetch promise
 */
async function authenticatedFetch(url, options = {}, panelType = null) {
    // Use SimpleAuth if available
    if (typeof SimpleAuth !== 'undefined') {
        return SimpleAuth.authenticatedFetch(url, options);
    }
    
    // Fallback to legacy token system
    const authData = isAuthenticated();
    if (!authData || !authData.token) {
        const message = authData && authData.missingRequirement 
            ? `Authentication issue: ${authData.missingRequirement}` 
            : 'No authentication token available';
        console.warn('authenticatedFetch:', message);
        if (typeof showNotification === 'function') {
            showNotification('Authentication required for this request. Please login.', 'warning');
        }
        throw new Error(message);
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`,
        ...options.headers
    };    
    return fetch(url, {
        ...options,
        headers    }).then(response => {
        // Handle 401 responses - redirect to login
        if (response.status === 401) {
            console.error('=== 401 AUTH ERROR ===');
            console.error('URL that returned 401:', url);
            console.error('Request options:', options);
            console.error('Current auth token:', authData.token ? `${authData.token.substring(0, 20)}...` : 'no token');
            console.error('User data:', authData);
            console.error('=== END 401 DEBUG ===');
              // Show notification and redirect to login
            if (typeof showNotification === 'function') {
                showNotification('Session expired. Redirecting to login...', 'error');
            }
            
            // Clear auth data and redirect
            clearAuthAndRedirect('Authentication failed. Please login again.', true);
            
            throw new Error(`401 Unauthorized from ${url}`);
        }
        return response;
    });
}

/**
 * Get current authentication token for the appropriate panel
 * @param {string} panelType - 'client' or 'admin' (auto-detected if not provided)
 * @returns {string|null} Token or null if not found
 */
function getAuthToken(panelType = null) {
    // Use SimpleAuth if available
    if (typeof SimpleAuth !== 'undefined') {
        return SimpleAuth.getToken();
    }
    
    // Fallback to legacy system
    const authData = isAuthenticated();
    if (authData && authData.token) {
        return authData.token;
    }
    
    // Show informative message if there are missing requirements
    if (authData && authData.missingRequirement) {
        console.warn(`getAuthToken: ${authData.missingRequirement}`);
    }    
    return null;
}

// Make functions available globally
window.checkAuthentication = checkAuthentication;
window.requireAuth = requireAuth;
window.isAuthenticated = isAuthenticated;
window.isAdmin = isAdmin;
window.clearAuthAndRedirect = clearAuthAndRedirect;
window.enhancedFetchWithAuth = enhancedFetchWithAuth;
window.authenticatedFetch = authenticatedFetch;
window.getAuthToken = getAuthToken;
