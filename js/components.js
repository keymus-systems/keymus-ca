/**
 * Loads an HTML component from a specified path and injects it into a target element.
 * @param {string} componentPath - The path to the HTML component file (e.g., '/components/sidebar.html').
 * @param {string} targetElementId - The ID of the HTML element where the component should be injected.
 * @returns {Promise<void>} A promise that resolves when the component is loaded and injected, or rejects on error.
 */
async function loadComponent(componentPath, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.log(`Target element with ID "${targetElementId}" not found, skipping component "${componentPath}".`);
        return Promise.resolve(); // Resolve instead of rejecting
    }

    try {
        // Use the base URL defined in the main HTML file if available, otherwise assume relative path
    // Remove leading slash if present to ensure relative path
    let relPath = componentPath.startsWith('/') ? componentPath.slice(1) : componentPath;
    const baseUrl = typeof baseurl !== 'undefined' ? baseurl : '.';
    const response = await fetch(`${baseUrl}/${relPath}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch component ${componentPath}: ${response.status} ${response.statusText}`);
        }        const html = await response.text();
        targetElement.innerHTML = html;
        console.log(`Component "${componentPath}" loaded into "#${targetElementId}".`);        // Apply i18n translations to the newly loaded component
        if (typeof updateContent === 'function') {
            console.log(`Applying i18n translations to component "${componentPath}"...`);
            updateContent();
        } else if (typeof i18next !== 'undefined' && i18next.isInitialized) {
            console.log(`Applying i18n translations to component "${componentPath}" (direct approach)...`);
            // Apply translations directly if updateContent is not available
            targetElement.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (i18next.exists(key)) {
                    element.innerHTML = i18next.t(key);
                }
            });
        } else {
            console.log(`i18n completely disabled for component "${componentPath}", skipping translations...`);
        }

        // Dispatch a custom event to signal completion
        const event = new CustomEvent('componentLoaded', { detail: { path: componentPath } });
        targetElement.dispatchEvent(event);
        // Re-initialize any necessary scripts or event listeners for the loaded component
        // Example: If the sidebar has interactive elements initialized by another script
        if (componentPath.endsWith('sidebar.html')) {
            initializeSidebarScripts();
        }

    } catch (error) {
        console.error(`Error loading component "${componentPath}":`, error);

        // Fallback for local file:// usage: try XMLHttpRequest if fetch failed due to file protocol.
        try {
            if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
                console.log('Attempting XHR fallback for component load (file:// protocol)...');
                const xhr = new XMLHttpRequest();
                const relPath = componentPath.startsWith('/') ? componentPath.slice(1) : componentPath;
                xhr.open('GET', relPath, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
                            targetElement.innerHTML = xhr.responseText;
                            console.log(`Component (XHR) "${componentPath}" loaded into "#${targetElementId}".`);

                            // Apply i18n translations if available (same logic as above)
                            if (typeof updateContent === 'function') {
                                updateContent();
                            } else if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                                targetElement.querySelectorAll('[data-i18n]').forEach(element => {
                                    const key = element.getAttribute('data-i18n');
                                    if (i18next.exists(key)) {
                                        element.innerHTML = i18next.t(key);
                                    }
                                });
                            }

                            const event = new CustomEvent('componentLoaded', { detail: { path: componentPath } });
                            targetElement.dispatchEvent(event);

                            if (componentPath.endsWith('sidebar.html')) {
                                initializeSidebarScripts();
                            }
                        } else {
                            console.error('XHR fallback failed to load component:', relPath, xhr.status, xhr.statusText);
                            targetElement.innerHTML = `<p class="error-message">Error loading component: ${componentPath}</p>`;
                        }
                    }
                };
                xhr.send();
                // Return a resolved promise here; errors will be logged/handled in the XHR callback
                return Promise.resolve();
            }
        } catch (xhrErr) {
            console.error('XHR fallback threw an error:', xhrErr);
        }

        targetElement.innerHTML = `<p class="error-message">Error loading component: ${componentPath}</p>`;
        return Promise.reject(error);
    }
}

