/**
 * Admin Chat API Client
 * Handles all API calls for the admin chat management interface
 */

const AdminChatAPI = (() => {
  // Base API URL - Fixed to match server routing
  const API_BASE = '/api/admin/chat';
  
  // Helper function for API calls with improved error handling
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    const fullUrl = `${API_BASE}${endpoint}`;
    console.log(`[AdminChatAPI] Making ${method} request to: ${fullUrl}`);
    
    // Check if SimpleAuth is available
    if (typeof SimpleAuth === 'undefined') {
      console.error('[AdminChatAPI] SimpleAuth not available. Check script loading order.');
      showError('Authentication system not loaded. Please refresh the page.');
      return null;
    }
    
    // Debug: Check what tokens are available
    console.log('[AdminChatAPI] Debug - Available localStorage keys:', Object.keys(localStorage));
    console.log('[AdminChatAPI] Debug - auth_token:', localStorage.getItem('auth_token'));
    console.log('[AdminChatAPI] Debug - auth_token_admin:', localStorage.getItem('auth_token_admin'));
    console.log('[AdminChatAPI] Debug - adminToken:', localStorage.getItem('adminToken'));
    console.log('[AdminChatAPI] Debug - admin_auth_token:', localStorage.getItem('admin_auth_token'));
    console.log('[AdminChatAPI] Debug - SimpleAuth current context:', SimpleAuth.getCurrentContext());
    
    // Use SimpleAuth to get the admin token
    const adminToken = SimpleAuth.getToken('admin');
    console.log('[AdminChatAPI] Retrieved admin token:', adminToken ? `${adminToken.substring(0, 20)}...` : 'null');
    
    // Additional debugging - check token structure if available
    if (adminToken) {
      try {
        const payload = JSON.parse(atob(adminToken.split('.')[1]));
        console.log('[AdminChatAPI] Token payload preview:', {
          userId: payload.userId,
          username: payload.username,
          exp: payload.exp,
          expiresAt: new Date(payload.exp * 1000).toISOString()
        });
      } catch (e) {
        console.log('[AdminChatAPI] Could not parse token payload:', e.message);
      }
    }
    
    if (!adminToken) {
      console.warn('[AdminChatAPI] No admin token found. User may not be authenticated.');
      
      // Check if user is on admin page but not authenticated
      if (window.location.pathname.includes('admin-chat.html')) {
        console.log('[AdminChatAPI] On admin page without admin token. Redirecting to admin login.');
        showError('Admin authentication required. Redirecting to login...');
        setTimeout(() => {
          window.location.href = 'admin-login.html';
        }, 2000);
      } else {
        showError('Authentication required. Please log in as admin.');
      }
      return null;
    }
    
    try {
      // Use standard admin authentication approach
      console.log('[AdminChatAPI] Using admin authentication token');
      response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: data ? JSON.stringify(data) : null,
        credentials: 'include'
      });

      console.log(`[AdminChatAPI] Response status: ${response.status} ${response.statusText}`);
      console.log(`[AdminChatAPI] Response URL: ${response.url}`);

      // Check for non-JSON responses which may indicate an error or redirect
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log(`[AdminChatAPI] Non-JSON response received (${contentType}):`, text.substring(0, 500));
        console.log(`[AdminChatAPI] Full URL: ${fullUrl}`);
        console.log(`[AdminChatAPI] Response headers:`, Object.fromEntries(response.headers.entries()));
        
        // If we get HTML, it's likely a server-side redirect or error page
        if (text.includes('<!DOCTYPE html>')) {
            console.error('[AdminChatAPI] Received HTML response instead of JSON. This could be an auth issue or server error.');
            console.error('[AdminChatAPI] Response preview:', text.substring(0, 200));
            showError('An unexpected server response was received. Please try logging in again.');
            return null;
        }
        // For other non-JSON, non-OK responses
        if (!response.ok) {
            throw new Error(`SERVER_NON_JSON_ERROR: Server returned a non-JSON error: ${response.status} ${response.statusText}`);
        }
        // If response is OK but not JSON (e.g., 204 No Content)
        return { success: true, data: text };
      }

      const result = await response.json();
      
      if (!response.ok) {
        // Enhanced error handling with detailed error information
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: result.error || 'UNKNOWN_ERROR',
          message: result.message || result.error || 'API call failed',
          details: result.details || null,
          timestamp: result.timestamp || new Date().toISOString()
        };
        
        console.error('[AdminChatAPI] API Error:', errorInfo);
        throw new Error(JSON.stringify(errorInfo));
      }
      
      return result;
    } catch (error) {
      console.error('[AdminChatAPI] API call failed:', error);
      
      // Try to parse enhanced error info
      let errorInfo;
      try {
        errorInfo = JSON.parse(error.message);
      } catch (parseError) {
        // Fallback to simple error
        errorInfo = {
          error: 'NETWORK_ERROR',
          message: error.message,
          details: 'Failed to connect to server or parse response'
        };
      }
      
      // Avoid showing generic error if DualAuth is already handling a redirect
      if (errorInfo.error !== 'Unauthorized') {
        showError(`${errorInfo.message}${errorInfo.details ? ' - ' + errorInfo.details : ''}`);
      }
      return null;
    }
  };
  
  
  // Get CSRF token from meta tag
  const getCSRFToken = () => {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : '';
  };
  
  // Show error message with improved formatting
  const showError = (message) => {
    console.error('[AdminChatAPI] Error:', message);
    
    // Try to use the existing notification system if available
    if (window.AdminUI && window.AdminUI.showNotification) {
      window.AdminUI.showNotification('error', message);
      return;
    }
    
    // Try to use a more user-friendly notification if available
    if (window.showNotification) {
      window.showNotification('error', message);
      return;
    }
    
    // Create a temporary error display element
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
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
    
    // Fallback to alert for critical errors
    if (message.includes('AUTHENTICATION') || message.includes('UNAUTHORIZED')) {
      alert(`Authentication Error: ${message}`);
    }
  };
  
  // Redirect to admin dashboard
  const redirectToLogin = () => {
    // Clear the tokens since they're invalid or expired
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    // Redirect to the admin panel
    // window.location.href = '/admin.html';
  };
  
  // API methods
  return {
    // Groups
    getGroups: (page = 1, limit = 50, search = '') => {
      return apiCall(`/groups?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    },
    
    getGroupDetails: (groupId) => {
      return apiCall(`/groups/${groupId}`);
    },
    
    // Alias for backward compatibility
    getGroupById: (groupId) => {
      return apiCall(`/groups/${groupId}`);
    },

    getGroupUsers: (groupId) => {
      // Use correct backend route for group members (fake users)
      return apiCall(`/groups/${groupId}/members`);
    },
    
    // Fake Users
    getAllFakeUsers: (page = 1, limit = 50, search = '') => {
      return apiCall(`/fake-users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    },
    
    getFakeUserDetails: (userId) => {
      return apiCall(`/fake-users/${userId}`);
    },
    
    // Real Client Users (for DM functionality)
    getRegisteredClients: (page = 1, limit = 100, search = '') => {
      return apiCall(`/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    },
    
    // Posting and Messages
    postAsFakeUser: (groupId, fakeUserId, message, messageType = 'text') => {
      return apiCall('/post', 'POST', {
        groupId,
        fakeUserId,
        message,
        messageType
      });
    },
    
    scheduleMessage: (groupId, fakeUserId, message, messageType, scheduledAt, isRecurring = false, recurringPattern = null) => {
      return apiCall('/schedule', 'POST', {
        groupId,
        fakeUserId,
        message,
        messageType,
        scheduledAt,
        isRecurring,
        recurringPattern
      });
    },
    
    cancelScheduledMessage: (messageId) => {
      return apiCall(`/schedule/${messageId}`, 'DELETE');
    },
    
    getScheduledMessages: (groupId = null, fakeUserId = null, page = 1, limit = 50) => {
      let query = `?page=${page}&limit=${limit}`;
      if (groupId) query += `&groupId=${groupId}`;
      if (fakeUserId) query += `&fakeUserId=${fakeUserId}`;
      
      return apiCall(`/schedule${query}`);
    },
    
    // Preview
    previewConversation: (groupId, messages) => {
      return apiCall('/preview', 'POST', {
        groupId,
        messages
      });
    },
    
    // Admin Logs
    getAdminLogs: (filters = {}, page = 1, limit = 50) => {
      let query = `?page=${page}&limit=${limit}`;
      
      if (filters.adminId) query += `&adminId=${filters.adminId}`;
      if (filters.actionType) query += `&actionType=${filters.actionType}`;
      if (filters.groupId) query += `&groupId=${filters.groupId}`;
      if (filters.fakeUserId) query += `&fakeUserId=${filters.fakeUserId}`;
      if (filters.startDate) query += `&startDate=${filters.startDate}`;
      if (filters.endDate) query += `&endDate=${filters.endDate}`;
      
      return apiCall(`/logs${query}`);
    },
    
    getLogDetails: (logId) => {
      return apiCall(`/logs/${logId}`);
    },
    
    // Templates (for future implementation)
    getTemplates: (page = 1, limit = 50) => {
      return apiCall(`/templates?page=${page}&limit=${limit}`);
    },
    
    createTemplate: (name, description, content) => {
      return apiCall('/templates', 'POST', {
        name,
        description,
        content
      });
    },
    
    updateTemplate: (templateId, name, description, content) => {
      return apiCall(`/templates/${templateId}`, 'PUT', {
        name,
        description,
        content
      });
    },
    
    deleteTemplate: (templateId) => {
      return apiCall(`/templates/${templateId}`, 'DELETE');
    },
    
    // Conversations (Admin View)
    getConversations: (page = 1, limit = 50, search = '') => {
      return apiCall(`/conversations?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    },
    
    // Client Chat Messages (Real messages from chat system)
    getClientMessages: (page = 1, limit = 100, groupId = null) => {
      let query = `?page=${page}&limit=${limit}`;
      if (groupId) query += `&groupId=${groupId}`;
      return apiCall(`/client-messages${query}`);
    },
    
    getConversationMessages: (conversationId, page = 1, limit = 50) => {
      return apiCall(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
    },
    
    sendConversationMessage: (conversationId, fakeUserId, content, messageType = 'text') => {
      return apiCall(`/conversations/${conversationId}/messages`, 'POST', {
        fakeUserId,
        content,
        messageType
      });
    },
    
    // Send direct message from persona to client
    sendDirectMessage: (clientUserId, fakeUserId, content, messageType = 'text') => {
      return apiCall('/direct-message', 'POST', {
        clientUserId,
        fakeUserId,
        content,
        messageType
      });
    },

    // Support Messages API
    getSupportMessages: () => {
      // Use the correct admin route for support messages (not under /chat)
      return fetch('/api/admin/support/messages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SimpleAuth.getToken('admin')}`
        },
        credentials: 'include'
      }).then(response => response.json());
    },

    replySupportMessage: (messageId, replyContent, personaId) => {
      return fetch('/api/admin/support/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SimpleAuth.getToken('admin')}`
        },
        body: JSON.stringify({
          message_id: messageId,
          message: replyContent,
          persona_id: personaId
        }),
        credentials: 'include'
      }).then(response => response.json());
    }
  };
})();
