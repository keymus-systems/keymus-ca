/**
 * Direct Message (DM) Module
 * Handles all DM functionality in the frontend
 */

// DM module with isolated scope
const DirectMessageModule = (function() {
    // Private variables
    let currentUser = null;
    let isAdmin = false;
    let currentConversationId = null;
    let conversations = [];
    let currentMessages = [];
    let fakeUsers = [];
    let dmContainer = null;
    let conversationsElement = null;
    let chatWindowElement = null;
    let messageListElement = null;
    let messageInput = null;
    let attachmentInput = null;
    let attachmentPreview = null;
    let currentAttachment = null;
    let refreshInterval = null;
    let searchTimeout = null;
    let voiceRecorder = null;
    let emojiPicker = null;
    let errorRetryCount = 0;
    let maxRetries = 3;
    let connectionStatus = 'connected'; // 'connected', 'connecting', 'disconnected'
    let statusIndicator = null;
    
    // Templates
    const templates = {
        conversationList: null,
        conversationItem: null,
        chatWindow: null,
        messageItem: null,
        newDmModal: null,
        userItem: null
    };
    
    /**
     * Initialize the DM module
     * @param {Object} user - Current user object
     * @param {string} containerId - ID of the container element
     */
    function init(user, containerId) {
        currentUser = user;
        isAdmin = user && user.role === 'admin';
        
        // Load templates
        loadTemplates();
        
        // Create main container
        dmContainer = document.getElementById(containerId);
        if (!dmContainer) {
            console.error('DM container not found:', containerId);
            return;
        }
        
        // Clear container
        dmContainer.innerHTML = '';
        dmContainer.classList.add('dm-container');
        
        // Create conversation list
        conversationsElement = document.createElement('div');
        conversationsElement.appendChild(templates.conversationList.content.cloneNode(true));
        dmContainer.appendChild(conversationsElement);
        
        // Create chat window
        chatWindowElement = document.createElement('div');
        chatWindowElement.appendChild(templates.chatWindow.content.cloneNode(true));
        dmContainer.appendChild(chatWindowElement);
        
        // Create connection status indicator
        createStatusIndicator();
        
        // Add new DM modal to body
        const modalElement = templates.newDmModal.content.cloneNode(true);
        document.body.appendChild(modalElement);
        
        // Get references to elements
        messageListElement = document.getElementById('dm-chat-messages');
        messageInput = document.getElementById('dm-message-input');
        attachmentInput = document.getElementById('dm-attachment-input');
        attachmentPreview = document.getElementById('dm-attachment-preview');
        
        // Initialize event listeners
        initEventListeners();
        
        // If admin, load fake users for impersonation
        if (isAdmin) {
            loadFakeUsers();
            document.getElementById('dm-admin-controls').style.display = 'block';
        }
        
        // Load conversations
        loadConversations();
        
        // Set up refresh interval (every 30 seconds)
        refreshInterval = setInterval(refreshCurrentView, 30000);
        
        // Initialize voice recorder if available
        if (typeof DMVoiceRecorder !== 'undefined') {
            initVoiceRecorder();
        }
        
        // Initialize emoji picker if available
        if (typeof DMEmojiPicker !== 'undefined') {
            initEmojiPicker();
        }
    }
    
    /**
     * Load HTML templates
     */
    function loadTemplates() {
        templates.conversationList = document.getElementById('dm-conversation-list-template');
        templates.conversationItem = document.getElementById('dm-conversation-item-template');
        templates.chatWindow = document.getElementById('dm-chat-window-template');
        templates.messageItem = document.getElementById('dm-message-item-template');
        templates.newDmModal = document.getElementById('new-dm-modal-template');
        templates.userItem = document.getElementById('dm-user-item-template');
        
        // Check if all templates are loaded
        for (const [key, template] of Object.entries(templates)) {
            if (!template) {
                console.error(`Template not found: ${key}`);
            }
        }
    }
    
    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // New DM button
        const newDmBtn = document.getElementById('new-dm-btn');
        if (newDmBtn) {
            newDmBtn.addEventListener('click', openNewDmModal);
        }
        
        // Search input
        const searchInput = document.getElementById('dm-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    filterConversations(this.value);
                }, 300);
            });
        }
        
        // Back button (mobile)
        const backBtn = document.getElementById('dm-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                conversationsElement.classList.remove('hidden');
                chatWindowElement.classList.remove('active');
            });
        }
        
        // Send message button
        const sendBtn = document.getElementById('dm-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }
        
        // Message input - send on Enter (but allow Shift+Enter for new line)
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Attachment button
        const attachmentBtn = document.getElementById('dm-attachment-btn');
        if (attachmentBtn && attachmentInput) {
            attachmentBtn.addEventListener('click', function() {
                attachmentInput.click();
            });
            
            attachmentInput.addEventListener('change', handleAttachmentChange);
        }
        
        // Modal close button
        const modalCloseBtn = document.getElementById('dm-modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeNewDmModal);
        }
        
        // User search in modal
        const userSearchInput = document.getElementById('dm-user-search-input');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchUsers(this.value);
                }, 300);
            });
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById('new-dm-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeNewDmModal();
                }
            });
        }
        
        // Online/Offline event listeners
        window.addEventListener('online', handleOnlineEvent);
        window.addEventListener('offline', handleOfflineEvent);
    }
    
    /**
     * Load conversations from API
     */
    async function loadConversations() {
        try {
            const data = await dmApi.listDMConversations();
            conversations = data;
            renderConversationsList();
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    const data = await dmApi.listDMConversations();
                    conversations = data;
                    renderConversationsList();
                    return data;
                }, 
                'Failed to load conversations',
                true
            );
        }
    }
    
    /**
     * Render the conversations list
     */
    function renderConversationsList() {
        const listElement = document.getElementById('dm-conversation-list');
        if (!listElement) return;
        
        // Clear list
        listElement.innerHTML = '';
        
        if (conversations.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'dm-empty-message';
            emptyMessage.textContent = 'No conversations yet';
            listElement.appendChild(emptyMessage);
            return;
        }
        
        // Add each conversation
        conversations.forEach(conversation => {
            const itemElement = templates.conversationItem.content.cloneNode(true);
            const item = itemElement.querySelector('.dm-conversation-item');
            
            // Set conversation ID
            item.dataset.conversationId = conversation.id;
            
            // Set user details
            const username = itemElement.querySelector('.dm-username');
            if (username) {
                username.textContent = conversation.otherUser.displayName || conversation.otherUser.username;
            }
            
            // Format timestamp
            const timestamp = itemElement.querySelector('.dm-timestamp');
            if (timestamp && conversation.last_message_at) {
                timestamp.textContent = formatTimestamp(new Date(conversation.last_message_at));
            }
            
            // Set unread badge
            const unreadBadge = itemElement.querySelector('.dm-unread-badge');
            if (unreadBadge) {
                if (conversation.unread_count > 0) {
                    unreadBadge.textContent = conversation.unread_count;
                } else {
                    unreadBadge.textContent = '';
                }
            }
            
            // Highlight active conversation
            if (currentConversationId === conversation.id) {
                item.classList.add('active');
            }
            
            // Add click event to open conversation
            item.addEventListener('click', function() {
                openConversation(conversation.id);
            });
            
            // Add options menu functionality
            const optionsBtn = itemElement.querySelector('.dm-options i');
            const optionsMenu = itemElement.querySelector('.dm-options-menu');
            if (optionsBtn && optionsMenu) {
                optionsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
                });
                
                // Add delete functionality
                const deleteBtn = optionsMenu.querySelector('.dm-delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                    });
                }
            }
            
            // Add to list
            listElement.appendChild(item);
        });
    }
    
    /**
     * Open a conversation
     * @param {number} conversationId - ID of the conversation to open
     */
    async function openConversation(conversationId) {
        try {
            currentConversationId = conversationId;
            
            // Highlight active conversation in list
            const conversationItems = document.querySelectorAll('.dm-conversation-item');
            conversationItems.forEach(item => {
                if (parseInt(item.dataset.conversationId) === conversationId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            // Find conversation data
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) {
                console.error('Conversation not found:', conversationId);
                return;
            }
            
            // Update chat header
            const headerUsername = document.querySelector('.dm-chat-username');
            if (headerUsername) {
                headerUsername.textContent = conversation.otherUser.displayName || conversation.otherUser.username;
            }
            
            // Load messages
            const messages = await dmApi.getDMConversation(conversationId);
            currentMessages = messages;
            renderMessages();
            
            // On mobile, show chat window and hide conversations list
            if (window.innerWidth <= 768) {
                conversationsElement.classList.add('hidden');
                chatWindowElement.classList.add('active');
            }
            
            // Clear unread count in list
            const unreadBadge = document.querySelector(`.dm-conversation-item[data-conversation-id="${conversationId}"] .dm-unread-badge`);
            if (unreadBadge) {
                unreadBadge.textContent = '';
            }
            
            // Update conversation in the list
            const updatedConversations = conversations.map(c => {
                if (c.id === conversationId) {
                    return { ...c, unread_count: 0 };
                }
                return c;
            });
            conversations = updatedConversations;
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    const messages = await dmApi.getDMConversation(conversationId);
                    currentMessages = messages;
                    renderMessages();
                    return messages;
                }, 
                'Failed to load messages',
                true
            );
        }
    }
    
    /**
     * Render messages in the current conversation
     */
    function renderMessages() {
        if (!messageListElement) return;
        
        // Clear message list
        messageListElement.innerHTML = '';
        
        if (currentMessages.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'dm-empty-message';
            emptyMessage.textContent = 'No messages yet';
            messageListElement.appendChild(emptyMessage);
            return;
        }
        
        // Add each message
        currentMessages.forEach(message => {
            const itemElement = templates.messageItem.content.cloneNode(true);
            const item = itemElement.querySelector('.dm-message-item');
            
            // Check if outgoing message (sent by current user)
            const isOutgoing = message.sender_id === currentUser.id;
            if (isOutgoing) {
                item.classList.add('outgoing');
            }
            
            // Set message content
            const messageText = itemElement.querySelector('.dm-message-text');
            if (messageText) {
                // Use message formatter if available
                if (typeof DMMessageFormatter !== 'undefined') {
                    messageText.innerHTML = DMMessageFormatter.format(message.message);
                } else {
                    messageText.textContent = message.message;
                }
            }
            
            // Set sender name
            const username = itemElement.querySelector('.dm-message-username');
            if (username) {
                username.textContent = message.sender_display_name || message.sender_username;
            }
            
            // Format timestamp
            const timestamp = itemElement.querySelector('.dm-message-timestamp');
            if (timestamp) {
                if (typeof DMMessageFormatter !== 'undefined') {
                    timestamp.textContent = DMMessageFormatter.formatTimestamp(new Date(message.created_at));
                } else {
                    timestamp.textContent = formatTimestamp(new Date(message.created_at));
                }
            }
            
            // Handle attachments
            if (message.attachment_url) {
                const attachmentContainer = itemElement.querySelector('.dm-message-attachment');
                if (attachmentContainer) {
                    // Determine attachment type
                    if (message.message_type === 'image') {
                        const img = document.createElement('img');
                        img.src = message.attachment_url;
                        img.alt = 'Image attachment';
                        img.addEventListener('click', () => {
                            window.open(message.attachment_url, '_blank');
                        });
                        attachmentContainer.appendChild(img);
                    } else if (message.message_type === 'voicenote') {
                        const audio = document.createElement('audio');
                        audio.controls = true;
                        audio.src = message.attachment_url;
                        attachmentContainer.appendChild(audio);
                    } else if (message.message_type === 'file') {
                        const link = document.createElement('a');
                        link.href = message.attachment_url;
                        link.target = '_blank';
                        link.innerHTML = '<i class="fas fa-file"></i> Download file';
                        attachmentContainer.appendChild(link);
                    }
                }
            }
            
            // Add to message list
            messageListElement.appendChild(item);
        });
        
        // Scroll to bottom
        messageListElement.scrollTop = messageListElement.scrollHeight;
    }
    
    /**
     * Send a message in the current conversation
     */
    async function sendMessage() {
        if (!currentConversationId) return;
        
        // Get message text
        const messageText = messageInput.value.trim();
        
        // If no text and no attachment, don't send
        if (!messageText && !currentAttachment) return;
        
        // Get message type based on attachment
        let messageType = 'text';
        if (currentAttachment) {
            if (currentAttachment.type.startsWith('image/')) {
                messageType = 'image';
            } else if (currentAttachment.type.startsWith('audio/')) {
                messageType = 'voicenote';
            } else {
                messageType = 'file';
            }
        }
        
        // Get impersonation user ID if admin
        let impersonateUserId = null;
        if (isAdmin) {
            const impersonateSelect = document.getElementById('dm-impersonate-select');
            if (impersonateSelect && impersonateSelect.value) {
                impersonateUserId = parseInt(impersonateSelect.value);
            }
        }
        
        try {
            // Send message
            const newMessage = await dmApi.sendDMMessage(
                currentConversationId,
                messageText,
                messageType,
                currentAttachment,
                impersonateUserId
            );
            
            // Clear input
            messageInput.value = '';
            clearAttachment();
            
            // Add message to current messages
            currentMessages.push(newMessage);
            renderMessages();
            
            // Update conversation in list
            updateConversationLastMessage(currentConversationId, newMessage);
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    const newMessage = await dmApi.sendDMMessage(
                        currentConversationId,
                        messageText,
                        messageType,
                        currentAttachment,
                        impersonateUserId
                    );
                    
                    // Clear input
                    messageInput.value = '';
                    clearAttachment();
                    
                    // Add message to current messages
                    currentMessages.push(newMessage);
                    renderMessages();
                    
                    // Update conversation in list
                    updateConversationLastMessage(currentConversationId, newMessage);
                    
                    return newMessage;
                }, 
                'Failed to send message',
                true
            );
        }
    }
    
    /**
     * Handle attachment file selection
     * @param {Event} e - Change event
     */
    function handleAttachmentChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Store file for upload
        currentAttachment = file;
        
        // Preview attachment
        attachmentPreview.innerHTML = '';
        
        const attachmentItem = document.createElement('div');
        attachmentItem.className = 'dm-attachment-item';
        
        // Preview based on file type
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            attachmentItem.appendChild(img);
        } else {
            const icon = document.createElement('i');
            icon.className = file.type.startsWith('audio/') ? 'fas fa-music fa-2x' : 'fas fa-file fa-2x';
            icon.style.padding = '40px';
            attachmentItem.appendChild(icon);
        }
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'dm-remove-attachment';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', clearAttachment);
        attachmentItem.appendChild(removeBtn);
        
        attachmentPreview.appendChild(attachmentItem);
    }
    
    /**
     * Clear the current attachment
     */
    function clearAttachment() {
        currentAttachment = null;
        attachmentPreview.innerHTML = '';
        if (attachmentInput) {
            attachmentInput.value = '';
        }
    }
    
    /**
     * Delete a conversation
     * @param {number} conversationId - ID of the conversation to delete
     */
    async function deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        
        try {
            await dmApi.deleteDMConversation(conversationId);
            
            // If it's the current conversation, clear it
            if (currentConversationId === conversationId) {
                currentConversationId = null;
                currentMessages = [];
                renderMessages();
            }
            
            // Remove from conversations list
            conversations = conversations.filter(c => c.id !== conversationId);
            renderConversationsList();
            
            showNotification('Conversation deleted successfully', 'success');
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    await dmApi.deleteDMConversation(conversationId);
                    
                    // If it's the current conversation, clear it
                    if (currentConversationId === conversationId) {
                        currentConversationId = null;
                        currentMessages = [];
                        renderMessages();
                    }
                    
                    // Remove from conversations list
                    conversations = conversations.filter(c => c.id !== conversationId);
                    renderConversationsList();
                    
                    showNotification('Conversation deleted successfully', 'success');
                    return true;
                }, 
                'Failed to delete conversation',
                true
            );
        }
    }
    
    /**
     * Open new DM modal
     */
    function openNewDmModal() {
        const modal = document.getElementById('new-dm-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Load users
            loadUsers();
        }
    }
    
    /**
     * Close new DM modal
     */
    function closeNewDmModal() {
        const modal = document.getElementById('new-dm-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    /**
     * Load users for new DM modal
     */
    async function loadUsers() {
        try {
            // Get users from API (adjust endpoint as needed)
            const response = await fetch('/api/users', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load users');
            
            const users = await response.json();
            renderUserList(users);
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    const response = await fetch('/api/users', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                    });
                    
                    if (!response.ok) throw new Error('Failed to load users');
                    
                    const users = await response.json();
                    renderUserList(users);
                    return users;
                }, 
                'Failed to load users',
                true
            );
        }
    }
    
    /**
     * Render user list in new DM modal
     * @param {Array} users - Array of user objects
     */
    function renderUserList(users) {
        const listElement = document.getElementById('dm-user-list');
        if (!listElement) return;
        
        // Clear list
        listElement.innerHTML = '';
        
        // Remove current user from list
        const filteredUsers = users.filter(user => user.id !== currentUser.id);
        
        if (filteredUsers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'dm-empty-message';
            emptyMessage.textContent = 'No users found';
            listElement.appendChild(emptyMessage);
            return;
        }
        
        // Add each user
        filteredUsers.forEach(user => {
            const itemElement = templates.userItem.content.cloneNode(true);
            const item = itemElement.querySelector('.dm-user-item');
            
            // Set user ID
            item.dataset.userId = user.id;
            
            // Set user details
            const username = itemElement.querySelector('.dm-user-name');
            if (username) {
                username.textContent = user.display_name || user.username;
            }
            
            const role = itemElement.querySelector('.dm-user-role');
            if (role) {
                role.textContent = user.role;
            }
            
            // Add click event to start conversation
            item.addEventListener('click', function() {
                startConversation(user.id);
            });
            
            // Add to list
            listElement.appendChild(item);
        });
    }
    
    /**
     * Start a new conversation with a user
     * @param {number} userId - ID of the user to start conversation with
     */
    async function startConversation(userId) {
        try {
            const result = await dmApi.startDMConversation(userId);
            
            // Close modal
            closeNewDmModal();
            
            // If not an existing conversation, refresh conversations
            if (!result.existing) {
                await loadConversations();
            }
            
            // Open the conversation
            openConversation(result.id);
        } catch (error) {
            await handleApiError(
                error, 
                async () => {
                    const result = await dmApi.startDMConversation(userId);
                    
                    // Close modal
                    closeNewDmModal();
                    
                    // If not an existing conversation, refresh conversations
                    if (!result.existing) {
                        await loadConversations();
                    }
                    
                    // Open the conversation
                    openConversation(result.id);
                    
                    return result;
                }, 
                'Failed to start conversation',
                true
            );
        }
    }
    
    /**
     * Search users in new DM modal
     * @param {string} query - Search query
     */
    function searchUsers(query) {
        const listItems = document.querySelectorAll('.dm-user-item');
        query = query.toLowerCase();
        
        listItems.forEach(item => {
            const username = item.querySelector('.dm-user-name').textContent.toLowerCase();
            const role = item.querySelector('.dm-user-role').textContent.toLowerCase();
            
            if (username.includes(query) || role.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Filter conversations by search query
     * @param {string} query - Search query
     */
    function filterConversations(query) {
        const listItems = document.querySelectorAll('.dm-conversation-item');
        query = query.toLowerCase();
        
        listItems.forEach(item => {
            const username = item.querySelector('.dm-username').textContent.toLowerCase();
            const lastMessage = item.querySelector('.dm-last-message')?.textContent.toLowerCase() || '';
            
            if (username.includes(query) || lastMessage.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Load fake users for admin impersonation
     */
    async function loadFakeUsers() {
        try {
            // Get fake users from API
            const response = await fetch('/api/admin/chat/fake-users', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load fake users');
            
            fakeUsers = await response.json();
            
            // Populate impersonate select
            const impersonateSelect = document.getElementById('dm-impersonate-select');
            if (impersonateSelect) {
                impersonateSelect.innerHTML = '<option value="">Send as yourself</option>';
                
                fakeUsers.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.display_name || user.username;
                    impersonateSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading fake users:', error);
        }
    }
    
    /**
     * Update conversation last message in the list
     * @param {number} conversationId - ID of the conversation
     * @param {Object} message - New message object
     */
    function updateConversationLastMessage(conversationId, message) {
        // Find the conversation
        const updatedConversations = conversations.map(c => {
            if (c.id === conversationId) {
                return {
                    ...c,
                    last_message_at: message.created_at
                };
            }
            return c;
        });
        
        // Sort by last message time (newest first)
        updatedConversations.sort((a, b) => {
            return new Date(b.last_message_at) - new Date(a.last_message_at);
        });
        
        conversations = updatedConversations;
        renderConversationsList();
    }
    
    /**
     * Refresh the current view (conversations or messages)
     */
    function refreshCurrentView() {
        // Refresh conversations
        loadConversations();
        
        // If a conversation is open, refresh its messages
        if (currentConversationId) {
            openConversation(currentConversationId);
        }
    }
    
    /**
     * Format timestamp to readable format
     * @param {Date} date - Date object
     * @returns {string} Formatted timestamp
     */
    function formatTimestamp(date) {
        const now = new Date();
        const diff = now - date;
        
        // Today - show time only
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Yesterday
        if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
            return 'Yesterday';
        }
        
        // Within a week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        
        // Older - show date
        return date.toLocaleDateString();
    }
    
    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        // Use our custom DM notifications
        if (typeof dmNotifications !== 'undefined') {
            if (type === 'success') dmNotifications.success(message);
            else if (type === 'error') dmNotifications.error(message);
            else if (type === 'warning') dmNotifications.warning(message);
            else dmNotifications.info(message);
        } else {
            // Fallback to generic notification
            if (typeof window.showNotification === 'function') {
                window.showNotification(message, type);
            } else {
                // Last resort fallback to alert
                alert(message);
            }
        }
    }
    
    /**
     * Clean up resources when module is unloaded
     */
    function cleanup() {
        clearInterval(refreshInterval);
        
        // Clean up voice recorder if exists
        if (voiceRecorder) {
            voiceRecorder.cleanup();
        }
        
        // Clean up emoji picker if exists
        if (emojiPicker) {
            emojiPicker.cleanup();
        }
        
        // Remove event listeners
        window.removeEventListener('online', handleOnlineEvent);
        window.removeEventListener('offline', handleOfflineEvent);
        
        // Remove status indicator if exists
        if (statusIndicator && statusIndicator.parentNode) {
            statusIndicator.parentNode.removeChild(statusIndicator);
            statusIndicator = null;
        }
    }
    
    /**
     * Initialize voice recorder
     */
    function initVoiceRecorder() {
        // Create voice recorder instance
        voiceRecorder = new DMVoiceRecorder();
        
        // Find the input container to add the voice recorder
        const inputContainer = document.querySelector('.dm-input-container');
        if (!inputContainer) return;
        
        // Initialize voice recorder
        voiceRecorder.init(inputContainer, handleVoiceRecording);
        
        // Style adjustment
        inputContainer.style.flexWrap = 'wrap';
    }
    
    /**
     * Handle completed voice recording
     * @param {Blob} audioBlob - Recorded audio blob
     */
    function handleVoiceRecording(audioBlob) {
        if (!audioBlob) return;
        
        // Set as current attachment
        currentAttachment = new File([audioBlob], 'voice_message.webm', { 
            type: 'audio/webm',
            lastModified: new Date().getTime()
        });
        
        // Preview voice message
        attachmentPreview.innerHTML = '';
        
        const attachmentItem = document.createElement('div');
        attachmentItem.className = 'dm-attachment-item';
        
        // Add audio preview
        const icon = document.createElement('i');
        icon.className = 'fas fa-microphone fa-2x';
        icon.style.padding = '40px';
        attachmentItem.appendChild(icon);
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'dm-remove-attachment';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', clearAttachment);
        attachmentItem.appendChild(removeBtn);
        
        attachmentPreview.appendChild(attachmentItem);
        
        // Focus message input
        messageInput.focus();
    }
    
    /**
     * Initialize emoji picker
     */
    function initEmojiPicker() {
        // Create emoji picker instance
        emojiPicker = new DMEmojiPicker();
        
        // Find the input container to add the emoji picker
        const inputContainer = document.querySelector('.dm-input-container');
        if (!inputContainer) return;
        
        // Initialize emoji picker before the message input
        const messageInputPosition = Array.from(inputContainer.children).findIndex(child => child === messageInput);
        if (messageInputPosition !== -1) {
            emojiPicker.init(inputContainer, insertEmoji);
            
            // Move the emoji button before the message input
            const emojiButton = inputContainer.querySelector('.dm-emoji-btn');
            if (emojiButton && messageInputPosition > 0) {
                inputContainer.insertBefore(emojiButton, inputContainer.children[messageInputPosition]);
            }
        }
    }
    
    /**
     * Insert emoji into message input
     * @param {string} emoji - Emoji character to insert
     */
    function insertEmoji(emoji) {
        if (!messageInput) return;
        
        // Get current cursor position
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        
        // Insert emoji at cursor position
        messageInput.value = messageInput.value.substring(0, start) + emoji + messageInput.value.substring(end);
        
        // Move cursor after inserted emoji
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        
        // Focus message input
        messageInput.focus();
    }
    
    /**
     * Handle API errors with retry mechanism
     * @param {Error} error - Error object
     * @param {Function} operation - Function to retry
     * @param {string} errorMessage - Error message to display
     * @param {boolean} criticalOperation - If true, will show error notification even after retries
     */
    async function handleApiError(error, operation, errorMessage, criticalOperation = false) {
        console.error(`DM Module Error: ${errorMessage}`, error);
        
        // Check if network error or server error
        const isNetworkError = !error.response && !window.navigator.onLine;
        const isServerError = error.response && error.response.status >= 500;
        
        // Update connection status
        if (isNetworkError) {
            updateConnectionStatus('disconnected');
        } else if (isServerError) {
            updateConnectionStatus('connecting');
        }
        
        // If retryable error and under max retries, attempt retry
        if ((isNetworkError || isServerError) && errorRetryCount < maxRetries) {
            errorRetryCount++;
            
            const retryDelay = Math.pow(2, errorRetryCount) * 1000; // Exponential backoff
            
            showNotification(`Connection issue. Retrying in ${retryDelay/1000} seconds... (${errorRetryCount}/${maxRetries})`, 'warning');
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // Try operation again
            try {
                updateConnectionStatus('connecting');
                const result = await operation();
                errorRetryCount = 0; // Reset on success
                updateConnectionStatus('connected');
                return result;
            } catch (retryError) {
                // If still failing after retry, handle as normal
                showNotification(`Failed to connect after ${errorRetryCount} retries`, 'error');
                updateConnectionStatus('disconnected');
                return null;
            }
        } else {
            // Reset retry count for next operation
            errorRetryCount = 0;
            
            // Show error notification for critical operations
            if (criticalOperation) {
                if (error.response && error.response.data && error.response.data.error) {
                    showNotification(`${errorMessage}: ${error.response.data.error}`, 'error');
                } else {
                    showNotification(errorMessage, 'error');
                }
            }
            
            return null;
        }
    }
    
    /**
     * Create the connection status indicator
     */
    function createStatusIndicator() {
        if (statusIndicator) return;
        
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'dm-connection-status connected';
        statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> <span>Connected</span>';
        
        // Add to chat window header
        const chatHeader = document.querySelector('.dm-chat-header');
        if (chatHeader) {
            chatHeader.appendChild(statusIndicator);
        }
        
        // Add event listener for online/offline status
        window.addEventListener('online', handleOnlineEvent);
        window.addEventListener('offline', handleOfflineEvent);
        
        // Set initial status
        updateConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    }
    
    /**
     * Update the connection status indicator
     * @param {string} status - Connection status ('connected', 'connecting', 'disconnected')
     */
    function updateConnectionStatus(status) {
        connectionStatus = status;
        
        if (!statusIndicator) {
            createStatusIndicator();
        }
        
        // Update class and text
        statusIndicator.className = `dm-connection-status ${status}`;
        
        const statusText = statusIndicator.querySelector('span');
        const statusIcon = statusIndicator.querySelector('i');
        
        if (status === 'connected') {
            statusText.textContent = 'Connected';
            statusIcon.className = 'fas fa-wifi';
        } else if (status === 'connecting') {
            statusText.textContent = 'Connecting...';
            statusIcon.className = 'fas fa-sync fa-spin';
        } else if (status === 'disconnected') {
            statusText.textContent = 'Disconnected';
            statusIcon.className = 'fas fa-exclamation-triangle';
        }
    }
    
    /**
     * Handle browser online event
     */
    function handleOnlineEvent() {
        updateConnectionStatus('connecting');
        showNotification('Connection restored. Refreshing data...', 'info');
        
        // Wait a moment for the connection to stabilize
        setTimeout(() => {
            // Refresh current view
            refreshCurrentView();
            updateConnectionStatus('connected');
        }, 1000);
    }
    
    /**
     * Handle browser offline event
     */
    function handleOfflineEvent() {
        updateConnectionStatus('disconnected');
        showNotification('Connection lost. Waiting for reconnection...', 'warning');
    }
    
    // Public API
    return {
        init,
        loadConversations,
        openConversation,
        sendMessage,
        refreshCurrentView,
        cleanup
    };
})();

// Export module to global scope
window.DirectMessageModule = DirectMessageModule;