// Example of how to initialize scripts specific to the sidebar after it's loaded
// You might need to move sidebar-specific JS initializations here from other files
async function initializeSidebarScripts() {
    console.log('Initializing sidebar scripts...');
    
    // Add CSS for sidebar functionality if not already present
    if (!document.getElementById('sidebar-functionality-css')) {
        const style = document.createElement('style');
        style.id = 'sidebar-functionality-css';
        style.textContent = `
            /* Prevent body scroll when sidebar is open */
            body.sidebar-open {
                overflow: hidden;
            }
            
            /* Ensure sidebar is above overlay */
            .main-sidebar {
                z-index: 10001;
            }
            
            /* Overlay styles for dynamically created overlay */
            .bg-overlay {
                position: fixed;
                width: 100%;
                height: 100vh;
                top: 0;
                left: 0;
                background-color: rgba(0, 0, 0, 0.5);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                z-index: 10000;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .bg-overlay.active {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }
        `;
        document.head.appendChild(style);
        console.log('Added sidebar functionality CSS');
    }
    
    attachSidebarEventListeners();
    await populateSidebarUserData();
    
    // Add global event listeners for any menu buttons
    // This ensures hamburger buttons work even if they don't have specific handlers
    document.addEventListener('click', function(e) {
        // Check for various menu button classes/IDs
        if (e.target.matches('.menu-btn, .navbar-btn, #menuBtn') || 
            e.target.closest('.menu-btn, .navbar-btn, #menuBtn')) {
            
            console.log('Menu button clicked, toggling sidebar');
            e.preventDefault();
            e.stopPropagation();
            
            // Use our global toggle function
            if (typeof window.toggleSidebar === 'function') {
                window.toggleSidebar();
            }
        }
    });

    // --- Periodic Data Refresh ---
    let sidebarRefreshInterval;
    const startRefreshInterval = () => {
        clearInterval(sidebarRefreshInterval);
        sidebarRefreshInterval = setInterval(async () => {
            try {
                if (!document.hidden) {
                    await populateSidebarUserData();
                }
            } catch (error) {
                console.error('Error during periodic sidebar refresh:', error);
            }
        }, 30000);
        console.log('Sidebar refresh interval started.');
    };
    const stopRefreshInterval = () => {
        clearInterval(sidebarRefreshInterval);
        console.log('Sidebar refresh interval stopped.');
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopRefreshInterval();
        } else {
            populateSidebarUserData();
            startRefreshInterval();
        }
    });
    startRefreshInterval();
}

function attachSidebarEventListeners() {
    // Logout Button
    const logoutButton = document.getElementById('sidebar-logout-btn');
    if (logoutButton) {
        logoutButton.onclick = (e) => {
            e.preventDefault();
            if (typeof performLogout === 'function') {
                performLogout();
            } else {
                console.error('performLogout function not found!');
            }
        };
    }
    // Close Button
    const closeButton = document.getElementById('sidebar-close-button');
    if (closeButton) {
        closeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Use the global closeSidebar function to ensure proper cleanup
            if (typeof window.closeSidebar === 'function') {
                window.closeSidebar();
            } else {
                // Fallback to direct manipulation
                const sidebarElement = document.querySelector('.main-sidebar');
                const overlayElement = document.querySelector('.bg-overlay');
                if (sidebarElement) {
                    sidebarElement.classList.remove('active');
                }
                if (overlayElement) {
                    overlayElement.classList.remove('active');
                    overlayElement.style.opacity = '0';
                    overlayElement.style.visibility = 'hidden';
                }
                document.body.classList.remove('sidebar-open');
            }
        };
    }
    // Currency Change Button
    const currencyBtn = document.getElementById('change-currency-btn');
    if (currencyBtn) {
        currencyBtn.onclick = () => {
            const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
            const currentCurrency = localStorage.getItem('preferred_currency') || 'USD';
            const nextIndex = (currencies.indexOf(currentCurrency) + 1) % currencies.length;
            const newCurrency = currencies[nextIndex];
            localStorage.setItem('preferred_currency', newCurrency);
            populateSidebarUserData();
            console.log(`Currency changed to ${newCurrency}`);
        };
    }
    
    // User avatar click handler - navigate to profile page
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('User avatar clicked - navigating to profile page');
            window.location.href = './profile.html';
        });
    }
}

