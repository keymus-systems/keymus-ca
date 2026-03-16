/**
 * Luxury Drive Enhancement
 * Integrates luxury features with existing drive.js system
 * Modifies purchase flow to include rating modal without breaking existing functionality
 */

class LuxuryDriveEnhancement {
    constructor() {
        this.isInitialized = false;
        this.originalHandlePurchase = null;
        this.luxuryFeatures = {
            productRating: true,
            loadingAnimation: true,
            enhancedUI: true
        };
    }
    
    /**
     * Initialize luxury enhancements
     */
    init() {
        if (this.isInitialized) {
            console.warn('LuxuryDriveEnhancement: Already initialized');
            return;
        }
        
        // Wait for existing drive.js to load
        this.waitForDriveSystem().then(() => {
            this.enhancePurchaseFlow();
            this.enhanceProductModal();
            this.setupLoadingAnimations();
            this.isInitialized = true;
            console.log('LuxuryDriveEnhancement: Initialized successfully');
        }).catch(error => {
            console.error('LuxuryDriveEnhancement: Failed to initialize', error);
        });
    }
    
    /**
     * Wait for existing drive system to be available
     */
    waitForDriveSystem() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                attempts++;
                
                // Check if drive.js has loaded by looking for key functions/elements
                const driveLoaded = document.getElementById('show-product-modal-btn') || 
                                 document.getElementById('drive-content-area') ||
                                 typeof window.handlePurchase === 'function';
                
