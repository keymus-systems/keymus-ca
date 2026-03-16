// This should be your API base URL, for example:
// const API_BASE_URL = ''; // Empty if API is on same origin
// or
// Only declare API_BASE_URL if it hasn't been declared yet
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:3000'; // If API is on a different port
}

// Function to display notifications on the page
function showNotification(message, type = 'info', duration = 5000) {
    // If i18next is available and the message is a translation key, translate it
    if (window.i18next && window.i18next.isInitialized && typeof message === 'string' && i18next.exists(message)) {
        message = i18next.t(message);
    }
    
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // Create individual notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border-left: 4px solid;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.4;
        position: relative;
        pointer-events: auto;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    let icon = '';
    let borderColor = '';
    let backgroundColor = '';
    
    // Style based on type
    if (type === 'success') {
        icon = '✓';
        borderColor = '#10B981';
        backgroundColor = 'rgba(16, 185, 129, 0.1)';
        notification.style.color = '#065F46';
    } else if (type === 'error') {
        icon = '✕';
        borderColor = '#EF4444';
        backgroundColor = 'rgba(239, 68, 68, 0.1)';
        notification.style.color = '#991B1B';
    } else if (type === 'warning') {
        icon = '⚠';
        borderColor = '#F59E0B';
        backgroundColor = 'rgba(245, 158, 11, 0.1)';
        notification.style.color = '#92400E';
    } else { // info
        icon = 'ℹ';
        borderColor = '#3B82F6';
        backgroundColor = 'rgba(59, 130, 246, 0.1)';
        notification.style.color = '#1E40AF';
    }
    
    notification.style.borderLeftColor = borderColor;
    notification.style.background = `linear-gradient(135deg, ${backgroundColor}, rgba(255, 255, 255, 0.9))`;
    
    // Add icon and message
    notification.innerHTML = `
        <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${borderColor};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            flex-shrink: 0;
        ">${icon}</div>
        <div style="flex: 1;">${message}</div>
        <div style="
            cursor: pointer;
            color: #6B7280;
            font-size: 18px;
            line-height: 1;
            padding: 2px;
            border-radius: 4px;
            transition: all 0.2s ease;
        " onclick="this.parentElement.style.transform='translateX(100%)'; setTimeout(() => this.parentElement.remove(), 300);">×</div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-hide after duration
    if (duration > 0) {
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
    
    return notification;
}

// Modern confirmation dialog
function showConfirmDialog(message, title = 'Confirm', options = {}) {
    return new Promise((resolve) => {
        const {
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'info' // 'info', 'warning', 'danger'
        } = options;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 15000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: scale(0.8);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        let iconColor = '#3B82F6';
        let confirmButtonColor = '#3B82F6';
        
        if (type === 'warning') {
            iconColor = '#F59E0B';
            confirmButtonColor = '#F59E0B';
        } else if (type === 'danger') {
            iconColor = '#EF4444';
            confirmButtonColor = '#EF4444';
        }
        
        dialog.innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: ${iconColor}20;
                    margin: 0 auto 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                ">${type === 'warning' ? '⚠️' : type === 'danger' ? '⚠️' : 'ℹ️'}</div>
                <h3 style="
                    margin: 0 0 12px 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                ">${title}</h3>
                <p style="
                    margin: 0;
                    font-size: 16px;
                    color: #6B7280;
                    line-height: 1.5;
                ">${message}</p>
            </div>
            <div style="
                display: flex;
                gap: 12px;
                justify-content: center;
            ">
                <button id="dialog-cancel" style="
                    padding: 12px 24px;
                    border: 2px solid #E5E7EB;
                    background: white;
                    color: #6B7280;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                ">${cancelText}</button>
                <button id="dialog-confirm" style="
                    padding: 12px 24px;
                    border: none;
                    background: ${confirmButtonColor};
                    color: white;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                ">${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Animate in
        setTimeout(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        }, 50);
        
        // Add hover effects
        const cancelBtn = dialog.querySelector('#dialog-cancel');
        const confirmBtn = dialog.querySelector('#dialog-confirm');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.borderColor = '#9CA3AF';
            cancelBtn.style.color = '#374151';
        });
        
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.borderColor = '#E5E7EB';
            cancelBtn.style.color = '#6B7280';
        });
        
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.transform = 'translateY(-1px)';
            confirmBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.transform = 'translateY(0)';
            confirmBtn.style.boxShadow = 'none';
        });
        
        // Handle clicks
        const closeDialog = (result) => {
            overlay.style.opacity = '0';
            dialog.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(result);
            }, 300);
        };
        
        cancelBtn.addEventListener('click', () => closeDialog(false));
        confirmBtn.addEventListener('click', () => closeDialog(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog(false);
        });
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                closeDialog(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Function to display validation errors near form elements
function showError(element, message) {
    // Remove existing error message for this element
    const existingError = element.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message'; // Use class for styling via CSS if needed
    errorDiv.style.color = '#dc3545'; // Bootstrap danger color
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = message;
    
    // Insert after the input or radio group
    if (element.type === 'radio' || element.classList.contains('radio-group')) {
         // Find the parent container of the radio group to append the error
        const parentContainer = element.closest('.radio-group') || element.parentNode;
        parentContainer.appendChild(errorDiv); 
    } else {
        element.parentNode.appendChild(errorDiv);
        element.style.borderColor = '#dc3545'; // Highlight the input border
    }
}

// Function to clear validation errors
function clearErrors(formElement) {
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
    formElement.querySelectorAll('input, select, textarea').forEach(el => {
        el.style.borderColor = '#ddd'; // Reset border color
    });
}

// Function to get JWT token from localStorage
function getToken() {
    return localStorage.getItem('auth_token');
}

// Global flag to prevent multiple 401 dialogs (avoid redeclaration)
if (typeof window.is401HandlerActive === 'undefined') {
    window.is401HandlerActive = false;
}

// Function to handle 401 authentication errors with a proper dialog
async function handle401Error() {
    // Prevent multiple simultaneous 401 handlers
    if (window.is401HandlerActive) {
        return;
    }
    window.is401HandlerActive = true;

    try {
        // Show signing out dialog
        await showSigningOutDialog();
        
        // Preserve drive session data before clearing localStorage
        const driveSessionData = localStorage.getItem('current_drive_session');
        
        // Clear authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        // Restore drive session data after clearing auth data
        if (driveSessionData) {
            localStorage.setItem('current_drive_session', driveSessionData);
        }
          // Short delay before redirect
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error in 401 handler:', error);
        // Force redirect even if there's an error
        window.location.href = 'login.html';
    } finally {
        // Reset the flag in case redirect fails
        setTimeout(() => {
            window.is401HandlerActive = false;
        }, 2000);
    }
}

// Function to show signing out dialog
function showSigningOutDialog() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'signing-out-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        // Create spinning icon
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: spin 1s linear infinite;
        `;

        const icon = document.createElement('i');
        icon.className = 'fas fa-sign-out-alt';
        icon.style.cssText = `
            color: white;
            font-size: 24px;
        `;

        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Signing Out';
        title.style.cssText = `
            margin: 0 0 12px 0;
            color: #2D3748;
            font-size: 20px;
            font-weight: 600;
        `;

        // Create message
        const message = document.createElement('p');
        message.textContent = 'Your session has expired. Please wait while we sign you out...';
        message.style.cssText = `
            margin: 0;
            color: #4A5568;
            font-size: 14px;
            line-height: 1.5;
        `;

        // Add spinning animation
        if (!document.querySelector('#signing-out-styles')) {
            const style = document.createElement('style');
            style.id = 'signing-out-styles';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        // Assemble dialog
        iconContainer.appendChild(icon);
        dialog.appendChild(iconContainer);
        dialog.appendChild(title);
        dialog.appendChild(message);
        overlay.appendChild(dialog);
        
        // Add to document
        document.body.appendChild(overlay);

        // Trigger animations
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        });

        // Resolve after animation and a short display time
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

