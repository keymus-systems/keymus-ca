/**
 * Luxury Dynamic Gauge Component
 * Provides animated gauges for PEA traffic and efficiency metrics
 * Uses unique class name to avoid conflicts with existing gauge implementations
 */

class LuxuryDynamicGauge {
    constructor(containerId, title, range = [75, 95], config = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.title = title;
        this.range = range;
        this.currentValue = this.generateRandomValue();
        this.config = {
            updateInterval: 30000, // 30 seconds
            animationDuration: 1000,
            variationRange: 5, // ±2.5%
            ...config
        };
        
        if (!this.container) {
            console.warn(`LuxuryDynamicGauge: Container with ID "${containerId}" not found`);
            return;
        }
        
        this.init();
    }
    
    generateRandomValue() {
        // Always in last quarter (75-100%)
        const [min, max] = this.range;
        return Math.random() * (max - min) + min;
    }
    
    init() {
        this.render();
        // Update every interval with slight variations
        this.updateInterval = setInterval(() => this.updateValue(), this.config.updateInterval);
        
        // Store reference for cleanup
        if (!window.luxuryGauges) {
            window.luxuryGauges = [];
        }
        window.luxuryGauges.push(this);
    }
    
    updateValue() {
        const variation = (Math.random() - 0.5) * this.config.variationRange;
        this.currentValue = Math.max(75, Math.min(100, this.currentValue + variation));
        this.animateToValue(this.currentValue);
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="lux-gauge">
                <svg class="lux-gauge-svg" viewBox="0 0 200 120">
                    <!-- Background arc -->
                    <path class="lux-gauge-bg" d="M20,100 A80,80 0 0,1 180,100" 
                          stroke-dasharray="251.2" stroke-dashoffset="0"></path>
                    <!-- Fill arc -->
                    <path class="lux-gauge-fill" d="M20,100 A80,80 0 0,1 180,100" 
                          stroke-dasharray="0 251.2" stroke-dashoffset="0"></path>
                    <!-- Center dot -->
                    <circle class="lux-gauge-center" cx="100" cy="100" r="8"></circle>
                    <!-- Needle -->
                    <line class="lux-gauge-needle" x1="100" y1="100" x2="100" y2="30"></line>
                </svg>
                <div class="lux-gauge-value">${Math.round(this.currentValue)}%</div>
                <div class="lux-gauge-title">${this.title}</div>
            </div>
        `;
        
        this.animateToValue(this.currentValue);
    }
    
    animateToValue(value) {
        if (!this.container) return;
        
        const needle = this.container.querySelector('.lux-gauge-needle');
        const fill = this.container.querySelector('.lux-gauge-fill');
        const display = this.container.querySelector('.lux-gauge-value');
        
        if (!needle || !fill || !display) return;
        
        // Calculate rotation angle (0-180 degrees for semicircle)
        const angle = (value / 100) * 180 - 90;
        
        // Calculate stroke dash array for fill
        const circumference = 251.2; // Approximate arc length
        const fillLength = (value / 100) * circumference;
        
        // Apply animations
        needle.style.transform = `rotate(${angle}deg)`;
        needle.style.transformOrigin = '100px 100px';
        
        fill.style.strokeDasharray = `${fillLength} ${circumference}`;
        
        // Animate the value display
        this.animateValueDisplay(display, parseInt(display.textContent), Math.round(value));
    }
    
    animateValueDisplay(element, startValue, endValue) {
        const duration = this.config.animationDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);
            element.textContent = `${currentValue}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Remove from global registry
        if (window.luxuryGauges) {
            const index = window.luxuryGauges.indexOf(this);
            if (index > -1) {
                window.luxuryGauges.splice(index, 1);
            }
        }
    }
    
    // Method to manually set value (for testing or external control)
    setValue(value) {
        this.currentValue = Math.max(0, Math.min(100, value));
        this.animateToValue(this.currentValue);
    }
    
    // Method to update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Restart interval if update interval changed
        if (newConfig.updateInterval && this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = setInterval(() => this.updateValue(), this.config.updateInterval);
        }
    }
}

/**
 * Luxury Gauge Manager
 * Handles initialization and management of multiple gauges
 */
class LuxuryGaugeManager {
    constructor() {
        this.gauges = new Map();
    }
    
    createGauge(containerId, title, range, config) {
        if (this.gauges.has(containerId)) {
            console.warn(`Gauge with ID "${containerId}" already exists`);
            return this.gauges.get(containerId);
        }
        
        const gauge = new LuxuryDynamicGauge(containerId, title, range, config);
        this.gauges.set(containerId, gauge);
        return gauge;
    }
    
    destroyGauge(containerId) {
        const gauge = this.gauges.get(containerId);
        if (gauge) {
            gauge.destroy();
            this.gauges.delete(containerId);
        }
    }
    
    destroyAll() {
        this.gauges.forEach(gauge => gauge.destroy());
        this.gauges.clear();
    }
    
    getGauge(containerId) {
        return this.gauges.get(containerId);
    }
    
    updateAllGauges() {
        this.gauges.forEach(gauge => gauge.updateValue());
    }
}

/**
 * Initialize luxury gauges for the task page
 * Uses specific container IDs to avoid conflicts
 */
function initLuxuryGauges() {
    // Check if we're on the task page and elements exist
    const peaContainer = document.querySelector('.gdot-metric-card:first-child .gdot-gauge');
    const efficiencyContainer = document.querySelector('.gdot-metric-card:last-child .gdot-gauge');
    
    if (!peaContainer || !efficiencyContainer) {
        console.log('LuxuryGauges: Gauge containers not found, skipping initialization');
        return;
    }
    
    // Add unique IDs for our luxury gauges
    peaContainer.id = 'lux-pea-traffic-gauge';
    efficiencyContainer.id = 'lux-efficiency-gauge';
    
    // Initialize gauge manager
    window.luxuryGaugeManager = new LuxuryGaugeManager();
    
    // Create gauges with different ranges
    window.luxuryGaugeManager.createGauge(
        'lux-pea-traffic-gauge', 
        'PEA TRAFFIC', 
        [78, 92],
        { updateInterval: 25000 } // Slightly different intervals for variety
    );
    
    window.luxuryGaugeManager.createGauge(
        'lux-efficiency-gauge', 
        'Efficiency Index', 
        [82, 96],
        { updateInterval: 35000 }
    );
    
    // Add luxury enhancement class to metrics container
    const metricsContainer = document.querySelector('.gdot-metrics-container');
    if (metricsContainer) {
        metricsContainer.classList.add('lux-enhanced');
    }
    
    console.log('LuxuryGauges: Initialized successfully');
}

/**
 * Cleanup function for page navigation
 */
function cleanupLuxuryGauges() {
    if (window.luxuryGaugeManager) {
        window.luxuryGaugeManager.destroyAll();
        delete window.luxuryGaugeManager;
    }
    
    if (window.luxuryGauges) {
        window.luxuryGauges.forEach(gauge => gauge.destroy());
        delete window.luxuryGauges;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLuxuryGauges);
} else {
    initLuxuryGauges();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupLuxuryGauges);

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LuxuryDynamicGauge, LuxuryGaugeManager, initLuxuryGauges, cleanupLuxuryGauges };
}
