/**
 * Admin Chat Management
 * Main JavaScript for the admin chat management interface
 */

// Utility function to show error messages
function showError(message, type = 'error') {
  console.error('[AdminChat] ' + (type === 'error' ? 'Error:' : 'Info:'), message);
  
  if (!message || type === 'info') return; // Don't show empty or info messages
  
  // Try to use the existing notification system if available
  if (window.AdminUI && window.AdminUI.showNotification) {
    window.AdminUI.showNotification(type, message);
    return;
  }
  
  // Create a temporary error display element
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : '#28a745'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Utility function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility function to format date
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if AdminChatAPI is available
  if (typeof AdminChatAPI === 'undefined') {
    console.error('[AdminChat] AdminChatAPI is not loaded. Make sure admin-chat-api.js is loaded before this script.');
    
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed; top: 20px; left: 20px; right: 20px; z-index: 10000;
      background: #dc3545; color: white; padding: 15px; border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    errorDiv.textContent = 'Error: Chat API is not loaded. Please refresh the page.';
    document.body.appendChild(errorDiv);
    return;
  }
  
  // Check if user is authenticated as admin
  // Temporarily commented out for testing
  /*
  const authData = requireAuth(true); // true for admin required
  if (!authData) {
    return; // requireAuth will handle redirect
  }
  */
  console.log('[AdminChat] Skipping auth check for testing purposes');

  // Initialize the main admin chat application
  window.adminChatApp = new AdminChatApp();
  window.adminChatApp.init();
});

/**
 * Main Admin Chat Application Class
 */
class AdminChatApp {
  constructor() {
    this.fakeUsers = [];
    this.currentView = 'conversations'; // 'conversations', 'fake-users'
    this.conversationsComponent = null;
    this.messagesComponent = null;
    
    // State management
    this.state = {
      ui: {},
      currentConversation: null,
      selectedPersona: null
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('[AdminChat] Initializing admin chat application...');
      
      // Cache DOM elements
      this.cacheUIElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize components
      this.initializeComponents();
      
      // Load initial data
      await this.loadInitialData();
      
      // Set initial view
      this.showConversationsView();
      
      console.log('[AdminChat] Admin chat application initialized successfully');
    } catch (error) {
      console.error('[AdminChat] Failed to initialize:', error);
      this.showError('Failed to initialize admin chat interface');
    }
  }