async function fetchSidebarData() {
    let fetchFunction;
    if (typeof SimpleAuth !== 'undefined' && SimpleAuth.authenticatedFetch) {
        fetchFunction = SimpleAuth.authenticatedFetch.bind(SimpleAuth);
    } else if (typeof fetchWithAuth === 'function') {
        fetchFunction = fetchWithAuth;
    } else {
        console.error('No authenticated fetch function available for sidebar.');
        return null;
    }
    try {
        const [profileRes, balanceRes] = await Promise.all([
            fetchFunction('/api/user/profile'),
            fetchFunction('/api/user/balances')
        ]);
        const profileData = profileRes.json ? await profileRes.json() : profileRes;
        const balanceData = balanceRes.json ? await balanceRes.json() : balanceRes;
        if (!profileData.success || !balanceData.success) {
            console.error('One or more sidebar API calls were unsuccessful.');
            return null;
        }
        return {
            user: profileData.user,
            balances: balanceData.balances
        };
    } catch (error) {
        console.error('Error fetching sidebar data:', error);
        return null;
    }
}

function updateSidebarUI(data) {
    if (!data || !data.user || !data.balances) {
        console.error('Invalid data provided to updateSidebarUI.');
        return;
    }
    const { user, balances } = data;
    
    // Sidebar Username
    const usernameElement = document.getElementById('dashboard-username');
    if (usernameElement) {
        usernameElement.textContent = user.username || 'User';
    }
    
    // Dashboard Header Username
    const dashboardUsernameElement = document.getElementById('dashboardUsername');
    if (dashboardUsernameElement) {
        dashboardUsernameElement.textContent = user.username || 'User';
    }
    
    // Sidebar Badge Number (Referral Code)
    const badgeElement = document.getElementById('user-badge-number');
    if (badgeElement) {
        badgeElement.textContent = user.referral_code || 'N/A';
    }
    
    // Dashboard Header Badge Number
    const userBadgeElement = document.getElementById('userBadgeNumber');
    if (userBadgeElement) {
        userBadgeElement.textContent = `Badge: ${user.referral_code || 'N/A'}`;
    }
    
    // Balance
    const balanceElement = document.getElementById('user-balance');
    if (balanceElement) {
        const mainBalance = parseFloat(balances.main_balance || 0);
        const commissionBalance = parseFloat(balances.commission_balance || 0);
        const totalBalance = mainBalance + commissionBalance;
        const preferredCurrency = localStorage.getItem('preferred_currency') || 'USD';
        balanceElement.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: preferredCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(totalBalance);
    }
    
    // Avatar
    const avatarElement = document.getElementById('user-avatar');
    if (avatarElement) {
        if (user.avatar_url) {
            avatarElement.src = user.avatar_url;
        } else if (user.profile_image) {
            avatarElement.src = user.profile_image;
        } else {
            // Fallback to default avatar
            avatarElement.src = '/assets/uploads/user.jpg';
        }
        // Add error handler to ensure fallback works
        avatarElement.onerror = function() {
            this.src = '/assets/uploads/user.jpg';
        };
    }
    
    // Dashboard Header User Initials
    const userInitialsElement = document.getElementById('userInitials');
    if (userInitialsElement && user.username) {
        const initials = user.username.split(' ').map(name => name.charAt(0)).join('').toUpperCase().substring(0, 2);
        userInitialsElement.textContent = initials;
    }
    
    // Verification Provider
    const verificationElement = document.getElementById('verification-provider');
    if (verificationElement) {
        verificationElement.textContent = "Keymus";
    }
}

// Function to populate sidebar user data across all pages
async function populateSidebarUserData() {
    console.log('Populating sidebar user data...');
    const usernameEl = document.getElementById('dashboard-username');
    if (!usernameEl) {
        console.log('Sidebar elements not found, skipping data population.');
        return;
    }
    const authData = (typeof isAuthenticated === 'function') ? isAuthenticated() : null;
    if (!authData || !authData.token) {
        console.warn('User not authenticated, skipping sidebar data population.');
        usernameEl.textContent = 'Not logged in';
        return;
    }
    try {
        const sidebarData = await fetchSidebarData();
        if (sidebarData) {
            updateSidebarUI(sidebarData);
            localStorage.setItem('user_data', JSON.stringify(sidebarData.user));
            console.log('Sidebar user data populated successfully.');
        } else {
            throw new Error('Failed to fetch sidebar data.');
        } 
    } catch (error) {
        console.error('Error populating sidebar user data:', error);
        usernameEl.textContent = 'Error loading data';
    }
}

