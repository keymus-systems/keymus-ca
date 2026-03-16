import * as DriveModuleAPI from './admin-drives.js';

// Admin Panel JavaScript
// Global variables
let driveUpdateInterval;

// Helper function for status colors (used by consolidated drive history)
function getStatusBadgeColor(status) {
    switch (status.toLowerCase()) {
        case 'active': return 'success';
        case 'pending': return 'warning';
        case 'completed': return 'primary';
        case 'failed': return 'danger';
        default: return 'secondary';
    }
}

async function viewDriveDetails(driveId) {
    try {
        const response = await fetchWithAuth(`/admin/drives/${driveId}/details`);
        if (response.success) {
            showNotification('Loading drive details...', 'info');
            // Implement drive details view...
        }
    } catch (error) {
        console.error('Error loading drive details:', error);
        showNotification('Failed to load drive details', 'error');
    }
}
window.viewDriveDetails = viewDriveDetails; // Make it globally accessible

// Add polling interval reference

document.addEventListener('DOMContentLoaded', () => {
    // Use centralized authentication check for admin
    const authData = requireAuth(true); // true for admin required
    if (!authData) {
        return; // requireAuth will handle redirect
    }
    
    // Initialize notification system
    createAlertsContainer();
    
    // Initialize sidebar navigation
    initializeSidebar();
    
    // Attach centralized logout handlers if available
    if (typeof attachLogoutHandlers === 'function') {
        attachLogoutHandlers();
    }
    
    // Load initial section
    loadSection('dashboard');

    // Initialize all section handlers
    initializeHandlers();
      // Initialize DriveModule functionality from admin-drives.js
    if (DriveModuleAPI && typeof DriveModuleAPI.initDependencies === 'function') {
        DriveModuleAPI.initDependencies({ fetchWithAuth, showNotification }); // Pass dependencies
        // Removed call to DriveModuleAPI.setupDrivePolling as it does not exist.
        // Polling will be handled by loadSection.
    } else {
        console.error('DriveModuleAPI or its initDependencies function is not available. Ensure admin-drives.js is loaded as a module and exports correctly.');
    }

    // Initialize FinanceModule functionality from admin-finance.js
    if (FinanceModuleAPI && typeof FinanceModuleAPI.initDependencies === 'function') {
        FinanceModuleAPI.initDependencies({ fetchWithAuth, showNotification });
        console.log('Finance module dependencies initialized');
    } else {
        console.error('FinanceModuleAPI or its initDependencies function is not available. Ensure admin-finance.js is loaded as a module and exports correctly.');
    }

    // Initialize Enhanced Combo Creation dependencies
    if (typeof window.initEnhancedComboCreationDependencies === 'function') {
        window.initEnhancedComboCreationDependencies({ fetchWithAuth, showNotification });
        console.log('Enhanced combo creation dependencies initialized');
    } else {
        console.warn('Enhanced combo creation module not available or not properly loaded');
    }

    // Load notification categories on admin panel load
    loadNotificationCategories();
});

// Helper function for authenticated API calls
async function fetchWithAuth(endpoint, options = {}) {
    // Use DualAuth system to get admin token, fallback to old system
    let token;
    if (typeof DualAuth !== 'undefined') {
        token = DualAuth.getToken('admin');
        console.log('Admin token from DualAuth:', token ? 'exists' : 'not found');
    } else {
        token = localStorage.getItem('admin_auth_token'); // Try standardized key first
        if (!token) {
            token = localStorage.getItem('auth_token'); // Fallback for backward compatibility
            // Migrate to standardized location if found
            if (token) {
                localStorage.setItem('admin_auth_token', token);
                console.log('Migrated admin token to standardized location');
            }
        }
        console.log('Token from localStorage:', token ? 'exists' : 'not found');
    }
    
    if (!token) {
        console.error('No authentication token found for admin panel');
        throw new Error('Not authorized - no token found');
    }
    
    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        // 'Content-Type': 'application/json' // Default Content-Type will be handled below
    };

    const mergedOptions = {
        ...options, // Spread other options like method, body
        headers: {
            ...defaultHeaders, // Start with default headers (Authorization)
            ...(options.headers || {}), // Merge and override with provided headers
        }
    };

    // Set Content-Type to application/json by default if not already set and not FormData
    if (!mergedOptions.headers['Content-Type'] && !(options.body instanceof FormData)) {
        mergedOptions.headers['Content-Type'] = 'application/json';
    }

    // If body is FormData, the browser sets Content-Type to multipart/form-data automatically, 
    // so remove our default if it was set, or any explicit one if it conflicts.
    if (options.body instanceof FormData) {
        delete mergedOptions.headers['Content-Type'];
    }    const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const response = await fetch(url, mergedOptions);

    let responseBodyText = '';
    try {
        responseBodyText = await response.text(); // Read body once as text
    } catch (e) {
        // This catch is primarily for network errors during response.text() itself,
        // though usually response.ok would be false for network issues caught by fetch itself.
        console.error('Error reading response text:', e);
        const err = new Error('Failed to read response from server.');
        err.status = response.status; // Keep original status if available
        throw err;
    }

    if (!response.ok) {
        let errorData = { message: `HTTP error! status: ${response.status}`, status: response.status, responseText: responseBodyText };
        try {
            // Try to parse the already read text as JSON
            errorData = { ...JSON.parse(responseBodyText), status: response.status, responseText: responseBodyText };
            console.error('API Error Response (JSON):', errorData);
        } catch (e) {
            // If parsing as JSON fails, the responseText is already in errorData
            console.error('API Error Response (Non-JSON):', responseBodyText);
            if (!errorData.message && responseBodyText) {
                errorData.message = responseBodyText;
            } else if (!errorData.message) {
                errorData.message = `HTTP error! status: ${response.status} - Non-JSON response`;
            }
        }
        const err = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        err.data = errorData;
        err.status = response.status;
        throw err;
    }

    // If response.ok is true, try to parse the text as JSON
    try {
        if (responseBodyText === "" && response.status === 204) { // Handle 204 No Content specifically
             return null; // Or an empty object/array as appropriate for your API contract
        }
        return JSON.parse(responseBodyText);
    } catch (e) {
        // If JSON parsing fails for a successful response, it might be plain text or an empty body not handled as 204.
        console.warn('Successful response was not valid JSON. Status:', response.status, 'Body:', responseBodyText);
        // Return the raw text for successful non-JSON responses, or handle as needed.
        // If your API contract says
        // then this case might indicate an API issue or an unexpected response.
        return responseBodyText; // Or throw an error, or return null/undefined based on how you want to treat this.
    }
}

