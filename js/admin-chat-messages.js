/**
 * Admin Chat Messages Component
 * Handles message display and sending functionality
 */

class AdminChatMessages {
  constructor(adminChatApp) {
    this.adminChatApp = adminChatApp;
    this.messages = [];
    this.currentConversation = null;
    this.currentPage = 1;
    this.limit = 50;
    this.isLoading = false;
    this.selectedPersona = null;
  }

  /**
   * Initialize the messages component
   */
  init() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for message interactions
   */
  setupEventListeners() {
    // Send message button
    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // Message input (Enter key)
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Persona selector
    const personaSelect = document.getElementById('personaSelect');
    if (personaSelect) {
      personaSelect.addEventListener('change', (e) => {
        this.selectPersona(e.target.value);
      });
    }

    // Load more messages button
    const loadMoreBtn = document.getElementById('loadMoreMessages');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.loadMoreMessages();
      });
    }
  }

  /**
   * Load conversation and its messages
   */
  async loadConversation(conversationId) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.currentConversation = conversationId;
    this.currentPage = 1;
    this.messages = [];
    
    this.showLoadingState();

    try {
      const response = await AdminChatAPI.getConversationMessages(
        conversationId, 
        this.currentPage, 
        this.limit
      );

      if (response && response.success) {
        this.messages = response.messages;
        this.currentConversation = response.conversation;
        this.renderConversationHeader();
        this.renderMessages();
        this.showMessageInterface();
      } else {
        this.showError('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      this.showError('Failed to load conversation');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load more messages (pagination)
   */
  async loadMoreMessages() {
    if (this.isLoading || !this.currentConversation) return;
    
    this.isLoading = true;
    this.currentPage++;

    try {
      const response = await AdminChatAPI.getConversationMessages(
        this.currentConversation.id, 
        this.currentPage, 
        this.limit
      );

      if (response && response.success && response.messages.length > 0) {
        // Prepend older messages
        this.messages = [...response.messages, ...this.messages];
        this.renderMessages(false); // Don't scroll to bottom
      } else {
        // No more messages
        this.currentPage--;
        this.hideLoadMoreButton();
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      this.currentPage--;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render conversation header
   */
  renderConversationHeader() {
    const header = document.getElementById('conversationHeader');
    if (!header || !this.currentConversation) return;

    const conversation = this.currentConversation;
    const typeIcon = conversation.is_personal_group ? 'fa-user-circle' : 'fa-users';
    const typeColor = conversation.is_personal_group ? '#007bff' : '#28a745';
    const conversationType = conversation.is_personal_group ? 'Personal Group' : 'Public Group';

    header.innerHTML = `
      <div class="conversation-header-info">
        <div class="conversation-avatar">
          <i class="fas ${typeIcon}" style="color: ${typeColor};"></i>
        </div>
        <div class="conversation-details">
          <h4 class="conversation-title">${this.escapeHtml(conversation.name)}</h4>
          <p class="conversation-subtitle">
            ${conversationType} • ${conversation.message_count} messages • 
            ${conversation.real_user_count} users • ${conversation.fake_user_count} personas
          </p>
        </div>
      </div>
      <div class="conversation-actions">
        <button class="btn btn-sm btn-outline-secondary" onclick="adminChatMessages.refreshConversation()">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
    `;
  }

  /**
   * Render messages list
   */
  renderMessages(scrollToBottom = true) {
    const container = document.getElementById('messagesList');
    if (!container) return;

    if (this.messages.length === 0) {
      container.innerHTML = `
        <div class="no-messages">
          <i class="fas fa-comments"></i>
          <p>No messages in this conversation</p>
          <small>Start the conversation by sending a message as one of your personas</small>
        </div>
      `;
      return;
    }

    // Show load more button if we might have more messages
    if (this.messages.length >= this.limit) {
      this.showLoadMoreButton();
    }

    container.innerHTML = this.messages.map(message => 
      this.createMessageElement(message)
    ).join('');

    if (scrollToBottom) {
      this.scrollToBottom();
    }
  }

  /**
   * Create HTML element for a message
   */
  createMessageElement(message) {
    const timestamp = new Date(message.created_at).toLocaleString();
    const isFromPersona = message.sender_type === 'fake_user';
    const isFromAdmin = message.sent_by_admin;
    
    // Message styling based on sender type
    const messageClass = isFromPersona ? 'message-persona' : 'message-user';
    const senderIcon = isFromPersona ? 'fa-robot' : 'fa-user';
    const senderColor = isFromPersona ? '#6f42c1' : '#007bff';
    
    // Admin attribution for persona messages
    const adminAttribution = isFromAdmin && message.admin_username 
      ? ` <small class="admin-attribution">(sent by ${message.admin_username})</small>`
      : '';

    // Avatar or icon
    const avatarElement = message.sender_avatar 
      ? `<img src="${message.sender_avatar}" alt="${message.sender_name}" class="message-avatar">`
      : `<div class="message-icon"><i class="fas ${senderIcon}" style="color: ${senderColor};"></i></div>`;

    return `
      <div class="message ${messageClass}" data-message-id="${message.id}">
        ${avatarElement}
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${this.escapeHtml(message.sender_name)}</span>
            ${adminAttribution}
            <span class="message-time">${timestamp}</span>
          </div>
          <div class="message-text">${this.formatMessageContent(message.content)}</div>
          ${message.media_url ? this.renderMessageMedia(message) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render message media (if any)
   */
  renderMessageMedia(message) {
    if (!message.media_url) return '';

    switch (message.media_type) {
      case 'image':
        return `<img src="${message.media_url}" alt="Image" class="message-image">`;
      case 'video':
        return `<video src="${message.media_url}" controls class="message-video"></video>`;
      default:
        return `<a href="${message.media_url}" target="_blank" class="message-link">View Media</a>`;
    }
  }

  /**
   * Send a new message as selected persona
   */
  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput?.value?.trim();
    
    if (!content) {
      this.showError('Please enter a message');
      return;
    }

    if (!this.selectedPersona) {
      this.showError('Please select a persona first');
      return;
    }

    if (!this.currentConversation) {
      this.showError('No conversation selected');
      return;
    }

    // Disable input while sending
    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) sendBtn.disabled = true;
    if (messageInput) messageInput.disabled = true;

    try {
      const response = await AdminChatAPI.sendConversationMessage(
        this.currentConversation.id,
        this.selectedPersona.id,
        content
      );

      if (response && response.success) {
        // Add message to UI immediately
        this.addMessage(response.message);
        
        // Clear input
        if (messageInput) messageInput.value = '';
        
        // Show success feedback
        this.showSuccess('Message sent successfully');
      } else {
        this.showError('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.showError('Failed to send message');
    } finally {
      // Re-enable input
      if (sendBtn) sendBtn.disabled = false;
      if (messageInput) messageInput.disabled = false;
    }
  }

  /**
   * Select persona for sending messages
   */
  selectPersona(personaId) {
    const personas = this.adminChatApp.fakeUsers || [];
    this.selectedPersona = personas.find(p => p.id == personaId);
    
    this.updateMessageInterface();
  }

  /**
   * Update message interface based on selected persona
   */
  updateMessageInterface() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    const personaInfo = document.getElementById('selectedPersonaInfo');

    if (this.selectedPersona) {
      // Enable interface
      if (messageInput) messageInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      
      // Update placeholder
      if (messageInput) {
        messageInput.placeholder = `Send message as ${this.selectedPersona.display_name}...`;
      }

      // Show selected persona info
      if (personaInfo) {
        personaInfo.innerHTML = `
          <div class="selected-persona">
            ${this.selectedPersona.avatar_url ? 
              `<img src="${this.selectedPersona.avatar_url}" alt="${this.selectedPersona.display_name}" class="persona-avatar">` :
              `<div class="persona-icon"><i class="fas fa-robot"></i></div>`
            }
            <span class="persona-name">${this.selectedPersona.display_name}</span>
          </div>
        `;
      }
    } else {
      // Disable interface
      if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = 'Select a persona to send messages...';
      }
      if (sendBtn) sendBtn.disabled = true;
      
      // Clear persona info
      if (personaInfo) personaInfo.innerHTML = '';
    }
  }

  /**
   * Add new message to the list (for real-time updates)
   */
  addMessage(message) {
    this.messages.push(message);
    
    // Re-render only the new message to avoid full re-render
    const container = document.getElementById('messagesList');
    if (container) {
      const messageElement = document.createElement('div');
      messageElement.innerHTML = this.createMessageElement(message);
      container.appendChild(messageElement.firstChild);
      this.scrollToBottom();
    }
  }

  /**
   * Show message interface
   */
  showMessageInterface() {
    const messageInterface = document.getElementById('messageInterface');
    if (messageInterface) {
      messageInterface.classList.remove('hidden');
    }
    
    const defaultState = document.getElementById('messagesDefaultState');
    if (defaultState) {
      defaultState.classList.add('hidden');
    }
  }

  /**
   * Hide message interface
   */
  hideMessageInterface() {
    const messageInterface = document.getElementById('messageInterface');
    if (messageInterface) {
      messageInterface.classList.add('hidden');
    }
    
    const defaultState = document.getElementById('messagesDefaultState');
    if (defaultState) {
      defaultState.classList.remove('hidden');
    }
  }

  /**
   * Refresh current conversation
   */
  async refreshConversation() {
    if (this.currentConversation) {
      await this.loadConversation(this.currentConversation.id);
    }
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const container = document.getElementById('messagesList');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading messages...</p>
        </div>
      `;
    }
  }

  /**
   * Show/hide load more button
   */
  showLoadMoreButton() {
    const btn = document.getElementById('loadMoreMessages');
    if (btn) btn.classList.remove('hidden');
  }

  hideLoadMoreButton() {
    const btn = document.getElementById('loadMoreMessages');
    if (btn) btn.classList.add('hidden');
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const container = document.getElementById('messagesList');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.adminChatApp.showError) {
      this.adminChatApp.showError(message);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (this.adminChatApp.showSuccess) {
      this.adminChatApp.showSuccess(message);
    }
  }

  // Utility methods
  formatMessageContent(content) {
    // Basic text formatting (preserve line breaks, escape HTML)
    return this.escapeHtml(content).replace(/\n/g, '<br>');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
window.AdminChatMessages = AdminChatMessages;
