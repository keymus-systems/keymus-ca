/**
 * Chat User Management JavaScript
 * This file contains the functionality for the chat user management interface
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated as admin
  if (typeof requireAuth === 'function') {
    const authData = requireAuth(true); // true for admin required
    if (!authData) {
      return; // requireAuth will handle redirect
    }
  }
  
  // Initialize tabs if they exist
  initTabs();
  
  // Initialize user management
  initUserManagement();
  
  // Initialize group management
  initGroupManagement();
  
  // Initialize group assignments
  initGroupAssignments();
  
  // Add event listener for refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', function() {
    refreshData();
  });
  
  // Initial data load
  refreshData();
});

/**
 * Initialize tab functionality
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.classList.remove('active'));
      // Show the selected tab content
      document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
    });
  });
}

/**
 * Initialize user management functionality
 */
function initUserManagement() {
  // DOM Elements
  const userSearch = document.getElementById('user-search');
  const searchUserBtn = document.getElementById('search-user-btn');
  const userResults = document.getElementById('user-results');
  const addUserBtn = document.getElementById('add-user-btn');
  const userForm = document.getElementById('user-form');
  const chatUserForm = document.getElementById('chat-user-form');
  const cancelUserFormBtn = document.getElementById('cancel-user-form');
  
  // Event handlers
  searchUserBtn?.addEventListener('click', function() {
    searchUsers(userSearch.value);
  });
  
  userSearch?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchUsers(userSearch.value);
    }
  });
  
  addUserBtn?.addEventListener('click', function() {
    showUserForm('add');
  });
  
  cancelUserFormBtn?.addEventListener('click', function() {
    hideUserForm();
  });
  
  chatUserForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    saveUser();
  });
  
  // Initial user search
  searchUsers('');
}

/**
 * Initialize group management functionality
 */
function initGroupManagement() {
  // DOM Elements
  const groupSearch = document.getElementById('group-search');
  const searchGroupBtn = document.getElementById('search-group-btn');
  const groupResults = document.getElementById('group-results');
  const addGroupBtn = document.getElementById('add-group-btn');
  const groupForm = document.getElementById('group-form');
  const chatGroupForm = document.getElementById('chat-group-form');
  const cancelGroupFormBtn = document.getElementById('cancel-group-form');
  
  // Event handlers
  searchGroupBtn?.addEventListener('click', function() {
    searchGroups(groupSearch.value);
  });
  
  groupSearch?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchGroups(groupSearch.value);
    }
  });
  
  addGroupBtn?.addEventListener('click', function() {
    showGroupForm('add');
  });
  
  cancelGroupFormBtn?.addEventListener('click', function() {
    hideGroupForm();
  });
  
  chatGroupForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    saveGroup();
  });
  
  // Initial group search
  searchGroups('');
}

/**
 * Initialize group assignments functionality
 */
function initGroupAssignments() {
  // DOM Elements
  const assignmentGroup = document.getElementById('assignment-group');
  const assignmentUser = document.getElementById('assignment-user');
  const addToGroupBtn = document.getElementById('add-to-group-btn');
  const removeFromGroupBtn = document.getElementById('remove-from-group-btn');
  const groupMembers = document.getElementById('group-members');
  
  // Event handlers
  assignmentGroup?.addEventListener('change', function() {
    if (this.value) {
      loadGroupMembers(this.value);
    } else {
      groupMembers.innerHTML = '<p>Please select a group to view its members.</p>';
    }
  });
  
  addToGroupBtn?.addEventListener('click', function() {
    const groupId = assignmentGroup.value;
    const userId = assignmentUser.value;
    
    if (!groupId || !userId) {
      showNotification('Please select both a group and a user.', 'warning');
      return;
    }
    
    addUserToGroup(groupId, userId);
  });
  
  removeFromGroupBtn?.addEventListener('click', function() {
    const groupId = assignmentGroup.value;
    const userId = assignmentUser.value;
    
    if (!groupId || !userId) {
      showNotification('Please select both a group and a user.', 'warning');
      return;
    }
    
    removeUserFromGroup(groupId, userId);
  });
  
  // Load groups and users for the dropdowns
  loadGroupsForDropdown();
  loadUsersForDropdown();
}

/**
 * Refresh all data
 */
function refreshData() {
  searchUsers('');
  searchGroups('');
  loadGroupsForDropdown();
  loadUsersForDropdown();
  
  const assignmentGroup = document.getElementById('assignment-group');
  if (assignmentGroup && assignmentGroup.value) {
    loadGroupMembers(assignmentGroup.value);
  }
  
  showNotification('Data refreshed.', 'info');
}

/**
 * Search for users
 * @param {string} query - Search query
 */