// Function to make authenticated API requests
// *** PRODUCTION MODE - REDIRECTS ENABLED ***
// - 401 error redirects are now active
// - Authentication failures will redirect to login page
// - Users will be automatically logged out on auth failures
// *** END NOTE ***

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        });        // Handle 401 (Unauthorized) upfront
        if (response.status === 401) {
            console.error('=== 401 AUTH ERROR (fetchWithAuth) ===');
            console.error('URL that returned 401:', url);
            console.error('Full URL:', `${API_BASE_URL}${url}`);
            console.error('Request options:', options);
            console.error('Request headers:', headers);
            console.error('Current token:', token ? `${token.substring(0, 20)}...` : 'no token');
            console.error('Response status:', response.status);
            console.error('Response statusText:', response.statusText);
            console.error('=== END 401 DEBUG ===');
              // Handle 401 with proper redirect
            showNotification('Session expired. Redirecting to login...', 'error');
            
            // Use the global 401 handler
            handle401Error();
            
            throw new Error(`401 Unauthorized from ${url}`);
        }// Handle other errors
        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (parseErr) {
                // If parsing fails, create a generic error message
                errorData = { 
                    message: `HTTP ${response.status}: ${response.statusText}` 
                };
            }
            const errorMsg = errorData.message || `Error status ${response.status}`;
            console.error('API Error Response:', errorData);
            throw new Error(errorMsg);
        }

        return await response.json();    } catch (error) {
        console.error('API request error:', error);
        
        // Don't show notifications for 401 errors (handled separately) or password change errors
        if (!error.message.includes('Authentication expired') && 
            error.message !== 'Unauthorized' && 
            !url.includes('/password/')) {
            showNotification('Network error or server issue. Please try again.', 'error');
        }
        throw error;
    }
}

