// Tier Management Frontend
// JavaScript for admin tier configuration management

class TierManagement {
    constructor() {
        this.apiBase = 'http://localhost:3001/api/admin/tier-management';
        this.currentTiers = [];
        this.isEditing = false;
        this.editingId = null;
        
        this.init();
    }    // Helper method for safe element selection
    safeGetElement(id, logError = true) {
        const element = document.getElementById(id);
        if (!element && logError) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    }

    // Helper method for safe element value access
    getElementValue(id, defaultValue = '') {
        const element = this.safeGetElement(id);
        return element ? element.value : defaultValue;
    }

    // Helper method for safe element property setting
    setElementProperty(id, property, value) {
        const element = this.safeGetElement(id);
        if (element) {
            element[property] = value;
        }
        return element;
    }async init() {
        // Check authentication before initializing
        if (!this.checkAuthentication()) {
            return;
        }
        
        this.setupEventListeners();
        await this.loadTierConfigurations();
        await this.loadTierStatistics();
    }
    
    checkAuthentication() {
        // Check if user is authenticated and has admin role
        let isAuthenticated = false;
        let isAdmin = false;
        
        // Try SimpleAuth first
        if (typeof SimpleAuth !== 'undefined') {
            isAuthenticated = SimpleAuth.isAuthenticated('admin');
            isAdmin = SimpleAuth.isAdmin();
            console.log('TierManagement: SimpleAuth check - authenticated:', isAuthenticated, 'admin:', isAdmin);
        }
        
        // Fallback to basic token check
        if (!isAuthenticated) {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            
            if (token && userData) {
                try {
                    const user = JSON.parse(userData);
                    isAuthenticated = true;
                    isAdmin = user.role === 'admin';
                    console.log('TierManagement: Basic auth check - authenticated:', isAuthenticated, 'admin:', isAdmin);
                } catch (error) {
                    console.error('TierManagement: Error parsing user data:', error);
                }
            }
        }
        
        if (!isAuthenticated) {
            console.log('TierManagement: User not authenticated, redirecting to login');
            this.showError('Please log in to access the admin panel.');
            window.location.href = 'login.html';
            return false;
        }
        
        if (!isAdmin) {
            console.log('TierManagement: User not admin, access denied');
            this.showError('Admin privileges required to access tier management.');
            return false;
        }
        
        console.log('TierManagement: Authentication successful');
        return true;
    }    setupEventListeners() {
        // Save tier configuration
        const saveBtn = this.safeGetElement('saveTierBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveTierConfiguration();
            });
        }

        // Cancel editing
        const cancelBtn = this.safeGetElement('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelEdit();
            });
        }

        // New tier button
        const newBtn = this.safeGetElement('newTierBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.createNewTier();
            });
        }

        // Refresh data
        const refreshBtn = this.safeGetElement('refreshTiersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        const form = document.getElementById('tierConfigForm');
        const inputs = form.querySelectorAll('input, textarea');

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateForm();
            });
        });
    }

    validateForm() {
        const tierName = document.getElementById('tierName').value.trim();
        const quantityLimit = document.getElementById('quantityLimit').value;
        const numSingleTasks = document.getElementById('numSingleTasks').value;
        const minPriceSingle = parseFloat(document.getElementById('minPriceSingle').value) || 0;
        const maxPriceSingle = parseFloat(document.getElementById('maxPriceSingle').value) || 0;

        const isValid = tierName && quantityLimit && numSingleTasks && 
                       minPriceSingle >= 0 && maxPriceSingle > 0 && 
                       minPriceSingle <= maxPriceSingle;

        document.getElementById('saveTierBtn').disabled = !isValid;

        // Show validation messages
        if (minPriceSingle > maxPriceSingle) {
            this.showValidationError('Min price cannot be greater than max price');
        } else {
            this.hideValidationError();
        }
    }

    showValidationError(message) {
        let errorDiv = document.getElementById('validationError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'validationError';
            errorDiv.className = 'alert alert-danger mt-2';
            document.getElementById('tierConfigForm').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideValidationError() {
        const errorDiv = document.getElementById('validationError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    async loadTierConfigurations() {
        try {
            const response = await this.makeAuthenticatedRequest('/configurations');
            
            if (response.success) {
                this.currentTiers = response.data;
                this.renderTierTable();
            } else {
                this.showError('Failed to load tier configurations');
            }
        } catch (error) {
            console.error('Error loading tier configurations:', error);
            this.showError('Network error loading tier configurations');
        }
    }

    async loadTierStatistics() {
        try {
            const response = await this.makeAuthenticatedRequest('/statistics');
            
            if (response.success) {
                this.renderTierStatistics(response.data);
            }
        } catch (error) {
            console.error('Error loading tier statistics:', error);
        }
    }    renderTierTable() {
        const tbody = document.getElementById('tierConfigTableBody');
        if (!tbody) {
            console.error('tierConfigTableBody element not found');
            return;
        }
        tbody.innerHTML = '';

        this.currentTiers.forEach(tier => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="badge bg-${this.getTierColor(tier.tier_name)}">${tier.tier_name}</span>
                </td>
                <td>${tier.quantity_limit}</td>
                <td>${tier.num_single_tasks || 0}</td>
                <td>${tier.num_combo_tasks || 0}</td>
                <td>$${tier.min_price_single || 0} - $${tier.max_price_single || 0}</td>
                <td>$${tier.min_price_combo || 0} - $${tier.max_price_combo || 0}</td>
                <td>${tier.commission_rate || 0}%</td>
                <td>
                    <span class="badge bg-${tier.is_active ? 'success' : 'secondary'}">
                        ${tier.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="tierManager.editTier(${tier.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="tierManager.deleteTier(${tier.id}, '${tier.tier_name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderTierStatistics(stats) {
        const container = document.getElementById('tierStatsContainer');
        container.innerHTML = '';

        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'col-md-3 mb-3';
            card.innerHTML = `
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">
                            <span class="badge bg-${this.getTierColor(stat.tier_name)} mb-2">${stat.tier_name}</span>
                        </h5>
                        <div class="row">
                            <div class="col-12">
                                <h3 class="text-primary">${stat.user_count || 0}</h3>
                                <small class="text-muted">Total Users</small>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-6">
                                <strong>${stat.new_users_30d || 0}</strong>
                                <small class="d-block text-muted">New (30d)</small>
                            </div>
                            <div class="col-6">
                                <strong>$${parseFloat(stat.avg_balance || 0).toFixed(2)}</strong>
                                <small class="d-block text-muted">Avg Balance</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    getTierColor(tierName) {
        const colors = {
            'bronze': 'warning',
            'silver': 'secondary',
            'gold': 'success',
            'platinum': 'primary'
        };
        return colors[tierName.toLowerCase()] || 'info';
    }

    editTier(id) {
        const tier = this.currentTiers.find(t => t.id === id);
        if (!tier) return;

        this.isEditing = true;
        this.editingId = id;        // Populate form with null checks
        this.setElementProperty('tierName', 'value', tier.tier_name);
        this.setElementProperty('quantityLimit', 'value', tier.quantity_limit);
        this.setElementProperty('numSingleTasks', 'value', tier.num_single_tasks || 0);
        this.setElementProperty('numComboTasks', 'value', tier.num_combo_tasks || 0);
        this.setElementProperty('minPriceSingle', 'value', tier.min_price_single || 0);
        this.setElementProperty('maxPriceSingle', 'value', tier.max_price_single || 0);
        this.setElementProperty('minPriceCombo', 'value', tier.min_price_combo || 0);
        this.setElementProperty('maxPriceCombo', 'value', tier.max_price_combo || 0);
        this.setElementProperty('commissionRate', 'value', tier.commission_rate || 0);
        this.setElementProperty('tierDescription', 'value', tier.description || '');
        this.setElementProperty('isActive', 'checked', tier.is_active);// Update UI
        const titleElement = document.getElementById('tierFormTitle');
        const saveButton = document.getElementById('saveTierBtn');
        const cancelButton = document.getElementById('cancelEditBtn');
        const formElement = document.getElementById('tierConfigForm');
        
        if (titleElement) {
            titleElement.textContent = `Edit Tier: ${tier.tier_name}`;
        }
        
        if (saveButton) {
            saveButton.textContent = 'Update Tier';
        }
        
        if (cancelButton) {
            cancelButton.style.display = 'inline-block';
        }

        // Scroll to form with null check
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.warn('tierConfigForm element not found for scrollIntoView');
        }
    }    createNewTier() {
        this.isEditing = false;
        this.editingId = null;

        // Clear form with null check
        const formElement = document.getElementById('tierConfigForm');
        if (formElement) {
            formElement.reset();
        }

        // Update UI with null checks
        const titleElement = document.getElementById('tierFormTitle');
        const saveButton = document.getElementById('saveTierBtn');
        const cancelButton = document.getElementById('cancelEditBtn');
        
        if (titleElement) {
            titleElement.textContent = 'Create New Tier';
        }
        
        if (saveButton) {
            saveButton.textContent = 'Create Tier';
        }
        
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }        // Scroll to form with null check
        const managementFormElement = this.safeGetElement('tierManagementForm');
        if (managementFormElement) {
            managementFormElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingId = null;

        // Clear form
        document.getElementById('tierConfigForm').reset();

        // Update UI
        document.getElementById('tierFormTitle').textContent = 'Tier Configuration';
        document.getElementById('saveTierBtn').textContent = 'Create Tier';
        document.getElementById('cancelEditBtn').style.display = 'none';

        this.hideValidationError();
    }

    async saveTierConfiguration() {
        const formData = this.getFormData();
        
        try {
            let response;
            if (this.isEditing) {
                response = await this.makeAuthenticatedRequest(`/configurations/${this.editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                response = await this.makeAuthenticatedRequest('/configurations', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }

            if (response.success) {
                this.showSuccess(response.message);
                this.cancelEdit();
                await this.refreshData();
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            console.error('Error saving tier configuration:', error);
            this.showError('Failed to save tier configuration');
        }
    }

    async deleteTier(id, tierName) {
        if (!confirm(`Are you sure you want to delete the ${tierName} tier? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/configurations/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.showSuccess(response.message);
                await this.refreshData();
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            console.error('Error deleting tier:', error);
            this.showError('Failed to delete tier configuration');
        }
    }

    getFormData() {
        return {
            tier_name: document.getElementById('tierName').value.trim(),
            quantity_limit: parseInt(document.getElementById('quantityLimit').value),
            num_single_tasks: parseInt(document.getElementById('numSingleTasks').value) || 0,
            num_combo_tasks: parseInt(document.getElementById('numComboTasks').value) || 0,
            min_price_single: parseFloat(document.getElementById('minPriceSingle').value) || 0,
            max_price_single: parseFloat(document.getElementById('maxPriceSingle').value) || 0,
            min_price_combo: parseFloat(document.getElementById('minPriceCombo').value) || 0,
            max_price_combo: parseFloat(document.getElementById('maxPriceCombo').value) || 0,
            commission_rate: parseFloat(document.getElementById('commissionRate').value) || 0,
            description: document.getElementById('tierDescription').value.trim(),
            is_active: document.getElementById('isActive').checked
        };
    }

    async refreshData() {
        await Promise.all([
            this.loadTierConfigurations(),
            this.loadTierStatistics()
        ]);
    }    async makeAuthenticatedRequest(endpoint, options = {}) {
        // Try multiple token sources in order of preference
        let token = null;
        
        // 1. Try SimpleAuth admin context first
        if (typeof SimpleAuth !== 'undefined') {
            token = SimpleAuth.getToken('admin');
            console.log('TierManagement: Admin token from SimpleAuth:', token ? 'exists' : 'not found');
        }
        
        // 2. Fallback to regular auth token
        if (!token) {
            token = localStorage.getItem('auth_token');
            console.log('TierManagement: Token from localStorage:', token ? 'exists' : 'not found');
        }
        
        // 3. Try admin-specific token as last resort
        if (!token) {
            token = localStorage.getItem('admin_auth_token');
            console.log('TierManagement: Admin-specific token:', token ? 'exists' : 'not found');
        }
        
        if (!token) {
            console.error('TierManagement: No authentication token found');
            this.showError('Authentication required. Please log in as an admin.');
            // Redirect to login if no token found
            window.location.href = 'login.html';
            return { success: false, message: 'No authentication token' };
        }
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            console.log(`TierManagement: Making request to ${this.apiBase}${endpoint}`);
            const response = await fetch(`${this.apiBase}${endpoint}`, finalOptions);
            
            if (response.status === 401) {
                console.error('TierManagement: 401 Unauthorized - Invalid or expired token');
                this.showError('Authentication failed. Please log in again.');
                // Clear invalid tokens
                localStorage.removeItem('auth_token');
                localStorage.removeItem('admin_auth_token');
                if (typeof SimpleAuth !== 'undefined') {
                    SimpleAuth.clearAuth('admin');
                }
                window.location.href = 'login.html';
                return { success: false, message: 'Authentication failed' };
            }
            
            if (response.status === 403) {
                console.error('TierManagement: 403 Forbidden - Insufficient privileges');
                this.showError('Admin privileges required to access tier management.');
                return { success: false, message: 'Insufficient privileges' };
            }
            
            if (!response.ok) {
                console.error(`TierManagement: HTTP ${response.status} - ${response.statusText}`);
                this.showError(`Server error: ${response.status} ${response.statusText}`);
                return { success: false, message: `Server error: ${response.status}` };
            }
            
            return await response.json();
        } catch (error) {
            console.error('TierManagement: Network error:', error);
            this.showError('Network error. Please check your connection.');
            return { success: false, message: 'Network error' };
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize when DOM is loaded
let tierManager;
document.addEventListener('DOMContentLoaded', function() {
    tierManager = new TierManagement();
    // Make it globally accessible
    window.tierManagement = tierManager;
});
