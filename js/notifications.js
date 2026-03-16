document.addEventListener('DOMContentLoaded', async () => {
  // Use centralized authentication check
  const authData = checkAuthentication();
  if (!authData) {
    return; // checkAuthentication will handle redirect
  }

  // Initialize i18n first before doing anything else
  if (typeof initI18next === 'function') {
    try {
      await initI18next();
      console.log('i18n initialized successfully');
      
      // Update all translations after i18n is ready
      if (typeof updateContent === 'function') {
        updateContent();
      }
    } catch (error) {
      console.error('Failed to initialize i18n:', error);
    }  }
  
  // Tab switching logic
  const tabGeneral = document.getElementById('tab-general');
  const tabUser = document.getElementById('tab-user');
  const generalContent = document.getElementById('general-content');
  const userContent = document.getElementById('user-content');
  const generalList = document.getElementById('general-list');
  const userList = document.getElementById('user-list');

  // Notification modal elements
  const notificationDetailModal = new bootstrap.Modal(document.getElementById('notificationDetailModal'));
  const notificationModalBody = document.getElementById('notificationModalBody');

  // Make these functions accessible globally for i18n hooks
  window.notificationDetailModal = notificationDetailModal;
  window.notificationModalBody = notificationModalBody;
  window.createGeneralNotificationElement = createGeneralNotificationElement;
  
  let generalNotificationsInterval;
  const MAX_GENERAL_NOTIFICATIONS = 10;

  // Initial state
  generalContent.classList.add('active');
  tabGeneral.classList.add('active');
  startGeneralNotifications(); // Start generating and displaying general notifications

  tabGeneral.addEventListener('click', () => {
    tabGeneral.classList.add('active');
    tabUser.classList.remove('active');
    generalContent.classList.add('active');
    userContent.classList.remove('active');
    startGeneralNotifications(); // Start generating and displaying general notifications
    stopUserNotifications(); // Stop fetching user notifications
  });

  tabUser.addEventListener('click', () => {
    tabUser.classList.add('active');
    tabGeneral.classList.remove('active');
    userContent.classList.add('active');
    generalContent.classList.remove('active');
    stopGeneralNotifications(); // Stop generating general notifications
    fetchUserNotifications(); // Fetch and display user notifications
  });

  // Function to generate a random user code (e.g., 6 random alphanumeric characters)
  function generateUserCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Function to generate a random USDT figure between 5,000 and 50,000
  function generateRandomUSDT() {
    return (Math.random() * (50000 - 5000) + 5000).toFixed(0);
  }  // Function to generate a single random general notification
  function generateRandomGeneralNotification() {
    const userCode = generateUserCode();
    const amount = generateRandomUSDT();
    const type = Math.random() > 0.5 ? 'withdrawn' : 'deposited';
    
    // Create message that can be translated
    let message;
    if (type === 'withdrawn') {
      message = `User '${userCode}' has withdrawn ${amount} USDT.`;
    } else {
      message = `User '${userCode}' has deposited ${amount} USDT.`;
    }
    
    return {
      message: message,
      type: type,
      userCode: userCode,
      amount: amount,
      created_at: new Date().toISOString() // Use current time for display
    };
  }

  // Function to add a new general notification to the list
  function addGeneralNotification() {
    const newNotification = generateRandomGeneralNotification();
    const notificationElement = createGeneralNotificationElement(newNotification);

    // Add the new notification to the top
    if (generalList.firstChild) {
      generalList.insertBefore(notificationElement, generalList.firstChild);
    } else {
      generalList.appendChild(notificationElement);
    }

    // Remove the oldest notification if the list exceeds the max limit
    while (generalList.children.length > MAX_GENERAL_NOTIFICATIONS) {
      generalList.removeChild(generalList.lastChild);
    }
  }

  // Function to start generating general notifications at intervals
  function startGeneralNotifications() {
    // Clear existing interval if any
    stopGeneralNotifications();

    // Generate initial set of notifications
    generalList.innerHTML = ''; // Clear the list before adding initial notifications
    for (let i = 0; i < MAX_GENERAL_NOTIFICATIONS; i++) {
        addGeneralNotification();
    }


    // Start interval for new notifications
    generalNotificationsInterval = setInterval(() => {
      addGeneralNotification();
    }, Math.random() * (120000 - 30000) + 30000); // Random interval between 30 seconds and 2 minutes
  }

  // Function to stop generating general notifications
  function stopGeneralNotifications() {
    clearInterval(generalNotificationsInterval);
  }  // Function to create the HTML element for a general notification (card design)
  function createGeneralNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'card cardd mb-2 notification-item'; // Added card classes
    
    // Handle notification message with i18n support
    let displayMessage = notification.message;
    
    // If i18next is available, translate common notification patterns
    if (window.i18next) {
      // For withdrawal notifications
      if (notification.type === 'withdrawn') {
        displayMessage = window.i18next.t('notificationWithdrawn', {
          userCode: notification.userCode,
          amount: notification.amount
        });
      } 
      // For deposit notifications
      else if (notification.type === 'deposited') {
        displayMessage = window.i18next.t('notificationDeposited', {
          userCode: notification.userCode,
          amount: notification.amount
        });
      }
    }
    
    div.innerHTML = `
      <div class="card-body">
        <div class="row">
          <div class="col-auto">
            <div class="avatar avatar-30 shadow rounded-circle">
              <img src="./assets/frontend/img/user.jpg" alt="" width="90"> <!-- Placeholder image -->
            </div>
          </div>
          <div class="col-auto align-self-center ps-0">
            <p class="size-12"><b>${displayMessage}</b></p>
            <div style="font-size:12px;color:#888;">${new Date(notification.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
    return div;
  }  // Function to fetch and display user notifications
  function fetchUserNotifications() {
    // Translation for loading message
    const loadingMessage = window.i18next ? window.i18next.t('notificationLoading', 'Loading user notifications...') : 'Loading user notifications...';
    userList.innerHTML = `<div>${loadingMessage}</div>`; // Loading indicator

    fetchWithAuth('/api/user/notifications')
      .then(data => {
        if (data.success) {
          renderUserNotifications(data.notifications, userList); // Use data.notifications
        } else {
          const errorMessage = window.i18next ? 
            window.i18next.t('notificationFetchError', { error: data.message || 'Unknown error' }) : 
            `Error fetching notifications: ${data.message || 'Unknown error'}`;
          userList.innerHTML = `<div>${errorMessage}</div>`;
        }
      })
      .catch(error => {
        console.error('Error fetching user notifications:', error);
        const errorMessage = window.i18next ? 
          window.i18next.t('notificationFetchError', { error: error.message }) : 
          `Error fetching notifications: ${error.message}`;
        userList.innerHTML = `<div>${errorMessage}</div>`;
      });
  }

  // Function to stop fetching user notifications (no ongoing fetch, just clear the list)
  function stopUserNotifications() {
      userList.innerHTML = ''; // Clear the list when switching away
  }  // Function to render user notifications (with unread indicator, categories, colors, and images)
  function renderUserNotifications(list, container) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
      const emptyMessage = window.i18next ? window.i18next.t('notificationEmpty') : 'No notifications to display.';
      container.innerHTML = `<div class="text-center my-4">${emptyMessage}</div>`;
      return;
    }
    list.forEach(n => {
      const div = document.createElement('div');
      div.className = 'card cardd mb-2 notification-item user-notification' + (n.is_read === false && !n.is_general ? ' unread' : '');
      div.dataset.notificationId = n.id;
      div.dataset.isRead = n.is_read || n.is_general; // General notifications are always considered "read"
      div.dataset.message = n.message;
      div.dataset.title = n.title || '';
      div.dataset.isGeneral = n.is_general || false;
      
      // Determine category color and icon
      const categoryColor = n.category_color || '#007bff';
      const categoryIcon = n.category_icon || 'fas fa-bell';
      const categoryName = n.category_name || 'General';
      
      // Prepare image display
      const imageHtml = n.image_url ? 
        `<img src="${n.image_url}" alt="Notification" class="notification-image rounded" style="width: 60px; height: 60px; object-fit: cover;">` :
        `<div class="avatar avatar-30 shadow rounded-circle" style="background-color: ${categoryColor}; color: white; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px;">
          <i class="${categoryIcon}" style="font-size: 20px;"></i>
        </div>`;
      
      // Priority indicator
      const priorityClass = n.priority > 3 ? 'high-priority' : n.priority > 1 ? 'medium-priority' : 'normal-priority';
      const priorityIndicator = n.priority > 3 ? '<span class="badge bg-danger ms-1">!</span>' : '';
      
      div.innerHTML = `
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-auto">
              ${imageHtml}
            </div>
            <div class="col">
              <div class="d-flex align-items-center mb-1">
                <span class="badge" style="background-color: ${categoryColor}; font-size: 10px;">${categoryName}</span>
                ${priorityIndicator}
                ${n.is_general ? '<span class="badge bg-info ms-1" style="font-size: 10px;">Public</span>' : ''}
              </div>
              ${n.title ? `<div class="fw-bold ${priorityClass}" style="font-size: 14px;">${n.title}</div>` : ''}
              <div class="notification-message" style="font-size: 13px; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${n.message}
              </div>
              <div style="font-size: 11px; color: #888; margin-top: 4px;">
                ${new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add click listener for user notifications
      if (!n.is_general) {
        div.addEventListener('click', handleUserNotificationClick);
        div.style.cursor = 'pointer';
      } else {
        // For general notifications, just show in modal without marking as read
        div.addEventListener('click', handleGeneralNotificationClick);
        div.style.cursor = 'pointer';
      }
      
      container.appendChild(div);
    });
  }  // Function to handle user notification click
  function handleUserNotificationClick(event) {
      const notificationElement = event.currentTarget;
      const notificationId = notificationElement.dataset.notificationId;
      const isRead = notificationElement.dataset.isRead === 'true';
      const messageContent = notificationElement.dataset.message;
      const titleContent = notificationElement.dataset.title || '';

      // Display message in modal with enhanced styling
      const modalTitle = titleContent || (window.i18next ? window.i18next.t('notificationDetails') : 'Notification Details');
      document.getElementById('notificationDetailModalLabel').textContent = modalTitle;
      
      notificationModalBody.innerHTML = `
        <div class="notification-detail-content">
          ${titleContent ? `<h6 class="fw-bold mb-3">${titleContent}</h6>` : ''}
          <p class="notification-message">${messageContent}</p>
          <div class="notification-meta mt-3 pt-2 border-top">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>
              ${new Date().toLocaleString()}
            </small>
          </div>
        </div>
      `;
      notificationDetailModal.show();      if (!isRead) {
          // Mark as read on the backend
          fetchWithAuth(`/api/user/notifications/${notificationId}/read`, {
              method: 'PUT'
          })
          .then(data => {
              if (data.success) {
                  // Update UI to show as read
                  notificationElement.classList.remove('unread');
                  notificationElement.dataset.isRead = 'true';
                  console.log(`Notification ${notificationId} marked as read.`);
              } else {
                  console.error('Failed to mark notification as read:', data.message);
              }
          })
          .catch(error => {
              console.error('Error marking notification as read:', error);
          });
      }
  }

  // Function to handle general notification click (no read marking needed)
  function handleGeneralNotificationClick(event) {
      const notificationElement = event.currentTarget;
      const messageContent = notificationElement.dataset.message;
      const titleContent = notificationElement.dataset.title || '';

      // Display message in modal
      const modalTitle = titleContent || (window.i18next ? window.i18next.t('notificationDetails') : 'Public Announcement');
      document.getElementById('notificationDetailModalLabel').textContent = modalTitle;
      
      notificationModalBody.innerHTML = `
        <div class="notification-detail-content">
          <div class="alert alert-info mb-3">
            <i class="fas fa-bullhorn me-2"></i>
            ${window.i18next ? window.i18next.t('publicNotificationLabel') : 'Public Announcement'}
          </div>
          ${titleContent ? `<h6 class="fw-bold mb-3">${titleContent}</h6>` : ''}
          <p class="notification-message">${messageContent}</p>
          <div class="notification-meta mt-3 pt-2 border-top">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>
              ${new Date().toLocaleString()}
            </small>
          </div>
        </div>
      `;
      notificationDetailModal.show();
  }

});
