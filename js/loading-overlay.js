
/**
 * Loading Overlay Utility
 * Provides functions to show/hide loading overlay with GIF animation
 */

class LoadingOverlay {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        this.createOverlay();
    }

    createOverlay() {
        // Create the overlay element
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay hidden';
        this.overlay.id = 'loading-overlay';
        
        // Create the content
        this.overlay.innerHTML = `
            <div class="loading-content">
                <img src="/assets/uploads/img/66.gif" alt="Loading..." class="loading-gif">
                <div class="loading-text">Processing...</div>
                <div class="loading-subtext">Please wait while we process your request</div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(this.overlay);
    }

    show(message = 'Processing...', subMessage = 'Please wait while we process your request') {
        if (!this.overlay) {
            this.createOverlay();
        }
        
        // Update messages
        const textElement = this.overlay.querySelector('.loading-text');
        const subTextElement = this.overlay.querySelector('.loading-subtext');
        
        if (textElement) textElement.textContent = message;
        if (subTextElement) subTextElement.textContent = subMessage;
        
        // Show overlay
        this.overlay.classList.remove('hidden');
        this.isVisible = true;
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.isVisible = false;
            
            // Restore body scrolling
            document.body.style.overflow = '';
        }
    }

    updateMessage(message, subMessage = null) {
        if (!this.overlay) return;
        
        const textElement = this.overlay.querySelector('.loading-text');
        const subTextElement = this.overlay.querySelector('.loading-subtext');
        
        if (textElement && message) textElement.textContent = message;
        if (subTextElement && subMessage) subTextElement.textContent = subMessage;
    }

    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
            this.isVisible = false;
            document.body.style.overflow = '';
        }
    }
}

// Create a global instance
window.loadingOverlay = new LoadingOverlay();

// Convenience functions
window.showLoading = function(message, subMessage) {
    window.loadingOverlay.show(message, subMessage);
};

window.hideLoading = function() {
    window.loadingOverlay.hide();
};

window.updateLoadingMessage = function(message, subMessage) {
    window.loadingOverlay.updateMessage(message, subMessage);
};

// Auto-hide loading on page unload
window.addEventListener('beforeunload', () => {
    if (window.loadingOverlay) {
        window.loadingOverlay.hide();
    }
});

console.log('Loading overlay utility initialized');
