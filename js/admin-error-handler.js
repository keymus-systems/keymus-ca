/**
 * Admin Error Handling Utility
 * Provides standardized error handling and notifications across admin interfaces
 */

const AdminErrorHandler = (() => {
  // Configuration
  const config = {
    notificationDuration: 5000, // 5 seconds
    consoleLogging: true
  };
  
  /**
   * Display a notification to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of notification (success, error, warning, info)
   * @param {Object} options - Additional options
   */
  const showNotification = (message, type = 'info', options = {}) => {
    // Log to console if enabled
    if (config.consoleLogging) {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // Check if AdminUI notification system exists (main admin panel)
    if (window.AdminUI && window.AdminUI.showNotification) {
      window.AdminUI.showNotification(type, message, options);
      return;
    }
    
    // Check for notification system in admin.js
    if (window.showAdminNotification) {
      window.showAdminNotification(type, message, options);
      return;
    }
    
    // Create an in-page notification if no existing system found
    const notificationContainer = document.getElementById('notification-container') || 
      createNotificationContainer();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${getBootstrapClass(type)} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    
    // Set content
    notification.innerHTML = `
      ${getIconForType(type)} <span>${message}</span>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Auto-remove after duration
    const duration = options.duration || config.notificationDuration;
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300); // Allow time for fade out animation
    }, duration);
  };
  
  /**
   * Handle API errors in a standardized way
   * @param {Error} error - The error object
   * @param {Object} options - Additional options
   */
  const handleApiError = (error, options = {}) => {
    // Skip notification for auth redirects if specified
    if (options.skipAuthErrors && 
        (error.message === 'Unauthorized' || 
         error.message.includes('Authentication required'))) {
      return;
    }
    
    // Log error to console
    if (config.consoleLogging) {
      console.error('API error:', error);
    }
    
    // Show notification
    showNotification(
      options.customMessage || error.message || 'An error occurred', 
      'error',
      options
    );
    
    // Handle authentication errors
    if (error.status === 401 || error.status === 403 || 
        error.message === 'Unauthorized' || 
        error.message.includes('Authentication required')) {
      handleAuthError(options);
    }
    
    return null;
  };
  
  /**
   * Handle authentication errors
   * @param {Object} options - Additional options
   */
  const handleAuthError = (options = {}) => {
    // Clear authentication tokens
    if (typeof DualAuth !== 'undefined') {
      DualAuth.clearAuth('admin');
    } else {
      localStorage.removeItem('admin_auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    
    // Redirect if not prevented
    if (!options.preventRedirect) {
      setTimeout(() => {
        window.location.href = '/admin.html';
      }, 1000); // Small delay to allow error message to be seen
    }
  };
  
  // Helper: Create notification container if it doesn't exist
  const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
    return container;
  };
  
  // Helper: Get Bootstrap alert class from notification type
  const getBootstrapClass = (type) => {
    switch(type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': default: return 'info';
    }
  };
  
  // Helper: Get icon for notification type
  const getIconForType = (type) => {
    switch(type) {
      case 'success': return '<i class="fas fa-check-circle"></i>';
      case 'error': return '<i class="fas fa-exclamation-circle"></i>';
      case 'warning': return '<i class="fas fa-exclamation-triangle"></i>';
      case 'info': default: return '<i class="fas fa-info-circle"></i>';
    }
  };
  
  // Public API
  return {
    showNotification,
    handleApiError,
    handleAuthError,
    setConfig: (newConfig) => {
      Object.assign(config, newConfig);
    }
  };
})();

// Make the error handler available globally
window.AdminErrorHandler = AdminErrorHandler;
