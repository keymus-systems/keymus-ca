/**
 * Enhanced Combo Creation Module
 * Provides advanced combo creation functionality with real-time progress display
 */

// Will be imported from the main module
let fetchWithAuth;
let showNotification;
let isInitialized = false; // Flag to track initialization

// Global variables for enhanced combo creation
let currentComboUserId = null;
let currentComboUsername = null;
let userProgressData = null;
let availableProductsForCombo = [];

// Initialize dependencies from the main module
window.initEnhancedComboCreationDependencies = function(dependencies) {
    fetchWithAuth = dependencies.fetchWithAuth;
    showNotification = dependencies.showNotification;
    
    if (!fetchWithAuth || !showNotification) {
        console.error("CRITICAL: fetchWithAuth or showNotification not passed to enhanced-combo-creation.js");
        isInitialized = false;
        return;
    }
    isInitialized = true;
    console.log("enhanced-combo-creation.js initialized with dependencies.");
};

/**
 * Initialize enhanced combo creation from View Progress modal
 */
function initializeEnhancedComboCreation() {
    // Add event listener to the "Create Combo" button in View Progress modal
    const createComboFromProgressBtn = document.getElementById('create-combo-from-progress-btn');
    if (createComboFromProgressBtn) {
        createComboFromProgressBtn.addEventListener('click', () => {
            // Extract user info from the progress modal
            const userInfoElement = document.getElementById('progress-user-info');
            if (userInfoElement && userInfoElement.textContent) {
                const userText = userInfoElement.textContent.trim();
                // Extract user ID from format like "Username (ID: 123)"
                const userIdMatch = userText.match(/\(ID:\s*(\d+)\)/);
                const userId = userIdMatch ? userIdMatch[1] : null;
                
                // Extract username (everything before " (ID:")
                const usernameMatch = userText.match(/^(.+?)\s*\(ID:/);
                const username = usernameMatch ? usernameMatch[1].trim() : 'Unknown User';
                
                if (userId) {
                    showEnhancedComboCreationModal(userId, username);
                } else {
                    showNotification('Could not determine user ID for combo creation', 'error');
                }
            } else {
                showNotification('User information not available for combo creation', 'error');
            }
        });
    }

    // Initialize enhanced combo creation modal event handlers
    initializeEnhancedComboModalHandlers();
}

/**
 * Show the enhanced combo creation modal
 */
async function showEnhancedComboCreationModal(userId, username) {
    if (!isInitialized) {
        console.error('Enhanced combo creation module is not initialized with dependencies');
        alert('Enhanced combo creation module is not ready. Please refresh the page.');
        return;
    }
    
    console.log('showEnhancedComboCreationModal called with:', { userId, username });
    currentComboUserId = userId;
    currentComboUsername = username;
    
    // Show the modal
    const modalElement = document.getElementById('enhancedComboCreationModal');
    if (!modalElement) {
        console.error('Enhanced combo creation modal not found in DOM');
        showNotification('Enhanced combo creation modal not found', 'error');
        return;
    }
    
    console.log('Modal element found, creating bootstrap modal...');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    console.log('Modal shown successfully');
    
    // Reset form
    resetEnhancedComboForm();
    
    // Load user progress and products
    console.log('Loading user progress and products...');
    await Promise.all([
        loadUserProgressForCombo(userId, username),
        loadProductsForCombo()
    ]);
    console.log('Enhanced combo creation modal initialization complete');
}

/**
 * Reset the enhanced combo creation form
 */
function resetEnhancedComboForm() {
    document.getElementById('enhanced-combo-creation-form').reset();
    document.getElementById('custom-position-group').style.display = 'none';
    document.getElementById('sequence-preview-content').style.display = 'none';
    document.getElementById('sequence-preview-loading').style.display = 'block';
    document.getElementById('sequence-preview-loading').innerHTML = '<span class="text-muted">Select insertion point to preview sequence...</span>';
    document.getElementById('create-combo-btn').disabled = true;
    updateSelectedProductsCount();
}

/**
 * Load user progress data for combo creation
 */
async function loadUserProgressForCombo(userId, username) {
    const loadingElement = document.getElementById('user-progress-loading');
    const contentElement = document.getElementById('user-progress-content');
    
    loadingElement.style.display = 'block';
    contentElement.style.display = 'none';
    
    try {
        const response = await fetchWithAuth(`/api/admin/drive-management/users/${userId}/drive-progress`);
        
        if (response && response.drive_session_id) {
            userProgressData = response;
            
            // Update UI elements
            document.getElementById('combo-user-info').textContent = `${username} (ID: ${userId})`;
            document.getElementById('combo-drive-config').textContent = response.drive_configuration_name || 'N/A';
            document.getElementById('combo-current-task').textContent = response.current_task_item_name || 'N/A';
            document.getElementById('combo-progress-summary').textContent = `${response.completed_task_items} of ${response.total_task_items} tasks completed`;
            
            // Update progress bar
            const progressPercent = response.total_task_items > 0 ? 
                Math.round((response.completed_task_items / response.total_task_items) * 100) : 0;
            const progressBar = document.getElementById('combo-progress-bar');
            progressBar.style.width = progressPercent + '%';
            progressBar.setAttribute('aria-valuenow', progressPercent);
            progressBar.textContent = progressPercent + '%';
            
            // Populate insertion point options
            populateInsertionPoints(response.task_items || []);
            
        } else {
            throw new Error(response?.message || 'No active drive session found');
        }
        
        loadingElement.style.display = 'none';
        contentElement.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading user progress for combo:', error);
        loadingElement.innerHTML = `<span class="text-danger">Error loading progress: ${error.message}</span>`;
        showNotification('Failed to load user progress for combo creation', 'error');
    }
}

/**
 * Load products for combo creation
 */
async function loadProductsForCombo() {
    try {
        const response = await fetchWithAuth('/admin/products');
        availableProductsForCombo = response.products || [];
        renderProductsForCombo(availableProductsForCombo);
    } catch (error) {
        console.error('Error loading products for combo:', error);
        document.getElementById('enhanced-products-list').innerHTML = `
            <tr><td colspan="3" class="text-center text-danger">Error loading products: ${error.message}</td></tr>
        `;
        showNotification('Failed to load products for combo creation', 'error');
    }
}

/**
 * Render products in the combo creation modal
 */
function renderProductsForCombo(products) {
    const productsList = document.getElementById('enhanced-products-list');
    
    if (!products || products.length === 0) {
        productsList.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No products available</td></tr>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <tr data-product-id="${product.id}" data-product-price="${product.price || 0}">
            <td>
                <input type="checkbox" class="form-check-input product-checkbox" 
                       data-product-id="${product.id}" 
                       data-product-name="${product.name}"
                       data-product-price="${product.price || 0}">
            </td>
            <td>
                <div class="fw-semibold">${product.name}</div>
                ${product.description ? `<small class="text-muted">${product.description}</small>` : ''}
            </td>
            <td>$${parseFloat(product.price || 0).toFixed(2)}</td>
        </tr>
    `).join('');
    
    // Add event listeners to checkboxes
    productsList.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedProductsCount();
            validateComboForm();
        });
    });
}

/**
 * Populate insertion point options based on user's current task sequence
 */
function populateInsertionPoints(taskItems) {
    const insertionSelect = document.getElementById('insertion-point');
    
    // Keep the basic options and add specific ones
    const basicOptions = `
        <option value="">Select insertion point...</option>
        <option value="beginning">At the beginning</option>
        <option value="after-current">After current task</option>
        <option value="end">At the end</option>
        <option value="custom">Custom position...</option>
    `;
    
    let specificOptions = '';
    if (taskItems && taskItems.length > 0) {
        specificOptions = taskItems.map(item => 
            `<option value="after-${item.task_item_id}">After "${item.products.map(p => p.name).join(', ')}" (Order ${item.order_in_drive})</option>`
        ).join('');
    }
    
    insertionSelect.innerHTML = basicOptions + (specificOptions ? '<optgroup label="After Specific Tasks">' + specificOptions + '</optgroup>' : '');
}

/**
 * Initialize event handlers for the enhanced combo modal
 */
function initializeEnhancedComboModalHandlers() {
    // Insertion point change handler
    const insertionSelect = document.getElementById('insertion-point');
    if (insertionSelect) {
        insertionSelect.addEventListener('change', (e) => {
            const customGroup = document.getElementById('custom-position-group');
            if (e.target.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
            
            updateSequencePreview();
            validateComboForm();
        });
    }
    
    // Custom position change handler
    const customPosition = document.getElementById('custom-position');
    if (customPosition) {
        customPosition.addEventListener('input', () => {
            updateSequencePreview();
            validateComboForm();
        });
    }
    
    // Product search handler
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }
    
    // Clear search handler
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            document.getElementById('product-search').value = '';
            document.getElementById('price-filter-min').value = '';
            document.getElementById('price-filter-max').value = '';
            filterProducts();
        });
    }
    
    // Price filter handlers
    const minPriceFilter = document.getElementById('price-filter-min');
    const maxPriceFilter = document.getElementById('price-filter-max');
    if (minPriceFilter) {
        minPriceFilter.addEventListener('input', () => filterProducts());
    }
    if (maxPriceFilter) {
        maxPriceFilter.addEventListener('input', () => filterProducts());
    }
    
    // Select all handler
    const selectAllCheckbox = document.getElementById('select-all-products');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const visibleCheckboxes = document.querySelectorAll('#enhanced-products-list .product-checkbox:not([style*="display: none"])');
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateSelectedProductsCount();
            validateComboForm();
        });
    }
    
    // Refresh progress handler
    const refreshBtn = document.getElementById('refresh-progress-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (currentComboUserId) {
                loadUserProgressForCombo(currentComboUserId, currentComboUsername);
            }
        });
    }
    
    // Form field handlers
    const comboName = document.getElementById('combo-name');
    if (comboName) {
        comboName.addEventListener('input', validateComboForm);
    }
    
    // Create combo button handler
    const createComboBtn = document.getElementById('create-combo-btn');
    if (createComboBtn) {
        createComboBtn.addEventListener('click', handleCreateCombo);
    }
}

/**
 * Filter products based on search and price criteria
 */
function filterProducts(searchTerm = null) {
    const search = searchTerm || document.getElementById('product-search').value.toLowerCase();
    const minPrice = parseFloat(document.getElementById('price-filter-min').value) || 0;
    const maxPrice = parseFloat(document.getElementById('price-filter-max').value) || Infinity;
    
    const productRows = document.querySelectorAll('#enhanced-products-list tr[data-product-id]');
    
    productRows.forEach(row => {
        const productName = row.querySelector('.fw-semibold').textContent.toLowerCase();
        const productPrice = parseFloat(row.dataset.productPrice) || 0;
        
        const matchesSearch = !search || productName.includes(search);
        const matchesPrice = productPrice >= minPrice && productPrice <= maxPrice;
        
        if (matchesSearch && matchesPrice) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
            // Uncheck hidden products
            const checkbox = row.querySelector('.product-checkbox');
            if (checkbox) checkbox.checked = false;
        }
    });
    
    updateSelectedProductsCount();
    updateSelectAllCheckboxState();
    validateComboForm();
}

/**
 * Update the selected products count
 */
function updateSelectedProductsCount() {
    const selectedCount = document.querySelectorAll('#enhanced-products-list .product-checkbox:checked').length;
    document.getElementById('selected-products-count').textContent = `${selectedCount} selected`;
}

/**
 * Update select all checkbox state
 */
function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('select-all-products');
    const visibleCheckboxes = document.querySelectorAll('#enhanced-products-list .product-checkbox:not([style*="display: none"])');
    const checkedVisibleCheckboxes = document.querySelectorAll('#enhanced-products-list .product-checkbox:checked:not([style*="display: none"])');
    
    if (visibleCheckboxes.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedVisibleCheckboxes.length === visibleCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else if (checkedVisibleCheckboxes.length > 0) {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    } else {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    }
}

/**
 * Update the sequence preview
 */
function updateSequencePreview() {
    const insertionPoint = document.getElementById('insertion-point').value;
    const previewLoading = document.getElementById('sequence-preview-loading');
    const previewContent = document.getElementById('sequence-preview-content');
    const previewList = document.getElementById('sequence-preview-list');
    
    if (!insertionPoint || !userProgressData) {
        previewContent.style.display = 'none';
        previewLoading.style.display = 'block';
        previewLoading.innerHTML = '<span class="text-muted">Select insertion point to preview sequence...</span>';
        return;
    }
    
    previewLoading.style.display = 'none';
    previewContent.style.display = 'block';
    
    const taskItems = userProgressData.task_items || [];
    let insertOrder = 1;
    
    // Determine insertion order
    if (insertionPoint === 'beginning') {
        insertOrder = 1;
    } else if (insertionPoint === 'end') {
        insertOrder = taskItems.length + 1;
    } else if (insertionPoint === 'after-current') {
        const currentTaskItem = taskItems.find(item => item.task_item_id === userProgressData.current_task_item_id);
        insertOrder = currentTaskItem ? currentTaskItem.order_in_drive + 1 : taskItems.length + 1;
    } else if (insertionPoint === 'custom') {
        insertOrder = parseInt(document.getElementById('custom-position').value) || 1;
    } else if (insertionPoint.startsWith('after-')) {
        const taskItemId = insertionPoint.replace('after-', '');
        const targetTask = taskItems.find(item => item.task_item_id == taskItemId);
        insertOrder = targetTask ? targetTask.order_in_drive + 1 : taskItems.length + 1;
    }
    
    // Create preview sequence
    const previewSequence = [];
    
    // Add existing tasks
    taskItems.forEach(item => {
        if (item.order_in_drive < insertOrder) {
            previewSequence.push({
                order: item.order_in_drive,
                name: item.products.map(p => p.name).join(', '),
                type: 'Existing',
                status: item.user_status,
                isExisting: true
            });
        }
    });
    
    // Add the new combo
    previewSequence.push({
        order: insertOrder,
        name: document.getElementById('combo-name').value || 'New Combo',
        type: 'New Combo',
        status: 'pending',
        isNew: true
    });
    
    // Add remaining existing tasks (shifted)
    taskItems.forEach(item => {
        if (item.order_in_drive >= insertOrder) {
            previewSequence.push({
                order: item.order_in_drive + 1,
                name: item.products.map(p => p.name).join(', '),
                type: 'Existing',
                status: item.user_status,
                isExisting: true
            });
        }
    });
    
    // Sort by order
    previewSequence.sort((a, b) => a.order - b.order);
    
    // Render preview
    previewList.innerHTML = previewSequence.map(item => `
        <tr class="${item.isNew ? 'table-success' : ''}">
            <td>${item.order}</td>
            <td>
                ${item.name}
                ${item.isNew ? '<span class="badge bg-success ms-2">NEW</span>' : ''}
            </td>
            <td>
                <span class="badge bg-${item.isNew ? 'success' : 'secondary'}">${item.type}</span>
            </td>
            <td>
                <span class="badge bg-${getStatusBadgeColor(item.status)}">${item.status}</span>
            </td>
        </tr>
    `).join('');
}

/**
 * Validate the combo creation form
 */
function validateComboForm() {
    const comboName = document.getElementById('combo-name').value.trim();
    const insertionPoint = document.getElementById('insertion-point').value;
    const selectedProducts = document.querySelectorAll('#enhanced-products-list .product-checkbox:checked');
    
    let isValid = true;
    
    // Check required fields
    if (!comboName) isValid = false;
    if (!insertionPoint) isValid = false;
    if (selectedProducts.length === 0) isValid = false;
    
    // Check custom position if selected
    if (insertionPoint === 'custom') {
        const customPosition = parseInt(document.getElementById('custom-position').value);
        if (!customPosition || customPosition < 1) isValid = false;
    }
    
    document.getElementById('create-combo-btn').disabled = !isValid;
}

/**
 * Handle combo creation
 */
async function handleCreateCombo() {
    const createBtn = document.getElementById('create-combo-btn');
    const originalText = createBtn.innerHTML;
    
    try {
        createBtn.disabled = true;
        createBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Creating...';
        
        // Collect form data
        const comboName = document.getElementById('combo-name').value.trim();
        const comboDescription = document.getElementById('combo-description').value.trim();
        const insertionPoint = document.getElementById('insertion-point').value;
        
        const selectedProducts = Array.from(document.querySelectorAll('#enhanced-products-list .product-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.productId));
        
        // Determine insertion details
        let insertionData = {};
        
        if (insertionPoint === 'beginning') {
            insertionData.insertAtOrder = 1;
        } else if (insertionPoint === 'end') {
            insertionData.insertAtOrder = (userProgressData.task_items?.length || 0) + 1;
        } else if (insertionPoint === 'after-current') {
            const currentTask = userProgressData.task_items?.find(item => 
                item.task_item_id === userProgressData.current_task_item_id);
            insertionData.insertAtOrder = currentTask ? currentTask.order_in_drive + 1 : 
                (userProgressData.task_items?.length || 0) + 1;
        } else if (insertionPoint === 'custom') {
            insertionData.insertAtOrder = parseInt(document.getElementById('custom-position').value);
        } else if (insertionPoint.startsWith('after-')) {
            const taskItemId = insertionPoint.replace('after-', '');
            const targetTask = userProgressData.task_items?.find(item => item.task_item_id == taskItemId);
            insertionData.insertAfterTaskSetId = taskItemId;
            insertionData.insertAtOrder = targetTask ? targetTask.order_in_drive + 1 : 
                (userProgressData.task_items?.length || 0) + 1;
        }
        
        // Prepare request payload
        const payload = {
            comboName: comboName,
            comboDescription: comboDescription,
            productIds: selectedProducts,
            ...insertionData
        };
        
        console.log('Creating combo with payload:', payload);
        
        // Make API call to create combo (we'll need to implement this endpoint)
        const response = await fetchWithAuth(`/api/admin/drive-management/users/${currentComboUserId}/drive/add-combo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response && response.success) {
            showNotification('Combo created and added to user\'s drive successfully!', 'success');
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('enhancedComboCreationModal'));
            if (modal) modal.hide();
            
            // Refresh the user progress in the main progress modal if it's open
            if (document.getElementById('userDriveProgressModal').classList.contains('show')) {
                showUserDriveProgressModal(currentComboUserId, currentComboUsername);
            }
            
        } else {
            throw new Error(response?.message || 'Failed to create combo');
        }
        
    } catch (error) {
        console.error('Error creating combo:', error);
        showNotification('Failed to create combo: ' + error.message, 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = originalText;
    }
}

/**
 * Helper function to get status badge color
 */
function getStatusBadgeColor(status) {
    switch (status?.toUpperCase()) {
        case 'COMPLETED': return 'success';
        case 'CURRENT': return 'primary';
        case 'PENDING': return 'secondary';
        default: return 'secondary';
    }
}

// Initialize enhanced combo creation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEnhancedComboCreation();
});

// Also initialize when the script is loaded (in case DOM is already ready)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedComboCreation);
} else {
    initializeEnhancedComboCreation();
}

// Make functions globally available for use by other modules
window.showEnhancedComboCreationModal = showEnhancedComboCreationModal;
window.loadProductsForCombo = loadProductsForCombo;
window.resetEnhancedComboForm = resetEnhancedComboForm;