async function searchUsers(query) {
  try {
    const userResults = document.getElementById('user-results');
    userResults.innerHTML = '<p>Loading users...</p>';
    
    // Call the API to get users
    const users = await AdminChatAPI.getFakeUsers(query);
    
    if (!users || users.length === 0) {
      userResults.innerHTML = '<p>No users found.</p>';
      return;
    }
    
    // Render users
    userResults.innerHTML = '';
    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'user-card';
      userCard.innerHTML = `
        <img src="${user.avatar_url || 'images/default-avatar.png'}" alt="${user.display_name}" class="user-avatar">
        <div class="user-details">
          <h4>${user.display_name} <small>(${user.username})</small></h4>
          <p>${user.bio || 'No bio provided.'}</p>
          <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="user-actions">
          <button class="btn small edit-user" data-id="${user.id}"><i class="fas fa-edit"></i></button>
          <button class="btn small danger delete-user" data-id="${user.id}"><i class="fas fa-trash"></i></button>
        </div>
      `;
      userResults.appendChild(userCard);
      
      // Add event listeners
      userCard.querySelector('.edit-user').addEventListener('click', function() {
        editUser(user.id);
      });
      
      userCard.querySelector('.delete-user').addEventListener('click', function() {
        if (confirm(`Are you sure you want to delete ${user.display_name}?`)) {
          deleteUser(user.id);
        }
      });
    });
  } catch (error) {
    console.error('Error searching users:', error);
    showNotification('Error searching users: ' + error.message, 'error');
  }
}

/**
 * Search for groups
 * @param {string} query - Search query
 */
async function searchGroups(query) {
  try {
    const groupResults = document.getElementById('group-results');
    groupResults.innerHTML = '<p>Loading groups...</p>';
    
    // Call the API to get groups
    const groups = await AdminChatAPI.getGroups(1, 100, query);
    
    if (!groups || !groups.groups || groups.groups.length === 0) {
      groupResults.innerHTML = '<p>No groups found.</p>';
      return;
    }
    
    // Render groups
    groupResults.innerHTML = '';
    groups.groups.forEach(group => {
      const groupCard = document.createElement('div');
      groupCard.className = 'user-card'; // Reuse the same styling
      groupCard.innerHTML = `
        <div class="group-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="user-details">
          <h4>${group.name}</h4>
          <p>${group.description || 'No description provided.'}</p>
          <span class="badge ${group.is_active ? 'active' : 'inactive'}">${group.is_active ? 'Active' : 'Inactive'}</span>
          <span class="badge">${group.group_type}</span>
        </div>
        <div class="user-actions">
          <button class="btn small edit-group" data-id="${group.id}"><i class="fas fa-edit"></i></button>
          <button class="btn small danger delete-group" data-id="${group.id}"><i class="fas fa-trash"></i></button>
        </div>
      `;
      groupResults.appendChild(groupCard);
      
      // Add event listeners
      groupCard.querySelector('.edit-group').addEventListener('click', function() {
        editGroup(group.id);
      });
      
      groupCard.querySelector('.delete-group').addEventListener('click', function() {
        if (confirm(`Are you sure you want to delete ${group.name}?`)) {
          deleteGroup(group.id);
        }
      });
    });
  } catch (error) {
    console.error('Error searching groups:', error);
    showNotification('Error searching groups: ' + error.message, 'error');
  }
}

/**
 * Load groups for the dropdown
 */
async function loadGroupsForDropdown() {
  try {
    const assignmentGroup = document.getElementById('assignment-group');
    if (!assignmentGroup) return;
    
    // Save current selection
    const currentValue = assignmentGroup.value;
    
    // Clear dropdown except for the placeholder
    assignmentGroup.innerHTML = '<option value="">-- Select Group --</option>';
    
    // Call the API to get groups
    const groups = await AdminChatAPI.getGroups(1, 100, '');
    
    if (!groups || !groups.groups || groups.groups.length === 0) {
      return;
    }
    
    // Add groups to dropdown
    groups.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      assignmentGroup.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue) {
      assignmentGroup.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading groups for dropdown:', error);
    showNotification('Error loading groups: ' + error.message, 'error');
  }
}

/**
 * Load users for the dropdown
 */
