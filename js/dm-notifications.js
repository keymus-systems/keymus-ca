/**
 * Toast notification utility for the DM module
 */

class DMNotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * Initialize the notification system
   */
  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('dm-notification-container')) {
      this.container = document.createElement('div');
      this.container.id = 'dm-notification-container';
      this.container.className = 'dm-notification-container';
      document.body.appendChild(this.container);
      
      // Add style if not already present
      if (!document.getElementById('dm-notification-style')) {
        const style = document.createElement('style');
        style.id = 'dm-notification-style';
        style.textContent = `
          .dm-notification-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            width: 300px;
            max-width: 100%;
          }
          
          .dm-notification {
            background-color: #fff;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-top: 10px;
            padding: 12px 15px;
            display: flex;
            align-items: center;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            overflow: hidden;
            position: relative;
          }
          
          .dm-notification.visible {
            transform: translateX(0);
          }
          
          .dm-notification-success {
            border-left: 4px solid #28a745;
          }
          
          .dm-notification-error {
            border-left: 4px solid #dc3545;
          }
          
          .dm-notification-info {
            border-left: 4px solid #17a2b8;
          }
          
          .dm-notification-warning {
            border-left: 4px solid #ffc107;
          }
          
          .dm-notification-icon {
            margin-right: 12px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .dm-notification-success .dm-notification-icon {
            color: #28a745;
          }
          
          .dm-notification-error .dm-notification-icon {
            color: #dc3545;
          }
          
          .dm-notification-info .dm-notification-icon {
            color: #17a2b8;
          }
          
          .dm-notification-warning .dm-notification-icon {
            color: #ffc107;
          }
          
          .dm-notification-content {
            flex: 1;
          }
          
          .dm-notification-content p {
            margin: 0;
            font-size: 14px;
            line-height: 1.4;
          }
          
          .dm-notification-close {
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            font-size: 14px;
            margin-left: 8px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .dm-notification-close:hover {
            color: #343a40;
          }
          
          .dm-notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background-color: rgba(0, 0, 0, 0.1);
            width: 100%;
          }
          
          .dm-notification-progress-bar {
            height: 100%;
            width: 100%;
            transform-origin: left;
            background-color: currentColor;
          }
          
          @media (max-width: 576px) {
            .dm-notification-container {
              bottom: 10px;
              right: 10px;
              left: 10px;
              width: auto;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.container = document.getElementById('dm-notification-container');
    }
  }

  /**
   * Show a notification
   * @param {string} message - The notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} duration - Duration in milliseconds
   * @returns {Object} - Notification object with id and methods
   */
  show(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `dm-notification dm-notification-${type}`;
    
    // Determine icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    // Create notification content
    notification.innerHTML = `
      <div class="dm-notification-icon">
        <i class="${iconClass}"></i>
      </div>
      <div class="dm-notification-content">
        <p>${message}</p>
      </div>
      <button class="dm-notification-close">
        <i class="fas fa-times"></i>
      </button>
      <div class="dm-notification-progress">
        <div class="dm-notification-progress-bar"></div>
      </div>
    `;
    
    // Add to container
    this.container.appendChild(notification);
    
    // Add visible class after a small delay (for animation)
    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);
    
    // Animate progress bar
    const progressBar = notification.querySelector('.dm-notification-progress-bar');
    progressBar.style.transition = `transform ${duration / 1000}s linear`;
    progressBar.style.transform = 'scaleX(0)';
    
    // Create notification object
    const id = Date.now();
    const notificationObj = {
      id,
      element: notification,
      close: () => this.close(notification)
    };
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.dm-notification-close');
    closeBtn.addEventListener('click', () => {
      this.close(notification);
    });
    
    // Auto close after duration
    if (duration > 0) {
      setTimeout(() => {
        this.close(notification);
      }, duration);
    }
    
    return notificationObj;
  }

  /**
   * Close a notification
   * @param {HTMLElement} notification - The notification element
   */
  close(notification) {
    notification.classList.remove('visible');
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Show a success notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   */
  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show an error notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   */
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show an info notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   */
  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Show a warning notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   */
  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }
}

// Create and export the notification system
const dmNotifications = new DMNotificationSystem();
