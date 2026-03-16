// Dashboard JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load standard navigation components
    loadStandardNavigation();
    
    // Initialize dashboard data (with better error handling)
    if (typeof checkAndInitializeDashboard === 'function') {
        try {
            checkAndInitializeDashboard();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            showDefaultDashboard();
        }
    } else if (typeof initializeDashboard === 'function') {
        // Fallback to old method with error handling
        try {
            initializeDashboard();
        } catch (error) {
            console.error('Error initializing dashboard (fallback):', error);
            showDefaultDashboard();
        }
    }
    
    // Load user data (with error handling)
    try {
        loadUserDashboardData();
    } catch (error) {
        console.error('Error loading user dashboard data:', error);
        // Show default dashboard if user data loading fails
        showDefaultDashboard();
    }
    
    // Initialize menu functionality
    initializeMenuControls();
    
    // Setup referral code copy functionality
    setupDashboardReferralCopy();
});

// Function to setup referral code copy functionality
function setupDashboardReferralCopy() {
    const copyBtn = document.getElementById('copy-dashboard-referral');
    const refcodeEl = document.getElementById('dashboard-refcode');
    
    if (copyBtn && refcodeEl) {
        copyBtn.addEventListener('click', function() {
            const refcode = refcodeEl.textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(refcode).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy me-2"></i>Copy Code';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            }
        });
    }
}

// Initialize menu controls
function initializeMenuControls() {
    const menuBtn = document.getElementById('menuBtn');
    
    // Menu button click - open the sidebar
    menuBtn?.addEventListener('click', function() {
        console.log('Menu button clicked');
        const sidebar = document.querySelector('.main-sidebar');
        const overlay = document.querySelector('.bg-overlay');
        
        if (sidebar) {
            sidebar.classList.add('active');
        }
        if (overlay) {
            overlay.style.display = 'block';
        }
        
        // Also close sidebar when overlay is clicked
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar?.classList.remove('active');
                overlay.style.display = 'none';
            });
        }
    });
}

// Listen for sidebar component to be loaded by components.js
document.addEventListener('componentLoaded', function(event) {
    if (event.detail.path === '/components/sidebar.html') {
        console.log('Sidebar component loaded, initializing close button...');
        
        // Initialize close button after sidebar is loaded
        setTimeout(() => {
            const closeBtns = document.querySelectorAll('[data-action="close-sidebar"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const sidebar = document.querySelector('.main-sidebar');
                    const overlay = document.querySelector('.bg-overlay');
                    
                    if (sidebar) sidebar.classList.remove('active');
                    if (overlay) overlay.style.display = 'none';
                });
            });
        }, 100);
        
        // Refresh sidebar user data
        setTimeout(() => {
            if (typeof refreshSidebarUserData === 'function') {
                refreshSidebarUserData();
            }
        }, 300);
    }
});

async function loadUserDashboardData() {
    try {
        // Check if user is authenticated using SimpleAuth first
        let isUserAuthenticated = false;
        
        if (typeof SimpleAuth !== 'undefined') {
            isUserAuthenticated = SimpleAuth.isAuthenticated();
        } else if (typeof isAuthenticated === 'function') {
            const authData = isAuthenticated();
            isUserAuthenticated = authData && authData.token;
        } else {
            console.warn('No authentication method available');
            showDefaultDashboard();
            return;
        }
        
        if (!isUserAuthenticated) {
            console.log('User not authenticated, showing default dashboard');
            showDefaultDashboard();
            return;
        }
        
        // Check if fetchWithAuth is available, if not use SimpleAuth
        let fetchFunction = null;
        if (typeof SimpleAuth !== 'undefined' && SimpleAuth.authenticatedFetch) {
            fetchFunction = SimpleAuth.authenticatedFetch.bind(SimpleAuth);
        } else if (typeof fetchWithAuth === 'function') {
            fetchFunction = fetchWithAuth;
        } else {
            console.warn('No authenticated fetch method available');
            showDefaultDashboard();
            return;
        }
        
        // Fetch user profile data
        console.log('Attempting to fetch profile data...');
        const response = await fetchFunction('/api/user/profile');
        console.log('Profile API raw response:', response);
        
        // Handle response based on the fetch function used
        let profileData;
        
        // Check if response is a Response object that needs to be parsed
        if (response && typeof response.json === 'function') {
            profileData = await response.json();
        } else if (response && typeof response === 'object') {
            profileData = response;
        } else {
            throw new Error('Invalid response format');
        }
        
        console.log('Dashboard profile API response:', profileData);
        
        if (profileData.success && profileData.user) {
            const user = profileData.user;
            console.log('User data received:', user);
            
            // Update user info
            if (user.username) {
                updateDashboardUI(user);
            }

            // Update notification count
            if (user.unreadNotifications !== undefined) {
                const badge = document.getElementById('notificationCount');
                if (user.unreadNotifications > 0) {
                    badge.textContent = user.unreadNotifications;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }

            // Fetch balance data separately for accuracy
            try {
                await refreshBalanceData();
            } catch (balanceError) {
                console.warn('Failed to refresh balance, using profile balance:', balanceError);
                // Fallback to profile balance if separate call fails
                if (user.balance !== undefined) {
                    const balanceEl = document.getElementById('depositBalance');
                    if (balanceEl) {
                        balanceEl.textContent = `$${parseFloat(user.balance || 0).toFixed(2)}`;
                    }
                }
            }

            // Update localStorage cache
            localStorage.setItem('user_data', JSON.stringify(user));
            
            // Hide login button when authenticated
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            
        } else {
            console.error('Profile API call failed:', profileData.message || 'Unknown error');
            console.error('Full profile response:', profileData);
            
            // Show specific error message if available
            if (profileData.message) {
                showNotification(`Profile loading failed: ${profileData.message}`, 'error');
            } else {
                showNotification('Failed to load profile data', 'error');
            }
            
            showDefaultDashboard();
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Show specific error message to user
        if (error.message.includes('Authentication expired')) {
            showNotification('Your session has expired. Please log in again.', 'warning');
        } else if (error.message.includes('401')) {
            showNotification('Authentication required. Please log in to view your profile.', 'warning');
        } else if (error.message.includes('Network error')) {
            showNotification('Network error. Please check your connection and try again.', 'error');
        } else {
            showNotification(`Error loading profile: ${error.message}`, 'error');
        }
        
        // On error, show default dashboard instead of redirecting
        showDefaultDashboard();
    }
}

function showDefaultDashboard() {
    // Update with default/demo data - add null checks
    const userInitialsEl = document.getElementById('userInitials');
    if (userInitialsEl) {
        userInitialsEl.textContent = 'WU';
    }
    
    // Use depositBalance since currentBalance doesn't exist
    const balanceEl = document.getElementById('depositBalance');
    if (balanceEl) {
        balanceEl.textContent = '$0.00';
    }
    
    const withdrawBalanceEl = document.getElementById('withdrawBalance');
    if (withdrawBalanceEl) {
        withdrawBalanceEl.textContent = '$0.00';
    }
    
    // Hide notification badge
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.style.display = 'none';
    }
    
    // Show login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'flex';
    }
}

