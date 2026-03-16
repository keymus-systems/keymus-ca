/**
 * Admin Chat Conversations Component
 * Handles conversation list display and management
 */

class AdminChatConversations {
  constructor(adminChatApp) {
    this.adminChatApp = adminChatApp;
    this.conversations = [];
    this.currentPage = 1;
    this.limit = 20;
    this.searchTerm = '';
    this.isLoading = false;
  }

  /**
   * Initialize the conversations component
   */
  init() {
    this.setupEventListeners();
    this.loadConversations();
  }

  /**
   * Set up event listeners for conversation interactions
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('conversationSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshConversations');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadConversations(true);
      });
    }
  }

  /**
   * Load conversations from API
   */
  async loadConversations(forceRefresh = false) {
    if (this.isLoading && !forceRefresh) return;
    
    this.isLoading = true;
    this.showLoadingState();

    try {
      const response = await AdminChatAPI.getConversations(
        this.currentPage, 
        this.limit, 
        this.searchTerm
      );

      if (response && response.success) {
        this.conversations = response.conversations;
        this.renderConversations();
        this.renderPagination(response.pagination);
      } else {
        this.showError('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.showError('Failed to load conversations');
    } finally {
      this.isLoading = false;
      this.hideLoadingState();
    }
  }

  /**
   * Render conversations list
   */
  renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;

    if (this.conversations.length === 0) {
      container.innerHTML = `
        <div class="no-conversations">
          <i class="fas fa-comments"></i>
          <p>No conversations found</p>
          <small>Conversations will appear here when users start chatting</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.conversations.map(conversation => 
      this.createConversationElement(conversation)
    ).join('');

    // Add click listeners
    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = item.dataset.conversationId;
        this.selectConversation(conversationId);
      });
    });
  }

  /**
   * Create HTML element for a conversation
   */
  createConversationElement(conversation) {
    const lastActivity = conversation.last_activity 
      ? this.formatRelativeTime(conversation.last_activity)
      : 'No activity';
    
    const lastMessage = conversation.last_message 
      ? this.truncateText(conversation.last_message, 60)
      : 'No messages yet';

    const conversationType = conversation.is_personal_group ? 'Personal' : 'Public';
    const typeIcon = conversation.is_personal_group ? 'fa-user-circle' : 'fa-users';
    const typeColor = conversation.is_personal_group ? '#007bff' : '#28a745';

    const unreadBadge = conversation.unread_count > 0 
      ? `<span class="unread-badge">${conversation.unread_count}</span>`
      : '';

    return `
      <div class="conversation-item" data-conversation-id="${conversation.id}">
        <div class="conversation-avatar">
          <i class="fas ${typeIcon}" style="color: ${typeColor};"></i>
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <span class="conversation-name">${this.escapeHtml(conversation.name)}</span>
            <span class="conversation-time">${lastActivity}</span>
          </div>
          <div class="conversation-preview">
            <span class="conversation-type">${conversationType}</span>
            <span class="conversation-stats">
              ${conversation.message_count} messages • 
              ${conversation.real_user_count} users • 
              ${conversation.fake_user_count} personas
            </span>
          </div>
          <div class="conversation-last-message">
            ${conversation.last_sender_name ? `${conversation.last_sender_name}: ` : ''}
            ${lastMessage}
          </div>
        </div>
        ${unreadBadge}
      </div>
    `;
  }

  /**
   * Select and load a conversation
   */
  async selectConversation(conversationId) {
    // Update UI to show selected state
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }

    // Load conversation details in the main app
    if (this.adminChatApp.loadConversation) {
      await this.adminChatApp.loadConversation(conversationId);
    }
  }

  /**
   * Handle search input
   */
  handleSearch(searchValue) {
    this.searchTerm = searchValue.trim();
    this.currentPage = 1;
    
    // Debounce search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadConversations();
    }, 300);
  }

  /**
   * Render pagination controls
   */
  renderPagination(pagination) {
    const container = document.getElementById('conversationsPagination');
    if (!container || !pagination) return;

    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHtml = `
      <div class="pagination-info">
        Page ${page} of ${pages} (${total} total)
      </div>
      <div class="pagination-controls">
    `;

    // Previous button
    if (page > 1) {
      paginationHtml += `
        <button class="btn btn-sm btn-outline-secondary" onclick="adminChatConversations.goToPage(${page - 1})">
          <i class="fas fa-chevron-left"></i> Previous
        </button>
      `;
    }

    // Page numbers (show up to 5 pages around current)
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'btn-primary' : 'btn-outline-secondary';
      paginationHtml += `
        <button class="btn btn-sm ${activeClass}" onclick="adminChatConversations.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    // Next button
    if (page < pages) {
      paginationHtml += `
        <button class="btn btn-sm btn-outline-secondary" onclick="adminChatConversations.goToPage(${page + 1})">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }

    paginationHtml += '</div>';
    container.innerHTML = paginationHtml;
  }

  /**
   * Navigate to specific page
   */
  goToPage(page) {
    this.currentPage = page;
    this.loadConversations();
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const container = document.getElementById('conversationsList');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading conversations...</p>
        </div>
      `;
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    // Loading state will be replaced by renderConversations()
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('conversationsList');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${this.escapeHtml(message)}</p>
          <button class="btn btn-sm btn-primary" onclick="adminChatConversations.loadConversations(true)">
            Try Again
          </button>
        </div>
      `;
    }
  }

  /**
   * Add new conversation to list (for real-time updates)
   */
  addConversation(conversation) {
    this.conversations.unshift(conversation);
    this.renderConversations();
  }

  /**
   * Update conversation in list (for real-time updates)
   */
  updateConversation(conversationId, updates) {
    const index = this.conversations.findIndex(c => c.id === conversationId);
    if (index !== -1) {
      this.conversations[index] = { ...this.conversations[index], ...updates };
      this.renderConversations();
    }
  }

  /**
   * Mark conversation as read (remove unread badge)
   */
  markConversationAsRead(conversationId) {
    this.updateConversation(conversationId, { unread_count: 0 });
  }

  // Utility methods
  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    
    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < week) return `${Math.floor(diff / day)}d ago`;
    
    return date.toLocaleDateString();
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
window.AdminChatConversations = AdminChatConversations;