// Function to load components after i18n is ready
function loadInitialComponents() {
    console.log('Components.js: loadInitialComponents called');
    
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        console.log('Components.js: Found sidebar placeholder, loading sidebar...');
        loadComponent('components/sidebar.html', 'sidebar-placeholder')
            .then(() => {
                console.log('Components.js: Sidebar loaded successfully');
            })
            .catch(err => {
                console.error("Components.js: Sidebar loading failed:", err);
            });
    } else {
        console.warn('Components.js: No sidebar placeholder found in DOM');
    }
    // Add similar checks for other components like header or footer if needed
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        console.log('Components.js: Found header placeholder, loading header...');
        loadComponent('components/header.html', 'header-placeholder')
            .then(() => {
                console.log('Components.js: Header loaded successfully');
            })
            .catch(err => {
                console.error("Components.js: Header loading failed:", err);
            });
    }
    
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        console.log('Components.js: Found footer placeholder, loading footer...');
        loadComponent('components/footer.html', 'footer-placeholder')
            .then(() => {
                console.log('Components.js: Footer loaded successfully');
            })
            .catch(err => {
                console.error("Components.js: Footer loading failed:", err);
            });
    }
}

/**
 * Loads the footer component
 */
async function loadFooter() {
    const footerTarget = document.getElementById('footer-placeholder');
    
    if (footerTarget) {
        return loadComponent('components/footer.html', 'footer-placeholder');
    } else {
        console.log('No footer placeholder found, skipping...');
        return Promise.resolve();
    }
}

/**
 * Loads the standard header navigation component
 */
async function loadHeaderNavigation() {
    // Check which header element exists and use the appropriate one
    const headerTarget = document.getElementById('header-navigation') ? 'header-navigation' : 'header-navigation-placeholder';
    
    // Only load if the target element exists
    if (document.getElementById(headerTarget)) {
        return loadComponent('components/header-navigation.html', headerTarget);
    } else {
        console.log('No header navigation target found, skipping...');
        return Promise.resolve();
    }
}

/**
 * Loads the dashboard header component
 */
async function loadDashboardHeader() {
    // Check which dashboard header element exists and use the appropriate one
    const headerTarget = document.getElementById('dashboard-header-placeholder') ? 'dashboard-header-placeholder' : 
                        document.getElementById('dashboard-header') ? 'dashboard-header' : null;
    
    // Only load if the target element exists
    if (headerTarget && document.getElementById(headerTarget)) {
        return loadComponent('components/dashboard-header-clean.html', headerTarget);
    } else {
        console.log('No dashboard header target found, skipping...');
        return Promise.resolve();
    }
}

/**
 * Loads the standard footer navigation component
 */