function showNotification(message, type = 'success') {
    // Create enhanced notification system
    const alertsContainer = document.getElementById('alerts-container') || createAlertsContainer();
    
    // Create alert element
    const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `admin-alert admin-alert-${type}`;
    
    // Get appropriate icon for the type
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    const icon = icons[type] || icons['info'];
    
    alertElement.innerHTML = `
        <i class="${icon} admin-alert-icon"></i>
        <span>${message}</span>
        <button type="button" class="admin-alert-close" onclick="closeAlert('${alertId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    alertsContainer.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        closeAlert(alertId);
    }, 5000);
    
    return alertId;
}

function createAlertsContainer() {
    let container = document.getElementById('alerts-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alerts-container';
        document.body.appendChild(container);
    }
    return container;
}

function closeAlert(alertId) {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        alertElement.classList.add('fade-out');
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }
}

// Make these functions globally accessible
window.showNotification = showNotification;
window.closeAlert = closeAlert;

// Debug function - test deposit modal manually
window.testDepositModal = function() {
    console.log('Manual test function called - delegating to FinanceModuleAPI');
    
    if (FinanceModuleAPI && typeof FinanceModuleAPI.showDepositHistoryModal === 'function') {
        FinanceModuleAPI.showDepositHistoryModal();
    } else {
        console.error('FinanceModuleAPI not available');
        alert('Finance module not loaded - cannot show deposit modal');
    }
};

function initializeSidebar() {
    // Handle submenu toggles
    document.querySelectorAll('.has-submenu > .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const submenu = e.target.nextElementSibling;
            submenu.classList.toggle('show');
        });
    });

    // Handle section navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadSection(e.target.dataset.section);
        });
    });    // Mobile menu toggle
    document.querySelector('.navbar-btn')?.addEventListener('click', () => {
        document.querySelector('.main-sidebar').classList.toggle('active');
        document.querySelector('.bg-overlay').classList.toggle('active');
    });

    // Handle logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();            console.log('Admin logout clicked');
            
            // Preserve drive session data before clearing localStorage
            const driveSessionData = localStorage.getItem('current_drive_session');
            
            // Use DualAuth system if available
            if (typeof DualAuth !== 'undefined') {
                DualAuth.clearAuth('admin');
            } else {
                // Clear authentication data (both standardized and legacy)
                localStorage.removeItem('admin_auth_token');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
            }
            
            // Restore drive session data after clearing auth data
            if (driveSessionData) {
                localStorage.setItem('current_drive_session', driveSessionData);
            }
            
            // Show logout notification if available
            if (typeof showNotification === 'function') {
                showNotification('Logged out successfully', 'success');
            }
            
            // Redirect to login page
            window.location.href = 'login.html';
        });
    } else {
        console.error('Logout button not found');
    }
}

function loadSection(sectionName) {
    // Clear any existing drive update interval when changing sections
    if (driveUpdateInterval) {
        clearInterval(driveUpdateInterval);
        driveUpdateInterval = null; // Reset the variable
    }

    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }

    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardStats();
            break;        case 'users':
            loadUsers();
            break;
        case 'frozen-users':
            loadFrozenUsers();
            break;
        case 'deposits':
            if (FinanceModuleAPI && typeof FinanceModuleAPI.loadDeposits === 'function') {
                FinanceModuleAPI.loadDeposits();
            } else {
                console.error('FinanceModuleAPI.loadDeposits function is not available.');
            }
            break;
        case 'withdrawals':
            if (FinanceModuleAPI && typeof FinanceModuleAPI.loadWithdrawals === 'function') {
                FinanceModuleAPI.loadWithdrawals();
            } else {
                console.error('FinanceModuleAPI.loadWithdrawals function is not available.');
            }
            break;
        case 'drives': 
            if (DriveModuleAPI && typeof DriveModuleAPI.loadDrives === 'function') {
                DriveModuleAPI.loadDrives(); // Load drives data immediately
                // Setup polling for the drives list when this section is active
                driveUpdateInterval = setInterval(() => {
                    if (document.getElementById('drives-section')?.style.display === 'block') {
                        console.log('Polling for drive updates...');
                        DriveModuleAPI.loadDrives();
                    } else {
                        // If drives section is not visible, clear interval (should be caught by section change too)
                        if (driveUpdateInterval) clearInterval(driveUpdateInterval);
                        driveUpdateInterval = null;
                    }
                }, 30000); // Poll every 30 seconds
            } else {
                console.error('DriveModuleAPI.loadDrives function is not available.');
            }
            break;        case 'drive-configurations':
            // This section's initial data is loaded by DriveModuleAPI.initDependencies.
            // If a reload is needed upon navigating here, loadDriveConfigurations should be exported from admin-drives.js and called here.
            if (DriveModuleAPI && typeof DriveModuleAPI.loadDriveConfigurations === 'function') {
                 DriveModuleAPI.loadDriveConfigurations(); // This will currently not run as it's not exported.
                 
                 // Initialize the drive configuration handlers
                 if (typeof DriveModuleAPI.initializeDriveConfigHandlers === 'function') {
                     DriveModuleAPI.initializeDriveConfigHandlers();
                 }
            } else {
                console.log('Drive configurations section displayed. Initial data loaded by initDependencies.');
            }
            break;        case 'products':
            loadProducts();
            break;
        case 'notifications':
            loadNotificationCategories();
            loadGeneralNotifications();
            break;        case 'tier-management':
            if (typeof window.tierManagement !== 'undefined') {
                window.tierManagement.refreshData();
            }
            break;
        case 'qr-management':
            loadQRCodeManagement();
            break;
        // Parent sections don't need to load data
        case 'general':
        case 'finance':
        case 'operations':
            break;
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        const response = await fetchWithAuth('/api/admin/stats');
        if (response.success) {
            document.getElementById('total-users').textContent = response.stats.totalUsers;
            document.getElementById('total-deposits').textContent = `$${response.stats.totalDeposits}`;
            document.getElementById('total-withdrawals').textContent = `$${response.stats.totalWithdrawals}`;
            document.getElementById('active-drives').textContent = response.stats.activeDrives;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Users Management
async function loadUsers() {
    try {
        const data = await fetchWithAuth('/admin/users'); // Uses GET by default

        // fetchWithAuth throws an error for non-ok responses,
        // so we can assume 'data' is present if we reach here.
        // It also parses JSON, so 'data' is the parsed response.

        // The previous implementation checked data.success.
        // Assuming the API returns { success: true, users: [...] } or { success: false, message: "..." }
        // If fetchWithAuth returns the parsed body directly, and the body itself indicates success/failure:
        if (data && data.users) { // Assuming successful response has a users array. Adjust if API structure is different.
            const usersList = $('#users-list');
            usersList.empty(); // Clear previous entries

            if (data.users.length === 0) {
                usersList.append('<tr><td colspan="6" class="text-center">No users found.</td></tr>');
            } else {
                data.users.forEach(user => {
                    const userRow = `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.tier || 'N/A'}</td>
                            <td>${user.main_balance !== undefined ? parseFloat(user.main_balance).toFixed(2) : 'N/A'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary manage-user-btn" data-user-id="${user.id}" data-bs-toggle="modal" data-bs-target="#manageUserModal">Manage</button>
                            </td>
                        </tr>
                    `;
                    usersList.append(userRow);
                });
            }
            // Re-attach event listeners for manage buttons if needed, or ensure event delegation is used.
            // If not using event delegation, this might be a place to call a function that sets up listeners on .manage-user-btn
        } else {
            // If 'data.users' is not present, it implies an issue or a different response structure.
            // The old code checked 'data.success'. If your API returns { success: false, message: '...' }
            // then fetchWithAuth would have returned that object.
            const errorMessage = data && data.message ? data.message : 'Failed to load users or no users data received.';
            showAlert(errorMessage, 'danger');
            // Clear the list if data is not as expected
            const usersList = $('#users-list');
            usersList.empty();
            usersList.append('<tr><td colspan="6" class="text-center">' + errorMessage + '</td></tr>');
        }

    } catch (error) {
        console.error('Error loading users:', error);
        let errorMessage = 'An error occurred while loading users.';
        if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        showAlert(errorMessage, 'danger');

        // fetchWithAuth throws an error object that includes 'status'
        if (error.status === 401 || error.status === 403) {
            // Preserve drive session data before clearing localStorage
            const driveSessionData = localStorage.getItem('current_drive_session');
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data'); // Also clear user_data
            
            // Restore drive session data after clearing auth data
            if (driveSessionData) {
                localStorage.setItem('current_drive_session', driveSessionData);
            }
            
            window.location.href = 'login.html';
        }    }
}

// Frozen Users Management
async function loadFrozenUsers() {
    try {
        const response = await fetchWithAuth('/admin/users/frozen');
        if (response.success) {
            const frozenUsersList = document.getElementById('frozen-users-list');
            if (frozenUsersList) {
                if (response.users && response.users.length > 0) {                    frozenUsersList.innerHTML = response.users.map(user => `
                        <tr ${user.frozen_sessions_count > 0 ? 'class="table-warning"' : ''}>
                            <td>${user.id}</td>
                            <td>
                                <strong>${user.username}</strong>
                                ${user.frozen_sessions_count > 0 ? '<span class="badge bg-danger ms-2">Frozen</span>' : ''}
                            </td>
                            <td>${user.email}</td>
                            <td>
                                <span class="badge ${parseFloat(user.main_balance || 0) > 0 ? 'bg-success' : 'bg-secondary'}">
                                    $${parseFloat(user.main_balance || 0).toFixed(2)}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${user.frozen_sessions_count > 0 ? 'bg-danger' : 'bg-secondary'}">
                                    ${user.frozen_sessions_count || 0}
                                </span>
                            </td>
                            <td>${user.last_frozen ? new Date(user.last_frozen).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                ${user.frozen_sessions_count > 0 ? `
                                    <button class="btn btn-sm btn-warning unfreeze-user-btn" 
                                            data-user-id="${user.id}" 
                                            data-username="${user.username}"
                                            title="Unfreeze this user's account">
                                        <i class="fas fa-unlock"></i> Unfreeze Account
                                    </button>
                                ` : `
                                    <span class="text-muted">
                                        <i class="fas fa-check-circle text-success"></i> Active
                                    </span>
                                `}
                            </td>
                        </tr>
                    `).join('');
                } else {
                    frozenUsersList.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No frozen users found.</td></tr>';
                }
            }
        }
    } catch (error) {
        console.error('Error loading frozen users:', error);
        const frozenUsersList = document.getElementById('frozen-users-list');
        if (frozenUsersList) {
            frozenUsersList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load frozen users.</td></tr>';
        }
        
        let errorMessage = 'Failed to load frozen users.';
        if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
        
        if (error.status === 401 || error.status === 403) {
            // Preserve drive session data before clearing localStorage
            const driveSessionData = localStorage.getItem('current_drive_session');
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            
            // Restore drive session data after clearing auth data
            if (driveSessionData) {
                localStorage.setItem('current_drive_session', driveSessionData);
            }
            
            window.location.href = 'login.html';
        }
    }
}

// Function to unfreeze a user account
async function unfreezeUser(userId, username) {
    // Create a more detailed confirmation dialog
    const confirmMessage = `
        Are you sure you want to unfreeze the account for user "${username}"?
        
        This action will:
        • Reactivate their frozen drive sessions
        • Allow them to continue with their current drive
        • Remove any account restrictions
        
        Make sure the user has sufficient balance before proceeding.
    `;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Show loading state on the button
    const unfreezeButton = document.querySelector(`[data-user-id="${userId}"].unfreeze-user-btn`);
    if (unfreezeButton) {
        unfreezeButton.disabled = true;
        unfreezeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unfreezing...';
    }
    
    try {
        const response = await fetchWithAuth(`/admin/users/${userId}/unfreeze`, {
            method: 'POST'
        });
        
        if (response.success) {
            showNotification(`✓ Successfully unfroze account for user "${username}". They can now continue their drive.`, 'success');
            // Reload the frozen users list to reflect changes
            loadFrozenUsers();
        }
    } catch (error) {
        console.error('Error unfreezing user:', error);
        
        let errorMessage = `❌ Failed to unfreeze account for user "${username}".`;
        if (error.data && error.data.message) {
            errorMessage += ` Reason: ${error.data.message}`;
        } else if (error.message) {
            errorMessage += ` Error: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
        
        // Reset button state on error
        if (unfreezeButton) {
            unfreezeButton.disabled = false;
            unfreezeButton.innerHTML = '<i class="fas fa-unlock"></i> Unfreeze Account';
        }
    }
}

