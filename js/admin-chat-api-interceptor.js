/**
 * Admin Chat API Authentication Interceptor
 * Ensures seamless authentication between admin panel and chat management
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check for admin session when page loads
  checkAdminSession();
  
  // Update username if available
  updateAdminUsername();
});

/**
 * Check if admin session exists
 */
function checkAdminSession() {
  fetch('/api/admin/check-session', {
    method: 'GET',
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      redirectToAdminPanel();
      return null;
    }
    return response.json();
  })
  .then(data => {
    if (!data || !data.authenticated) {
      redirectToAdminPanel();
    }
  })
  .catch(error => {
    console.error('Session check failed:', error);
    redirectToAdminPanel();
  });
}

/**
 * Update admin username from session data
 */
function updateAdminUsername() {
  const usernameElement = document.getElementById('adminUsername');
  if (!usernameElement) return;
  
  fetch('/api/admin/profile', {
    method: 'GET',
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) return null;
    return response.json();
  })
  .then(data => {
    if (data && data.username) {
      usernameElement.textContent = data.username;
    }
  })
  .catch(error => {
    console.error('Failed to get admin profile:', error);
  });
}

/**
 * Redirect to admin panel
 */
function redirectToAdminPanel() {
  // window.location.href = '/admin.html';
}