async function loadFooterNavigation() {
    // Check which footer element exists and use the appropriate one
    const footerTarget = document.getElementById('footer-navigation') ? 'footer-navigation' : 'footer-navigation-placeholder';
    
    // Only load if the target element exists
    if (document.getElementById(footerTarget)) {
        // Ensure sticky footer CSS is loaded
        if (!document.querySelector('link[href*="sticky-footer.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = './css/sticky-footer.css';
            document.head.appendChild(link);
        }
        return loadComponent('components/footer-navigation.html', footerTarget);
    } else {
        console.log('No footer navigation target found, skipping...');
        return Promise.resolve();
    }
}

/**
 * Loads all standard navigation components
 */
async function loadStandardNavigation() {
    try {
        const promises = [];
        
        // Check which sidebar element exists and use the appropriate one
        const sidebarTarget = document.getElementById('sidebar-container') ? 'sidebar-container' : 
                             document.getElementById('sidebar-placeholder') ? 'sidebar-placeholder' : null;
        
        if (sidebarTarget) {
            promises.push(loadComponent('components/sidebar.html', sidebarTarget));
        } else {
            console.log('No sidebar target found, skipping sidebar component...');
        }
        
        // Add dashboard header
        promises.push(loadDashboardHeader());
        
        // Add header and footer navigation
        promises.push(loadHeaderNavigation());
        promises.push(loadFooterNavigation());
        
        // Add footer component
        promises.push(loadFooter());
          await Promise.all(promises);
        console.log('All standard navigation components loaded successfully');
        
        // Refresh sidebar user data after loading (only if sidebar was loaded)
        if (sidebarTarget) {
            // Multiple attempts to ensure sidebar data loads
            setTimeout(async () => {
                console.log('First attempt to populate sidebar data...');
                await populateSidebarUserData();
            }, 300);
            
            setTimeout(async () => {
                console.log('Second attempt to populate sidebar data...');
                await populateSidebarUserData();
            }, 1000);
            
            // Set up refresh function for external use
            if (typeof window.refreshSidebarUserData === 'function') {
                setTimeout(() => {
                    window.refreshSidebarUserData();
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Error loading standard navigation components:', error);
    }
}

// Automatically load components when both DOM and i18n are ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Components.js: DOM loaded, checking i18n status...');
    
    // Check if i18n is completely disabled (no updateContent function and no i18next)
    if (typeof updateContent === 'undefined' && typeof i18next === 'undefined') {
        console.log('Components.js: i18n completely disabled, loading components immediately...');
        loadInitialComponents();
        return;
    }
    
    // Check if i18n is already ready (for the disabled i18n system, check if updateContent function exists)
    if ((typeof i18next !== 'undefined' && i18next.isInitialized) || 
        (typeof updateContent === 'function')) {
        console.log('Components.js: i18n ready, loading components immediately...');
        loadInitialComponents();
    } else {
        console.log('Components.js: Waiting for i18nReady event...');
        // Wait for i18n to be ready
        window.addEventListener('i18nReady', () => {
            console.log('Components.js: i18nReady event received, loading components...');
            loadInitialComponents();
        });
        
        // Fallback: if i18nReady event doesn't fire within 1 second, load anyway
        setTimeout(() => {
            if (document.getElementById('sidebar-placeholder') && 
                document.getElementById('sidebar-placeholder').innerHTML === '') {
                console.warn('Components.js: Loading components without i18n ready confirmation (fallback)');
                loadInitialComponents();
            }
        }, 1000);
    }
});

// Fallback logout function
async function performLogout() {
    console.log('Performing logout...');
    
    // Show modern confirmation dialog
    const confirmed = await showConfirmDialog(
        'You will be signed out of your account. Any unsaved changes may be lost.',
        'Sign Out',
        {
            confirmText: 'Sign Out',
            cancelText: 'Cancel',
            type: 'warning'
        }
    );
    
    if (confirmed) {
        try {
            // Get token before clearing
            const token = localStorage.getItem('auth_token');
            
            // Preserve drive session data before clearing localStorage
            const driveSessionData = localStorage.getItem('current_drive_session');
            
            // Clear authentication data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            
            // Restore drive session data after clearing auth data
            if (driveSessionData) {
                localStorage.setItem('current_drive_session', driveSessionData);
            }
            
            // Attempt server-side logout if token exists
            if (token && typeof API_BASE_URL !== 'undefined') {
                fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Server-side logout response:', data);
                })
                .catch(error => {
                    console.warn('Server-side logout failed (continuing with client-side logout):', error);
                });
            }
            
            // Show notification if available
            if (typeof showNotification === 'function') {
                if (window.i18next && window.i18next.isInitialized) {
                    showNotification(i18next.t('logoutSuccessNotification') || 'Logout successful!', 'success');
                } else {
                    showNotification('Logout successful!', 'success');
                }
                // Redirect after a short delay to allow notification to show
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } else {
                // Redirect immediately if no notification
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect even if there's an error
            window.location.href = 'login.html';
        }
    }
}

/**
 * Initialize referral code copy functionality
 */
function initializeReferralCodeCopy(referralCode) {
    const refcodeEl = document.getElementById('dashboard-refcode');
    
    if (refcodeEl && referralCode) {
        // Remove any existing click listeners to avoid duplicates
        const newRefcodeEl = refcodeEl.cloneNode(true);
        refcodeEl.parentNode.replaceChild(newRefcodeEl, refcodeEl);
        
        // Add click listener to the entire referral code element
        newRefcodeEl.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Sidebar referral code clicked, copying:', referralCode);
            
            if (typeof copyToClipboard === 'function') {
                const success = await copyToClipboard(referralCode, 'Referral code copied to clipboard!');
                
                if (success) {
                    // Visual feedback - temporarily change the icon
                    const copyIcon = newRefcodeEl.querySelector('.ref-copy-icon');
                    if (copyIcon) {
                        const originalClass = copyIcon.className;
                        copyIcon.className = 'fas fa-check ref-copy-icon';
                        copyIcon.style.color = '#28a745';
                        
                        setTimeout(() => {
                            copyIcon.className = originalClass;
                            copyIcon.style.color = '';
                        }, 2000);
                    }
                }
            } else {
                console.error('copyToClipboard function not available');
                if (typeof showNotification === 'function') {
                    showNotification('Copy functionality not available', 'error');
                }
            }
        });
        
        // Also add hover effect
        newRefcodeEl.style.cursor = 'pointer';
        newRefcodeEl.title = 'Click to copy referral code';
        
        console.log('Referral code copy functionality initialized for sidebar');
    }
}