async function loadUsersForDropdown() {
  try {
    const assignmentUser = document.getElementById('assignment-user');
    if (!assignmentUser) return;
    
    // Save current selection
    const currentValue = assignmentUser.value;
    
    // Clear dropdown except for the placeholder
    assignmentUser.innerHTML = '<option value="">-- Select User --</option>';
    
    // Call the API to get users
    const users = await AdminChatAPI.getFakeUsers('');
    
    if (!users || users.length === 0) {
      return;
    }
    
    // Add users to dropdown
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.display_name} (${user.username})`;
      assignmentUser.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue) {
      assignmentUser.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading users for dropdown:', error);
    showNotification('Error loading users: ' + error.message, 'error');
  }
}

/**
 * Load members of a specific group
 * @param {string} groupId - ID of the group
 */
async function loadGroupMembers(groupId) {
  try {
    const groupMembers = document.getElementById('group-members');
    groupMembers.innerHTML = '<p>Loading group members...</p>';
    
    // Call the API to get group members
    const members = await AdminChatAPI.getGroupMembers(groupId);
    
    if (!members || members.length === 0) {
      groupMembers.innerHTML = '<p>No members in this group.</p>';
      return;
    }
    
    // Render members
    groupMembers.innerHTML = '';
    members.forEach(member => {
      const memberCard = document.createElement('div');
      memberCard.className = 'user-card';
      memberCard.innerHTML = `
        <img src="${member.avatar_url || 'images/default-avatar.png'}" alt="${member.display_name}" class="user-avatar">
        <div class="user-details">
          <h4>${member.display_name} <small>(${member.username})</small></h4>
          <p>${member.bio || 'No bio provided.'}</p>
          <span class="status-badge ${member.is_active ? 'active' : 'inactive'}">${member.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="user-actions">
          <button class="btn small danger remove-member" data-user-id="${member.id}" data-group-id="${groupId}">
            <i class="fas fa-user-minus"></i> Remove
          </button>
        </div>
      `;
      groupMembers.appendChild(memberCard);
      
      // Add event listener
      memberCard.querySelector('.remove-member').addEventListener('click', function() {
        if (confirm(`Remove ${member.display_name} from this group?`)) {
          removeUserFromGroup(this.dataset.groupId, this.dataset.userId);
        }
      });
    });
  } catch (error) {
    console.error('Error loading group members:', error);
    showNotification('Error loading group members: ' + error.message, 'error');
  }
}

/**
 * Show user form for adding or editing
 * @param {string} mode - 'add' or 'edit'
 * @param {object} userData - User data for editing (only required for edit mode)
 */
function showUserForm(mode, userData = null) {
  const userForm = document.getElementById('user-form');
  const userFormTitle = document.getElementById('user-form-title');
  const form = document.getElementById('chat-user-form');
  
  // Set form title
  userFormTitle.textContent = mode === 'add' ? 'Add New User' : 'Edit User';
  
  // Reset form
  form.reset();
  
  // Set form fields if editing
  if (mode === 'edit' && userData) {
    document.getElementById('user-id').value = userData.id;
    document.getElementById('username').value = userData.username;
    document.getElementById('display-name').value = userData.display_name;
    document.getElementById('avatar-url').value = userData.avatar_url || '';
    document.getElementById('bio').value = userData.bio || '';
    document.getElementById('is-active').value = userData.is_active.toString();
  } else {
    document.getElementById('user-id').value = '';
  }
  
  // Show form
  userForm.style.display = 'block';
  
  // Scroll to form
  userForm.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Hide user form
 */
function hideUserForm() {
  const userForm = document.getElementById('user-form');
  userForm.style.display = 'none';
}

/**
 * Show group form for adding or editing
 * @param {string} mode - 'add' or 'edit'
 * @param {object} groupData - Group data for editing (only required for edit mode)
 */
function showGroupForm(mode, groupData = null) {
  const groupForm = document.getElementById('group-form');
  const groupFormTitle = document.getElementById('group-form-title');
  const form = document.getElementById('chat-group-form');
  
  // Set form title
  groupFormTitle.textContent = mode === 'add' ? 'Add New Group' : 'Edit Group';
  
  // Reset form
  form.reset();
  
  // Set form fields if editing
  if (mode === 'edit' && groupData) {
    document.getElementById('group-id').value = groupData.id;
    document.getElementById('group-name').value = groupData.name;
    document.getElementById('group-description').value = groupData.description || '';
    document.getElementById('group-type').value = groupData.group_type;
    document.getElementById('group-is-active').value = groupData.is_active.toString();
  } else {
    document.getElementById('group-id').value = '';
  }
  
  // Show form
  groupForm.style.display = 'block';
  
  // Scroll to form
  groupForm.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Hide group form
 */
function hideGroupForm() {
  const groupForm = document.getElementById('group-form');
  groupForm.style.display = 'none';
}

/**
 * Save user (create or update)
 */
async function saveUser() {
  try {
    const userId = document.getElementById('user-id').value;
    const userData = {
      username: document.getElementById('username').value,
      display_name: document.getElementById('display-name').value,
      avatar_url: document.getElementById('avatar-url').value || null,
      bio: document.getElementById('bio').value || null,
      is_active: document.getElementById('is-active').value === 'true'
    };
    
    let result;
    if (userId) {
      // Update existing user
      result = await AdminChatAPI.updateFakeUser(userId, userData);
      showNotification('User updated successfully!', 'success');
    } else {
      // Create new user
      result = await AdminChatAPI.createFakeUser(userData);
      showNotification('User created successfully!', 'success');
    }
    
    // Hide form and refresh user list
    hideUserForm();
    searchUsers('');
    loadUsersForDropdown();
  } catch (error) {
    console.error('Error saving user:', error);
    showNotification('Error saving user: ' + error.message, 'error');
  }
}

/**
 * Save group (create or update)
 */
async function saveGroup() {
  try {
    const groupId = document.getElementById('group-id').value;
    const groupData = {
      name: document.getElementById('group-name').value,
      description: document.getElementById('group-description').value || null,
      group_type: document.getElementById('group-type').value,
      is_active: document.getElementById('group-is-active').value === 'true'
    };
    
    let result;
    if (groupId) {
      // Update existing group
      result = await AdminChatAPI.updateGroup(groupId, groupData);
      showNotification('Group updated successfully!', 'success');
    } else {
      // Create new group
      result = await AdminChatAPI.createGroup(groupData);
      showNotification('Group created successfully!', 'success');
    }
    
    // Hide form and refresh group list
    hideGroupForm();
    searchGroups('');
    loadGroupsForDropdown();
  } catch (error) {
    console.error('Error saving group:', error);
    showNotification('Error saving group: ' + error.message, 'error');
  }
}

/**
 * Edit user
 * @param {string} userId - ID of the user to edit
 */
async function editUser(userId) {
  try {
    // Get user details
    const user = await AdminChatAPI.getFakeUserById(userId);
    
    if (!user) {
      showNotification('User not found.', 'error');
      return;
    }
    
    // Show edit form
    showUserForm('edit', user);
  } catch (error) {
    console.error('Error getting user details:', error);
    showNotification('Error getting user details: ' + error.message, 'error');
  }
}

/**
 * Edit group
 * @param {string} groupId - ID of the group to edit
 */
async function editGroup(groupId) {
  try {
    // Get group details
    const group = await AdminChatAPI.getGroupById(groupId);
    
    if (!group) {
      showNotification('Group not found.', 'error');
      return;
    }
    
    // Show edit form
    showGroupForm('edit', group);
  } catch (error) {
    console.error('Error getting group details:', error);
    showNotification('Error getting group details: ' + error.message, 'error');
  }
}

/**
 * Delete user
 * @param {string} userId - ID of the user to delete
 */
async function deleteUser(userId) {
  try {
    // Delete user
    await AdminChatAPI.deleteFakeUser(userId);
    showNotification('User deleted successfully!', 'success');
    
    // Refresh user list
    searchUsers('');
    loadUsersForDropdown();
  } catch (error) {
    console.error('Error deleting user:', error);
    showNotification('Error deleting user: ' + error.message, 'error');
  }
}

/**
 * Delete group
 * @param {string} groupId - ID of the group to delete
 */
async function deleteGroup(groupId) {
  try {
    // Delete group
    await AdminChatAPI.deleteGroup(groupId);
    showNotification('Group deleted successfully!', 'success');
    
    // Refresh group list
    searchGroups('');
    loadGroupsForDropdown();
  } catch (error) {
    console.error('Error deleting group:', error);
    showNotification('Error deleting group: ' + error.message, 'error');
  }
}

/**
 * Add user to group
 * @param {string} groupId - ID of the group
 * @param {string} userId - ID of the user
 */
async function addUserToGroup(groupId, userId) {
  try {
    // Add user to group
    await AdminChatAPI.addGroupMember(groupId, {
      fake_user_id: userId,
      user_type: 'fake_user'
    });
    
    showNotification('User added to group successfully!', 'success');
    
    // Refresh group members
    loadGroupMembers(groupId);
  } catch (error) {
    console.error('Error adding user to group:', error);
    showNotification('Error adding user to group: ' + error.message, 'error');
  }
}

/**
 * Remove user from group
 * @param {string} groupId - ID of the group
 * @param {string} userId - ID of the user
 */
async function removeUserFromGroup(groupId, userId) {
  try {
    // Remove user from group
    await AdminChatAPI.removeGroupMember(groupId, userId);
    
    showNotification('User removed from group successfully!', 'success');
    
    // Refresh group members
    loadGroupMembers(groupId);
  } catch (error) {
    console.error('Error removing user from group:', error);
    showNotification('Error removing user from group: ' + error.message, 'error');
  }
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // Use AdminErrorHandler if available
  if (window.AdminErrorHandler && AdminErrorHandler.showNotification) {
    AdminErrorHandler.showNotification(message, type);
    return;
  }
  
  // Fallback to window.showNotification if available
  if (window.showNotification) {
    window.showNotification(message, type);
    return;
  }
  
  // Fallback to alert
  alert(`${type.toUpperCase()}: ${message}`);
}
