document.addEventListener('DOMContentLoaded', () => {
    // Use centralized authentication check
    const authData = requireAuth();
    if (!authData) {
        return; // requireAuth will handle redirect
    }

    // Get references to key elements
    const startDriveButton = document.getElementById('start-drive-button');
    const driveContentArea = document.getElementById('drive-content-area'); // Container for product card etc.
    const walletBalanceElement = document.querySelector('.datadrive-balance strong'); // Element displaying balance
    
    // Frontend state for sequential product processing
    let currentItemId = null;
    let currentProductSlotInItem = 0;
    let totalProductsInItem = 0;
    let isLastProductInCurrentItem = false;
    let currentProductData = null; // Stores the full details of the currently displayed single product

    // Event listener for the Start Drive button
    if (startDriveButton) {
        startDriveButton.addEventListener('click', handleStartDrive);
    }

    // Function to handle the Start Drive button click
    async function handleStartDrive() {
        // Disable the button and show loading state
        startDriveButton.disabled = true;
        startDriveButton.textContent = 'Starting...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/drive/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error(`Server error (status ${response.status}). Please try again later.`);
            }

            if (response.ok && data.code === 0) {
                startDriveButton.style.display = 'none';
                driveContentArea.style.display = 'block';
                
                if (data.existing_session) {
                    checkDriveStatus(); // Token is available in the outer scope
                } else {
                    // New drive started, data should contain the first product
                    if (data.current_product_details) {
                        updateFrontendState(data);
                        updateWalletBalance();
                    } else {
                        fetchNextOrder(); // Fetch the first order/product
                    }
                }
            } else {
                if (response.status === 409) { // Conflict - existing session
                    startDriveButton.style.display = 'none';
                    driveContentArea.style.display = 'block';
                    checkDriveStatus();
                } else {
                    alert('Failed to start drive: ' + (data.info || data.message || 'Unknown error'));
                    startDriveButton.disabled = false;
                    startDriveButton.textContent = 'Start Drive';
                }
            }
        } catch (error) {
            console.error('Error starting drive:', error);
            alert('Error starting drive: ' + error.message);
            startDriveButton.disabled = false;
            startDriveButton.textContent = 'Start Drive';
        }
    }

    // Function to update frontend state variables based on API response
    function updateFrontendState(data) {
        if (data.current_product_details) {
            currentProductData = data.current_product_details;
            currentItemId = data.item_id || data.order_id; // order_id is the item_id from backend
            currentProductSlotInItem = data.product_slot_in_item;
            totalProductsInItem = data.total_products_in_item;
            isLastProductInCurrentItem = data.is_last_product_in_item;
        } else if (data.product_details) { // For getOrder response
            currentProductData = data.product_details;
            currentItemId = data.item_id || data.order_id;
            currentProductSlotInItem = data.product_slot_in_item;
            totalProductsInItem = data.total_products_in_item;
            isLastProductInCurrentItem = data.is_last_product_in_item;
        }
    }

    // Function to fetch and display the next order/product
    async function fetchNextOrder() {
        driveContentArea.innerHTML = '<p>Loading next product...</p>'; // Loading state
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/drive/getorder`, {
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            const data = await response.json();

            if (response.ok) {
                if (data.code === 0 && data.product_details) { // Success, product received
                    updateFrontendState(data);
                    updateWalletBalance(); 
                } else if (data.code === 2) { // Drive complete
                    displayDriveComplete(data.info || 'All tasks completed!');
                    updateWalletBalance(); 
                } else {
                     alert('Received unexpected data while fetching order.');
                     displayDriveError('Received unexpected data from server.');
                }
            } else {
                 alert('Failed to fetch order: ' + (data.info || data.message || 'Unknown error'));
                 displayDriveError(data.info || data.message || 'Failed to fetch next product.');
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            alert('Error fetching order: ' + error.message);
            displayDriveError('Error fetching next product: ' + error.message);
        }
    }

    // Function to render the product details in a card
    /*function renderProductCard(productDetails) {
        logDebug(`Rendering product card for: ${productDetails.product_name}`, 'info');
        if (!productDetails || productDetails.product_id === undefined) {
             logDebug("CRITICAL: product_id is missing in productDetails for renderProductCard!", 'error');
             console.error("CRITICAL: product_id is missing in productDetails for renderProductCard!", productDetails);
             displayDriveError("An internal error occurred (missing product ID). Please try starting a new drive.");
             return;
        }

        // Display combo progress if applicable
        let productNameDisplay = productDetails.product_name || productDetails.product_number;
        if (totalProductsInItem > 1) {
            productNameDisplay += ` (${currentProductSlotInItem}/${totalProductsInItem})`;
        }        driveContentArea.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h4>${productNameDisplay}</h4>
                    <img src="${productDetails.product_image}" alt="${productDetails.product_name}" style="max-width: 100px; margin: 10px 0;">
                    <p>Price: ${productDetails.product_price} USDT</p>
                    <p>Commission: <span class="text-success">+${productDetails.order_commission} USDT</span></p>
                    <div class="alert alert-info py-2 my-2">
                        <small><i class="fas fa-info-circle"></i> <strong>Refund Policy:</strong> Purchase amount will be refunded after completion!</small>
                    </div>
                    <button id="purchase-button" class="btn btn-primary">Purchase & Earn</button>
                </div>
            </div>
        `;
        document.getElementById('purchase-button').addEventListener('click', () => handlePurchase(productDetails));
    }*/

    // Function to handle the Purchase button click
    async function handlePurchase(productDataForPurchase) {
        const purchaseButton = document.getElementById('purchase-button');
        if (purchaseButton) {
            purchaseButton.disabled = true;
            purchaseButton.textContent = 'Processing...';
        }
        
        try {
            const payload = {
                order_id: currentItemId,
                product_id: productDataForPurchase.product_id,
                item_id: currentItemId,
                product_slot_to_complete: currentProductSlotInItem,
                order_amount: productDataForPurchase.product_price,
                earning_commission: productDataForPurchase.order_commission,
            };

            const response = await fetch(`${API_BASE_URL}/api/drive/saveorder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.code === 0) {
                // Process refund for the purchase amount
                try {
                    const refundResponse = await fetch(`${API_BASE_URL}/api/drive/refund`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            order_id: currentItemId,
                            product_id: productDataForPurchase.product_id,
                            refund_amount: productDataForPurchase.product_price,
                            reason: 'Post-purchase refund as per drive policy'
                        })
                    });

                    const refundData = await refundResponse.json();

                    // Show purchase success popup regardless of refund status
                    if (typeof showPurchaseSuccessPopup === 'function') {
                        showPurchaseSuccessPopup(productDataForPurchase.product_name, () => {
                            // Continue with the drive flow after user clicks "Continue Drive"
                            if (data.next_action === 'drive_complete') {
                                displayDriveComplete(data.message_to_user || 'Congratulations! Drive complete!');
                            } else {
                                fetchNextOrder();
                            }
                        });
                        return; // Exit early since popup will handle the continue flow
                    } else {
                        // Fallback to regular notification if popup function is not available
                        if (typeof showNotification === 'function') {
                            showNotification(`Purchase completed! $${productDataForPurchase.product_price} refunded + $${productDataForPurchase.order_commission} commission earned`, 'success');
                        }
                    }
                } catch (refundError) {
                    console.error('Error processing refund:', refundError);
                    // Continue with normal flow even if refund fails
                    
                    // Show success popup even if refund processing failed
                    if (typeof showPurchaseSuccessPopup === 'function') {
                        showPurchaseSuccessPopup(productDataForPurchase.product_name, () => {
                            // Continue with the drive flow
                            if (data.next_action === 'drive_complete') {
                                displayDriveComplete(data.message_to_user || 'Congratulations! Drive complete!');
                            } else {
                                fetchNextOrder();
                            }
                        });
                        return;
                    }
                }
                
                // Update balance after refund attempt
                updateWalletBalance();
                
                // Only execute default flow if popup wasn't shown
                if (typeof showPurchaseSuccessPopup !== 'function') {
                    if (data.next_action === 'drive_complete') {
                        displayDriveComplete(data.message_to_user || 'Congratulations! Drive complete!');
                    } else {
                        fetchNextOrder();
                    }
                }
            } else if (data.code === 3) { // Insufficient balance/Frozen
                 const tasksCompleted = data.tasks_completed && data.tasks_required ? 
                     `${data.tasks_completed} of ${data.tasks_required}` : '0 of 0';
                 const totalCommission = data.total_session_commission || '0.00';
                 displayFrozenState(data.info, data.frozen_amount_needed, tasksCompleted, totalCommission);
                 updateWalletBalance();
            } else {
                alert('Failed to save order: ' + (data.info || data.message || 'Unknown error'));
                 if (purchaseButton) {
                     purchaseButton.disabled = false;
                     purchaseButton.textContent = 'Purchase';
                 }
            }
        } catch (error) {
            console.error('Error saving order:', error);
            alert('Error saving order: ' + error.message);
            if (purchaseButton) {
                purchaseButton.disabled = false;
                purchaseButton.textContent = 'Purchase';
            }
        }
    }

    // Function to update the displayed wallet balance
    async function updateWalletBalance() {
        console.log('Updating wallet balance...');
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('No auth token found');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/api/user/balances`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.balances) {
                const mainBalance = parseFloat(data.balances.main_balance || 0);
                if (walletBalanceElement) {
                    walletBalanceElement.textContent = mainBalance.toFixed(2);
                }
            } else {
                console.error('Failed to fetch updated balance:', data.message);
                if (walletBalanceElement) {
                    walletBalanceElement.textContent = 'Error';
                }
            }
        } catch (error) {
            console.error('Error fetching updated balance:', error);
            if (walletBalanceElement) {
                walletBalanceElement.textContent = 'Error';
            }
        }
    }

    // Function to display drive complete message
    function displayDriveComplete(message) {
        driveContentArea.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h4>Drive Complete!</h4>
                    <p>${message}</p>
                    <button id="start-new-drive-button" class="btn btn-primary">Start New Drive</button>
                </div>
            </div>
        `;
         document.getElementById('start-new-drive-button').addEventListener('click', () => {
             // Reset UI and allow starting a new drive
             driveContentArea.innerHTML = ''; // Clear content area
             startDriveButton.style.display = 'block'; // Show start button
             startDriveButton.disabled = false;
             startDriveButton.textContent = 'Start Drive';
             updateWalletBalance(); // Final balance update
         });    
    }    // Function to display frozen state popup modal
    function displayFrozenState(message, amountNeeded, tasksCompleted = '0 of 0', totalCommission = '0.00') {
        console.log('displayFrozenState called with:', { message, amountNeeded, tasksCompleted, totalCommission });
        
        // Check if showFullModal function exists
        if (typeof showFullModal === 'function') {
            console.log('showFullModal function exists, calling it...');
            showFullModal(message, amountNeeded, tasksCompleted, totalCommission);
        } else {
            console.error('showFullModal function not found!');
            // Fallback to Bootstrap modal
            const frozenModalElement = document.getElementById('frozenAccountModal');
            if (frozenModalElement) {
                console.log('Using Bootstrap modal fallback');
                const modal = new bootstrap.Modal(frozenModalElement);
                
                // Update modal content
                const currentBalanceElement = document.getElementById('modal-current-balance');
                const amountNeededElement = document.getElementById('modal-amount-needed');
                
                if (currentBalanceElement) currentBalanceElement.textContent = '$0.00';
                if (amountNeededElement) amountNeededElement.textContent = '$' + amountNeeded;
                
                modal.show();
            } else {
                console.error('No modal found - neither custom nor Bootstrap!');
            }
        }
    }
    
    function showFullModal(message, amountNeeded, tasksCompleted = '0 of 0', totalCommission = '0.00') {
        // Remove existing modal if present
        const existingModal = document.getElementById('drive-frozen-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Calculate progress percentage
        let percentage = 0;
        if (tasksCompleted && tasksCompleted !== '0 of 0') {
            const match = tasksCompleted.match(/(\d+)\s*of\s*(\d+)/);
            if (match) {
                const completed = parseInt(match[1]);
                const total = parseInt(match[2]);
                if (!isNaN(completed) && !isNaN(total) && total > 0) {
                    percentage = Math.min((completed / total) * 100, 100);
                }
            }
        }

        // Create simplified modal
        const modalHTML = `
            <div id="drive-frozen-modal" class="drive-frozen-overlay">
                <div class="drive-frozen-content">
                    <button id="drive-frozen-close" class="drive-frozen-close">×</button>
                    
                    <div class="drive-frozen-image">
                        <img src="./assets/uploads/images/Drive/continue-drive.png" alt="Account Frozen" class="frozen-modal-image">
                    </div>
                    
                    <h2 class="drive-frozen-title">Get Back to PEA Drive</h2>
                    <p class="drive-frozen-message">${message}</p>
                    
                    ${amountNeeded ? `
                    <div class="drive-frozen-amount">
                        Amount needed: <span class="amount-value">$${amountNeeded} USD</span>
                    </div>
                    ` : ''}
                    
                    <div class="drive-frozen-stats">
                        <div class="progress-section">
                            <div class="progress-label">Drive Progress</div>
                            <div class="progress-text">${tasksCompleted} ${percentage > 0 ? `(${Math.round(percentage)}%)` : ''}</div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        
                        <div class="commission-section">
                            <div class="commission-value">$${totalCommission} USD</div>
                            <div class="commission-note">Your earned commission is safe and will be available when you resume</div>
                        </div>
                    </div>
                    
                    <div class="drive-frozen-buttons">
                        <button id="drive-deposit-funds-btn" class="btn-primary">
                            <i class="fas fa-plus-circle"></i> Deposit Funds
                        </button>
                        <button id="drive-view-orders-btn" class="btn-secondary">
                            <i class="fas fa-list"></i> View Orders
                        </button>
                        <button id="drive-contact-support-btn" class="btn-secondary">
                            <i class="fas fa-headset"></i> Contact Support
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS
        const style = document.createElement('style');
        style.id = 'drive-frozen-modal-styles';
        style.textContent = `
            .drive-frozen-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.75);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            }
            
            .drive-frozen-content {
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
                border: 1px solid #e9ecef;
                max-width: 450px;
                width: 100%;
                color: #2c3e50;
                padding: 40px 35px 35px;
                text-align: center;
                position: relative;
                animation: slideUp 0.4s ease;
            }
            
            .drive-frozen-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                color: #6c757d;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .drive-frozen-close:hover {
                background: #e9ecef;
                color: #495057;
                transform: scale(1.1);
            }
            
            .drive-frozen-image {
                margin-bottom: 20px;
                background: transparent;
            }
            
            .frozen-modal-image {
                max-width: 120px;
                max-height: 120px;
                width: auto;
                height: auto;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }
            
            .drive-frozen-title {
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 12px 0;
                color: #2c3e50;
            }
            
            .drive-frozen-message {
                font-size: 16px;
                margin: 0 0 20px 0;
                color: #6c757d;
                line-height: 1.5;
            }
            
            .drive-frozen-amount {
                font-size: 18px;
                margin-bottom: 25px;
                padding: 15px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 12px;
                color: #495057;
            }
            
            .amount-value {
                color: #dc3545;
                font-weight: 800;
                font-size: 22px;
            }
            
            .drive-frozen-stats {
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 12px;
            }
            
            .progress-section {
                margin-bottom: 20px;
            }
            
            .progress-label {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 8px;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            .progress-text {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 12px;
                color: #2c3e50;
            }
            
            .progress-bar-container {
                width: 100%;
                height: 10px;
                background: #e9ecef;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
                border-radius: 5px;
                transition: width 0.8s ease-out;
            }
            
            .commission-value {
                color: #28a745;
                font-size: 20px;
                font-weight: 700;
            }
            
            .commission-note {
                margin-top: 8px;
                color: #6c757d;
                font-size: 13px;
            }
            
            .drive-frozen-buttons {
                display: flex;
                gap: 15px;
                flex-direction: column;
            }
            
            .btn-primary, .btn-secondary {
                padding: 16px 24px;
                border-radius: 12px;
                border: none;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 50px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
            }
            
            .btn-primary:hover {
                transform: translateY(-3px);
                background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
                box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
            }
            
            .btn-secondary {
                background: #ffffff;
                color: #6c757d;
                border: 2px solid #dee2e6;
            }
            
            .btn-secondary:hover {
                background: #f8f9fa;
                color: #495057;
                border-color: #adb5bd;
                transform: translateY(-2px);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(-50px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;

        document.head.appendChild(style);
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Event listeners
        const modal = document.getElementById('drive-frozen-modal');
        const closeBtn = document.getElementById('drive-frozen-close');
        const depositBtn = document.getElementById('drive-deposit-funds-btn');
        const viewOrdersBtn = document.getElementById('drive-view-orders-btn');
        const supportBtn = document.getElementById('drive-contact-support-btn');

        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        depositBtn.addEventListener('click', () => {
            modal.remove();
            window.location.href = './account.html';
        });

        viewOrdersBtn.addEventListener('click', () => {
            modal.remove();
            window.location.href = './orders.html';
        });

        supportBtn.addEventListener('click', () => {
            modal.remove();
            window.location.href = './contact.html';
        });

        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    // Expose displayFrozenState to global scope for task.js to use
    window.displayFrozenState = displayFrozenState;

     // Function to display a generic drive error
     function displayDriveError(message) {
         driveContentArea.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h4>Error</h4>
                    <p>${message}</p>
                     <button id="start-new-drive-button" class="btn btn-primary">Try Starting New Drive</button>
                </div>
            </div>
        `;
         document.getElementById('start-new-drive-button').addEventListener('click', () => {
             // Reset UI and allow starting a new drive
             driveContentArea.innerHTML = ''; // Clear content area
             startDriveButton.style.display = 'block'; // Show start button
             startDriveButton.disabled = false;
             startDriveButton.textContent = 'Start Drive';
             updateWalletBalance(); // Final balance update
         });
     }

    // Initial balance load and drive status check
    updateWalletBalance();
    checkDriveStatus(); // Call the primary checkDriveStatus
});