// Function to generate user initials (fallback if not available globally)
function generateUserInitials(username) {
    if (!username) return 'U';
    
    // Fallback implementation
    const parts = username.split(' ');
    if (parts.length >= 2) {        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
        return username.substring(0, 2).toUpperCase();
    }
}

// Function to refresh sidebar user data (can be called externally)
window.refreshSidebarUserData = async function() {
    console.log('Refreshing sidebar user data...');
    await populateSidebarUserData();
};

// Debug function to manually trigger sidebar refresh
window.debugSidebarRefresh = async function() {
    console.log('=== DEBUG: Manual sidebar refresh triggered ===');
    
    // Check if sidebar is loaded
    const sidebarEl = document.querySelector('.main-sidebar');
    if (!sidebarEl) {
        console.log('Sidebar not loaded yet');
        return;
    }
    
    // Check authentication
    const token = localStorage.getItem('auth_token');
    console.log('Auth token exists:', !!token);
    
    // Check if elements exist
    const usernameEl = document.getElementById('dashboard-username');
    const refcodeEl = document.getElementById('dashboard-refcode');
    const userInitialsEl = document.getElementById('sidebar-user-initials');
    
    console.log('Sidebar elements found:', {
        username: !!usernameEl,
        refcode: !!refcodeEl,
        initials: !!userInitialsEl
    });
    
    // Trigger refresh
    await populateSidebarUserData();
    
    console.log('=== DEBUG: Manual sidebar refresh completed ===');
};

// Global sidebar toggle functions for header navigation
window.toggleSidebar = function() {
    console.log('toggleSidebar called');
    const sidebar = document.querySelector('.main-sidebar');
    let overlay = document.querySelector('.bg-overlay');
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    // Create overlay if it doesn't exist
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bg-overlay';
        
        // Add CSS styles for the overlay
        overlay.style.cssText = `
            position: fixed;
            width: 100%;
            height: 100vh;
            top: 0;
            left: 0;
            background-color: rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            z-index: 10000;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        
        // Add click handler to close sidebar when overlay is clicked
        overlay.addEventListener('click', function() {
            closeSidebar();
        });
        
        console.log('Created bg-overlay element with styles');
    }
    
    // Check if sidebar is currently active
    const isActive = sidebar.classList.contains('active');
    
    if (isActive) {
        // Close sidebar
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
        document.body.classList.remove('sidebar-open');
        console.log('Sidebar closed');
    } else {
        // Open sidebar
        sidebar.classList.add('active');
        overlay.classList.add('active');
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        overlay.style.pointerEvents = 'auto';
        document.body.classList.add('sidebar-open');
        console.log('Sidebar opened');
    }
};

// Separate functions for explicit open/close
window.openSidebar = function() {
    console.log('openSidebar called');
    const sidebar = document.querySelector('.main-sidebar');
    let overlay = document.querySelector('.bg-overlay');
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    // Create overlay if it doesn't exist
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bg-overlay';
        
        // Add CSS styles for the overlay
        overlay.style.cssText = `
            position: fixed;
            width: 100%;
            height: 100vh;
            top: 0;
            left: 0;
            background-color: rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            z-index: 10000;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        
        // Add click handler to close sidebar when overlay is clicked
        overlay.addEventListener('click', function() {
            closeSidebar();
        });
        
        console.log('Created bg-overlay element with styles');
    }
    
    sidebar.classList.add('active');
    overlay.classList.add('active');
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    overlay.style.pointerEvents = 'auto';
    document.body.classList.add('sidebar-open');
    console.log('Sidebar opened');
};

window.closeSidebar = function() {
    console.log('closeSidebar called');
    const sidebar = document.querySelector('.main-sidebar');
    const overlay = document.querySelector('.bg-overlay');
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    sidebar.classList.remove('active');
    if (overlay) {
        overlay.classList.remove('active');
        // Force overlay to be hidden using inline styles
        // This ensures it works whether overlay was created dynamically or exists in HTML
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
    }
    document.body.classList.remove('sidebar-open');
    console.log('Sidebar closed');
};