// New function to populate the drive configuration dropdown
async function populateDriveConfigurationDropdown(currentAssignedConfigId, currentAssignedConfigName) {
    const selectElement = document.getElementById('user-drive-config-select');
    const currentAssignedElement = document.getElementById('current-assigned-config');

    if (!selectElement || !currentAssignedElement) {
        console.error('Required elements for drive configuration dropdown not found.');
        return;
    }

    // Note: The caller (e.g., manage user button handler) typically sets
    // selectElement.innerHTML = '<option value="">Loading configurations...</option>';
    // before calling this function.

    try {
        // Ensure DriveModuleAPI and getDriveConfigurations are available
        if (!DriveModuleAPI || typeof DriveModuleAPI.getDriveConfigurations !== 'function') {
            console.error('DriveModuleAPI.getDriveConfigurations is not available.');
            showNotification('Critical error: Drive configuration module not loaded correctly.', 'error');
            selectElement.innerHTML = '<option value="">Error loading module</option>';
            currentAssignedElement.textContent = 'Error';
            return;
        }

        const configurations = await DriveModuleAPI.getDriveConfigurations();
        
        selectElement.innerHTML = ''; // Clear "Loading..." or previous options immediately

        if (configurations && configurations.length > 0) {
            let activeConfigFound = false;
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Select a Configuration";
            selectElement.appendChild(defaultOption);

            configurations.forEach(config => {
                if (config.is_active) { // Only show active configurations
                    activeConfigFound = true;
                    const option = document.createElement('option');
                    option.value = config.id;
                    option.textContent = config.name;
                    selectElement.appendChild(option);
                }
            });

            if (!activeConfigFound) {
                // If loop completes and no active configs were added, but default "Select..." is there.
                // We can either leave "Select a Configuration" or be more specific.
                // For clarity, let's indicate no active ones are available if the list was otherwise populated.
                // If configurations was not empty but all were inactive:
                if (selectElement.options.length <= 1 && configurations.some(c => !c.is_active)) { // only "Select..." is present
                     selectElement.innerHTML = '<option value="">No active configurations available</option>';
                } else if (selectElement.options.length <=1) { // Covers case where configurations was empty or all were inactive
                     selectElement.innerHTML = '<option value="">No configurations available</option>';
                }
            }
        } else {
            selectElement.innerHTML = '<option value="">No configurations available</option>';
        }

        currentAssignedElement.textContent = currentAssignedConfigName || 'N/A';
        selectElement.value = currentAssignedConfigId || '';

    } catch (error) {
        console.error('Error populating drive configuration dropdown:', error);
        showNotification('Failed to load drive configurations for assignment.', 'error');
        selectElement.innerHTML = '<option value="">Error loading configurations</option>';
        currentAssignedElement.textContent = 'Error';
    }
}

// Finance Management (Deposits & Withdrawals)
// These functions have been moved to admin-finance.js

// Data Drives Management
// These functions have been moved to admin-drives.js

