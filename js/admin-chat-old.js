/**
 * Admin Chat Management - Updated Version
 * Main JavaScript for the admin chat management interface with conversation support
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
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
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
  
  console.log('[AdminChat] Initializing admin chat application...');

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
    // Sidebar navigation
    this.state.ui.conversationsTab = document.getElementById('conversationsTab');
    this.state.ui.fakeUsersTab = document.getElementById('fakeUsersTab');
    
    // Tab content containers
    this.state.ui.conversationsView = document.getElementById('conversationsView');
    this.state.ui.fakeUsersView = document.getElementById('fakeUsersView');
    
    // Message detail panel
    this.state.ui.messageDetailPanel = document.getElementById('messageDetailPanel');
    this.state.ui.closeDetailBtn = document.getElementById('closeDetailBtn');
    
    // Elements for fake users functionality
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

    // Close detail panel
    if (this.state.ui.closeDetailBtn) {
      this.state.ui.closeDetailBtn.addEventListener('click', () => {
        this.hideMessageDetailPanel();
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
    
    // Update sidebar tab states
    this.state.ui.conversationsTab?.classList.add('active');
    this.state.ui.fakeUsersTab?.classList.remove('active');
    
    // Show/hide tab content
    this.state.ui.conversationsView?.classList.remove('hidden');
    this.state.ui.fakeUsersView?.classList.add('hidden');
    
    console.log('[AdminChat] Switched to conversations view');
  }

  /**
   * Show fake users view (legacy)
   */
  showFakeUsersView() {
    this.currentView = 'fake-users';
    
    // Update sidebar tab states
    this.state.ui.conversationsTab?.classList.remove('active');
    this.state.ui.fakeUsersTab?.classList.add('active');
    
    // Show/hide tab content
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
    
    // Show the message detail panel
    this.showMessageDetailPanel();
  }

  /**
   * Show message detail panel
   */
  showMessageDetailPanel() {
    if (this.state.ui.messageDetailPanel) {
      this.state.ui.messageDetailPanel.style.display = 'flex';
    }
  }

  /**
   * Hide message detail panel
   */
  hideMessageDetailPanel() {
    if (this.state.ui.messageDetailPanel) {
      this.state.ui.messageDetailPanel.style.display = 'none';
    }
    this.state.currentConversation = null;
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
            Select
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
        Previous
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
        Next
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
