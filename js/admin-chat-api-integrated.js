/**
 * Admin Chat API Client (Integrated Version)
 * Works with existing admin authentication system
 */

const AdminChatAPI = (() => {
  // Base API URL
  const API_BASE = '/api/admin/chat';
  
  // Helper function for API calls
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    try {
      let response;
      
      // Use DualAuth if available, otherwise fall back to standard fetch
      if (typeof DualAuth !== 'undefined') {
        // Use DualAuth system for unified authentication
        const options = {
          method,
          body: data && (method === 'POST' || method === 'PUT') ? JSON.stringify(data) : null
        };
        
        console.log('Using DualAuth to fetch:', `${API_BASE}${endpoint}`);
        response = await DualAuth.fetchWithAuth(`${API_BASE}${endpoint}`, options, 'admin');
      } else {
        // Fallback to standard fetch with credentials
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          // Important: include credentials to send session cookies
          credentials: 'same-origin'
        };
        
        // Add authorization header with token if available
        const token = localStorage.getItem('admin_auth_token') || localStorage.getItem('auth_token');
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }
        
        response = await fetch(`${API_BASE}${endpoint}`, options);
      }
      
      // Handle unauthorized or forbidden - redirect to admin login
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication error:', response.status);
        // Clear auth tokens since they're invalid
        if (typeof DualAuth !== 'undefined') {
          DualAuth.clearAuth('admin');
        } else {
          localStorage.removeItem('admin_auth_token'); // Use standardized key
          localStorage.removeItem('auth_token'); // Also clear old key for compatibility
          localStorage.removeItem('user_data');
        }
        window.location.href = '/admin.html'; // Redirect to main admin page
        return null;
      }
      
      if (!response.ok) {
        // Try to extract error message from JSON response
        let errorMessage = 'API call failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'API call failed';
        } catch (jsonError) {
          // If response isn't JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // For successful responses, parse JSON
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // Handle empty responses or non-JSON responses
        console.warn('Response is not JSON or is empty:', jsonError);
        return { success: true };
      }
      
      return result;
    } catch (error) {
      console.error('API error:', error);
      
      // Create a more detailed error message for debugging
      const errorDetails = {
        message: error.message || 'API call failed',
        endpoint: `${API_BASE}${endpoint}`,
        method,
        status: error.status || 'unknown'
      };
      
      console.error('API call details:', errorDetails);
      
      // Don't show error notification for auth redirects
      if (error.message !== 'Unauthorized' && 
          !error.message.includes('Authentication required')) {
        showNotification('error', error.message || 'API call failed');
      }
      
      return null;
    }
  };
  
  // Display notification
  const showNotification = (type, message) => {
    // Use existing admin notification system if available
    if (window.AdminUI && window.AdminUI.showNotification) {
      window.AdminUI.showNotification(type, message);
      return;
    }
    
    // Check for notification system in admin.js
    if (window.showAdminNotification) {
      window.showAdminNotification(type, message);
      return;
    }
    
    // Fallback notification
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Use a more user-friendly approach than basic alert
    if (type === 'error') {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      
      // Try to insert at the top of the main content
      const mainContent = document.querySelector('.admin-content') || document.body;
      if (mainContent.firstChild) {
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
      } else {
        mainContent.appendChild(errorDiv);
      }
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    } else {
      // For non-error notifications, use alert as last resort
      alert(message);
    }
  };

  // Group Management
  const getGroups = (page = 1, limit = 50, search = '') => {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const endpoint = `/groups${queryString}`;
    
    console.log('Fetching groups with endpoint:', `${API_BASE}${endpoint}`);
    return apiCall(endpoint);
  };
  const getGroupById = (groupId) => apiCall(`/groups/${groupId}`);
  const createGroup = (groupData) => apiCall('/groups', 'POST', groupData);
  const updateGroup = (groupId, groupData) => apiCall(`/groups/${groupId}`, 'PUT', groupData);
  const deleteGroup = (groupId) => apiCall(`/groups/${groupId}`, 'DELETE');
  
  // Fake User Management
  const getFakeUsers = (search = '') => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiCall(`/fake-users${queryString}`);
  };
  const getFakeUserById = (userId) => apiCall(`/fake-users/${userId}`);
  const createFakeUser = (userData) => apiCall('/fake-users', 'POST', userData);
  const updateFakeUser = (userId, userData) => apiCall(`/fake-users/${userId}`, 'PUT', userData);
  const deleteFakeUser = (userId) => apiCall(`/fake-users/${userId}`, 'DELETE');
  const generateFakeUsers = (options) => apiCall('/fake-users/generate', 'POST', options);
  
  // Group Membership
  const getGroupMembers = (groupId) => apiCall(`/groups/${groupId}/members`);
  const addGroupMember = (groupId, memberData) => apiCall(`/groups/${groupId}/members`, 'POST', memberData);
  const removeGroupMember = (groupId, memberId) => apiCall(`/groups/${groupId}/members/${memberId}`, 'DELETE');
  
  // Messages
  const getGroupMessages = (groupId, options = {}) => {
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.before) queryParams.append('before', options.before);
    if (options.after) queryParams.append('after', options.after);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiCall(`/groups/${groupId}/messages${queryString}`);
  };
  
  const sendMessage = (groupId, messageData) => apiCall(`/groups/${groupId}/messages`, 'POST', messageData);
  const deleteMessage = (messageId) => apiCall(`/messages/${messageId}`, 'DELETE');
  
  // Post message as fake user
  const postAsFakeUser = (groupId, fakeUserId, content, messageType = 'text') => {
    const messageData = {
      groupId,
      fakeUserId,
      message: content,
      messageType
    };
    return apiCall(`/groups/${groupId}/messages`, 'POST', messageData);
  };
  
  // Scheduled Messages
  const getScheduledMessages = (groupId, userId, userType) => {
    const queryParams = new URLSearchParams();
    if (groupId) queryParams.append('groupId', groupId);
    if (userId) queryParams.append('userId', userId);
    if (userType) queryParams.append('userType', userType);
    
    return apiCall(`/scheduled-messages?${queryParams.toString()}`);
  };
  const getGroupScheduledMessages = (groupId) => apiCall(`/groups/${groupId}/scheduled-messages`);
  const scheduleMessage = (messageData) => apiCall('/scheduled-messages', 'POST', messageData);
  const updateScheduledMessage = (messageId, messageData) => apiCall(`/scheduled-messages/${messageId}`, 'PUT', messageData);
  const deleteScheduledMessage = (messageId) => apiCall(`/scheduled-messages/${messageId}`, 'DELETE');
  
  // Admin Logs
  const getAdminLogs = (options = {}) => {
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.page) queryParams.append('page', options.page);
    if (options.actionType) queryParams.append('actionType', options.actionType);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiCall(`/logs${queryString}`);
  };
  
  // Return public API
  return {
    // Groups
    getGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    
    // Fake Users
    getFakeUsers,
    getFakeUserById,
    createFakeUser,
    updateFakeUser,
    deleteFakeUser,
    generateFakeUsers,
    
    // Group Membership
    getGroupMembers,
    addGroupMember,
    removeGroupMember,
    
    // Messages
    getGroupMessages,
    sendMessage,
    deleteMessage,
    postAsFakeUser,
    
    // Scheduled Messages
    getScheduledMessages,
    getGroupScheduledMessages,
    scheduleMessage,
    updateScheduledMessage,
    deleteScheduledMessage,
    
    // Admin Logs
    getAdminLogs,
    
    // NEW: Direct Messages Management
    getAllDirectMessages: () => apiCall('/direct-messages'),
    getDirectMessageConversation: (conversationId, options = {}) => {
      const queryParams = new URLSearchParams({
        page: options.page || 1,
        limit: options.limit || 50
      });
      return apiCall(`/direct-messages/${conversationId}/messages?${queryParams}`);
    },
    
    // NEW: Enhanced Group Message Management
    replyToGroupMessage: (groupId, replyData) => apiCall(`/groups/${groupId}/reply`, 'POST', replyData)
  };
})();

// Make API available globally
window.AdminChatAPI = AdminChatAPI;
