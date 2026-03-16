/**
 * Enhanced Order Progress Integration Script
 * This script ensures seamless integration between the new enhanced order progress
 * and the existing task system
 */

(function() {
    'use strict';
    
    // Wait for DOM and other scripts to load
    function initializeOrderProgressIntegration() {
        console.log('🔄 Initializing Enhanced Order Progress Integration...');
        
        // Ensure enhanced order progress is initialized
        if (typeof window.initializeEnhancedOrderProgress === 'function') {
            window.initializeEnhancedOrderProgress();
        }
        
        // Override the legacy updateProgressBar to also update enhanced progress
        if (typeof window.updateProgressBar === 'function') {
            const originalUpdateProgressBar = window.updateProgressBar;
            
            window.updateProgressBar = function(currentStep, totalProducts) {
                // Call original function
                originalUpdateProgressBar.call(this, currentStep, totalProducts);
                
                // Update enhanced order progress
                updateEnhancedOrderProgress(currentStep, totalProducts);
            };
            
            console.log('✅ Legacy updateProgressBar function enhanced');
        }
        
        // Monitor global variable changes
        let lastTasksCompleted = window.tasksCompleted || 0;
        let lastTotalTasksRequired = window.totalTasksRequired || 0;
        
        setInterval(() => {
            const currentTasksCompleted = window.tasksCompleted || 0;
            const currentTotalTasksRequired = window.totalTasksRequired || 0;
            
            if (currentTasksCompleted !== lastTasksCompleted || 
                currentTotalTasksRequired !== lastTotalTasksRequired) {
                
                updateEnhancedOrderProgress(currentTasksCompleted, currentTotalTasksRequired);
                
                lastTasksCompleted = currentTasksCompleted;
                lastTotalTasksRequired = currentTotalTasksRequired;
            }
        }, 1000); // Check every second
        
        console.log('✅ Order Progress Integration initialized successfully');
    }
    
    function updateEnhancedOrderProgress(currentStep, totalProducts) {
        try {
            if (window.orderProgress && typeof window.orderProgress.updateProgress === 'function') {
                const completed = Math.max(0, parseInt(currentStep) || 0);
                const total = Math.max(0, parseInt(totalProducts) || 5);
                const currentProgressStep = Math.min(Math.max(1, completed + 1), total);
                const pendingOrders = Math.max(0, total - completed);
                
                window.orderProgress.updateProgress(currentProgressStep, completed, pendingOrders);
                
                console.log(`📊 Enhanced Order Progress updated: Step ${currentProgressStep}, Completed: ${completed}, Pending: ${pendingOrders}`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to update enhanced order progress:', error);
        }
    }
    
    // Auto-initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeOrderProgressIntegration, 1000);
        });
    } else {
        setTimeout(initializeOrderProgressIntegration, 1000);
    }
    
    // Export functions for manual use
    window.updateEnhancedOrderProgress = updateEnhancedOrderProgress;
    window.initializeOrderProgressIntegration = initializeOrderProgressIntegration;
    
})();