// Function to refresh balance data independently
async function refreshBalanceData() {
    try {
        const authData = isAuthenticated();
        if (!authData || typeof fetchWithAuth !== 'function') {
            return;
        }

        const balanceData = await fetchWithAuth('/api/user/balances');
        if (balanceData.success && balanceData.balances) {
            const balances = balanceData.balances;
            const mainBalance = parseFloat(balances.main_balance || 0);
            const commissionBalance = parseFloat(balances.commission_balance || 0);
            const totalBalance = mainBalance + commissionBalance;
            
            // Update balance displays
            const balanceEl = document.getElementById('depositBalance');
            if (balanceEl) {
                balanceEl.textContent = `$${mainBalance.toFixed(2)}`;
            }
            
            const depositBalanceEl = document.getElementById('depositBalance');
            if (depositBalanceEl) {
                depositBalanceEl.textContent = `$${mainBalance.toFixed(2)}`;
            }
            
            console.log(`Updated balances - Main: $${mainBalance}, Commission: $${commissionBalance}, Total: $${totalBalance}`);
            return balances;
        }
    } catch (error) {
        console.error('Error refreshing balance:', error);
    }
}

// Make refresh function globally available
window.refreshDashboardBalance = refreshBalanceData;

function updateDashboardUI(userData) {
    // Update user avatar initials
    if (userData.username) {
        const initials = generateUserInitials(userData.username);
        const userInitialsEl = document.getElementById('userInitials');
        if (userInitialsEl) {
            userInitialsEl.textContent = initials;
        }
        
        // Also update sidebar initials if sidebar is loaded
        const sidebarInitials = document.getElementById('sidebar-user-initials');
        if (sidebarInitials) {
            sidebarInitials.textContent = initials;
        }
    }

    // Update balances (prefer separate balance API call)
    if (userData.balance !== undefined) {
        const balance = parseFloat(userData.balance || 0);
        // Update balance
        const balanceEl = document.getElementById('depositBalance');
        if (balanceEl) {
            balanceEl.textContent = `$${balance.toFixed(2)}`;
        }
        
        const depositBalanceEl = document.getElementById('depositBalance');
        if (depositBalanceEl) {
            depositBalanceEl.textContent = `$${balance.toFixed(2)}`;
        }
    }

    // Update notification count
    if (userData.unreadNotifications !== undefined) {
        const badge = document.getElementById('notificationCount');
        if (userData.unreadNotifications > 0) {
            badge.textContent = userData.unreadNotifications;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Hide login button when authenticated
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
}

// Helper function to generate user initials properly
function generateUserInitials(username) {
    if (!username) return 'U';
    
    // Remove extra spaces and split by space
    const nameParts = username.trim().split(/\s+/).filter(part => part.length > 0);
    
    if (nameParts.length === 0) return 'U';
    
    if (nameParts.length === 1) {
        // Single word username - take first 2 characters
        const name = nameParts[0];
        return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
    } else {
        // Multiple words - take first letter of each word (max 2)
        return nameParts.slice(0, 2).map(name => name[0]).join('').toUpperCase();
    }
}

// Add smooth scroll behavior for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
