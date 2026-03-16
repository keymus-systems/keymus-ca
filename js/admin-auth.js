/**
 * Admin Authentication Helper - Simplified to match admin.js
 */

// Immediately check if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
  // Check if this is an admin page that requires authentication
  checkAdminAuth();
  
  // Set up logout functionality if the button exists
  const logoutBtn = document.querySelector('.logout-btn') || document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }
  
  // Add CSRF token meta tag if it doesn't exist
  if (!document.querySelector('meta[name="csrf-token"]')) {
    const metaTag = document.createElement('meta');
    metaTag.name = 'csrf-token';
    metaTag.content = generateCSRFToken();
    document.head.appendChild(metaTag);
  }
});

/**
 * Check if admin is authenticated
 * If not, redirect to login page
 */
function checkAdminAuth() {
  // Use DualAuth system consistently
  let token;
  if (typeof DualAuth !== 'undefined') {
    token = DualAuth.getToken('admin');
  } else {
    // Fall back to the standardized admin token key
    token = localStorage.getItem('admin_auth_token');
    
    // For backward compatibility, check old token location
    if (!token) {
      token = localStorage.getItem('auth_token');
      // If found in old location, migrate it to the new standardized location
      if (token) {
        localStorage.setItem('admin_auth_token', token);
        console.log('Migrated admin token to standardized location');
      }
    }
  }
  
  if (!token) {
    // Redirect to main admin page instead of login
    window.location.href = '/admin.html';
    return;
  }

  // Update the UI with the admin's username if available
  const adminUsernameEl = document.getElementById('adminUsername');
  if (adminUsernameEl) {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        adminUsernameEl.textContent = user.username || 'Admin';
      } catch (e) {
        adminUsernameEl.textContent = 'Admin';
      }
    }
  }
}

/**
 * Logout admin user
 */
function logoutAdmin() {
  // Use DualAuth system if available
  if (typeof DualAuth !== 'undefined') {
    DualAuth.clearAuth('admin');
  } else {
    // Otherwise clear both token locations
    localStorage.removeItem('admin_auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
  
  // Redirect to the main admin page
  window.location.href = '/admin.html';
}

/**
 * Redirect to admin dashboard
 */
function redirectToLogin() {
  console.warn('Authentication required. Redirecting to admin panel.');
  
  // Clear the tokens since they're invalid or expired
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  
  // Redirect to the admin panel
  window.location.href = '/admin.html';
}

/**
 * Generate a random CSRF token
 */
function generateCSRFToken() {
  return Array(32)
    .fill(0)
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
}

/**
 * Get admin token from local storage
 */
function getAdminToken() {
  return localStorage.getItem('adminToken');
}

/**
 * Check if user has admin role
 */
function isAdmin() {
  const adminToken = localStorage.getItem('adminToken');
  return !!adminToken;
}
