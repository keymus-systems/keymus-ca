/**
 * Unified Drive Product Renderer
 * This module consolidates all drive product display functionality
 * to eliminate conflicts between task.js and drive.js implementations
 */

// Global configuration for drive product rendering
const DRIVE_CONFIG = {
    FADE_DURATION: 300,
    SCALE_DURATION: 300,
    IMAGE_FALLBACK: './assets/uploads/images/ph.png',
    PURCHASE_PROCESSING_TEXT: 'Processing...',
    PURCHASE_DEFAULT_TEXT: 'Purchase & Earn'
};

/**
 * Unified Product Card Renderer
 * Replaces both task.js and drive.js renderProductCard functions
 */
function renderDriveProductCard(productData, container, options = {}) {
    console.log('Rendering unified drive product card:', productData);
    
    if (!container) {
        console.error('Drive product container not found');
        return false;
    }

    if (!productData || !productData.product_id) {
        console.error('Invalid product data for drive rendering:', productData);
        return false;
    }

    // Apply fade-out effect
    container.style.transition = `opacity ${DRIVE_CONFIG.FADE_DURATION}ms ease, transform ${DRIVE_CONFIG.SCALE_DURATION}ms ease`;
    container.style.opacity = '0.3';
    container.style.transform = 'scale(0.98)';

    setTimeout(() => {
        // Generate product card HTML
        const cardHTML = generateDriveProductHTML(productData, options);
        
        // Update container
        container.innerHTML = cardHTML;
        container.className = 'drive-product-container drive-fade-in';
        
        // Apply fade-in effect
        container.style.opacity = '1';
        container.style.transform = 'scale(1)';
        
        // Attach event listeners
        attachDriveProductListeners(container, productData);
        
        console.log('Drive product card rendered successfully');
    }, DRIVE_CONFIG.FADE_DURATION);

    return true;
}

/**
 * Generate HTML for drive product card
 */
function generateDriveProductHTML(productData, options = {}) {
    console.log('Drive Product Renderer - Product Data:', productData);
    console.log('Drive Product Renderer - Description Field:', productData.product_description);
    console.log('Drive Product Renderer - Alternative Description:', productData.description);
    
    const {
        showComboInfo = true,
        showProgressInfo = true,
        showRefundPolicy = true,
        showStats = true
    } = options;

    // Product basic info
    const productName = productData.product_name || productData.product_number || 'Product';
    const productImage = productData.product_image || DRIVE_CONFIG.IMAGE_FALLBACK;
    const productPrice = parseFloat(productData.product_price || 0);
    const productCommission = parseFloat(productData.order_commission || 0);

    // Combo information
    let comboSection = '';
    if (showComboInfo && productData.is_combo) {
        comboSection = generateComboSection(productData);
    }

    // Progress information
    let progressSection = '';
    if (showProgressInfo && (window.totalTasksRequired > 0 || productData.combo_progress)) {
        progressSection = generateProgressSection(productData);
    }

    // Statistics section
    let statsSection = '';
    if (showStats && window.totalDriveCommission !== undefined) {
        statsSection = generateStatsSection();
    }

    // Refund policy
    let refundSection = '';
    if (showRefundPolicy) {
        refundSection = `
            <div class="drive-refund-info">
                <i class="fas fa-info-circle"></i>
                <strong>Refund Policy:</strong> Purchase amount will be refunded after completion!
            </div>
        `;
    }    return `
        <div class="drive-product-card">
            <div class="drive-product-header">
                <h4 class="drive-product-title">
                    ${productName}
                    ${comboSection}
                </h4>
            </div>
            
            <div class="drive-product-body">
                <div class="drive-product-image-container">
                    <img src="${productImage}" 
                         alt="${productName}" 
                         class="drive-product-image"
                         onerror="this.src='${DRIVE_CONFIG.IMAGE_FALLBACK}'">
                </div>                <!-- Product Description Section -->
                <div class="drive-product-description">
                    <h5 class="drive-product-description-title">Product Description</h5>
                    <p class="drive-product-description-text">
                        ${getProductDescription(productData)}
                    </p>
                </div>
                
                <!-- Price and Commission Button-like Display -->
                <div class="drive-product-pricing">
                    <div class="drive-pricing-row">
                        <div class="drive-price-tag">
                            <div class="drive-price-label">Purchase Price</div>
                            <div class="drive-price-value">$${productPrice.toFixed(2)} <span class="drive-price-currency">USDT</span></div>
                        </div>
                        <div class="drive-commission-tag">
                            <div class="drive-commission-label">Your Commission</div>
                            <div class="drive-commission-value">+$${productCommission.toFixed(2)} <span class="drive-commission-currency">USDT</span></div>
                        </div>
                    </div>
                    <div class="drive-net-result">
                        <div class="drive-net-label">Net Result</div>
                        <div class="drive-net-value">+$${productCommission.toFixed(2)} USDT <span class="drive-net-note">(Price refunded + Commission earned)</span></div>
                    </div>
                </div>

                ${refundSection}
                ${progressSection}
                ${statsSection}

                <div class="drive-product-actions">
                    <button id="drive-purchase-button" 
                            class="drive-purchase-btn"
                            data-product-id="${productData.product_id}"
                            data-product-name="${productName}"
                            data-product-price="${productPrice}"
                            data-commission="${productCommission}">
                        <i class="fas fa-shopping-cart me-2"></i>
                        ${DRIVE_CONFIG.PURCHASE_DEFAULT_TEXT}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate combo information section
 */
function generateComboSection(productData) {
    let comboHTML = '<span class="drive-combo-badge">Combo Item</span>';
    
    if (productData.combo_progress) {
        comboHTML += `<div class="drive-combo-progress">Progress: ${productData.combo_progress}</div>`;
    }
    
    if (productData.product_slot !== undefined && productData.total_products_in_item) {
        comboHTML += `<div class="drive-combo-progress">Product ${productData.product_slot + 1} of ${productData.total_products_in_item}</div>`;
    }
    
    return comboHTML;
}

/**
 * Generate progress information section
 */
function generateProgressSection(productData) {
    let progressHTML = '<div class="drive-progress-container">';
    
    // Drive progress (if available)
    if (window.totalTasksRequired > 0 && window.tasksCompleted !== undefined) {
        const progressPercent = (window.tasksCompleted / window.totalTasksRequired) * 100;
        progressHTML += `
            <div class="drive-progress-header">
                <span class="drive-progress-title">Drive Progress</span>
                <span class="drive-progress-count">${window.tasksCompleted}/${window.totalTasksRequired} completed</span>
            </div>
            <div class="drive-progress-bar">
                <div class="drive-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        `;
    }
    
    // Combo progress within item (if applicable)
    if (productData.currentProductSlotInItem && productData.totalProductsInItem) {
        const itemProgressPercent = (productData.currentProductSlotInItem / productData.totalProductsInItem) * 100;
        progressHTML += `
            <div class="drive-progress-header">
                <span class="drive-progress-title">Item Progress</span>
                <span class="drive-progress-count">${productData.currentProductSlotInItem}/${productData.totalProductsInItem}</span>
            </div>
            <div class="drive-progress-bar">
                <div class="drive-progress-fill" style="width: ${itemProgressPercent}%"></div>
            </div>
        `;
    }
    
    progressHTML += '</div>';
    return progressHTML;
}