// Global error handler for fetch requests
window.addEventListener('unhandledrejection', function(event) {
    // Check if this is a 401 authentication error
    if (event.reason && event.reason.message && event.reason.message.includes('401')) {
        console.warn('Unhandled 401 error detected:', event.reason);
        console.error('=== 401 AUTH ERROR (unhandledrejection) ===');
        console.error('Rejection reason:', event.reason);
        console.error('=== END 401 DEBUG ===');
        
        // Handle 401 with proper redirect
        event.preventDefault(); // Prevent the default unhandled rejection behavior
        
        if (typeof showNotification === 'function') {
            showNotification('Session expired. Redirecting to login...', 'error');
        }
        
        // Only handle if our main handler hasn't been triggered
        if (!window.is401HandlerActive) {
            handle401Error();
        }
    }
});

// Also handle fetch errors that might not be promises
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('401')) {
        console.warn('Unhandled 401 error detected in error event:', event.error);
        console.error('=== 401 AUTH ERROR (error event) ===');
        console.error('Error object:', event.error);
        console.error('Event details:', event);
        console.error('=== END 401 DEBUG ===');
        
        // Handle 401 with proper redirect
        if (typeof showNotification === 'function') {
            showNotification('Session expired. Redirecting to login...', 'error');
        }
        
        if (!window.is401HandlerActive) {
            handle401Error();
        }
    }
});

// Global copy to clipboard function
window.copyToClipboard = async function(text, successMessage = 'Copied to clipboard!') {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            // Modern async clipboard API
            await navigator.clipboard.writeText(text);
            showNotification(successMessage, 'success');
            return true;
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            textArea.style.pointerEvents = 'none';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                showNotification(successMessage, 'success');
                return true;
            } else {
                showNotification('Failed to copy to clipboard', 'error');
                return false;
            }
        }
    } catch (error) {
        console.error('Failed to copy text: ', error);
        showNotification('Failed to copy to clipboard', 'error');
        return false;
    }
};

// Debug function to check authentication status
window.debugAuthStatus = function() {
    console.log('=== Authentication Debug Info ===');
    
    // Check localStorage
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    console.log('User data in localStorage:', userData ? JSON.parse(userData) : 'NOT FOUND');
    
    // Check authentication functions
    if (typeof isAuthenticated === 'function') {
        const authResult = isAuthenticated();
        console.log('isAuthenticated() result:', authResult);
    }
    
    if (typeof requireAuth === 'function') {
        const requireResult = requireAuth();
        console.log('requireAuth() result:', requireResult);
    }
    
    // Test API call
    if (token) {
        fetch(`${window.API_BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            console.log('Direct API test - Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Direct API test - Response data:', data);
        })
        .catch(error => {
            console.log('Direct API test - Error:', error);
        });
    }
    
    console.log('=== End Authentication Debug ===');
};
