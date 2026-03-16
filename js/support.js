document.addEventListener('DOMContentLoaded', () => {
    // Use centralized authentication check
    const authData = requireAuth();
    if (!authData) {
        return; // requireAuth will handle redirect
    }

    const messageListElem = document.getElementById('support-message-list');
    const supportForm = document.getElementById('support-form');
    const subjectInput = document.getElementById('support-subject-input');
    const messageInput = document.getElementById('usermessage');
    const sendButton = document.getElementById('userchat');

    // Format date for messages
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'Invalid date';
        }
    };

    // Escape HTML to prevent XSS
    const escapeHtml = (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Display messages in the chat interface
    const displayMessages = (messages) => {
        if (!messageListElem) return;

        messageListElem.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            messageListElem.innerHTML = '<p class="text-center text-muted">No messages yet. Start a conversation!</p>';
            return;
        }

        // Sort messages by date
        const sortedMessages = [...messages].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
        );

        sortedMessages.forEach(msg => {
            const isUserMessage = msg.sender_role === 'user';
            const chatClass = isUserMessage ? 'chat' : 'chat chat-left';
            const avatarSrc = isUserMessage ? './assets/uploads/user.jpg' : './assets/uploads/generals/favicon.png';
            const time = formatDate(msg.created_at);

            const messageHtml = `
                <div class="${chatClass}">
                    ${!isUserMessage ? `<div class="chat-avatar">
                        <span class="avatar avatar-sm">
                            <img alt="Support" src="${avatarSrc}" class="hide-mobile">
                        </span>
                    </div>` : ''}
                    <div class="chat-body">
                        <div class="chat-content">
                            ${msg.subject ? `<p><strong>Subject: ${escapeHtml(msg.subject)}</strong></p>` : ''}
                            <p>${escapeHtml(msg.message)}</p>
                            <time class="chat-time">${time}</time>
                        </div>
                    </div>
                    ${isUserMessage ? `<div class="chat-avatar">
                        <span class="avatar avatar-sm">
                            <img alt="You" src="${avatarSrc}" class="hide-mobile">
                        </span>
                    </div>` : ''}
                </div>
            `;
            messageListElem.insertAdjacentHTML('beforeend', messageHtml);
        });

        // Scroll to bottom
        messageListElem.scrollTop = messageListElem.scrollHeight;
    };

    // Fetch messages from server
    const fetchMessages = async () => {
        if (!messageListElem) return;
        
        try {
            const response = await fetch('/api/user/support/messages', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                displayMessages(data.messages);
            } else {
                throw new Error(data.message || 'Failed to load messages');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            messageListElem.innerHTML = '<p class="text-center text-danger">Error loading messages. Please try again.</p>';
            if (typeof showNotification === 'function') {
                showNotification('Error loading messages', 'error');
            }
        }
    };

    // Handle form submission
    if (supportForm) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subject = subjectInput?.value.trim() || '';
            const message = messageInput?.value.trim();

            if (!message) {
                if (typeof showNotification === 'function') {
                    showNotification('Please enter a message', 'error');
                }
                return;
            }

            sendButton.disabled = true;
            const originalText = sendButton.textContent;
            sendButton.textContent = 'Sending...';

            try {
                const response = await fetch('/api/user/support/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ subject, message })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    if (typeof showNotification === 'function') {
                        showNotification('Message sent successfully', 'success');
                    }
                    supportForm.reset();
                    await fetchMessages(); // Refresh messages
                } else {
                    throw new Error(data.message || 'Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                if (typeof showNotification === 'function') {
                    showNotification(error.message || 'Error sending message', 'error');
                }
            } finally {
                sendButton.disabled = false;
                sendButton.textContent = originalText;
            }
        });
    }

    // Initial fetch of messages
    fetchMessages();
});