  /**
   * Cache DOM elements for easy access
   */
  cacheUIElements() {
    // Main navigation
    this.state.ui.conversationsTab = document.getElementById('conversationsTab');
    this.state.ui.fakeUsersTab = document.getElementById('fakeUsersTab');
    
    // View containers
    this.state.ui.conversationsView = document.getElementById('conversationsView');
    this.state.ui.fakeUsersView = document.getElementById('fakeUsersView');
    
    // Legacy elements (for fake users functionality)
    this.state.ui.groupsList = document.getElementById('groupsViewList');
    this.state.ui.groupSearch = document.getElementById('groupSearch');
    this.state.ui.searchGroupsBtn = document.getElementById('searchGroupsBtn');
    this.state.ui.groupsPagination = document.getElementById('groupsPagination');
    
    this.state.ui.usersList = document.getElementById('usersList');
    this.state.ui.fakeUserSearchInput = document.getElementById('userSearch');
    this.state.ui.searchUsersBtn = document.getElementById('searchUsersBtn');
    this.state.ui.usersPagination = document.getElementById('usersPagination');
    
    console.log('[AdminChat] UI elements cached');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Tab navigation
    if (this.state.ui.conversationsTab) {
      this.state.ui.conversationsTab.addEventListener('click', () => {
        this.showConversationsView();
      });
    }
    
    if (this.state.ui.fakeUsersTab) {
      this.state.ui.fakeUsersTab.addEventListener('click', () => {
        this.showFakeUsersView();
      });
    }

    // Legacy fake users functionality
    if (this.state.ui.searchUsersBtn) {
      this.state.ui.searchUsersBtn.addEventListener('click', () => {
        const search = this.state.ui.fakeUserSearchInput?.value || '';
        this.loadFakeUsers(search);
      });
    }

    if (this.state.ui.fakeUserSearchInput) {
      this.state.ui.fakeUserSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const search = e.target.value || '';
          this.loadFakeUsers(search);
        }
      });
    }

    console.log('[AdminChat] Event listeners set up');
  }

  /**
   * Initialize components
   */
  initializeComponents() {
    // Initialize conversations component
    if (typeof AdminChatConversations !== 'undefined') {
      this.conversationsComponent = new AdminChatConversations(this);
      this.conversationsComponent.init();
      
      // Make it globally accessible for pagination
      window.adminChatConversations = this.conversationsComponent;
    }

    // Initialize messages component
    if (typeof AdminChatMessages !== 'undefined') {
      this.messagesComponent = new AdminChatMessages(this);
      this.messagesComponent.init();
      
      // Make it globally accessible
      window.adminChatMessages = this.messagesComponent;
    }

    console.log('[AdminChat] Components initialized');
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    // Load fake users for persona selection
    await this.loadFakeUsers();
    
    // Populate persona selector
    this.populatePersonaSelector();
  }

  /**
   * Show conversations view
   */
  showConversationsView() {
    this.currentView = 'conversations';
    
    // Update tab states
    this.state.ui.conversationsTab?.classList.add('active');
    this.state.ui.fakeUsersTab?.classList.remove('active');
    
    // Show/hide views
    this.state.ui.conversationsView?.classList.remove('hidden');
    this.state.ui.fakeUsersView?.classList.add('hidden');
    
    console.log('[AdminChat] Switched to conversations view');
  }

  /**
   * Show fake users view (legacy)
   */
  showFakeUsersView() {
    this.currentView = 'fake-users';
    
    // Update tab states
    this.state.ui.conversationsTab?.classList.remove('active');
    this.state.ui.fakeUsersTab?.classList.add('active');
    
    // Show/hide views
    this.state.ui.conversationsView?.classList.add('hidden');
    this.state.ui.fakeUsersView?.classList.remove('hidden');
    
    console.log('[AdminChat] Switched to fake users view');
  }

  /**
   * Load conversation (called by conversations component)
   */
  async loadConversation(conversationId) {
    this.state.currentConversation = conversationId;
    
    if (this.messagesComponent) {
      await this.messagesComponent.loadConversation(conversationId);
    }
  }

  /**
   * Populate persona selector dropdown
   */
  populatePersonaSelector() {
    const personaSelect = document.getElementById('personaSelect');
    if (!personaSelect || !this.fakeUsers) return;

    personaSelect.innerHTML = '<option value="">Select a persona...</option>';
    
    this.fakeUsers.forEach(persona => {
      const option = document.createElement('option');
      option.value = persona.id;
      option.textContent = persona.display_name || persona.username;
      personaSelect.appendChild(option);
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    showError(message, 'error');
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    showError(message, 'success');
  }

  // ===== LEGACY FAKE USERS FUNCTIONALITY =====
  // (Keeping for backward compatibility)

  /**
   * Load fake users (legacy functionality)
   */
  async loadFakeUsers(search = '', page = 1) {
    try {
      console.log('[AdminChat] Loading fake users...', { search, page });
      
      const response = await AdminChatAPI.getAllFakeUsers(page, 50, search);
      
      if (response && response.users) {
        this.fakeUsers = response.users;
        this.renderFakeUsersList(response.users);
        this.renderUsersPagination(response.pagination);
        this.populatePersonaSelector(); // Update persona selector
        console.log('[AdminChat] Fake users loaded successfully:', this.fakeUsers.length);
      } else {
        console.error('[AdminChat] Invalid response format:', response);
        this.showError('Failed to load fake users - invalid response format');
      }
    } catch (error) {
      console.error('[AdminChat] Error loading fake users:', error);
      this.showError('Failed to load fake users');
    }
  }

  /**
   * Render fake users list (legacy)
   */
  renderFakeUsersList(users) {
    const usersList = this.state.ui.usersList;
    if (!usersList) {
      console.warn('[AdminChat] Users list element not found');
      return;
    }
    
    if (!users || users.length === 0) {
      usersList.innerHTML = '<div class="no-users">No fake users found</div>';
      return;
    }
    
    usersList.innerHTML = users.map(user => `
      <div class="user-item" data-user-id="${user.id}">
        <div class="user-avatar">
          ${user.avatar_url 
            ? `<img src="${user.avatar_url}" alt="${escapeHtml(user.display_name)}" class="avatar-img">` 
            : `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`
          }
        </div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.display_name || user.username)}</div>
          <div class="user-details">
            <span class="user-username">@${escapeHtml(user.username)}</span>
            <span class="user-stats">
              ${user.group_count || 0} groups • ${user.message_count || 0} messages
            </span>
          </div>
          ${user.bio ? `<div class="user-bio">${escapeHtml(user.bio)}</div>` : ''}
        </div>
        <div class="user-actions">
          <button class="btn btn-sm btn-primary" onclick="selectFakeUser(${user.id})">
            <i class="fas fa-comment"></i> Select
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="editFakeUser(${user.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteFakeUser(${user.id})">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `).join('');
    
    console.log('[AdminChat] Rendered fake users list');
  }

  /**
   * Render users pagination (legacy)
   */
  renderUsersPagination(pagination) {
    const paginationContainer = this.state.ui.usersPagination;
    if (!paginationContainer || !pagination) return;

    if (pagination.pages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHtml = '';
    
    // Previous button
    if (pagination.page > 1) {
      paginationHtml += `<button class="pagination-btn" onclick="adminChatApp.loadFakeUsers('${this.state.ui.fakeUserSearchInput?.value || ''}', ${pagination.page - 1})">
        <i class="fas fa-chevron-left"></i> Previous
      </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" 
        onclick="adminChatApp.loadFakeUsers('${this.state.ui.fakeUserSearchInput?.value || ''}', ${i})">${i}</button>`;
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
      paginationHtml += `<button class="pagination-btn" onclick="adminChatApp.loadFakeUsers('${this.state.ui.fakeUserSearchInput?.value || ''}', ${pagination.page + 1})">
        Next <i class="fas fa-chevron-right"></i>
      </button>`;
    }
    
    paginationContainer.innerHTML = paginationHtml;
  }
}

// ===== GLOBAL FUNCTIONS FOR LEGACY COMPATIBILITY =====

// Select fake user (placeholder)
window.selectFakeUser = function(userId) {
  console.log('Select fake user:', userId);
  if (window.adminChatApp && window.adminChatApp.messagesComponent) {
    window.adminChatApp.messagesComponent.selectPersona(userId);
  }
  showError('Fake user selected for messaging', 'success');
};

// Edit fake user (placeholder)
window.editFakeUser = function(userId) {
  showError('Fake user editing is not yet implemented', 'info');
  console.log('Edit fake user:', userId);
};

// Delete fake user (placeholder)
window.deleteFakeUser = function(userId) {
  if (confirm('Are you sure you want to delete this fake user? This action cannot be undone.')) {
    showError('Fake user deletion is not yet implemented', 'info');
    console.log('Delete fake user:', userId);
  }
};

// Open create fake user dialog (placeholder)
window.openCreateFakeUserDialog = function() {
  showError('Fake user creation is not yet implemented', 'info');
  console.log('Open create fake user dialog');
};
  
  // DOM Elements - Message Panel
  const selectedGroupElement = document.getElementById('selectedGroup');
  const selectedUserElement = document.getElementById('selectedUser');
  const messageContent = document.getElementById('messageContent');
  const messageType = document.getElementById('messageType');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const previewBtn = document.getElementById('previewBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const scheduledList = document.getElementById('scheduledList');
  
  // DOM Elements - Preview Modal
  const previewModal = document.getElementById('previewModal');
  const chatPreview = document.getElementById('chatPreview');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  
  // DOM Elements - Schedule Modal
  const scheduleModal = document.getElementById('scheduleModal');
  const scheduleDate = document.getElementById('scheduleDate');
  const scheduleTime = document.getElementById('scheduleTime');
  const isRecurring = document.getElementById('isRecurring');
  const recurringOptions = document.getElementById('recurringOptions');
  const recurringFrequency = document.getElementById('recurringFrequency');
  const recurringInterval = document.getElementById('recurringInterval');
  const intervalLabel = document.getElementById('intervalLabel');
  const recurringEnd = document.getElementById('recurringEnd');
  const confirmScheduleBtn = document.getElementById('confirmScheduleBtn');
  const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
  
  // DOM Elements - Logs Modal
  const logsModal = document.getElementById('logsModal');
  const viewLogsBtn = document.getElementById('viewLogsBtn');
  const logsTableBody = document.getElementById('logsTableBody');
  const logActionType = document.getElementById('logActionType');
  const logStartDate = document.getElementById('logStartDate');
  const logEndDate = document.getElementById('logEndDate');
  const filterLogsBtn = document.getElementById('filterLogsBtn');
  const logsPagination = document.getElementById('logsPagination');
  const closeLogsBtn = document.getElementById('closeLogsBtn');
  
  // DOM Elements - Other
  const refreshBtn = document.getElementById('refreshBtn');
  const closeModalButtons = document.querySelectorAll('.close-modal');
  
  // State
  let state = {
    groups: {
      data: [],
      page: 1,
      limit: 50,
      total: 0,
      search: '',
      selected: null
    },
    users: {
      data: [],
      page: 1,
      limit: 100,
      total: 0,
      search: '',
      selected: null
    },
    fakeUsers: {
      data: [],
      page: 1,
      limit: 50,
      total: 0,
      pagination: null
    },
    scheduledMessages: {
      data: [],
      page: 1,
      limit: 10,
      total: 0
    },
    logs: {
      data: [],
      page: 1,
      limit: 50,
      total: 0,
      filters: {}
    },
    ui: {
      fakeUserSearchInput: null, // Reference to the fake user search input element
      usersList: null,           // Reference to the users list element
      usersPagination: null      // Reference to the users pagination element
    }
  };
  
  // Initialize
  init();
  
  // Initialize the application
  async function init() {
    // Validate that all required DOM elements exist
    const requiredElements = {
      groupsList: 'groupsViewList',
      groupSearch: 'groupSearch', 
      searchGroupsBtn: 'searchGroupsBtn',
      groupsPagination: 'groupsPagination',
      usersList: 'usersList',
      userSearch: 'userSearch',
      searchUsersBtn: 'searchUsersBtn',
      messageContent: 'messageContent',
      sendMessageBtn: 'sendMessageBtn'
    };
    
    const missingElements = [];
    for (const [varName, elementId] of Object.entries(requiredElements)) {
      const element = document.getElementById(elementId);
      if (!element) {
        missingElements.push(`${varName} (ID: ${elementId})`);
      }
    }
    
    if (missingElements.length > 0) {
      console.error('[AdminChat] Missing required DOM elements:', missingElements);
      const errorMessage = `Failed to initialize: Missing DOM elements: ${missingElements.join(', ')}`;
      
      // Show error in a visible way
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed; top: 20px; left: 20px; right: 20px;
        background: #dc3545; color: white; padding: 15px; border-radius: 6px;
        z-index: 10000; font-family: monospace; font-size: 14px;
      `;
      errorDiv.textContent = errorMessage;
      document.body.appendChild(errorDiv);
      
      return; // Don't continue initialization
    }
    
    // Use same auth check as admin.js - just proceed, let API calls handle auth
    console.log('Initializing admin chat...');
    
    // Cache UI elements in state
    state.ui.usersList = document.getElementById('usersList');
    state.ui.usersPagination = document.getElementById('usersPagination');
    state.ui.fakeUserSearchInput = document.getElementById('userSearch');
    
    // Load initial data for legacy composer (if needed)
    loadGroups();
    
    // Load groups for the new message viewing interface
    loadGroupsForViewing();
    
    // Load fake users for the users panel
    loadFakeUsers();
    
    // Add event listeners
    addEventListeners();
    
    // Initialize modals
    initModals();
    
    // Set today's date as default for scheduler
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    if (scheduleDate) scheduleDate.value = dateStr;
    
    // Set default time as 1 hour from now
    const nextHour = new Date(today.getTime() + (60 * 60 * 1000));
    const timeStr = nextHour.getHours().toString().padStart(2, '0') + ':' + 
                   nextHour.getMinutes().toString().padStart(2, '0');
    if (scheduleTime) scheduleTime.value = timeStr;
  }
  
  // Add event listeners with null checks
  function addEventListeners() {
    // Groups panel
    if (searchGroupsBtn) {
      searchGroupsBtn.addEventListener('click', () => {
        state.groups.search = groupSearch ? groupSearch.value.trim() : '';
        state.groups.page = 1;
        loadGroups();
      });
    }
    
    if (groupSearch) {
      groupSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          state.groups.search = groupSearch.value.trim();
          state.groups.page = 1;
          loadGroups();
        }
      });
    }
    
    // Users panel
    if (searchUsersBtn) {
      searchUsersBtn.addEventListener('click', () => {
        const searchTerm = userSearch ? userSearch.value.trim() : '';
        if (state.groups.selected) {
          // Search users within the selected group
          state.users.search = searchTerm;
          state.users.page = 1;
          loadUsersForGroup(state.groups.selected.id);
        } else {
          // Search fake users when no group is selected
          loadFakeUsers(searchTerm);
        }
      });
    }
    
    if (userSearch) {
      userSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const searchTerm = userSearch.value.trim();
          if (state.groups.selected) {
            // Search users within the selected group
            state.users.search = searchTerm;
            state.users.page = 1;
            loadUsersForGroup(state.groups.selected.id);
          } else {
            // Search fake users when no group is selected
            loadFakeUsers(searchTerm);
          }
        }
      });
    }
    
    // Message panel
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', sendMessage);
    }
    if (previewBtn) {
      previewBtn.addEventListener('click', showPreviewModal);
    }
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', showScheduleModal);
    }
    
    // Schedule modal
    if (isRecurring) {
      isRecurring.addEventListener('change', () => {
        if (recurringOptions) {
          recurringOptions.style.display = isRecurring.checked ? 'block' : 'none';
        }
      });
    }
    
    if (recurringFrequency) {
      recurringFrequency.addEventListener('change', updateIntervalLabel);
    }
    if (confirmScheduleBtn) {
      confirmScheduleBtn.addEventListener('click', scheduleMessage);
    }
    if (cancelScheduleBtn) {
      cancelScheduleBtn.addEventListener('click', () => {
        if (scheduleModal) {
          scheduleModal.style.display = 'none';
        }
      });
    }
    
    // Logs modal
    if (viewLogsBtn) {
      viewLogsBtn.addEventListener('click', () => {
        loadLogs();
        if (logsModal) {
          logsModal.style.display = 'block';
        }
      });
    }
    
    if (filterLogsBtn) {
      filterLogsBtn.addEventListener('click', () => {
        state.logs.filters = {
          actionType: logActionType ? logActionType.value : '',
          startDate: logStartDate ? logStartDate.value : '',
          endDate: logEndDate ? logEndDate.value : ''
        };
        state.logs.page = 1;
        loadLogs();
      });
    }
    
    if (closeLogsBtn) {
      closeLogsBtn.addEventListener('click', () => {
        if (logsModal) {
          logsModal.style.display = 'none';
        }
      });
    }
    
    // Other
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadGroups();
        if (state.groups.selected) {
          loadUsersForGroup(state.groups.selected.id);
          loadScheduledMessages();
        }
      });
    }
    
    // Close modal buttons
    if (closeModalButtons && closeModalButtons.length > 0) {
      closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
          const modal = button.closest('.modal');
          if (modal) {
            modal.style.display = 'none';
          }
        });
      });
    }
    
    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('click', () => {
        if (previewModal) {
          previewModal.style.display = 'none';
        }
      });
    }
    
    // Tab functionality for Groups/Direct Messages
    const groupsTab = document.getElementById('groupsTab');
    const directMessagesTab = document.getElementById('directMessagesTab');
    
    if (groupsTab) {
      groupsTab.addEventListener('click', () => switchTab('groups'));
    }
    
    if (directMessagesTab) {
      directMessagesTab.addEventListener('click', () => switchTab('direct-messages'));
    }
  }
  
  // Initialize modals
  function initModals() {
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });
  }
  
  // Update interval label based on frequency
  function updateIntervalLabel() {
    if (!recurringFrequency || !intervalLabel) {
      console.warn('[updateIntervalLabel] Required elements not found');
      return;
    }
    
    const frequency = recurringFrequency.value;
    switch (frequency) {
      case 'daily':
        intervalLabel.textContent = 'day(s)';
        break;
      case 'weekly':
        intervalLabel.textContent = 'week(s)';
        break;
      case 'monthly':
        intervalLabel.textContent = 'month(s)';
        break;
      default:
        intervalLabel.textContent = 'interval(s)';
    }
  }
  
  // Load groups
  async function loadGroups() {
    if (!groupsList) {
      console.error('[loadGroups] groupsList element not found');
      return;
    }
    
    groupsList.innerHTML = '<div class="loading">Loading groups...</div>';
    
    const { page, limit, search } = state.groups;
    const result = await AdminChatAPI.getGroups(page, limit, search);
    
    if (result) {
      state.groups.data = result.groups;
      state.groups.total = result.pagination.total;
      
      renderGroups();
      renderPagination(groupsPagination, state.groups, loadGroups);
    }
  }
  
  // Render groups
  function renderGroups() {
    if (state.groups.data.length === 0) {
      groupsList.innerHTML = '<div class="empty-state">No groups found</div>';
      return;
    }
    
    let html = '';
    
    state.groups.data.forEach(group => {
      const isSelected = state.groups.selected && state.groups.selected.id === group.id;
      
      html += `
        <div class="group-item ${isSelected ? 'selected' : ''}" data-id="${group.id}">
          <div class="group-name">${escapeHtml(group.name)}</div>
          <div class="group-stats">
            <div class="group-stat">
              <i class="fas fa-users"></i> ${group.member_count}
            </div>
            <div class="group-stat">
              <i class="fas fa-comment"></i> ${group.message_count}
            </div>
            <div class="group-stat">
              <i class="fas fa-clock"></i> ${formatDate(group.last_activity)}
            </div>
          </div>
        </div>
      `;
    });
    
    groupsList.innerHTML = html;
    
    // Add click event to group items
    document.querySelectorAll('.group-item').forEach(item => {
      item.addEventListener('click', () => {
        const groupId = item.dataset.id;
        selectGroup(groupId);
      });
    });
  }
  
  // Select a group
  async function selectGroup(groupId) {
    // Remove selected class from all groups
    document.querySelectorAll('.group-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selected class to clicked group
    const groupItem = document.querySelector(`.group-item[data-id="${groupId}"]`);
    if (groupItem) {
      groupItem.classList.add('selected');
    }
    
    // Get group details
    const group = await AdminChatAPI.getGroupById(groupId);
    
    if (group) {
      // Update state
      state.groups.selected = group;
      state.users.selected = null;
      
      // Update UI
      selectedGroupElement.innerHTML = `<strong>Group:</strong> ${escapeHtml(group.name)}`;
      selectedUserElement.innerHTML = 'No user selected';
      
      // Disable message controls
      messageContent.disabled = true;
      messageType.disabled = true;
      sendMessageBtn.disabled = true;
      previewBtn.disabled = true;
      scheduleBtn.disabled = true;
      
      // Load users for this group
      loadUsersForGroup(groupId);
      
      // Load scheduled messages
      loadScheduledMessages();
    }
  }
  
  // Load users for a group
  async function loadUsersForGroup(groupId) {
    usersList.innerHTML = '<div class="loading">Loading users...</div>';
    
    const { page, limit, search } = state.users;
    const result = await AdminChatAPI.getGroupMembers(groupId);
    
    if (result && result.users) {
      state.users.data = result.users;
      state.users.total = result.pagination ? result.pagination.total : result.users.length;
      
      renderUsers();
      // We don't need pagination for this simple implementation
      // renderPagination(usersPagination, state.users, () => loadUsersForGroup(groupId));
    } else {
      usersList.innerHTML = '<div class="empty-state">No users found in this group</div>';
    }
  }
  
  // Render users
  function renderUsers() {
    if (!state.users.data || state.users.data.length === 0) {
      usersList.innerHTML = '<div class="empty-state">No users found in this group</div>';
      return;
    }
    
    let html = '';
    
    state.users.data.forEach(user => {
      const isSelected = state.users.selected && state.users.selected.id === user.id;
      const avatarUrl = user.avatar_url || 'images/default-avatar.png';
      
      html += `
        <div class="user-item ${isSelected ? 'selected' : ''}" data-id="${user.id}">
          <div class="user-avatar">
            <img src="${avatarUrl}" alt="${escapeHtml(user.display_name)}">
          </div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(user.display_name)}</div>
            <div class="user-username">@${escapeHtml(user.username)}</div>
            ${user.bio ? `<div class="user-bio">${escapeHtml(user.bio.substring(0, 50))}${user.bio.length > 50 ? '...' : ''}</div>` : ''}
          </div>
        </div>
      `;
    });
    
    usersList.innerHTML = html;
    
    // Add click event to user items
    document.querySelectorAll('.user-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.id;
        selectUser(userId);
      });
    });
  }
  
  // Select a user
  async function selectUser(userId) {
    // Remove selected class from all users
    document.querySelectorAll('.user-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selected class to clicked user
    const userItem = document.querySelector(`.user-item[data-id="${userId}"]`);
    if (userItem) {
      userItem.classList.add('selected');
    }
    
    // Find user in state
    const user = state.users.data.find(u => u.id.toString() === userId.toString());
    
    if (user) {
      // Update state
      state.users.selected = user;
      
      // Update UI
      selectedUserElement.innerHTML = `<strong>User:</strong> ${escapeHtml(user.display_name)} (@${escapeHtml(user.username)})`;
      
      // Enable message controls
      messageContent.disabled = false;
      messageType.disabled = false;
      sendMessageBtn.disabled = false;
      previewBtn.disabled = false;
      scheduleBtn.disabled = false;
    }
  }
  
  // Load scheduled messages
  async function loadScheduledMessages() {
    if (!state.groups.selected) return;
    
    const groupId = state.groups.selected.id;
    const userId = state.users.selected ? state.users.selected.id : null;
    const userType = state.users.selected ? 'fake_user' : null;
    
    const result = await AdminChatAPI.getScheduledMessages(groupId, userId, userType);
    
    if (result) {
      state.scheduledMessages.data = result.messages;
      state.scheduledMessages.total = result.pagination.total;
      
      renderScheduledMessages();
    }
  }
  
  // Render scheduled messages
  function renderScheduledMessages() {
    if (state.scheduledMessages.data.length === 0) {
      scheduledList.innerHTML = '<div class="empty-state">No scheduled messages</div>';
      return;
    }
    
    let html = '';
    
    state.scheduledMessages.data.forEach(message => {
      html += `
        <div class="scheduled-item" data-id="${message.id}">
          <div class="scheduled-header">
            <div class="scheduled-time">${formatDateTime(message.scheduled_at)}</div>
            <div class="scheduled-actions">
              <button class="cancel-scheduled-btn" data-id="${message.id}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="scheduled-content">${escapeHtml(message.content)}</div>
          <div class="scheduled-meta">
            <div>Group: ${escapeHtml(message.group_name)}</div>
            <div>User: ${escapeHtml(message.user_display_name)}</div>
            ${message.is_recurring ? '<div><i class="fas fa-redo"></i> Recurring</div>' : ''}
          </div>
        </div>
      `;
    });
    
    scheduledList.innerHTML = html;
    
    // Add click event to cancel buttons
    document.querySelectorAll('.cancel-scheduled-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const messageId = button.dataset.id;
        
        if (confirm('Are you sure you want to cancel this scheduled message?')) {
          const result = await AdminChatAPI.cancelScheduledMessage(messageId);
          
          if (result) {
            // Reload scheduled messages
            loadScheduledMessages();
          }
        }
      });
    });
  }
  
  // Send a message
  async function sendMessage() {
    if (!state.groups.selected || !state.users.selected) {
      alert('Please select a group and a user first');
      return;
    }
    
    const message = messageContent.value.trim();
    
    if (!message) {
      alert('Please enter a message');
      return;
    }
    
    // Disable send button
    sendMessageBtn.disabled = true;
    
    // Send message
    const result = await AdminChatAPI.postAsFakeUser(
      state.groups.selected.id,
      state.users.selected.id,
      message,
      messageType.value
    );
    
    if (result) {
      // Clear message input
      messageContent.value = '';
      
      // Show success message
      alert('Message sent successfully');
    }
    
    // Re-enable send button
    sendMessageBtn.disabled = false;
  }
  
  // Show preview modal
  function showPreviewModal() {
    if (!state.groups.selected || !state.users.selected) {
      alert('Please select a group and a user first');
      return;
    }
    
    const message = messageContent.value.trim();
    
    if (!message) {
      alert('Please enter a message');
      return;
    }
    
    // Build preview data
    const previewData = {
      groupId: state.groups.selected.id,
      messages: [
        {
          fakeUserId: state.users.selected.id,
          content: message,
          messageType: messageType.value
        }
      ]
    };
    
    // Get preview
    AdminChatAPI.previewConversation(previewData.groupId, previewData.messages)
      .then(result => {
        if (result) {
          renderPreview(result);
          previewModal.style.display = 'block';
        }
      });
  }
  
  // Render message preview
  function renderPreview(data) {
    let html = '';
    
    data.messages.forEach(message => {
      const avatarUrl = message.user.avatar_url || 'images/default-avatar.png';
      
      html += `
        <div class="chat-message">
          <div class="chat-message-avatar">
            <img src="${avatarUrl}" alt="${escapeHtml(message.user.display_name)}">
          </div>
          <div class="chat-message-content">
            <div class="chat-message-name">${escapeHtml(message.user.display_name)}</div>
            <div class="chat-message-text">${escapeHtml(message.content)}</div>
            <div class="chat-message-time">${formatTime(new Date())}</div>
          </div>
        </div>
      `;
    });
    
    chatPreview.innerHTML = html;
  }
  
  // Show schedule modal
  function showScheduleModal() {
    if (!state.groups.selected || !state.users.selected) {
      alert('Please select a group and a user first');
      return;
    }
    
    const message = messageContent.value.trim();
    
    if (!message) {
      alert('Please enter a message');
      return;
    }
    
    // Reset recurring options
    isRecurring.checked = false;
    recurringOptions.style.display = 'none';
    
    // Show modal
    scheduleModal.style.display = 'block';
  }
  
  // Schedule a message
  async function scheduleMessage() {
    // Check if group and user are selected
    if (!state.groups.selected || !state.users.selected) {
      alert('Please select a group and a user first');
      return;
    }
    
    const message = messageContent.value.trim();
    
    if (!message) {
      alert('Please enter a message');
      return;
    }
    
    // Get scheduled date and time
    const scheduledDate = scheduleDate.value;
    const scheduledTime = scheduleTime.value;
    
    if (!scheduledDate || !scheduledTime) {
      alert('Please select a date and time');
      return;
    }
    
    // Create scheduled date object
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Check if date is in the future
    if (scheduledAt <= new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }
    
    // Get recurring info
    const recurring = isRecurring.checked;
    let recurringPattern = null;
    
    if (recurring) {
      recurringPattern = {
        frequency: recurringFrequency.value,
        interval: parseInt(recurringInterval.value),
        endDate: recurringEnd.value || null
      };
    }
    
    // Disable confirm button
    confirmScheduleBtn.disabled = true;
    
    // Schedule message
    const messageData = {
      groupId: state.groups.selected.id,
      fakeUserId: state.users.selected.id,
      message: message,
      messageType: messageType.value,
      scheduledAt: scheduledAt.toISOString(),
      isRecurring: recurring,
      recurringPattern: recurringPattern
    };
    
    const result = await AdminChatAPI.scheduleMessage(messageData);
    
    if (result) {
      // Clear message input
      messageContent.value = '';
      
      // Hide modal
      scheduleModal.style.display = 'none';
      
      // Show success message
      alert('Message scheduled successfully');
      
      // Reload scheduled messages
      loadScheduledMessages();
    }
    
    // Re-enable confirm button
    confirmScheduleBtn.disabled = false;
  }
  
  // Load admin logs
  async function loadLogs() {
    logsTableBody.innerHTML = '<tr><td colspan="6"><div class="loading">Loading logs...</div></td></tr>';
    
    const { page, limit, filters } = state.logs;
    const result = await AdminChatAPI.getAdminLogs(filters, page, limit);
    
    if (result) {
      state.logs.data = result.logs;
      state.logs.total = result.pagination.total;
      
      renderLogs();
      renderPagination(logsPagination, state.logs, loadLogs);
    }
  }
  
  // Render admin logs
  function renderLogs() {
    if (state.logs.data.length === 0) {
      logsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No logs found</td></tr>';
      return;
    }
    
    let html = '';
    
    state.logs.data.forEach(log => {
      const actionDetails = log.action_details ? JSON.stringify(log.action_details) : '';
      
      html += `
        <tr>
          <td>${formatDateTime(log.created_at)}</td>
          <td>${escapeHtml(log.admin_username || '')}</td>
          <td>${formatActionType(log.action_type)}</td>
          <td>${escapeHtml(log.group_name || '')}</td>
          <td>${escapeHtml(log.fake_user_name || '')}</td>
          <td>${actionDetails.length > 50 ? actionDetails.substring(0, 50) + '...' : actionDetails}</td>
        </tr>
      `;
    });
    
    logsTableBody.innerHTML = html;
  }
  
  // Render pagination
  function renderPagination(element, state, callback) {
    const { page, limit, total } = state;
    const pages = Math.ceil(total / limit);
    
    if (pages <= 1) {
      element.innerHTML = '';
      return;
    }
    
    let html = '';
    
    // Previous button
    html += `
      <button class="pagination-btn ${page === 1 ? 'disabled' : ''}" 
              data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
    
    // Next button
    html += `
      <button class="pagination-btn ${page === pages ? 'disabled' : ''}" 
              data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    element.innerHTML = html;
    
    // Add click event to pagination buttons
    element.querySelectorAll('.pagination-btn:not(.disabled)').forEach(button => {
      button.addEventListener('click', () => {
        const newPage = parseInt(button.dataset.page);
        state.page = newPage;
        callback();
      });
    });
  }
  
  // When the fake users tab is activated, load all users
  function showFakeUsersTab() {
    // Optionally clear any search input
    if (state.ui.fakeUserSearchInput) {
      state.ui.fakeUserSearchInput.value = '';
    }
    // Fetch all users (no search filter)
    loadFakeUsers();
  }
  
  // Load fake users, optionally with a search filter
  async function loadFakeUsers(search = '', page = 1) {
    console.log('[AdminChat] Loading fake users, search:', search, 'page:', page);
    console.log('[AdminChat] State object:', state);
    console.log('[AdminChat] State.fakeUsers:', state?.fakeUsers);
    
    try {
      showError('', 'info'); // Clear any previous errors
      
      const response = await AdminChatAPI.getAllFakeUsers(page, 50, search || '');
      console.log('[AdminChat] Fake users response:', response);
      
      if (response) {
        // Ensure fakeUsers object exists
        if (!state.fakeUsers) {
          console.warn('[AdminChat] state.fakeUsers is undefined, initializing...');
          state.fakeUsers = { data: [], pagination: null };
        }
        
        state.fakeUsers.data = response.users || response || [];
        state.fakeUsers.pagination = response.pagination || null;
        console.log('[AdminChat] Loaded fake users:', state.fakeUsers.data.length, 'users');
        renderFakeUsersList();
      } else {
        console.error('[AdminChat] No response from fake users API');
        showError('Failed to load fake users');
      }
    } catch (error) {
      console.error('[AdminChat] Error loading fake users:', error);
      showError('Error loading fake users: ' + error.message);
    }
  }

  // Render fake users list in the users panel
  function renderFakeUsersList() {
    const usersList = state.ui.usersList;
    if (!usersList) {
      console.error('Users list element not found');
      return;
    }

    const users = state.fakeUsers.data || [];
    
    if (users.length === 0) {
      usersList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>No fake users found</p>
          <button class="btn btn-primary" onclick="openCreateFakeUserDialog()">
            <i class="fas fa-plus"></i> Create First Fake User
          </button>
        </div>
      `;
      return;
    }

    const usersHtml = users.map(user => {
      // Safely escape data that goes into attributes
      const userId = parseInt(user.id) || 0;
      const username = escapeHtml(user.username || '');
      const displayName = escapeHtml(user.display_name || user.username || '');
      const avatarUrl = user.avatar_url ? escapeHtml(user.avatar_url) : '';
      const groupCount = parseInt(user.group_count) || 0;
      const messageCount = parseInt(user.message_count) || 0;
      const createdAt = formatDate(user.created_at);
      const avatarChar = displayName.charAt(0) || username.charAt(0) || '?';
      
      return `
        <div class="user-item ${state.users.selected?.id === userId ? 'selected' : ''}" 
             data-user-id="${userId}" onclick="selectFakeUser(${userId})">
          <div class="user-avatar">
            ${avatarUrl ? 
              `<img src="${avatarUrl}" alt="${displayName}" onerror="this.style.display='none'">` : 
              `<div class="avatar-placeholder">${avatarChar}</div>`
            }
          </div>
          <div class="user-info">
            <div class="user-name">${displayName}</div>
            <div class="user-details">
              <span class="username">@${username}</span>
              <span class="user-stats">
                ${groupCount} groups • ${messageCount} messages
              </span>
            </div>
            <div class="user-meta">
              <span class="created-date">Created: ${createdAt}</span>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn btn-sm" onclick="editFakeUser(${userId}); event.stopPropagation();" title="Edit User">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteFakeUser(${userId}); event.stopPropagation();" title="Delete User">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    usersList.innerHTML = usersHtml;
    
    // Update pagination if available
    if (state.fakeUsers.pagination) {
      renderUsersPagination(state.fakeUsers.pagination);
    }
  }
  
  // Helper Functions
  
  // Format date
  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }
  
  // Format date and time
  function formatDateTime(dateStr) {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  // Format time
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Format action type
  function formatActionType(actionType) {
    if (!actionType) return '';
    
    return actionType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Escape HTML
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    
    return unsafe
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // NEW FUNCTIONALITY FOR MESSAGE VIEWING AND DM MANAGEMENT
  
  // Switch between tabs (Groups and Direct Messages)
  function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
    
    // Load appropriate data
    if (tabName === 'groups') {
      loadGroupsForViewing();
    } else if (tabName === 'direct-messages') {
      loadDirectMessages();
    }
  }
  
  // Load groups for message viewing (different from the existing loadGroups)
  async function loadGroupsForViewing() {
    const groupsViewList = document.getElementById('groupsViewList');
    if (!groupsViewList) return;
    
    groupsViewList.innerHTML = '<div class="loading">Loading groups...</div>';
    
    try {
      const result = await AdminChatAPI.getGroups(1, 100, ''); // Load more groups for viewing
      
      if (result && result.groups) {
        renderGroupsForViewing(result.groups);
      }
    } catch (error) {
      console.error('Error loading groups for viewing:', error);
      groupsViewList.innerHTML = '<div class="error-state">Error loading groups</div>';
    }
  }
  
  // Render groups list for message viewing
  function renderGroupsForViewing(groups) {
    const groupsViewList = document.getElementById('groupsViewList');
    if (!groupsViewList) return;
    
    if (groups.length === 0) {
      groupsViewList.innerHTML = '<div class="empty-state">No groups found</div>';
      return;
    }
    
    let html = '';
    groups.forEach(group => {
      html += `
        <div class="chat-item group-view-item" data-group-id="${group.id}" onclick="selectGroupForViewing(${group.id}, '${escapeHtml(group.name)}')">
          <div class="chat-item-avatar">
            <i class="fas fa-users"></i>
          </div>
          <div class="chat-item-content">
            <div class="chat-item-header">
              <span class="chat-item-name">${escapeHtml(group.name)}</span>
              <span class="chat-item-time">${group.message_count || 0} messages</span>
            </div>
            <div class="chat-item-preview">
              ${group.member_count || 0} members
            </div>
          </div>
        </div>
      `;
    });
    
    groupsViewList.innerHTML = html;
  }
  
  // Select a group for viewing messages
  async function selectGroupForViewing(groupId, groupName) {
    // Update selected group styling
    document.querySelectorAll('.group-view-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-group-id="${groupId}"]`).classList.add('active');
    
    // Update message area header
    const messageArea = document.getElementById('messageViewArea');
    const messageHeader = document.getElementById('messageViewHeader');
    
    if (messageHeader) {
      messageHeader.innerHTML = `
        <h3><i class="fas fa-users"></i> ${escapeHtml(groupName)}</h3>
        <div class="message-area-controls">
          <button class="btn btn-secondary" onclick="refreshGroupMessages(${groupId})">
            <i class="fas fa-refresh"></i> Refresh
          </button>
        </div>
      `;
    }
    
    if (messageArea) {
      messageArea.style.display = 'block';
    }
    
    // Load messages for this group
    await loadGroupMessages(groupId);
  }
  
  // Load messages for a specific group
  async function loadGroupMessages(groupId) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
      // Use the new API endpoint for getting group messages
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('admin_auth_token');
      
      const response = await fetch(`/api/admin/chat/groups/${groupId}/messages?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      renderGroupMessages(data.messages, groupId);
      
    } catch (error) {
      console.error('Error loading group messages:', error);
      messagesContainer.innerHTML = '<div class="error-state">Error loading messages</div>';
    }
  }
  
  // Render group messages
  function renderGroupMessages(messages, groupId) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-state">No messages found</div>';
      return;
    }
    
    let html = '';
    messages.forEach(message => {
      const timestamp = new Date(message.created_at).toLocaleString();
      const senderType = message.sender_type === 'real_user' ? 'Real User' : 'AI Assistant';
      const senderIcon = message.sender_type === 'real_user' ? 'fas fa-user' : 'fas fa-robot';
      
      html += `
        <div class="message-item ${message.sender_type === 'real_user' ? 'real-user' : 'fake-user'}">
          <div class="message-header">
            <div class="message-sender">
              <i class="${senderIcon}"></i>
              <span class="sender-name">${escapeHtml(message.sender_name || 'Unknown')}</span>
              <span class="sender-type">(${senderType})</span>
            </div>
            <div class="message-time">${timestamp}</div>
          </div>
          <div class="message-content">
            ${escapeHtml(message.content)}
          </div>
          <div class="message-actions">
            <button class="btn btn-sm btn-secondary" onclick="replyToMessage(${groupId}, ${message.id}, '${escapeHtml(message.sender_name)}')">
              <i class="fas fa-reply"></i> Reply
            </button>
          </div>
        </div>
      `;
    });
    
    messagesContainer.innerHTML = html;
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Reply to a message
  function replyToMessage(groupId, messageId, senderName) {
    const replyModal = document.getElementById('replyModal');
    const replyContext = document.getElementById('replyContext');
    const replyContent = document.getElementById('replyContent');
    const sendReplyBtn = document.getElementById('sendReplyBtn');
    
    if (!replyModal) {
      // Create reply modal if it doesn't exist
      createReplyModal();
      return replyToMessage(groupId, messageId, senderName);
    }
    
    if (replyContext) {
      replyContext.textContent = `Replying to ${senderName}`;
    }
    
    if (replyContent) {
      replyContent.value = '';
    }
    
    if (sendReplyBtn) {
      sendReplyBtn.onclick = () => sendReply(groupId, messageId);
    }
    
    replyModal.style.display = 'block';
  }
  
  // Send reply to message
  async function sendReply(groupId, originalMessageId) {
    const replyContent = document.getElementById('replyContent');
    const content = replyContent.value.trim();
    
    if (!content) {
      alert('Please enter a reply message');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('admin_auth_token');
      
      const response = await fetch(`/api/admin/chat/groups/${groupId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          originalMessageId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send reply');
      }
      
      // Close modal and refresh messages
      document.getElementById('replyModal').style.display = 'none';
      await loadGroupMessages(groupId);
      
      alert('Reply sent successfully!');
      
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply: ' + error.message);
    }
  }
  
  // Create reply modal
  function createReplyModal() {
    const modalHtml = `
      <div id="replyModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Reply to Message</h3>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div id="replyContext" class="reply-context"></div>
            <textarea id="replyContent" class="form-control" rows="4" placeholder="Type your reply..."></textarea>
          </div>
          <div class="modal-footer">
            <button id="sendReplyBtn" class="btn btn-primary">Send Reply</button>
            <button class="btn btn-secondary close-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add close functionality
    document.querySelectorAll('#replyModal .close-modal').forEach(btn => {
      btn.onclick = () => document.getElementById('replyModal').style.display = 'none';
    });
  }
  
  // Load direct messages
  async function loadDirectMessages() {
    const dmViewList = document.getElementById('dmViewList');
    if (!dmViewList) return;
    
    dmViewList.innerHTML = '<div class="loading">Loading direct messages...</div>';
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('admin_auth_token');
      
      const response = await fetch('/api/admin/chat/direct-messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load direct messages');
      }
      
      const data = await response.json();
      renderDirectMessages(data.conversations || []);
      
    } catch (error) {
      console.error('Error loading direct messages:', error);
      dmViewList.innerHTML = '<div class="error-state">Error loading direct messages</div>';
    }
  }
  
  // Render direct messages list
  function renderDirectMessages(conversations) {
    const dmViewList = document.getElementById('dmViewList');
    if (!dmViewList) return;
    
    if (conversations.length === 0) {
      dmViewList.innerHTML = '<div class="empty-state">No direct message conversations found</div>';
      return;
    }
    
    let html = '';
    conversations.forEach(conversation => {
      const lastActivity = conversation.last_activity ? 
        new Date(conversation.last_activity).toLocaleDateString() : 'No activity';
      
      html += `
        <div class="chat-item dm-view-item" data-conversation-id="${conversation.id}" onclick="selectDMForViewing(${conversation.id}, '${escapeHtml(conversation.participant_names)}')">
          <div class="chat-item-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="chat-item-content">
            <div class="chat-item-header">
              <span class="chat-item-name">${escapeHtml(conversation.participant_names || 'Direct Message')}</span>
              <span class="chat-item-time">${lastActivity}</span>
            </div>
            <div class="chat-item-preview">
              ${conversation.message_count || 0} messages
            </div>
          </div>
        </div>
      `;
    });
    
    dmViewList.innerHTML = html;
  }
  
  // Select a DM conversation for viewing
  async function selectDMForViewing(conversationId, participantNames) {
    // Update selected DM styling
    document.querySelectorAll('.dm-view-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');
    
    // Update message area header
    const messageArea = document.getElementById('messageViewArea');
    const messageHeader = document.getElementById('messageViewHeader');
    
    if (messageHeader) {
      messageHeader.innerHTML = `
        <h3><i class="fas fa-user"></i> ${escapeHtml(participantNames)}</h3>
        <div class="message-area-controls">
          <button class="btn btn-secondary" onclick="refreshDMMessages(${conversationId})">
            <i class="fas fa-refresh"></i> Refresh
          </button>
        </div>
      `;
    }
    
    if (messageArea) {
      messageArea.style.display = 'block';
    }
    
    // Load messages for this DM
    await loadDMMessages(conversationId);
  }
  
  // Load messages for a DM conversation
  async function loadDMMessages(conversationId) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('admin_auth_token');
      
      const response = await fetch(`/api/admin/chat/direct-messages/${conversationId}/messages?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load DM messages');
      }
      
      const data = await response.json();
      renderDMMessages(data.messages);
      
    } catch (error) {
      console.error('Error loading DM messages:', error);
      messagesContainer.innerHTML = '<div class="error-state">Error loading messages</div>';
    }
  }
  
  // Render DM messages
  function renderDMMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-state">No messages found</div>';
      return;
    }
    
    let html = '';
    messages.forEach(message => {
      const timestamp = new Date(message.created_at).toLocaleString();
      
      html += `
        <div class="message-item real-user">
          <div class="message-header">
            <div class="message-sender">
              <i class="fas fa-user"></i>
              <span class="sender-name">${escapeHtml(message.sender_name || 'Unknown')}</span>
              <span class="sender-type">(User)</span>
            </div>
            <div class="message-time">${timestamp}</div>
          </div>
          <div class="message-content">
            ${escapeHtml(message.content)}
          </div>
        </div>
      `;
    });
    
    messagesContainer.innerHTML = html;
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Refresh group messages
  async function refreshGroupMessages(groupId) {
    await loadGroupMessages(groupId);
  }
  
  // Refresh DM messages
  async function refreshDMMessages(conversationId) {
    await loadDMMessages(conversationId);
  }
  
  // Make functions globally accessible
  window.selectGroupForViewing = selectGroupForViewing;
  window.selectDMForViewing = selectDMForViewing;
  window.replyToMessage = replyToMessage;
  window.refreshGroupMessages = refreshGroupMessages;
  window.refreshDMMessages = refreshDMMessages;
  window.selectFakeUser = selectFakeUser;
  window.editFakeUser = editFakeUser;
  window.deleteFakeUser = deleteFakeUser;
  window.openCreateFakeUserDialog = openCreateFakeUserDialog;
  window.loadFakeUsersPage = loadFakeUsersPage;

  // === FAKE USER MANAGEMENT FUNCTIONS ===

  // Update message form state based on current selections
  function updateMessageFormState() {
    // This function updates the UI based on selected group and user
    const selectedGroupElement = document.getElementById('selectedGroup');
    const selectedUserElement = document.getElementById('selectedUser');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageContent = document.getElementById('messageContent');
    
    if (selectedGroupElement && state.groups.selected) {
      selectedGroupElement.textContent = state.groups.selected.name || 'Selected Group';
    }
    
    if (selectedUserElement && state.users.selected) {
      selectedUserElement.textContent = state.users.selected.display_name || state.users.selected.username || 'Selected User';
    }
    
    // Enable/disable send button based on selections
    if (sendMessageBtn) {
      const canSend = state.groups.selected && state.users.selected && messageContent?.value?.trim();
      sendMessageBtn.disabled = !canSend;
    }
  }

  // Select a fake user
  window.selectFakeUser = function(userId) {
    const user = state.fakeUsers.data.find(u => u.id === userId);
    if (user) {
      // Deselect previous user
      if (state.users.selected) {
        const prevElement = document.querySelector(`[data-user-id="${state.users.selected.id}"]`);
        if (prevElement) {
          prevElement.classList.remove('selected');
        }
      }
      
      // Select new user
      state.users.selected = user;
      const element = document.querySelector(`[data-user-id="${userId}"]`);
      if (element) {
        element.classList.add('selected');
      }
      
      // Update UI state
      updateMessageFormState();
      console.log('Selected fake user:', user.username);
    }
  };

  // Edit fake user (placeholder)
  window.editFakeUser = function(userId) {
    showError('Fake user editing is not yet implemented', 'info');
    console.log('Edit fake user:', userId);
  };

  // Delete fake user (placeholder) 
  window.deleteFakeUser = function(userId) {
    if (confirm('Are you sure you want to delete this fake user? This action cannot be undone.')) {
      showError('Fake user deletion is not yet implemented', 'info');
      console.log('Delete fake user:', userId);
    }
  };

  // Open create fake user dialog (placeholder)
  window.openCreateFakeUserDialog = function() {
    showError('Fake user creation is not yet implemented', 'info');
    console.log('Open create fake user dialog');
  };

  // Load specific page of fake users
  window.loadFakeUsersPage = function(page) {
    const search = state.ui.fakeUserSearchInput?.value || '';
    loadFakeUsers(search, page);
  };

  // Render users pagination
  function renderUsersPagination(pagination) {
    const paginationContainer = state.ui.usersPagination;
    if (!paginationContainer || !pagination) return;

    if (pagination.pages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHtml = '';
    
    // Previous button
    if (pagination.page > 1) {
      paginationHtml += `<button class="pagination-btn" onclick="loadFakeUsersPage(${pagination.page - 1})">
        <i class="fas fa-chevron-left"></i> Previous
      </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" 
        onclick="loadFakeUsersPage(${i})">${i}</button>`;
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
      paginationHtml += `<button class="pagination-btn" onclick="loadFakeUsersPage(${pagination.page + 1})">
        Next <i class="fas fa-chevron-right"></i>
      </button>`;
    }
    
    paginationContainer.innerHTML = paginationHtml;
  }
});
