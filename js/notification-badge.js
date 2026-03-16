// notification-badge.js - Handle dynamic notification badge count
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize notification badge
    await updateNotificationBadge();
    
    // Update badge every 30 seconds
    setInterval(updateNotificationBadge, 30000);
});

/**
 * Update the notification badge with unread count
 */
async function updateNotificationBadge() {
    try {
        const authData = JSON.parse(localStorage.getItem('authData'));
        if (!authData || !authData.token) {
            return; // Not authenticated
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:3000'}/api/user/notifications`, {
            headers: {
                'Authorization': `Bearer ${authData.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.notifications) {
            // Count unread notifications (excluding general notifications)
            const unreadCount = data.notifications.filter(notification => 
                !notification.is_read && !notification.is_general
            ).length;
            
            updateBadgeDisplay(unreadCount);
        }
    } catch (error) {
        console.error('Error fetching notification count:', error);
    }
}

/**
 * Update the visual display of the notification badge
 * @param {number} count - Number of unread notifications
 */
function updateBadgeDisplay(count) {
    const badge = document.querySelector('.count-notif');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count.toString();
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.minWidth = '18px';
        badge.style.height = '18px';
        badge.style.fontSize = '11px';
        badge.style.fontWeight = 'bold';
        badge.style.color = 'white';
        badge.style.backgroundColor = '#dc3545';
        badge.style.borderRadius = '50%';
        badge.style.position = 'absolute';
        badge.style.top = '-8px';
        badge.style.right = '-8px';
        badge.style.animation = 'pulse 2s infinite';
        
        // Add pulse animation if not already added
        if (!document.getElementById('badge-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'badge-pulse-style';
            style.textContent = `
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        badge.textContent = '';
        badge.style.display = 'none';
    }
}

/**
 * Mark a notification as read and update badge
 * @param {string} notificationId - ID of the notification to mark as read
 */
async function markNotificationAsRead(notificationId) {
    try {
        const authData = JSON.parse(localStorage.getItem('authData'));
        if (!authData || !authData.token) {
            return false;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:3000'}/api/user/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authData.token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            // Update badge after marking as read
            await updateNotificationBadge();
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

// Make functions globally available
window.updateNotificationBadge = updateNotificationBadge;
window.markNotificationAsRead = markNotificationAsRead;