// Support Messages Management
async function loadSupportMessages() {
    try {
        const response = await fetchWithAuth('/admin/support/messages');
        if (response.success) {
            const messagesList = document.getElementById('support-messages-list');
            // Group messages by thread_id for basic threading display
            const threads = {};
            response.messages.forEach(msg => {
                const threadKey = msg.thread_id || msg.id; // Original messages act as their own thread key
                if (!threads[threadKey]) {
                    threads[threadKey] = [];
                }
                threads[threadKey].push(msg);
            });

            let html = '';
            // Sort threads by the latest message in each thread
            Object.values(threads).sort((a, b) => {
                const lastMsgA = a[a.length - 1];
                const lastMsgB = b[b.length - 1];
                return new Date(lastMsgB.created_at) - new Date(lastMsgA.created_at);
            }).forEach(threadMessages => {
                // Sort messages within a thread by creation date
                threadMessages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                
                const originalMessage = threadMessages.find(m => m.id === (m.thread_id || m.id)) || threadMessages[0];
                html += `<div class="support-thread mb-3 border p-3 rounded">`;
                html += `<h6>Thread: ${originalMessage.subject || `Message ID ${originalMessage.id}`}</h6>`;

                threadMessages.forEach((msg, index) => {
                    // Use a slightly different background for unread messages, e.g., a light yellow or a specific class
                    // The 'list-group-item-warning' is a Bootstrap class that gives a yellow hue.
                    // If a different hue is needed, a custom CSS class would be better.
                    // For now, we'll stick to list-group-item-warning for unread.
                    const unreadClass = !msg.is_read && msg.sender_role !== 'admin' ? 'list-group-item-warning' : ''; 
                    const replyIndentClass = msg.thread_id && msg.id !== msg.thread_id ? 'ms-4' : ''; // Indent replies

                    html += `
                        <div class="list-group-item ${unreadClass} ${replyIndentClass} mb-2">
                            <div class="d-flex w-100 justify-content-between">
                                <h5 class="mb-1">
                                    From: ${msg.sender_username || 'N/A'} (ID: ${msg.sender_id}, Email: ${msg.sender_email || 'N/A'})
                                    ${msg.sender_role === 'admin' ? '<span class="badge bg-info ms-2">Admin Reply</span>' : ''}
                                </h5>
                                <small>${new Date(msg.created_at).toLocaleString()}</small>
                            </div>
                            ${index === 0 && msg.subject ? `<p class="mb-1"><strong>Subject: ${msg.subject}</strong></p>` : ''}
                            <p class="mb-1">${msg.message}</p>
                            ${msg.sender_role !== 'admin' ? // Only show reply button for user messages
                            `<button class="btn btn-sm btn-primary reply-message-btn" 
                                    data-message-id="${msg.id}"
                                    data-user-id="${msg.sender_id}"
                                    data-thread-subject="${originalMessage.subject || 'Message ID ' + originalMessage.id}">
                                Reply
                            </button>` : ''}
                        </div>
                    `;
                });
                html += `</div>`; // End of thread div
            });
            messagesList.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading support messages:', error);
        showNotification('Failed to load support messages', 'error');
    }
}

// Products Management
async function loadProducts() {
    try {
        const response = await fetchWithAuth('/admin/products');
        if (response.success) {
            const productList = document.getElementById('products-list');            productList.innerHTML = response.products.map(product => `
                <tr>
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>$${product.price}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${product.id}">
                            Delete
                        </button>
                        <button class="btn btn-sm btn-warning edit-product-btn" data-id="${product.id}">
                            Edit
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

async function createProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    // This function handles the ADD form, remove min_tier and is_active
    const productData = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        description: formData.get('description') || null,
        min_balance_required: parseFloat(formData.get('min_balance_required')) || 0,
        image_url: formData.get('image_url') || null
    };

    try {
        // NOTE: The fetch endpoint here seems incorrect for createProduct.
        // It should likely use fetchWithAuth or include the token header.
        const response = await fetchWithAuth('/admin/products', { // Changed to fetchWithAuth
            method: 'POST',
            body: JSON.stringify(productData)
            // Content-Type is handled by fetchWithAuth
        });
        
        // fetchWithAuth already parses JSON
        if (response.success) {
            showNotification('Product created successfully', 'success');
            document.getElementById('create-product-form').reset(); // Ensure this ID matches HTML
            await loadProducts();
        } else {
            showNotification(response.message || 'Error creating product', 'error');
        }
    } catch (error) {
        console.error('Error creating product:', error);
        showNotification('Error creating product: ' + error.message, 'error');
    }
}

async function editProduct(productId) { // This function populates the edit form
    try {
        const response = await fetchWithAuth(`/admin/products/${productId}`); // Changed to fetchWithAuth
        if (response.success) {
            // Populate edit form with product data
            const product = response.product;
            document.getElementById('edit-product-id').value = product.id;            // Populate relevant fields only
            document.getElementById('edit-product-name').value = product.name;
            document.getElementById('edit-product-price').value = product.price;
            // Assuming min_balance_required is still needed/editable
            document.getElementById('edit-min-balance').value = product.min_balance_required || 0; 
            // Add image_url if needed: document.getElementById('edit-image-url').value = product.image_url || '';
            
            // Show edit modal (Ensure this modal ID exists in admin.html)
            const editModalElement = document.getElementById('edit-product-modal'); // Ensure this ID matches HTML
            if (!editModalElement) {
                console.error("Edit product modal ('edit-product-modal') not found!");
                showNotification('UI Error: Edit modal element not found.', 'error');
                return;
            }
            const editModal = new bootstrap.Modal(editModalElement);
            editModal.show();
        } else {
            showNotification(response.message || 'Failed to load product details for editing.', 'error');
        }
    } catch (error) {
        console.error('Error loading product details for edit:', error);
        showNotification('Error loading product details: ' + error.message, 'error');
    }
}

async function updateProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const productId = formData.get('product_id');
    // This function handles the EDIT form submission
    const productData = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        description: formData.get('description') || null,
        min_balance_required: parseFloat(formData.get('min_balance_required')) || 0,
        image_url: formData.get('image_url') || null
    };

    try {
        // Use fetchWithAuth for authenticated request
        const response = await fetchWithAuth(`/admin/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
        
        // Assuming fetchWithAuth returns parsed JSON directly
        const data = response; 
        // fetchWithAuth returns parsed JSON directly
        if (response.success) {
            showNotification('Product updated successfully', 'success');
            const editModalEl = document.getElementById('edit-product-modal'); // Ensure this ID matches HTML
            if (editModalEl) {
                const editModal = bootstrap.Modal.getInstance(editModalEl);
                if (editModal) editModal.hide();
            }
            await loadProducts();
        } else {
            showNotification(response.message || 'Error updating product', 'error');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product: ' + error.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/admin/products/${productId}`, { // Changed to fetchWithAuth
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('Product deleted successfully', 'success');
            await loadProducts();
        } else {
            showNotification(response.message || 'Error deleting product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product: ' + error.message, 'error');
    }
}

async function respondToMessage(messageId, responseText) { // Added responseText parameter
    if (!responseText) return;

    try {
        const response = await fetchWithAuth(`/admin/support-messages/${messageId}/respond`, { // Changed to fetchWithAuth
            method: 'POST',
            body: JSON.stringify({ response: responseText }) // Ensure backend expects 'response'
        });
        
        if (response.success) {
            showNotification('Response sent successfully', 'success');
            await loadSupportMessages(); // Reload to see the update
        } else {
            showNotification(response.message || 'Error sending response', 'error');
        }
    } catch (error) {
        console.error('Error sending response:', error);
        showNotification('Error sending response: ' + error.message, 'error');
    }
}

async function markAsResolved(messageId) {
    try {
        const response = await fetchWithAuth(`/admin/support-messages/${messageId}/resolve`, { // Changed to fetchWithAuth
            method: 'PUT'
        });
        
        if (response.success) {
            showNotification('Message marked as resolved', 'success');
            await loadSupportMessages(); // Reload to see the update
        } else {
            showNotification(response.message || 'Error updating message status', 'error');
        }
    } catch (error) {
        console.error('Error updating message status:', error);
        showNotification('Error updating message status: ' + error.message, 'error');
    }
}

function initializeHandlers() {
    // Use event delegation for dynamically created elements
    document.addEventListener('click', async (event) => {
        const target = event.target;

        // --- Drive Configuration & Task Set Modals ---
        if (target.id === 'show-create-config-modal-btn') {
            event.preventDefault();
            if (DriveModuleAPI && typeof DriveModuleAPI.showCreateDriveConfigurationModal === 'function') {
                DriveModuleAPI.showCreateDriveConfigurationModal();
            } else {
                console.error('DriveModuleAPI.showCreateDriveConfigurationModal is not available. Ensure admin-drives.js is loaded and exports this function.');
                showNotification('Error: Cannot open the form to create a new drive configuration.', 'error');
            }
        }
        else if (target.id === 'show-create-taskset-modal-btn') {
            event.preventDefault();
            const configIdInput = document.getElementById('current-config-id-for-taskset');
            const configNameElement = document.getElementById('tasksetConfigName');
            
            const configId = configIdInput ? configIdInput.value : null;
            const configName = configNameElement ? configNameElement.textContent : 'Selected Configuration';

            if (configId) {
                if (DriveModuleAPI && typeof DriveModuleAPI.showCreateTaskSetModal === 'function') {
                    DriveModuleAPI.showCreateTaskSetModal(configId, configName);
                } else {
                    console.error('DriveModuleAPI.showCreateTaskSetModal is not available.');
                    showNotification('Error: Cannot open the form to create a new task set.', 'error');
                }
            } else {
                console.error('Cannot create task set: Configuration ID is missing.');
                showNotification('Could not determine the current configuration to add a task set to.', 'error');
            }
        }
        // User Management
        else if (target.matches('.manage-user-btn')) {
            const userId = target.dataset.userId;
            const username = target.dataset.username;
            const currentTier = target.dataset.tier;
            const assignedConfigId = target.dataset.assignedConfigId;
            const assignedConfigName = target.dataset.assignedConfigName;
            const userBalance = target.dataset.userBalance;
            
            const userDetails = document.getElementById('user-details');
            const manageUsernameEl = document.getElementById('manage-username');
            const manageUserIdEl = document.getElementById('manage-user-id');
            const tierSelectEl = document.getElementById('user-tier-select');
            const balanceEl = document.getElementById('manage-user-balance');
            
            if (manageUsernameEl) manageUsernameEl.textContent = username;
            if (manageUserIdEl) manageUserIdEl.textContent = userId;
            if (tierSelectEl) tierSelectEl.value = currentTier;
            if (balanceEl) {
                balanceEl.textContent = userBalance !== undefined ? parseFloat(userBalance).toFixed(2) : 'N/A';
            }
            
            // Populate drive configuration dropdown
            await populateDriveConfigurationDropdown(assignedConfigId, assignedConfigName);
            
            if (userDetails) userDetails.style.display = 'block';
        }
        // Assign Drive Configuration Button
        else if (target.id === 'assign-drive-config-button') {
            event.preventDefault();
            const manageUserIdEl = document.getElementById('manage-user-id');
            const configSelectEl = document.getElementById('user-drive-config-select');
            
            const userId = manageUserIdEl ? manageUserIdEl.textContent : null;
            const selectedConfigId = configSelectEl ? configSelectEl.value : null;

            if (!userId) {
                showNotification('Cannot assign configuration: User ID not found.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth(`/api/admin/users/${userId}/assign-drive-configuration`, {
                    method: 'POST',
                    body: JSON.stringify({ drive_configuration_id: selectedConfigId || null })
                });

                if (response.success) {
                    showNotification('Drive configuration assigned successfully!', 'success');
                    await loadUsers();
                    const userDetailsEl = document.getElementById('user-details');
                    if (userDetailsEl) userDetailsEl.style.display = 'none';
                } else {
                    throw new Error(response.message || 'Failed to assign drive configuration.');
                }
            } catch (error) {
                console.error('Error assigning drive configuration:', error);
                showNotification(error.message || 'Error assigning drive configuration', 'error');
            }
        }
        // Unfreeze User Button
        else if (target.matches('.unfreeze-user-btn')) {
            const userId = target.dataset.userId;
            const username = target.dataset.username;
            if (userId && username) {
                await unfreezeUser(userId, username);
            }
        }
        // Edit Product Button
        else if (target.matches('.edit-product-btn')) {
            const productId = target.dataset.id;
            if (!productId) {
                showNotification('Product ID not found.', 'error');
                return;
            }
            
            try {
                const response = await fetchWithAuth(`/admin/products/${productId}`);
                if (response.success && response.product) {
                    const product = response.product;
                    const editIdEl = document.getElementById('edit-product-id');
                    const editNameEl = document.getElementById('edit-product-name');
                    const editPriceEl = document.getElementById('edit-product-price');
                    
                    if (editIdEl) editIdEl.value = product.id;
                    if (editNameEl) editNameEl.value = product.name;
                    if (editPriceEl) editPriceEl.value = product.price;

                    const editModalElement = document.getElementById('edit-product-modal');
                    if (editModalElement) {
                        const editModal = new bootstrap.Modal(editModalElement);
                        editModal.show();
                    } else {
                        console.error("Edit product modal not found.");
                        showNotification('UI Error: Edit modal not found.', 'error');
                    }
                } else {
                    showNotification(response.message || 'Failed to load product details.', 'error');
                }
            } catch (error) {
                console.error('Error fetching product for edit:', error);
                showNotification('Error fetching product details: ' + error.message, 'error');
            }
        }
        // Delete Product Button
        else if (target.matches('.delete-product-btn')) {
            if (confirm('Are you sure you want to delete this product?')) {
                const productId = target.dataset.id;
                if (!productId) {
                    showNotification('Product ID not found.', 'error');
                    return;
                }
                
                try {
                    const response = await fetchWithAuth(`/admin/products/${productId}`, { method: 'DELETE' });
                    if (response.success) {
                        showNotification('Product deleted successfully', 'success');
                        loadProducts();
                    } else {
                        showNotification(response.message || 'Failed to delete product', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting product:', error);
                    showNotification('Failed to delete product: ' + error.message, 'error');
                }
            }
        }
        // Approve Deposit Button
        else if (target.matches('.approve-deposit-btn')) {
            const depositId = target.dataset.id;
            if (depositId && confirm('Are you sure you want to approve this deposit?')) {
                if (FinanceModuleAPI && typeof FinanceModuleAPI.approveDeposit === 'function') {
                    await FinanceModuleAPI.approveDeposit(depositId);
                } else {
                    console.error('FinanceModuleAPI.approveDeposit function is not available.');
                    showNotification('Finance module not available', 'error');
                }
            }
        }
        // Reject Deposit Button
        else if (target.matches('.reject-deposit-btn')) {
            const depositId = target.dataset.id;
            if (depositId && confirm('Are you sure you want to reject this deposit?')) {
                if (FinanceModuleAPI && typeof FinanceModuleAPI.rejectDeposit === 'function') {
                    await FinanceModuleAPI.rejectDeposit(depositId);
                } else {
                    console.error('FinanceModuleAPI.rejectDeposit function is not available.');
                    showNotification('Finance module not available', 'error');
                }
            }
        }
        // Approve Withdrawal Button - NEW FUNCTIONALITY
        else if (target.matches('.approve-withdrawal-btn')) {
            const withdrawalId = target.dataset.id;
            if (withdrawalId) {
                if (FinanceModuleAPI && typeof FinanceModuleAPI.approveWithdrawal === 'function') {
                    await FinanceModuleAPI.approveWithdrawal(withdrawalId);
                } else {
                    console.error('FinanceModuleAPI.approveWithdrawal function is not available.');
                    showNotification('Finance module not available', 'error');
                }
            }
        }
        // Reject Withdrawal Button - NEW FUNCTIONALITY
        else if (target.matches('.reject-withdrawal-btn')) {
            const withdrawalId = target.dataset.id;
            if (withdrawalId) {
                if (FinanceModuleAPI && typeof FinanceModuleAPI.rejectWithdrawal === 'function') {
                    await FinanceModuleAPI.rejectWithdrawal(withdrawalId);
                } else {
                    console.error('FinanceModuleAPI.rejectWithdrawal function is not available.');
                    showNotification('Finance module not available', 'error');
                }
            }
        }
        // View Deposit History Button
        else if (target.id === 'view-deposit-history-btn') {
            console.log('View deposit history button clicked');
            event.preventDefault();
            
            if (FinanceModuleAPI && typeof FinanceModuleAPI.showDepositHistoryModal === 'function') {
                FinanceModuleAPI.showDepositHistoryModal();
            } else {
                console.error('FinanceModuleAPI.showDepositHistoryModal function is not available.');
                showNotification('Finance module not available', 'error');
            }
        }
        // View Withdrawal History Button - NEW FUNCTIONALITY
        else if (target.id === 'view-withdrawal-history-btn') {
            console.log('View withdrawal history button clicked');
            event.preventDefault();
            
            if (FinanceModuleAPI && typeof FinanceModuleAPI.showWithdrawalHistoryModal === 'function') {
                FinanceModuleAPI.showWithdrawalHistoryModal();
            } else {
                console.error('FinanceModuleAPI.showWithdrawalHistoryModal function is not available.');
                showNotification('Finance module not available', 'error');
            }
        }
        // Refresh Deposit History Button
        else if (target.id === 'refreshHistoryBtn') {
            console.log('Refresh history button clicked');
            event.preventDefault();
            if (FinanceModuleAPI && typeof FinanceModuleAPI.loadDepositHistory === 'function') {
                FinanceModuleAPI.loadDepositHistory();
            } else {
                console.error('FinanceModuleAPI.loadDepositHistory function is not available.');
            }
        }
        // Refresh Withdrawal History Button - NEW FUNCTIONALITY
        else if (target.id === 'refreshWithdrawalHistoryBtn') {
            console.log('Refresh withdrawal history button clicked');
            event.preventDefault();
            if (FinanceModuleAPI && typeof FinanceModuleAPI.loadWithdrawalHistory === 'function') {
                FinanceModuleAPI.loadWithdrawalHistory();
            } else {
                console.error('FinanceModuleAPI.loadWithdrawalHistory function is not available.');
            }
        }
    });

    // Reply button handler
    const replyButton = document.getElementById('send-reply-button');
    if (replyButton) {
        replyButton.addEventListener('click', async () => {
            const messageId = replyButton.dataset.messageId;
            const userId = replyButton.dataset.userId;
            const replyTextEl = document.getElementById('reply-message');
            const replyText = replyTextEl ? replyTextEl.value : '';

            if (!replyText.trim()) {
                showNotification('Please enter a reply message.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth('/admin/support/messages/reply', {
                    method: 'POST',
                    body: JSON.stringify({
                        message_id: messageId,
                        user_id: userId,
                        message: replyText
                    })
                });

                if (response.success) {
                    showNotification('Reply sent successfully', 'success');
                    const replyFormEl = document.getElementById('message-reply-form');
                    if (replyFormEl) replyFormEl.style.display = 'none';
                    if (replyTextEl) replyTextEl.value = '';
                    loadSupportMessages();
                } else {
                    showNotification(response.message || 'Failed to send reply', 'error');
                }
            } catch (error) {
                console.error('Error sending reply:', error);
                showNotification('Failed to send reply', 'error');
            }
        });
    }

    // Product form handlers
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameEl = document.getElementById('product-name');
            const priceEl = document.getElementById('product-price');
            
            const productData = {
                name: nameEl ? nameEl.value : '',
                price: priceEl ? parseFloat(priceEl.value) : 0
            };

            if (!productData.name || isNaN(productData.price) || productData.price <= 0) {
                showNotification('Please fill in Name and a valid Price.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth('/admin/products', {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });

                if (response.success) {
                    showNotification('Product added successfully', 'success');
                    e.target.reset();
                    loadProducts();
                } else {
                    showNotification(response.message || 'Failed to add product', 'error');
                }
            } catch (error) {
                console.error('Error adding product:', error);
                showNotification('Failed to add product: ' + error.message, 'error');
            }
        });
    }

    const editProductForm = document.getElementById('edit-product-form');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const productId = formData.get('product_id');

            if (!productId) {
                showNotification('Error: Product ID missing from edit form.', 'error');
                return;
            }

            const productData = {
                name: formData.get('name'),
                price: parseFloat(formData.get('price'))
            };

            if (!productData.name || isNaN(productData.price) || productData.price <= 0) {
                showNotification('Please fill in Name and a valid Price.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth(`/admin/products/${productId}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                });

                if (response.success) {
                    showNotification('Product updated successfully', 'success');
                    const editModalElement = document.getElementById('edit-product-modal');
                    if (editModalElement) {
                        const editModal = bootstrap.Modal.getInstance(editModalElement);
                        if (editModal) editModal.hide();
                    }
                    loadProducts();
                } else {
                    showNotification(response.message || 'Failed to update product', 'error');
                }
            } catch (error) {
                console.error('Error updating product:', error);
                showNotification('Failed to update product: ' + error.message, 'error');
            }
        });
    }

    // Update tier button handler
    const updateTierButton = document.getElementById('update-tier-button');
    if (updateTierButton) {
        updateTierButton.addEventListener('click', async () => {
            const manageUserIdEl = document.getElementById('manage-user-id');
            const tierSelectEl = document.getElementById('user-tier-select');
            
            const userId = manageUserIdEl ? manageUserIdEl.textContent : null;
            const newTier = tierSelectEl ? tierSelectEl.value : null;

            if (!userId || !newTier) {
                showNotification('User ID or tier selection missing.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth(`/admin/users/${userId}/tier`, {
                    method: 'PUT',
                    body: JSON.stringify({ tier: newTier })
                });

                if (response.success) {
                    showNotification('User tier updated successfully', 'success');
                    loadUsers();
                } else {
                    showNotification(response.message || 'Failed to update user tier', 'error');
                }
            } catch (error) {
                console.error('Error updating user tier:', error);
                showNotification('Failed to update user tier', 'error');
            }
        });
    }

    // Manual transaction handler
    $(document).on('click', '#manual-transaction-button', async function() {
        const userId = $('#manage-user-id').text();
        const inputAmount = parseFloat($('#manual-transaction-amount').val());
        const description = $('#manual-transaction-description').val().trim();

        if (!userId) {
            showAlert('User ID not found. Please select a user to manage first.', 'danger');
            return;
        }

        if (isNaN(inputAmount) || inputAmount === 0) {
            showAlert('Please enter a valid amount (positive to add funds, negative to deduct funds).', 'danger');
            return;
        }

        const type = inputAmount > 0 ? 'deposit' : 'withdrawal';
        const amount = Math.abs(inputAmount);

        try {
            const response = await fetchWithAuth(`/api/admin/users/${userId}/transactions`, {
                method: 'POST',
                body: JSON.stringify({ type, amount, description })
            });

            if (response.success) {
                const actionType = inputAmount > 0 ? 'added to' : 'deducted from';
                showAlert(`Balance adjusted successfully! $${Math.abs(inputAmount).toFixed(2)} ${actionType} user ${userId}.`, 'success');
                $('#manual-transaction-amount').val('');
                $('#manual-transaction-description').val('');
                loadUsers();
            } else {
                showAlert(response.message || 'Failed to adjust balance.', 'danger');
            }
        } catch (error) {
            console.error('Error during balance adjustment:', error);
            showAlert('An error occurred while adjusting balance.', 'danger');
            
            if (error.status === 401 || error.status === 403) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        }    });
    
    // QR Code file input change handler
    const qrFileInput = document.getElementById('qr-file');
    if (qrFileInput) {
        qrFileInput.addEventListener('change', previewQRCode);
    }
    
    // QR Code form submission handler
    const qrUploadForm = document.getElementById('qr-upload-form');
    if (qrUploadForm) {
        qrUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await uploadQRCode();
        });
    }

    // Visibility change handler for drives
    document.addEventListener('visibilitychange', () => {
        const drivesSection = document.getElementById('drives-section');
        if (document.visibilityState === 'visible' && drivesSection?.style.display === 'block') {
            if (DriveModuleAPI && typeof DriveModuleAPI.loadDrives === 'function') {
                DriveModuleAPI.loadDrives();
            }
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (driveUpdateInterval) {
            clearInterval(driveUpdateInterval);
        }
    });
}

