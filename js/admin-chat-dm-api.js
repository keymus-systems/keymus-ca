/**
 * Direct Message (DM) API Client
 * Provides methods to interact with the DM API endpoints
 */

const dmApi = {
    // Base URL for all DM-related API requests
    baseUrl: '/api/admin-chat',
    
    /**
     * Get all DM conversations for the current user
     * @returns {Promise<Array>} Array of DM conversation objects
     */
    async listDMConversations() {
        try {
            const response = await fetch(`${this.baseUrl}/dms`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get DM conversations');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error listing DM conversations:', error);
            throw error;
        }
    },
    
    /**
     * Get messages in a specific DM conversation
     * @param {number} conversationId - ID of the conversation
     * @returns {Promise<Array>} Array of message objects
     */
    async getDMConversation(conversationId) {
        try {
            const response = await fetch(`${this.baseUrl}/dms/${conversationId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get DM messages');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting DM conversation:', error);
            throw error;
        }
    },
    
    /**
     * Start a new DM conversation with another user
     * @param {number} userId - ID of the user to start conversation with
     * @returns {Promise<Object>} New conversation object
     */
    async startDMConversation(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/dms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ otherUserId: userId })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start DM conversation');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error starting DM conversation:', error);
            throw error;
        }
    },
    
    /**
     * Send a message in a DM conversation
     * @param {number} conversationId - ID of the conversation
     * @param {string} message - Message text
     * @param {string} messageType - Type of message (text, image, file, voicenote)
     * @param {File} attachment - Optional file attachment
     * @param {number} impersonateUserId - Optional user ID to impersonate (admin only)
     * @returns {Promise<Object>} New message object
     */
    async sendDMMessage(conversationId, message, messageType = 'text', attachment = null, impersonateUserId = null) {
        try {
            // Use FormData for file uploads
            const formData = new FormData();
            formData.append('message', message);
            formData.append('messageType', messageType);
            
            if (impersonateUserId) {
                formData.append('impersonateUserId', impersonateUserId);
            }
            
            if (attachment) {
                formData.append('attachment', attachment);
            }
            
            const response = await fetch(`${this.baseUrl}/dms/${conversationId}/message`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send DM message');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending DM message:', error);
            throw error;
        }
    },
    
    /**
     * Delete a DM conversation
     * @param {number} conversationId - ID of the conversation to delete
     * @returns {Promise<Object>} Success message
     */
    async deleteDMConversation(conversationId) {
        try {
            const response = await fetch(`${this.baseUrl}/dms/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete DM conversation');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting DM conversation:', error);
            throw error;
        }
    },
    
    /**
     * Get all messages for a fake user (admin only)
     * @param {number} fakeUserId - ID of the fake user
     * @returns {Promise<Array>} Array of message objects
     */
    async getFakeUserMessages(fakeUserId) {
        try {
            const response = await fetch(`${this.baseUrl}/fake-users/${fakeUserId}/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get fake user messages');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting fake user messages:', error);
            throw error;
        }
    }
};

// Export the DM API client
window.dmApi = dmApi;
