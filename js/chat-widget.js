/**
 * Floating Chat Widget
 * Provides easy access to chat from any page
 */

// Create and inject the floating chat button
function createChatWidget() {
    // Check if widget already exists
    if (document.getElementById('floating-chat-widget')) {
        return;
    }

    // Create the floating chat button
    const chatWidget = document.createElement('div');
    chatWidget.id = 'floating-chat-widget';
    chatWidget.className = 'floating-chat-widget';
    
    chatWidget.innerHTML = `
        <div class="chat-widget-button" onclick="openChatPage()">
            <i class="fas fa-comments"></i>
            <span class="chat-notification-badge" id="chatWidgetBadge" style="display: none;">0</span>
        </div>
        <div class="chat-widget-tooltip">Open Chat</div>
    `;
    
    // Add to body
    document.body.appendChild(chatWidget);
}

// Function to open chat page
function openChatPage() {
    window.location.href = './chat/';
}

// Function to update the chat widget badge
async function updateChatWidgetBadge() {
    try {
        // Check if user is authenticated
        let isUserAuthenticated = false;
        let fetchFunction = null;
        
        if (typeof SimpleAuth !== 'undefined') {
            isUserAuthenticated = SimpleAuth.isAuthenticated();
            if (isUserAuthenticated && SimpleAuth.authenticatedFetch) {
                fetchFunction = SimpleAuth.authenticatedFetch.bind(SimpleAuth);
            }
        } else if (typeof isAuthenticated === 'function') {
            const authData = isAuthenticated();
            isUserAuthenticated = authData && authData.token;
            if (typeof fetchWithAuth === 'function') {
                fetchFunction = fetchWithAuth;
            }
        } else {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
            isUserAuthenticated = !!token;
            if (isUserAuthenticated) {
                fetchFunction = async (url, options = {}) => {
                    return fetch(url, {
                        ...options,
                        headers: {
                            ...options.headers,
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                };
            }
        }
        
        if (!isUserAuthenticated || !fetchFunction) {
            // Hide badge for unauthenticated users
            const badge = document.getElementById('chatWidgetBadge');
            if (badge) {
                badge.style.display = 'none';
            }
            return;
        }
        
        // Fetch unread chat count
        const response = await fetchFunction('/api/chat/unread-count');
        let unreadData;
        
        if (response && typeof response.json === 'function') {
            unreadData = await response.json();
        } else if (response && typeof response === 'object') {
            unreadData = response;
        } else {
            return; // Failed to get data
        }
        
        // Update badge
        const badge = document.getElementById('chatWidgetBadge');
        if (badge && unreadData && typeof unreadData.unread_count === 'number') {
            if (unreadData.unread_count > 0) {
                badge.textContent = unreadData.unread_count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error updating chat widget badge:', error);
        // Don't show error to user, just log it
    }
}

// Initialize the chat widget when DOM is loaded
function initializeChatWidget() {
    // Create the widget
    createChatWidget();
    
    // Update badge initially
    setTimeout(() => {
        updateChatWidgetBadge();
    }, 1000); // Wait a bit for auth to be ready
    
    // Update badge periodically
    setInterval(updateChatWidgetBadge, 30000); // Every 30 seconds
    
    // Update when page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateChatWidgetBadge();
        }
    });
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatWidget);
} else {
    initializeChatWidget();
}