// Helper function to display alerts
function showAlert(message, type = 'info') {
    const alertsContainer = $('#alerts-container');
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertsContainer.html(alertHtml); // Replace previous alert if any, or use .append() to stack them
}

// Initial load for the default or active section
document.addEventListener('DOMContentLoaded', () => {
    const defaultSection = 'dashboard'; // Change this to your desired default section
    loadSection(defaultSection);
});

// ============ NOTIFICATION MANAGEMENT FUNCTIONS ============

// Global notification data cache
let notificationCategories = [];

// === NOTIFICATION CATEGORIES MANAGEMENT ===

// Load and display notification categories
async function loadNotificationCategories() {
    try {
        const data = await fetchWithAuth('/api/admin/notification-categories');
        if (data.success) {
            notificationCategories = data.categories;
            renderNotificationCategories();
            populateCategoryDropdowns();
        } else {
            showNotification('Failed to load notification categories', 'error');
        }
    } catch (error) {
        console.error('Error loading notification categories:', error);
        showNotification('Error loading notification categories', 'error');
    }
}

// Render notification categories in the table
function renderNotificationCategories() {
    const tbody = document.getElementById('notification-categories-list');
    if (!tbody) return;

    if (notificationCategories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = notificationCategories.map(category => `
        <tr>
            <td>${category.id}</td>
            <td>
                <span class="badge rounded-pill" style="background-color: ${category.color}; color: white;">
                    <i class="${category.icon}"></i> ${category.name}
                </span>
            </td>
            <td><span style="color: ${category.color};">${category.color}</span></td>
            <td><i class="${category.icon}"></i> ${category.icon}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Populate category dropdowns in various forms
function populateCategoryDropdowns() {
    const dropdowns = [
        'generalCategory',
        'individualCategory', 
        'bulkCategory',
        'editGeneralCategory'
    ];

    dropdowns.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.innerHTML = notificationCategories.map(category => 
                `<option value="${category.id}">${category.name}</option>`
            ).join('');
        }
    });
}

// Show create category modal
function showCreateCategoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('createCategoryModal'));
    // Reset form
    document.getElementById('createCategoryForm').reset();
    modal.show();
}

// Create new notification category
async function createCategory() {
    const form = document.getElementById('createCategoryForm');
    const formData = new FormData(form);
    
    const categoryData = {
        name: formData.get('categoryName') || document.getElementById('categoryName').value,
        color: formData.get('categoryColor') || document.getElementById('categoryColor').value,
        icon: formData.get('categoryIcon') || document.getElementById('categoryIcon').value,
        description: formData.get('categoryDescription') || document.getElementById('categoryDescription').value
    };

    try {
        const response = await fetchWithAuth('/api/admin/notification-categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });

        if (response.success) {
            showNotification('Notification category created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createCategoryModal')).hide();
            await loadNotificationCategories();
        } else {
            showNotification(response.message || 'Failed to create category', 'error');
        }
    } catch (error) {
        console.error('Error creating category:', error);
        showNotification('Error creating category', 'error');
    }
}

// Edit notification category
async function editCategory(categoryId) {
    const category = notificationCategories.find(c => c.id === categoryId);
    if (!category) {
        showNotification('Category not found', 'error');
        return;
    }

    // Populate edit form (you'd need to create this modal)
    // For now, we'll use a simple prompt-based edit
    const newName = prompt('Enter new category name:', category.name);
    if (newName && newName !== category.name) {
        try {
            const response = await fetchWithAuth(`/api/admin/notification-categories/${categoryId}`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });

            if (response.success) {
                showNotification('Category updated successfully!', 'success');
                await loadNotificationCategories();
            } else {
                showNotification(response.message || 'Failed to update category', 'error');
            }
        } catch (error) {
            console.error('Error updating category:', error);
            showNotification('Error updating category', 'error');
        }
    }
}

// Delete notification category
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/admin/notification-categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showNotification('Category deleted successfully!', 'success');
            await loadNotificationCategories();
        } else {
            showNotification(response.message || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error deleting category', 'error');
    }
}

// === GENERAL NOTIFICATIONS MANAGEMENT ===

let generalNotifications = [];

// Load general notifications
async function loadGeneralNotifications() {
    try {
        const response = await fetchWithAuth('/admin/general-notifications');
        if (response.success) {
            generalNotifications = response.notifications;
            renderGeneralNotifications();
        } else {
            showNotification('Failed to load general notifications', 'error');
        }
    } catch (error) {
        console.error('Error loading general notifications:', error);
        showNotification('Error loading general notifications', 'error');
    }
}

// Render general notifications table
function renderGeneralNotifications() {
    const tbody = document.getElementById('general-notifications-list');
    if (!tbody) return;

    if (generalNotifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No general notifications found</td></tr>';
        return;
    }

    tbody.innerHTML = generalNotifications.map(notification => `
        <tr>
            <td>${notification.id}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${notification.title}">
                ${notification.title}
            </td>
            <td>
                <span class="badge ${getPriorityBadgeClass(notification.priority)}">
                    ${getPriorityText(notification.priority)}
                </span>
            </td>
            <td>
                <span class="badge rounded-pill" style="background-color: ${notification.category_color}; color: white;">
                    <i class="${notification.category_icon}"></i> ${notification.category_name}
                </span>
            </td>
            <td>
                <span class="badge ${notification.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${notification.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${new Date(notification.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editGeneralNotification(${notification.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteGeneralNotification(${notification.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Helper functions for notification display
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 3: return 'bg-danger';
        case 2: return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 3: return 'High';
        case 2: return 'Medium';
        default: return 'Normal';
    }
}

// Show create general notification modal
function showCreateGeneralNotificationModal() {
    const modal = new bootstrap.Modal(document.getElementById('createGeneralNotificationModal'));
    // Reset form
    document.getElementById('createGeneralNotificationForm').reset();
    // Set default values
    document.getElementById('generalIsActive').checked = true;
    modal.show();
}

// Create general notification
async function createGeneralNotification() {
    const formData = {
        category_id: parseInt(document.getElementById('generalCategory').value),
        title: document.getElementById('generalTitle').value,
        message: document.getElementById('generalMessage').value,
        priority: parseInt(document.getElementById('generalPriority').value),
        image_url: document.getElementById('generalImageUrl').value || null,
        is_active: document.getElementById('generalIsActive').checked,
        display_order: parseInt(document.getElementById('generalDisplayOrder')?.value) || 0
    };

    // Validation
    if (!formData.title || !formData.message || !formData.category_id) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth('/admin/general-notifications', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (response.success) {
            showNotification('General notification created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createGeneralNotificationModal')).hide();
            await loadGeneralNotifications();
        } else {
            showNotification(response.message || 'Failed to create notification', 'error');
        }
    } catch (error) {
        console.error('Error creating general notification:', error);
        showNotification('Error creating notification', 'error');
    }
}