/**
 * Generate statistics section
 */
function generateStatsSection() {
    return `
        <div class="drive-stats-grid">
            <div class="drive-stat-card">
                <div class="drive-stat-value">$${(window.totalDriveCommission || 0).toFixed(2)}</div>
                <div class="drive-stat-label">Total Earned</div>
            </div>
            <div class="drive-stat-card">
                <div class="drive-stat-value">${window.tasksCompleted || 0}</div>
                <div class="drive-stat-label">Tasks Done</div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to drive product elements
 */
function attachDriveProductListeners(container, productData) {
    const purchaseButton = container.querySelector('#drive-purchase-button');
    
    if (purchaseButton) {
        purchaseButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleDrivePurchase(productData, purchaseButton);
        });
    }
}

/**
 * Unified purchase handler for drive products
 */
async function handleDrivePurchase(productData, button) {
    console.log('Drive purchase initiated:', productData);
    
    if (!button) {
        console.error('Purchase button not found');
        return;
    }

    // Disable button and show processing state
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${DRIVE_CONFIG.PURCHASE_PROCESSING_TEXT}`;    try {
        // Ensure productData has the required properties for task.js handlePurchase
        const enhancedProductData = {
            ...productData,
            // Add missing properties that task.js expects
            product_slot: productData.product_slot || productData.currentProductSlotInItem || 0,
            is_combo_product: productData.is_combo || false,
            combo_product_index: productData.combo_product_index || productData.product_slot || 0        };        // Get authentication token - check multiple sources
        let token = localStorage.getItem('auth_token') || 
                   localStorage.getItem('token') || 
                   sessionStorage.getItem('auth_token') || 
                   sessionStorage.getItem('token');
        
        // Also check globalAuthData if available (from task.js context)
        if (!token && typeof window.globalAuthData !== 'undefined' && window.globalAuthData?.token) {
            token = window.globalAuthData.token;
        }
        
        // Also check if globalAuthData is available in current scope
        if (!token && typeof globalAuthData !== 'undefined' && globalAuthData?.token) {
            token = globalAuthData.token;
        }
        
        // Debug logging for token detection
        console.log('Drive purchase token check:', {
            localStorage_auth_token: !!localStorage.getItem('auth_token'),
            localStorage_token: !!localStorage.getItem('token'),
            sessionStorage_auth_token: !!sessionStorage.getItem('auth_token'),
            sessionStorage_token: !!sessionStorage.getItem('token'),
            window_globalAuthData: !!(typeof window.globalAuthData !== 'undefined' && window.globalAuthData?.token),
            scope_globalAuthData: !!(typeof globalAuthData !== 'undefined' && globalAuthData?.token),
            final_token_found: !!token
        });
        
        if (!token) {
            throw new Error('Authentication required - please log in');
        }
        
        // Determine which purchase handler to use based on context
        if (typeof handlePurchase === 'function') {
            // Use task.js purchase handler (most common case) - requires token as first parameter
            await handlePurchase(token, enhancedProductData);
        } else if (typeof window.handleTaskPurchase === 'function') {
            // Use alternative task purchase handler if available
            await window.handleTaskPurchase(token, enhancedProductData);
        } else {
            // Generic purchase handler
            await genericDrivePurchase(enhancedProductData);
        }
    } catch (error) {
        console.error('Drive purchase error:', error);
        
        // Show error state
        button.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Error - Try Again`;
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            resetPurchaseButton(button);
        }, 3000);
    }
}

/**
 * Generic purchase handler when specific handlers aren't available
 */
async function genericDrivePurchase(productData) {
    console.log('Using generic drive purchase handler');
      // Get authentication token - check multiple sources
    let token = localStorage.getItem('auth_token') || 
               localStorage.getItem('token') || 
               sessionStorage.getItem('auth_token') || 
               sessionStorage.getItem('token');
    
    // Also check globalAuthData if available (from task.js context)
    if (!token && typeof window.globalAuthData !== 'undefined' && window.globalAuthData?.token) {
        token = window.globalAuthData.token;
    }
    
    // Also check if globalAuthData is available in current scope
    if (!token && typeof globalAuthData !== 'undefined' && globalAuthData?.token) {
        token = globalAuthData.token;
    }
    
    if (!token) {
        throw new Error('Authentication required - please log in');
    }

    const response = await fetch(`${window.API_BASE_URL || 'http://localhost:3000'}/api/drive/purchase`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            product_id: productData.product_id,
            product_price: productData.product_price,
            commission: productData.order_commission
        })
    });

    if (!response.ok) {
        throw new Error(`Purchase failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || 'Purchase failed');
    }

    return result;
}

