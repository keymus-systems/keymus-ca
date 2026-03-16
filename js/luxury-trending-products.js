/**
 * Luxury Trending Products Service
 * Manages dynamic product carousel using existing product images
 * Uses unique class names to avoid conflicts with existing carousel implementations
 */

class LuxuryTrendingProductsService {
    constructor(config = {}) {
        this.imageBasePath = './assets/uploads/images/';
        this.config = {
            maxImageNumber: 1489, // Based on existing images (1.jpg to 1489.jpg)
            productCount: 6,
            updateInterval: 45000, // 45 seconds
            animationDuration: 500,
            ...config
        };
        
        this.availableImages = this.generateImageList();
        this.currentProducts = [];
        this.updateInterval = null;
        this.carouselContainer = null;
        
        this.productNames = {
            adjectives: ['Premium', 'Luxury', 'Elite', 'Professional', 'Advanced', 'Smart', 'Ultra', 'Pro', 'Deluxe', 'Supreme'],
            categories: ['Electronics', 'Gadget', 'Device', 'Tool', 'Accessory', 'Product', 'System', 'Kit', 'Set', 'Collection'],
            types: ['Wireless', 'Digital', 'Portable', 'Compact', 'Multi-Function', 'High-Tech', 'Premium', 'Executive']
        };
    }
    
    /**
     * Initialize the trending products service
     */
    init() {
        this.findCarouselContainer();
        if (!this.carouselContainer) {
            console.log('LuxuryTrendingProductsService: Carousel container not found');
            return false;
        }
        
        this.enhanceExistingCarousel();
        this.loadInitialProducts();
        this.startAutoUpdate();
        
        console.log('LuxuryTrendingProductsService: Initialized successfully');
        return true;
    }
    
    /**
     * Find the existing carousel container
     */
    findCarouselContainer() {
        // Look for existing trending products carousel
        this.carouselContainer = document.querySelector('.gdot-products-carousel');
        
        if (!this.carouselContainer) {
            // Fallback: look for any carousel container
            this.carouselContainer = document.querySelector('.gdot-carousel-inner .gdot-products-carousel');
        }
    }
    
    /**
     * Enhance existing carousel with luxury styling
     */
    enhanceExistingCarousel() {
        if (!this.carouselContainer) return;
        
        // Add luxury enhancement class
        this.carouselContainer.classList.add('lux-enhanced');
        
        // Enhance parent containers as well
        const carouselSection = document.querySelector('.gdot-trending-section');
        if (carouselSection) {
            carouselSection.classList.add('lux-enhanced');
        }
    }
    
    /**
     * Generate list of available product images
     */
    generateImageList() {
        const images = [];
        for (let i = 1; i <= this.config.maxImageNumber; i++) {
            // Skip some numbers that might not exist (based on the file listing)
            if (this.isValidImageNumber(i)) {
                images.push(`${i}.jpg`);
            }
        }
        return images;
    }
    
    /**
     * Check if image number is valid (exists in the file system)
     */
    isValidImageNumber(num) {
        // Based on the file listing, most numbers from 1-1489 exist
        // You can add specific exclusions here if needed
        return num >= 1 && num <= this.config.maxImageNumber;
    }
    
    /**
     * Load initial products into carousel
     */
    loadInitialProducts() {
        this.currentProducts = this.getRandomProducts(this.config.productCount);
        this.updateCarouselDisplay();
    }
    
    /**
     * Get random products with generated names
     */
    getRandomProducts(count = 6) {
        const shuffled = [...this.availableImages].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map((img, index) => ({
            id: `lux-product-${Date.now()}-${index}`,
            image: this.imageBasePath + img,
            name: this.generateProductName(),
            badge: Math.random() > 0.7 ? `#${Math.floor(Math.random() * 99) + 1}` : null,
            isNew: Math.random() > 0.8
        }));
    }
    
    /**
     * Generate realistic product names
     */
    generateProductName() {
        const { adjectives, categories, types } = this.productNames;
        
        const structure = Math.random();
        
        if (structure < 0.4) {
            // "Premium Electronics"
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const cat = categories[Math.floor(Math.random() * categories.length)];
            return `${adj} ${cat}`;
        } else if (structure < 0.7) {
            // "Smart Wireless Device"
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const cat = categories[Math.floor(Math.random() * categories.length)];
            return `${adj} ${type} ${cat}`;
        } else {
            // "Pro Digital Kit"
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            return `${adj} ${type}`;
        }
    }
    
    /**
     * Update carousel display with new products
     */
    updateCarouselDisplay() {
        if (!this.carouselContainer) return;
        
        // Clear existing products
        this.carouselContainer.innerHTML = '';
        
        // Add new products
        this.currentProducts.forEach((product, index) => {
            const productElement = this.createProductElement(product, index);
            this.carouselContainer.appendChild(productElement);
        });
        
        // Duplicate for seamless scrolling (if original carousel had this feature)
        this.currentProducts.forEach((product, index) => {
            const duplicateElement = this.createProductElement(product, index, true);
            this.carouselContainer.appendChild(duplicateElement);
        });
        
        // Trigger entrance animation
        this.animateProductsIn();
    }
    