// Edit general notification
async function editGeneralNotification(notificationId) {
    const notification = generalNotifications.find(n => n.id === notificationId);
    if (!notification) {
        showNotification('Notification not found', 'error');
        return;
    }

    // Populate edit form
    document.getElementById('editGeneralId').value = notification.id;
    document.getElementById('editGeneralTitle').value = notification.title;
    document.getElementById('editGeneralMessage').value = notification.message;
    document.getElementById('editGeneralPriority').value = notification.priority;
    document.getElementById('editGeneralCategory').value = notification.category_id;
    document.getElementById('editGeneralImageUrl').value = notification.image_url || '';
    document.getElementById('editGeneralIsActive').checked = notification.is_active;

    const modal = new bootstrap.Modal(document.getElementById('editGeneralNotificationModal'));
    modal.show();
}

// Update general notification
async function updateGeneralNotification() {
    const notificationId = document.getElementById('editGeneralId').value;
    const formData = {
        category_id: parseInt(document.getElementById('editGeneralCategory').value),
        title: document.getElementById('editGeneralTitle').value,
        message: document.getElementById('editGeneralMessage').value,
        priority: parseInt(document.getElementById('editGeneralPriority').value),
        image_url: document.getElementById('editGeneralImageUrl').value || null,
        is_active: document.getElementById('editGeneralIsActive').checked
    };

    try {
        const response = await fetchWithAuth(`/admin/general-notifications/${notificationId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        if (response.success) {
            showNotification('General notification updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editGeneralNotificationModal')).hide();
            await loadGeneralNotifications();
        } else {
            showNotification(response.message || 'Failed to update notification', 'error');
        }
    } catch (error) {
        console.error('Error updating general notification:', error);
        showNotification('Error updating notification', 'error');
    }
}

// Delete general notification
async function deleteGeneralNotification(notificationId) {
    if (!confirm('Are you sure you want to delete this general notification?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/admin/general-notifications/${notificationId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showNotification('General notification deleted successfully!', 'success');
            await loadGeneralNotifications();
        } else {
            showNotification(response.message || 'Failed to delete notification', 'error');
        }
    } catch (error) {
        console.error('Error deleting general notification:', error);
        showNotification('Error deleting notification', 'error');
    }
}

// === INDIVIDUAL NOTIFICATIONS ===

// Show send individual notification modal
function showSendIndividualNotificationModal() {
    const modal = new bootstrap.Modal(document.getElementById('sendIndividualNotificationModal'));
    // Reset form
    document.getElementById('sendIndividualNotificationForm').reset();
    modal.show();
}

// Send individual notification
async function sendIndividualNotification() {
    const userIdOrUsername = document.getElementById('individualUserId').value.trim();
    
    // Convert priority to number
    const priorityValue = document.getElementById('individualPriority').value;
    const priorityMap = { 'normal': 1, 'medium': 2, 'high': 3 };
    
    const formData = {
        user_id: userIdOrUsername, // Backend should handle both ID and username
        category_id: parseInt(document.getElementById('individualCategory').value),
        title: document.getElementById('individualTitle').value,
        message: document.getElementById('individualMessage').value,
        priority: priorityMap[priorityValue] || 1,
        image_url: document.getElementById('individualImageUrl').value || null
    };

    // Validation
    if (!formData.user_id || !formData.title || !formData.message || !formData.category_id) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        console.log('Sending individual notification:', formData);
        
        const response = await fetchWithAuth('/api/admin/notifications', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        console.log('Individual notification response:', response);

        if (response.success) {
            showNotification('Individual notification sent successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('sendIndividualNotificationModal')).hide();
            document.getElementById('sendIndividualNotificationForm').reset();
        } else {
            showNotification(response.message || 'Failed to send notification', 'error');
        }
    } catch (error) {
        console.error('Error sending individual notification:', error);
        showNotification('Error sending notification: ' + error.message, 'error');
    }
}

// === BULK NOTIFICATIONS ===

// Show send bulk notification modal
function showSendBulkNotificationModal() {
    const modal = new bootstrap.Modal(document.getElementById('sendBulkNotificationModal'));
    // Reset form
    document.getElementById('sendBulkNotificationForm').reset();
    modal.show();
}

// Send bulk notification
async function sendBulkNotification() {
    const userIdsInput = document.getElementById('bulkUserIds').value.trim();
    const userIds = userIdsInput.split(',').map(id => id.trim()).filter(id => id);
    
    // Convert priority to number
    const priorityValue = document.getElementById('bulkPriority').value;
    const priorityMap = { 'normal': 1, 'medium': 2, 'high': 3 };
    
    const formData = {
        user_ids: userIds,
        category_id: parseInt(document.getElementById('bulkCategory').value),
        title: document.getElementById('bulkTitle').value,
        message: document.getElementById('bulkMessage').value,
        priority: priorityMap[priorityValue] || 1,
        image_url: document.getElementById('bulkImageUrl').value || null
    };

    // Validation
    if (userIds.length === 0 || !formData.title || !formData.message || !formData.category_id) {
        showNotification('Please fill in all required fields and provide valid user IDs', 'error');
        return;
    }

    try {
        console.log('Sending bulk notification:', formData);
        
        const response = await fetchWithAuth('/api/admin/notifications/bulk', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        console.log('Bulk notification response:', response);

        if (response.success) {
            showNotification(`Bulk notification sent successfully to ${userIds.length} users!`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('sendBulkNotificationModal')).hide();
            document.getElementById('sendBulkNotificationForm').reset();
        } else {
            showNotification(response.message || 'Failed to send bulk notification', 'error');
        }
    } catch (error) {
        console.error('Error sending bulk notification:', error);
        showNotification('Error sending bulk notification: ' + error.message, 'error');
    }
}

// QR Code Management Functions
async function loadQRCodeManagement() {
    try {
        await loadCurrentQRCode();
        await loadQRCodeHistory();
    } catch (error) {
        console.error('Error loading QR code management:', error);
        showNotification('Failed to load QR code management', 'error');
    }
}

async function loadCurrentQRCode() {
    try {
        const response = await fetchWithAuth('/api/user/qr-code');
        const currentQRDisplay = document.getElementById('current-qr-display');
        
        if (response.success && response.data) {
            document.getElementById('current-qr-image').src = response.data.qr_code_url;
            document.getElementById('current-qr-description').textContent = response.data.description || 'Deposit QR Code';
            document.getElementById('current-qr-wallet-address').textContent = response.data.wallet_address || 'No wallet address set';
            document.getElementById('current-qr-updated').textContent = 
                'Updated: ' + new Date(response.data.updated_at).toLocaleDateString();
            currentQRDisplay.style.display = 'block';
        } else {
            document.getElementById('current-qr-description').textContent = 'No QR code uploaded yet';
            document.getElementById('current-qr-wallet-address').textContent = 'No wallet address set';
            document.getElementById('current-qr-updated').textContent = 'Updated: --';
            document.getElementById('current-qr-image').src = '/assets/images/placeholder-qr.png';
        }
    } catch (error) {
        console.error('Error loading current QR code:', error);
        showNotification('Failed to load current QR code', 'error');
        document.getElementById('current-qr-description').textContent = 'Error loading QR code';
        document.getElementById('current-qr-wallet-address').textContent = 'Error loading wallet address';
        document.getElementById('current-qr-updated').textContent = 'Updated: --';
    }
}

async function loadQRCodeHistory() {
    try {
        const response = await fetchWithAuth('/admin/qr-codes');
        const historyBody = document.getElementById('qr-history-list');
        
        if (response.success && response.data && response.data.length > 0) {
            historyBody.innerHTML = '';
              response.data.forEach(qr => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <img src="${qr.qr_code_url}" alt="QR Code" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                    </td>
                    <td>${qr.description || 'Deposit QR Code'}</td>
                    <td class="text-break small">${qr.wallet_address || 'No wallet address'}</td>
                    <td>
                        <span class="badge bg-${qr.is_active ? 'success' : 'secondary'}">
                            ${qr.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(qr.updated_at).toLocaleDateString()}</td>
                    <td>
                        ${!qr.is_active ? `
                            <button class="btn btn-sm btn-primary me-1" onclick="activateQRCode(${qr.id})">
                                <i class="fas fa-check"></i> Activate
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteQRCode(${qr.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                historyBody.appendChild(row);
            });
        } else {
            historyBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No QR codes found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading QR code history:', error);
        showNotification('Failed to load QR code history', 'error');
        const historyBody = document.getElementById('qr-history-list');
        historyBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading QR code history</td></tr>';
    }
}

function previewQRCode() {
    const fileInput = document.getElementById('qr-file');
    const preview = document.getElementById('qr-preview');
    const previewContainer = document.getElementById('qr-preview-container');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

async function uploadQRCode() {
    const fileInput = document.getElementById('qr-file');
    const uploadBtn = document.getElementById('upload-qr-btn');
    const description = document.getElementById('qr-description').value;
    const walletAddress = document.getElementById('qr-wallet-address').value;
    
    if (!fileInput.files || !fileInput.files[0]) {
        showNotification('Please select a QR code image', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('qrcode', fileInput.files[0]);
    formData.append('description', description);
    formData.append('wallet_address', walletAddress);
    
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Uploading...';
    
    try {
        const response = await fetchWithAuth('/admin/qr-code/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.success) {
            showNotification('QR code uploaded successfully!', 'success');
            
            // Reset form
            document.getElementById('qr-upload-form').reset();
            document.getElementById('qr-preview-container').style.display = 'none';
            
            // Reload QR code data
            await loadCurrentQRCode();
            await loadQRCodeHistory();
        } else {
            showNotification(response.message || 'Failed to upload QR code', 'error');
        }
    } catch (error) {
        console.error('Error uploading QR code:', error);
        showNotification('Error uploading QR code: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload QR Code';
    }
}

async function activateQRCode(qrId) {
    if (!confirm('Are you sure you want to activate this QR code? This will deactivate the current active QR code.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/admin/qr-code/${qrId}/activate`, {
            method: 'POST'
        });
        
        if (response.success) {
            showNotification('QR code activated successfully!', 'success');
            await loadCurrentQRCode();
            await loadQRCodeHistory();
        } else {
            showNotification(response.message || 'Failed to activate QR code', 'error');
        }
    } catch (error) {
        console.error('Error activating QR code:', error);
        showNotification('Error activating QR code: ' + error.message, 'error');
    }
}

async function deleteQRCode(qrId) {
    if (!confirm('Are you sure you want to delete this QR code? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/admin/qr-code/${qrId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('QR code deleted successfully!', 'success');
            await loadCurrentQRCode();
            await loadQRCodeHistory();
        } else {
            showNotification(response.message || 'Failed to delete QR code', 'error');
        }
    } catch (error) {
        console.error('Error deleting QR code:', error);
        showNotification('Error deleting QR code: ' + error.message, 'error');
    }
}

// Make notification functions globally available
window.loadNotificationCategories = loadNotificationCategories;
window.showCreateCategoryModal = showCreateCategoryModal;
window.createCategory = createCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.loadGeneralNotifications = loadGeneralNotifications;
window.showCreateGeneralNotificationModal = showCreateGeneralNotificationModal;
window.createGeneralNotification = createGeneralNotification;
window.editGeneralNotification = editGeneralNotification;
window.updateGeneralNotification = updateGeneralNotification;
window.deleteGeneralNotification = deleteGeneralNotification;
window.showSendIndividualNotificationModal = showSendIndividualNotificationModal;
window.sendIndividualNotification = sendIndividualNotification;
window.showSendBulkNotificationModal = showSendBulkNotificationModal;
window.sendBulkNotification = sendBulkNotification;

// Make QR code management functions globally available
window.loadQRCodeManagement = loadQRCodeManagement;
window.previewQRCode = previewQRCode;
window.uploadQRCode = uploadQRCode;
window.activateQRCode = activateQRCode;
window.deleteQRCode = deleteQRCode;

// Handle chat navigation with authentication check
function handleChatNavigation(event) {
    event.preventDefault();
    
    // Check if user is authenticated
    const token = localStorage.getItem('admin_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    
    if (!token) {
        showNotification('Please log in to access chat management', 'error');
        window.location.href = '/admin-login.html';
        return false;
    }
    
    // Show loading notification
    showNotification('Loading chat management...', 'info');
    
    // Navigate to admin chat page
    window.location.href = '/admin-chat.html';
    return false;
}

// Make function globally accessible
window.handleChatNavigation = handleChatNavigation;