/**
 * Reset purchase button to default state
 */
function resetPurchaseButton(button) {
    button.disabled = false;
    button.innerHTML = `<i class="fas fa-shopping-cart me-2"></i>${DRIVE_CONFIG.PURCHASE_DEFAULT_TEXT}`;
    button.style.background = '';
}

/**
 * Update drive product display with new data
 */
function updateDriveProduct(productData, container, options = {}) {
    const { animate = true } = options;
    
    if (animate) {
        return renderDriveProductCard(productData, container, options);
    } else {
        container.innerHTML = generateDriveProductHTML(productData, options);
        attachDriveProductListeners(container, productData);
        return true;
    }
}

/**
 * Initialize drive product rendering system
 */
function initializeDriveProductRenderer() {
    console.log('Initializing unified drive product renderer');
    
    // Override existing renderProductCard functions to prevent conflicts
    if (typeof window.renderProductCard === 'function') {
        window.renderProductCard_original = window.renderProductCard;
    }
    
    // Set unified renderer as global
    window.renderProductCard = function(productData, container) {
        const targetContainer = container || 
                              document.getElementById('product-card-container') || 
                              document.getElementById('drive-content-area') ||
                              document.querySelector('.drive-product-container');
        
        return renderDriveProductCard(productData, targetContainer);
    };
    
    window.renderDriveProductCard = renderDriveProductCard;
    window.updateDriveProduct = updateDriveProduct;
    
    console.log('Drive product renderer initialized successfully');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDriveProductRenderer);
} else {
    initializeDriveProductRenderer();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderDriveProductCard,
        updateDriveProduct,
        initializeDriveProductRenderer
    };
}

/**
 * Extract product description from various possible fields
 */
function getProductDescription(productData) {
    console.log('Getting product description from:', productData);
    
    // Check multiple possible field names and data structures
    let description = null;
    
    if (productData.product_description && productData.product_description.trim() !== '') {
        description = productData.product_description.trim();
        console.log('Found description in product_description field:', description.substring(0, 100) + '...');
    } else if (productData.description && productData.description.trim() !== '') {
        description = productData.description.trim();
        console.log('Found description in description field:', description.substring(0, 100) + '...');
    } else if (productData.data && productData.data.description && productData.data.description.trim() !== '') {
        description = productData.data.description.trim();
        console.log('Found description in data.description field:', description.substring(0, 100) + '...');
    } else {
        description = 'High-quality product available for purchase in your data drive. Complete this purchase to earn commission and advance your drive progress.';
        console.log('Using fallback description');
    }
    
    return description;
}