// Function to check the current drive status and resume if necessary
async function checkDriveStatus() { // Removed token parameter, use global token
    const localToken = localStorage.getItem('auth_token'); // Use local token variable
    if (!localToken) {
        console.log('checkDriveStatus: No token found, returning.');
        return;
    }

    // Get references to key elements for showing/hiding
    const startDriveButton = document.getElementById('start-drive-button');
    const driveContentArea = document.getElementById('drive-content-area');
    const driveProgressSection = document.getElementById('progress-section'); // Fixed: Use correct ID from HTML
    const noDriveMessageSection = document.getElementById('no-drive-message-section'); // New section for the message and button

    try {
        const response = await fetch(`${API_BASE_URL}/api/drive/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localToken}`
            }
        });

        const data = await response.json();
        console.log('Drive status response:', data);

        if (response.ok && data.code === 0) {
            if (data.status === 'active' && data.current_product_details) {
                console.log('Active session with current product found. Resuming drive.');
                if(startDriveButton) startDriveButton.style.display = 'none';
                if(driveContentArea) driveContentArea.style.display = 'block';
                if(driveProgressSection) driveProgressSection.style.display = 'block';
                if(noDriveMessageSection) noDriveMessageSection.style.display = 'none';
                updateFrontendState(data);
                updateWalletBalance();
            } else if (data.status === 'frozen') {
                 console.log('Frozen session found. Displaying frozen state.');
                 if(startDriveButton) startDriveButton.style.display = 'none';
                 if(driveContentArea) driveContentArea.style.display = 'block';
                 if(driveProgressSection) driveProgressSection.style.display = 'block';
                 if(noDriveMessageSection) noDriveMessageSection.style.display = 'none';
                 const tasksCompleted = data.tasks_completed && data.tasks_required ? 
                     `${data.tasks_completed} of ${data.tasks_required}` : '0 of 0';
                 const totalCommission = data.total_commission || '0.00';
                 displayFrozenState(data.info || 'Your drive is frozen.', data.frozen_amount_needed, tasksCompleted, totalCommission);
                 updateWalletBalance();
            } else if (data.status === 'complete' || data.status === 'pending_reset') {
                 console.log('Drive complete or pending reset.');
                 if(driveProgressSection) driveProgressSection.style.display = 'block';
                 if(noDriveMessageSection) noDriveMessageSection.style.display = 'none';
                 displayDriveComplete(data.info || 'Your data drive is complete.');
                 updateWalletBalance();
            } else if (data.status === 'no_session') {
                 console.log('No active drive session found.');
                 if(startDriveButton) startDriveButton.style.display = 'block';
                 if(driveContentArea) driveContentArea.style.display = 'none';
                 if(driveProgressSection) driveProgressSection.style.display = 'none';
                 if(noDriveMessageSection) {
                    noDriveMessageSection.innerHTML = '<p>No active data drive. Please contact support if you believe this is an error.</p><button id="contact-support-no-drive-btn" class="btn btn-primary">Contact Support</button>';
                    noDriveMessageSection.style.display = 'block';
                    const contactBtn = document.getElementById('contact-support-no-drive-btn');
                    if(contactBtn) {
                        contactBtn.addEventListener('click', () => {
                            window.location.href = './support.html';
                        });
                    }
                 }
                 // Reset frontend state if no session
                 currentItemId = null;
                 currentProductSlotInItem = 0;
                 totalProductsInItem = 0;
                 isLastProductInCurrentItem = false;
                 currentProductData = null;
            } else {
                 console.log(`Received unexpected status: ${data.status}. Data:`, data);
                 if(startDriveButton) startDriveButton.style.display = 'block';
                 if(driveContentArea) driveContentArea.style.display = 'none';
                 if(driveProgressSection) driveProgressSection.style.display = 'none';
                 if(noDriveMessageSection) noDriveMessageSection.style.display = 'none';
            }
        } else {
            console.log(`Failed to check drive status: ${data.info || data.message || 'Unknown error'}`);
            if(startDriveButton) startDriveButton.style.display = 'block'; 
            if(driveContentArea) driveContentArea.style.display = 'none';
            if(driveProgressSection) driveProgressSection.style.display = 'none';
            if(noDriveMessageSection) noDriveMessageSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking drive status:', error);
        if(startDriveButton) startDriveButton.style.display = 'block'; 
        if(driveContentArea) driveContentArea.style.display = 'none';
        if(driveProgressSection) driveProgressSection.style.display = 'none'; // Hide progress
        if(noDriveMessageSection) noDriveMessageSection.style.display = 'none'; // Hide no-drive message
    }
}

// Constants and auth setup
const API_BASE_URL = ''; // Should be set to your API base URL e.g. http://localhost:3000
let token = localStorage.getItem('auth_token');

function requireAuth() {
    token = localStorage.getItem('auth_token');
    if (!token) {
        console.log('Auth token not found. Redirecting to login.');
        window.location.href = './login.html';
        return null;
    }
    return { token: token };
}

// Test function to manually trigger the frozen modal (for debugging)
window.testFrozenModal = function() {
    displayFrozenState(
        'Drive frozen. Please deposit funds and contact admin.',
        '100.00',
        '3 of 5',
        '25.50'
    );
};

// Initialize page and check drive status
console.log('Drive.js initializing...');