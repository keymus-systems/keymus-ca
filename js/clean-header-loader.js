// Clean Dashboard Header Loader
// Use this to load the new clean dashboard header component

/**
 * Loads the clean dashboard header component
 * @param {string} containerId - The ID of the container element (default: 'dashboard-header-placeholder')
 * @returns {Promise} Promise that resolves when header is loaded
 */
function loadCleanDashboardHeader(containerId = 'dashboard-header-placeholder') {
    return new Promise((resolve, reject) => {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Header container '${containerId}' not found`);
            reject(new Error(`Container ${containerId} not found`));
            return;
        }
        
        console.log('Loading clean dashboard header...');
        
        fetch('./components/dashboard-header-clean.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                container.innerHTML = data;
                console.log('Clean dashboard header loaded successfully');
                
                // Dispatch event to notify other scripts
                document.dispatchEvent(new CustomEvent('cleanHeaderLoaded', {
                    detail: { containerId: containerId }
                }));
                
                resolve();
            })
            .catch(error => {
                console.error('Error loading clean dashboard header:', error);
                reject(error);
            });
    });
}

/**
 * Load clean header with standard navigation components
 * This replaces the old pattern of loading header + sidebar separately
 */
async function loadCleanStandardNavigation() {
    try {
        console.log('Loading clean standard navigation...');
        
        // Load clean header first
        await loadCleanDashboardHeader();
        
        // Load sidebar (using existing loadStandardNavigation function)
        if (typeof loadStandardNavigation === 'function') {
            await loadStandardNavigation();
        } else {
            console.warn('loadStandardNavigation function not available');
        }
        
        console.log('Clean standard navigation loaded successfully');
        
    } catch (error) {
        console.error('Error loading clean standard navigation:', error);
    }
}

// Make functions globally available
window.loadCleanDashboardHeader = loadCleanDashboardHeader;
window.loadCleanStandardNavigation = loadCleanStandardNavigation;

// Auto-initialize if called directly
if (typeof module === 'undefined' && typeof exports === 'undefined') {
    console.log('Clean dashboard header loader ready');
}