                if (driveLoaded) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Drive system not found after maximum attempts'));
                } else {
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }
    
    /**
     * Enhance the purchase flow to include rating modal
     */
    enhancePurchaseFlow() {
        // Store original handlePurchase if it exists
        if (typeof window.handlePurchase === 'function') {
            this.originalHandlePurchase = window.handlePurchase;
        }
        
        // Override the purchase success flow
        this.interceptPurchaseSuccess();
        
        // Enhance the existing drive.js purchase flow
        this.enhanceExistingDriveFlow();
    }
    
    /**
     * Intercept purchase success to show rating modal
     */
    interceptPurchaseSuccess() {
        // Look for the existing purchase success popup function
        const originalShowPurchaseSuccessPopup = window.showPurchaseSuccessPopup;
        
        if (typeof originalShowPurchaseSuccessPopup === 'function') {
            window.showPurchaseSuccessPopup = (productName, onContinue) => {
                // Show loading animation first
                if (this.luxuryFeatures.loadingAnimation) {
                    this.showLuxuryLoadingAnimation();
                }
                
                // Delay to show loading, then show rating modal
                setTimeout(() => {
                    this.hideLuxuryLoadingAnimation();
                    
                    if (this.luxuryFeatures.productRating && window.luxuryRatingModal) {
                        // Get current product data from global scope
                        const productData = this.getCurrentProductData();
                        window.luxuryRatingModal.show(productData, onContinue);
                    } else {
                        // Fallback to original popup
                        originalShowPurchaseSuccessPopup(productName, onContinue);
                    }
                }, 2000);
            };
        }
    }
    
    /**
     * Enhance existing drive flow from drive.js
     */
    enhanceExistingDriveFlow() {
        // Monitor for successful purchase completion in drive.js
        this.monitorDriveAPI();
    }
    
    /**
     * Monitor drive API calls to inject our enhancements
     */
    monitorDriveAPI() {
        // Override fetch to monitor drive API calls
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const [url, options] = args;
            
            // Check if this is a drive API call
            if (typeof url === 'string' && url.includes('/api/drive/')) {
                return this.handleDriveAPICall(originalFetch, url, options);
            }
            
            return originalFetch(...args);
        };
    }
    
    /**
     * Handle drive API calls with enhancements
     */
    async handleDriveAPICall(originalFetch, url, options) {
        try {
            // Show loading animation for certain API calls
            if (url.includes('/saveorder') && this.luxuryFeatures.loadingAnimation) {
                this.showLuxuryLoadingAnimation();
            }
            
            const response = await originalFetch(url, options);
            
            // Hide loading animation
            this.hideLuxuryLoadingAnimation();
            
            // If this is a successful purchase, potentially show rating modal
            if (url.includes('/saveorder') && response.ok) {
                this.handleSuccessfulPurchase(response.clone());
            }
            
            return response;
        } catch (error) {
            this.hideLuxuryLoadingAnimation();
            throw error;
        }
    }
    
    /**
     * Handle successful purchase response
     */
    async handleSuccessfulPurchase(response) {
        try {
            const data = await response.json();
            
            if (data.code === 0 && this.luxuryFeatures.productRating) {
                // Get current product data
                const productData = this.getCurrentProductData();
                
                if (productData && window.showLuxuryProductRatingModal) {
                    // Delay slightly to let the original flow process
                    setTimeout(() => {
                        // Check if original success popup is being shown
                        const existingPopup = document.getElementById('purchase-success-popup');
                        if (existingPopup) {
                            // Hide original popup and show our rating modal instead
                            existingPopup.style.display = 'none';
                            window.showLuxuryProductRatingModal(productData, () => {
                                // Continue with original flow
                                existingPopup.style.display = 'block';
                            });
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error handling successful purchase:', error);
        }
    }
    
    /**
     * Get current product data from the global drive state
     */
    getCurrentProductData() {
        // Try to get from global variables set by drive.js
        if (window.currentProductData) {
            return window.currentProductData;
        }
        
        // Try to extract from DOM
        const productTitle = document.querySelector('#driveProductTitle');
        const productPrice = document.querySelector('#drivePurchasePrice');
        const productImage = document.querySelector('#driveProductMainImage');
        
        if (productTitle) {
            return {
                product_name: productTitle.textContent || 'Product',
                product_price: productPrice ? productPrice.textContent : '0.00',
                product_image: productImage ? productImage.src : '',
                product_id: Date.now() // Fallback ID
            };
        }
        
        // Ultimate fallback
        return {
            product_name: 'Recent Purchase',
            product_price: '0.00',
            product_image: '',
            product_id: Date.now()
        };
    }
    
    /**
     * Enhance the existing product modal
     */
    enhanceProductModal() {
        // Add luxury styling to existing modal
        const modal = document.getElementById('driveProductModal');
        if (modal) {
            modal.classList.add('lux-enhanced');
        }
        
        // Enhance modal triggers
        this.enhanceModalTriggers();
    }
    
    /**
     * Enhance modal triggers - work WITH existing handlers instead of blocking them
     */
    enhanceModalTriggers() {
        const searchButton = document.getElementById('show-product-modal-btn');
        if (searchButton) {
            // Instead of blocking, let's enhance the existing openProductModal function
            this.enhanceExistingOpenModal();
            
            console.log('LuxuryDriveEnhancement: Enhanced existing modal functionality');
        }
    }
    
    /**
     * Enhance the existing openProductModal function instead of blocking it
     */
    enhanceExistingOpenModal() {
        // Wait a bit to ensure other scripts have loaded
        setTimeout(() => {
            // Store the original openProductModal function if it exists
            if (typeof window.openProductModal === 'function') {
                const originalOpenProductModal = window.openProductModal;
                
                // Replace it with our enhanced version
                window.openProductModal = () => {
                    console.log('Enhanced openProductModal called');
                    
                    try {
                        // Show luxury loading animation first
                        if (this.luxuryFeatures.loadingAnimation) {
                            this.showLuxuryLoadingAnimation(800);
                        }
                        
                        // Then call the original function after animation
                        setTimeout(() => {
                            originalOpenProductModal();
                            
                            // Add luxury styling to the opened modal
                            setTimeout(() => {
                                this.applyLuxuryModalStyling();
                            }, 100);
                        }, 800);
                    } catch (error) {
                        console.warn('Luxury enhancement failed, falling back to original:', error);
                        // Fallback to original function if enhancement fails
                        originalOpenProductModal();
                    }
                };
                
                console.log('LuxuryDriveEnhancement: Enhanced existing openProductModal function');
            } else {
                console.warn('LuxuryDriveEnhancement: openProductModal function not found, will retry...');
                
                // If function not found, try again later
                setTimeout(() => {
                    this.enhanceExistingOpenModal();
                }, 1000);
            }
        }, 500);
    }
    
    /**
     * Apply luxury styling to any modal that opens
     */
    applyLuxuryModalStyling() {
        // Try to find any open modal and enhance it
        const modals = [
            document.getElementById('driveProductModal'),
            document.getElementById('product-modal'),
            document.querySelector('.modal.show'),
            document.querySelector('.drive-modal-overlay.show')
        ];
        
        modals.forEach(modal => {
            if (modal && modal.style.display !== 'none') {
                modal.classList.add('lux-enhanced');
                console.log('Applied luxury styling to modal:', modal.id || modal.className);
            }
        });
    }
    
    /**
     * Setup loading animations
     */
    setupLoadingAnimations() {
        // Create loading animation template
        this.createLoadingTemplate();
    }
    
    /**
     * Create loading animation template
     */
    createLoadingTemplate() {
        if (document.getElementById('lux-loading-template')) return;
        
        const template = document.createElement('template');
        template.id = 'lux-loading-template';
        template.innerHTML = `
            <div class="lux-loading-overlay" id="lux-loading-overlay">
                <div class="lux-loading-content">
                    <div class="lux-loading-spinner">
                        <div class="lux-spinner-ring"></div>
                        <div class="lux-spinner-ring"></div>
                        <div class="lux-spinner-ring"></div>
                    </div>
                    <h3 id="lux-loading-title">Processing</h3>
                    <p id="lux-loading-message">Please wait...</p>
                </div>
            </div>
        `;
        
        document.head.appendChild(template);
        
        // Add loading spinner styles
        this.addLoadingStyles();
    }
    
    /**
     * Add loading animation styles
     */
    addLoadingStyles() {
        if (document.getElementById('lux-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'lux-loading-styles';
        style.textContent = `
            .lux-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99997;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .lux-loading-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .lux-loading-content {
                background: var(--lux-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
                border-radius: 20px;
                padding: 3rem 2rem;
                text-align: center;
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
                max-width: 400px;
                width: 90%;
            }
            
            .lux-loading-spinner {
                position: relative;
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
            }
            
            .lux-spinner-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 4px solid transparent;
                border-top: 4px solid #ffd700;
                border-radius: 50%;
                animation: luxSpin 1.2s linear infinite;
            }
            
            .lux-spinner-ring:nth-child(2) {
                width: 60px;
                height: 60px;
                top: 10px;
                left: 10px;
                animation-duration: 1s;
                animation-direction: reverse;
            }
            
            .lux-spinner-ring:nth-child(3) {
                width: 40px;
                height: 40px;
                top: 20px;
                left: 20px;
                animation-duration: 0.8s;
            }
            
            @keyframes luxSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Show luxury loading animation
     */
    showLuxuryLoadingAnimation(duration = null, title = 'Processing', message = 'Please wait...') {
        const template = document.getElementById('lux-loading-template');
        if (!template) {
            this.createLoadingTemplate();
            return this.showLuxuryLoadingAnimation(duration, title, message);
        }
        
        // Remove existing loading overlay
        this.hideLuxuryLoadingAnimation();
        
        // Clone template content
        const clone = template.content.cloneNode(true);
        
        // Update content
        const titleEl = clone.getElementById('lux-loading-title');
        const messageEl = clone.getElementById('lux-loading-message');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        // Add to document
        document.body.appendChild(clone);
        
        // Show with animation
        requestAnimationFrame(() => {
            const overlay = document.getElementById('lux-loading-overlay');
            if (overlay) {
                overlay.classList.add('show');
            }
        });
        
        // Auto-hide after duration
        if (duration) {
            setTimeout(() => this.hideLuxuryLoadingAnimation(), duration);
        }
    }
    
    /**
     * Hide luxury loading animation
     */
    hideLuxuryLoadingAnimation() {
        const overlay = document.getElementById('lux-loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    
    /**
     * Toggle luxury features
     */
    toggleFeature(feature, enabled) {
        if (this.luxuryFeatures.hasOwnProperty(feature)) {
            this.luxuryFeatures[feature] = enabled;
            console.log(`LuxuryDriveEnhancement: ${feature} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * Get feature status
     */
    getFeatureStatus() {
        return { ...this.luxuryFeatures };
    }
    
    /**
     * Destroy enhancements and restore original functionality
     */
    destroy() {
        // Restore original functions
        if (this.originalHandlePurchase) {
            window.handlePurchase = this.originalHandlePurchase;
        }
        
        // Remove loading styles
        const loadingStyles = document.getElementById('lux-loading-styles');
        if (loadingStyles) loadingStyles.remove();
        
        const loadingTemplate = document.getElementById('lux-loading-template');
        if (loadingTemplate) loadingTemplate.remove();
        
        // Hide any active loading overlays
        this.hideLuxuryLoadingAnimation();
        
        this.isInitialized = false;
        console.log('LuxuryDriveEnhancement: Destroyed');
    }
}

/**
 * Initialize luxury drive enhancements
 */
function initLuxuryDriveEnhancement() {
    // Check if we're on the task page
    if (!document.querySelector('.keymus-app-container')) {
        return;
    }
    
    window.luxuryDriveEnhancement = new LuxuryDriveEnhancement();
    window.luxuryDriveEnhancement.init();
}

/**
 * Cleanup function
 */
function cleanupLuxuryDriveEnhancement() {
    if (window.luxuryDriveEnhancement) {
        window.luxuryDriveEnhancement.destroy();
        delete window.luxuryDriveEnhancement;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLuxuryDriveEnhancement);
} else {
    // Small delay to ensure other scripts load first
    setTimeout(initLuxuryDriveEnhancement, 100);
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupLuxuryDriveEnhancement);

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LuxuryDriveEnhancement, initLuxuryDriveEnhancement };
}
