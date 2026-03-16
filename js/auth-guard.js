/**
 * Enhanced Authentication Guard for Protected Pages
 * 
 * This module provides comprehensive authentication checking and automatic
 * redirection to login page when authentication fails.
 * 
 * Usage:
 * 1. Include this script after auth-check.js
 * 2. Call authGuard() in your page's DOMContentLoaded event
 * 3. Optionally specify if admin access is required
 */

/**
 * Authentication guard function for protected pages
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAdmin - Whether admin privileges are required (default: false)
 * @param {string} options.redirectUrl - URL to redirect to on auth failure (default: 'login.html')
 * @param {string} options.pageTitle - Page title for logging purposes
 * @param {Function} options.onAuthSuccess - Callback function called on successful authentication
 * @param {Function} options.onAuthFailure - Callback function called on authentication failure (before redirect)
 * @returns {Promise<Object|null>} Returns auth data on success, null on failure
 */
async function authGuard(options = {}) {
    const {
        requireAdmin = false,
        redirectUrl = 'login.html',
        pageTitle = 'Protected Page',
        onAuthSuccess = null,
        onAuthFailure = null
    } = options;

    console.log(`[AuthGuard] Checking authentication for: ${pageTitle}`);

    try {
        // Perform authentication check
        const authResult = checkAuthentication({
            adminRequired: requireAdmin,
            redirectPath: redirectUrl,
            silent: false
        });

        // If authResult is null, the user has been redirected
        if (!authResult) {
            console.log(`[AuthGuard] Authentication failed for ${pageTitle} - user redirected to ${redirectUrl}`);
            
            if (onAuthFailure && typeof onAuthFailure === 'function') {
                try {
                    onAuthFailure();
                } catch (callbackError) {
                    console.error('[AuthGuard] Error in onAuthFailure callback:', callbackError);
                }
            }
            
            return null;
        }

        // Check if user has limited access (missing requirements)
        if (authResult.hasLimitedAccess || authResult.missingRequirement) {
            console.warn(`[AuthGuard] Limited access detected for ${pageTitle}:`, authResult.missingRequirement);
            
            // For pages that absolutely require authentication, redirect anyway
            if (requireAdmin && authResult.missingRequirement === 'admin_privileges') {
                console.log(`[AuthGuard] Admin required but user lacks privileges - redirecting`);
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
                return null;
            }
        }

        console.log(`[AuthGuard] Authentication successful for ${pageTitle}`);
        
        if (onAuthSuccess && typeof onAuthSuccess === 'function') {
            try {
                await onAuthSuccess(authResult);
            } catch (callbackError) {
                console.error('[AuthGuard] Error in onAuthSuccess callback:', callbackError);
            }
        }

        return authResult;

    } catch (error) {
        console.error(`[AuthGuard] Error during authentication check for ${pageTitle}:`, error);
        
        // On error, redirect to login as a safety measure
        if (typeof showNotification === 'function') {
            showNotification('Authentication error occurred. Redirecting to login...', 'error');
        }
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 2000);
        
        return null;
    }
}

/**
 * Quick authentication guard for pages that just need basic user authentication
 * @param {string} pageTitle - Page title for logging
 * @returns {Promise<Object|null>} Auth data on success, null on failure
 */
async function requireUserAuth(pageTitle = 'User Page') {
    return authGuard({
        requireAdmin: false,
        pageTitle: pageTitle
    });
}

/**
 * Authentication guard for admin-only pages
 * @param {string} pageTitle - Page title for logging
 * @returns {Promise<Object|null>} Auth data on success, null on failure
 */
async function requireAdminAuth(pageTitle = 'Admin Page') {
    return authGuard({
        requireAdmin: true,
        pageTitle: pageTitle,
        redirectUrl: 'admin-login.html' // Redirect to admin login
    });
}

/**
 * Setup automatic authentication monitoring for the current page
 * This will periodically check token validity and redirect if expired
 * @param {number} intervalMinutes - How often to check (default: 5 minutes)
 */
function setupAuthMonitoring(intervalMinutes = 5) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(() => {
        console.log('[AuthGuard] Performing periodic authentication check');
        
        const authResult = isAuthenticated();
        if (!authResult || authResult.missingRequirement === 'valid_session') {
            console.warn('[AuthGuard] Periodic check failed - session expired');
            
            if (typeof showNotification === 'function') {
                showNotification('Your session has expired. Redirecting to login...', 'warning');
            }
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }, intervalMs);
    
    console.log(`[AuthGuard] Authentication monitoring enabled (checking every ${intervalMinutes} minutes)`);
}

/**
 * Enhanced page protection that combines auth guard with monitoring
 * @param {Object} options - Same options as authGuard plus monitoring options
 * @param {boolean} options.enableMonitoring - Whether to enable periodic monitoring (default: true)
 * @param {number} options.monitoringInterval - Monitoring interval in minutes (default: 5)
 */
async function protectPage(options = {}) {
    const {
        enableMonitoring = true,
        monitoringInterval = 5,
        ...guardOptions
    } = options;

    // First, check authentication
    const authResult = await authGuard(guardOptions);
    
    if (authResult && enableMonitoring) {
        // If authentication successful, setup monitoring
        setupAuthMonitoring(monitoringInterval);
    }
    
    return authResult;
}

// Make functions available globally
window.authGuard = authGuard;
window.requireUserAuth = requireUserAuth;
window.requireAdminAuth = requireAdminAuth;
window.setupAuthMonitoring = setupAuthMonitoring;
window.protectPage = protectPage;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        authGuard,
        requireUserAuth,
        requireAdminAuth,
        setupAuthMonitoring,
        protectPage
    };
}
