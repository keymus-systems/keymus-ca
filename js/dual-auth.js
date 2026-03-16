/**
 * Dual Authentication System
 * Provides a unified interface for handling both client and admin authentication tokens.
 * This system is designed to replace scattered localStorage access and provide a clear,
 * centralized way to manage authentication data.
 */
const DualAuth = (() => {
    const clientTokenKey = 'auth_token';
    const adminTokenKey = 'admin_auth_token'; // Standardized admin token key
    const userDataKey = 'user_data';

    /**
     * Get the authentication token for a specific user type.
     * @param {string} type - 'client' or 'admin'.
     * @returns {string|null} The authentication token or null if not found.
     */
    const getToken = (type) => {
        const key = type === 'admin' ? adminTokenKey : clientTokenKey;
        return localStorage.getItem(key);
    };

    /**
     * Set the authentication token for a specific user type.
     * @param {string} type - 'client' or 'admin'.
     * @param {string} token - The authentication token to store.
     */
    const setToken = (type, token) => {
        const key = type === 'admin' ? adminTokenKey : clientTokenKey;
        localStorage.setItem(key, token);
    };

    /**
     * Get user data from localStorage.
     * @returns {object|null} The parsed user data or null if not found.
     */
    const getUserData = () => {
        const data = localStorage.getItem(userDataKey);
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
            return null;
        }
    };

    /**
     * Set user data in localStorage.
     * @param {object} userData - The user data object to store.
     */
    const setUserData = (userData) => {
        localStorage.setItem(userDataKey, JSON.stringify(userData));
    };

    /**
     * Clear all authentication data (tokens and user data).
     * @param {string} type - 'client', 'admin', or 'all'.
     */
    const clearAuth = (type = 'all') => {
        if (type === 'admin' || type === 'all') {
            localStorage.removeItem(adminTokenKey);
        }
        if (type === 'client' || type === 'all') {
            localStorage.removeItem(clientTokenKey);
            localStorage.removeItem(userDataKey);
        }
    };

    /**
     * Check if a user is authenticated for a specific type.
     * @param {string} type - 'client' or 'admin'.
     * @returns {boolean} True if a token exists, false otherwise.
     */
    const isAuthenticated = (type) => {
        return !!getToken(type);
    };

    /**
     * Performs an authenticated fetch request using the appropriate token.
     * @param {string} endpoint - The API endpoint to call.
     * @param {object} options - Standard fetch options.
     * @param {string} type - 'client' or 'admin'.
     * @returns {Promise<Response>} The fetch promise.
     */
    const fetchWithAuth = async (endpoint, options = {}, type) => {
        const token = getToken(type);
        if (!token) {
            console.error(`DualAuth: No token found for type '${type}'.`);
            // Redirect to appropriate login page
            window.location.href = type === 'admin' ? '/admin.html' : '/login.html';
            return Promise.reject(new Error('Not authorized'));
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };
        
        // Set Content-Type to application/json by default if not a FormData request
        if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(endpoint, { ...options, headers });

        if (response.status === 401) {
            console.error(`DualAuth: Unauthorized (401) for type '${type}'. Token may be expired or invalid.`);
            clearAuth(type);
            window.location.href = type === 'admin' ? '/admin.html' : '/login.html';
            throw new Error('Unauthorized');
        }

        return response;
    };

    return {
        getToken,
        setToken,
        getUserData,
        setUserData,
        clearAuth,
        isAuthenticated,
        fetchWithAuth
    };
})();