    /**
     * Create individual product element
     */
    createProductElement(product, index, isDuplicate = false) {
        const element = document.createElement('div');
        element.className = 'gdot-product-icon';
        element.dataset.name = product.name;
        element.dataset.productId = product.id;
        
        if (isDuplicate) {
            element.classList.add('lux-duplicate');
        }
        
        element.innerHTML = `
            <img src="${product.image}" 
                 alt="${product.name}" 
                 loading="lazy"
                 onerror="this.style.display='none'">
            ${product.badge ? `<span class="gdot-product-badge">${product.badge}</span>` : ''}
            ${product.isNew ? '<span class="lux-new-badge">NEW</span>' : ''}
        `;
        
        // Add hover effects
        element.addEventListener('mouseenter', () => this.onProductHover(element, product));
        element.addEventListener('mouseleave', () => this.onProductLeave(element, product));
        
        return element;
    }
    
    /**
     * Handle product hover
     */
    onProductHover(element, product) {
        // Show product name in a tooltip or update UI
        this.showProductInfo(product);
    }
    
    /**
     * Handle product leave
     */
    onProductLeave(element, product) {
        this.hideProductInfo();
    }
    
    /**
     * Show product information
     */
    showProductInfo(product) {
        // You can implement a tooltip or status display here
        // For now, just log to console
        console.log(`Viewing: ${product.name}`);
    }
    
    /**
     * Hide product information
     */
    hideProductInfo() {
        // Clear any tooltips or status displays
    }
    
    /**
     * Animate products entrance
     */
    animateProductsIn() {
        const products = this.carouselContainer.querySelectorAll('.gdot-product-icon:not(.lux-duplicate)');
        
        products.forEach((product, index) => {
            product.style.opacity = '0';
            product.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                product.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                product.style.opacity = '1';
                product.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    /**
     * Start automatic updates
     */
    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateProducts();
        }, this.config.updateInterval);
        
        // Store reference for cleanup
        if (!window.luxuryProductServices) {
            window.luxuryProductServices = [];
        }
        window.luxuryProductServices.push(this);
    }
    
    /**
     * Update products with new random selection
     */
    updateProducts() {
        // Get new random products
        const newProducts = this.getRandomProducts(this.config.productCount);
        
        // Animate out old products
        this.animateProductsOut(() => {
            // Update with new products
            this.currentProducts = newProducts;
            this.updateCarouselDisplay();
        });
    }
    
    /**
     * Animate products exit
     */
    animateProductsOut(callback) {
        const products = this.carouselContainer.querySelectorAll('.gdot-product-icon:not(.lux-duplicate)');
        
        if (products.length === 0) {
            callback();
            return;
        }
        
        products.forEach((product, index) => {
            setTimeout(() => {
                product.style.transition = 'all 0.3s ease-out';
                product.style.opacity = '0';
                product.style.transform = 'translateY(-20px)';
            }, index * 50);
        });
        
        // Execute callback after animation completes
        setTimeout(callback, products.length * 50 + 300);
    }
    
    /**
     * Manually trigger update (for testing)
     */
    manualUpdate() {
        this.updateProducts();
    }
    
    /**
     * Pause automatic updates
     */
    pause() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Resume automatic updates
     */
    resume() {
        if (!this.updateInterval) {
            this.startAutoUpdate();
        }
    }
    
    /**
     * Destroy the service and cleanup
     */
    destroy() {
        this.pause();
        
        // Remove from global registry
        if (window.luxuryProductServices) {
            const index = window.luxuryProductServices.indexOf(this);
            if (index > -1) {
                window.luxuryProductServices.splice(index, 1);
            }
        }
        
        // Remove enhancement classes
        if (this.carouselContainer) {
            this.carouselContainer.classList.remove('lux-enhanced');
        }
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const oldInterval = this.config.updateInterval;
        this.config = { ...this.config, ...newConfig };
        
        // Restart interval if update interval changed
        if (newConfig.updateInterval && newConfig.updateInterval !== oldInterval) {
            this.pause();
            this.startAutoUpdate();
        }
    }
    
    /**
     * Get current products
     */
    getCurrentProducts() {
        return [...this.currentProducts];
    }
}

/**
 * Initialize luxury trending products service
 */
function initLuxuryTrendingProducts() {
    // Check if we're on the right page
    if (!document.querySelector('.gdot-trending-section')) {
        console.log('LuxuryTrendingProducts: Trending section not found');
        return;
    }
    
    // Create and initialize service
    window.luxuryTrendingService = new LuxuryTrendingProductsService({
        productCount: 6,
        updateInterval: 45000 // 45 seconds
    });
    
    const initialized = window.luxuryTrendingService.init();
    
    if (initialized) {
        console.log('LuxuryTrendingProducts: Service initialized successfully');
    }
}

/**
 * Cleanup function
 */
function cleanupLuxuryTrendingProducts() {
    if (window.luxuryTrendingService) {
        window.luxuryTrendingService.destroy();
        delete window.luxuryTrendingService;
    }
    
    if (window.luxuryProductServices) {
        window.luxuryProductServices.forEach(service => service.destroy());
        delete window.luxuryProductServices;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLuxuryTrendingProducts);
} else {
    initLuxuryTrendingProducts();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupLuxuryTrendingProducts);

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LuxuryTrendingProductsService, initLuxuryTrendingProducts };
}
