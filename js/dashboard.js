// Dashboard.js - Fixed authentication issues and error handling
console.log('Dashboard.js loaded with fixes:')
console.log('- Fixed authentication method checking')
console.log('- Fixed balance response handling')
console.log('- Fixed frozen state modal positioning')
console.log('- Disabled debug script auto-execution')

// Function to ensure i18n content is updated with correct translations
function updatePageTranslations() {
    // Use the simplified fallback text conversion system
    if (typeof updateContent === 'function') {
        updateContent();
        console.log('Updated page translations using fallback text conversion');
    } else {
        console.warn('updateContent function not available');
    }
}

// Function to initialize dashboard logic (fetching data, setting up listeners)
async function initializeDashboard() {
    // Check if SimpleAuth is available
    if (typeof SimpleAuth === 'undefined') {
        console.warn('SimpleAuth not available yet, using fallback authentication');
        
        // Use fallback authentication check
        const authData = isAuthenticated();
        if (!authData) {
            console.log('No authentication data, using default dashboard');
            return;
        }
        
        // Use fetchWithAuth as fallback
        return initializeDashboardWithFallback(authData);
    }
    
    // Use silent authentication check to avoid redirects
    const authData = isAuthenticated();
    if (!authData) {
        console.log('No authentication data, using default dashboard');
        return; // Don't redirect, just use default data
    }

    console.log('Dashboard authData:', authData);
    console.log('Token from authData:', authData.token ? `${authData.token.substring(0, 10)}...` : 'no token');

    const usernameEl = document.getElementById('dashboard-username');
    const refcodeEl = document.getElementById('dashboard-refcode');
    const balancesEl = document.getElementById('dashboard-balances');

    // Try to use cached data first
    const cachedUserData = localStorage.getItem('user_data');    try {          
        console.log('Making API call to /api/user/profile');
        console.log('Current auth data:', authData);
        console.log('Token available:', authData.token ? 'Yes' : 'No');
        
        // Check what authentication methods are available
        const hasSimpleAuth = typeof SimpleAuth !== 'undefined' && typeof SimpleAuth.authenticatedFetch === 'function';
        const hasFetchWithAuth = typeof fetchWithAuth === 'function';
        
        console.log('SimpleAuth available:', hasSimpleAuth);
        console.log('fetchWithAuth available:', hasFetchWithAuth);
        
        if (!hasSimpleAuth && !hasFetchWithAuth) {
            throw new Error('No authentication method available');
        }
        
        // Use SimpleAuth if available, otherwise use fetchWithAuth
        const response = hasSimpleAuth ? 
                        await SimpleAuth.authenticatedFetch('/api/user/profile') :
                        await fetchWithAuth('/api/user/profile');
        
        console.log('Profile API response status:', response.status);
        
        const data = await response.json();
        console.log('Profile API response data:', data);        if (data.success && data.user) {
            const user = data.user;
            if (usernameEl) usernameEl.textContent = user.username;
            if (refcodeEl) refcodeEl.textContent = user.referral_code || 'N/A';              console.log('Making API call to /api/user/balances');
              console.log('Auth data for balances call:', authData);
              
              // Fetch balances separately for real-time accuracy
            const balancesResponse = hasSimpleAuth ? 
                                   await SimpleAuth.authenticatedFetch('/api/user/balances') :
                                   await fetchWithAuth('/api/user/balances');
            
            console.log('Balances API response status:', balancesResponse.status);
            
            const balancesData = await balancesResponse.json();
            console.log('Balances API response data:', balancesData);
            
            if (balancesData.success && balancesEl) {
                const mainBalance = parseFloat(balancesData.balances.main_balance || 0).toFixed(2);
                const commissionBalance = parseFloat(balancesData.balances.commission_balance || 0).toFixed(2);
                balancesEl.innerHTML = `Main: <strong>${mainBalance}</strong> USDT | Commission: <strong>${commissionBalance}</strong> USDT`;
            }// Update localStorage cache
            localStorage.setItem('user_data', JSON.stringify(user));
            
            // Update membership tier display
            updateMembershipTier(user.tier || 'bronze');
              // Fetch additional data sequentially to avoid race conditions
            try {
                // Fetch and update drive progress
                await fetchDriveProgress();
            } catch (error) {
                console.error('Error fetching drive progress:', error);
                if (error.message.includes('authentication')) {
                    showNotification('Drive progress requires authentication. Please login.', 'warning');
                }
            }

            // Fetch and update total withdrawals
            try {
                await fetchTotalWithdrawals();
            } catch (error) {
                console.error('Error fetching total withdrawals:', error);
            }
            
        } else {
            console.error('Profile API call failed:', data.message);
            showNotification(data.message || 'Failed to load profile data.', 'error');            if (!cachedUserData) {
                if (usernameEl) usernameEl.textContent = 'Error';
                if (refcodeEl) refcodeEl.textContent = 'Error';
                if (balancesEl) balancesEl.innerHTML = 'Balance: Error';
            }
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');        // Use cached data as fallback
        if (cachedUserData) {
            try {                const user = JSON.parse(cachedUserData);
                if (usernameEl) usernameEl.textContent = user.username;
                if (refcodeEl) refcodeEl.textContent = user.referral_code || 'N/A';
                if (balancesEl) balancesEl.innerHTML = 'Balance: Using cached data';
                
                // Try to update tier from cached data
                updateMembershipTier(user.tier || 'bronze');
            } catch (e) {
                console.error('Error parsing cached user data:', e);
            }
        }
    }
}

// Fallback initialization function for when SimpleAuth is not available
async function initializeDashboardWithFallback(authData) {
    console.log('Using fallback dashboard initialization');
    
    const usernameEl = document.getElementById('dashboard-username');
    const refcodeEl = document.getElementById('dashboard-refcode');
    const balancesEl = document.getElementById('dashboard-balances');

    // Try to use cached data first
    const cachedUserData = localStorage.getItem('user_data');    
    
    try {
        // Check what authentication methods are available
        const hasFetchWithAuth = typeof fetchWithAuth === 'function';
        
        if (!hasFetchWithAuth) {
            throw new Error('fetchWithAuth not available in fallback mode');
        }
        
        // Use fetchWithAuth as fallback
        const data = await fetchWithAuth('/api/user/profile');
          if (data.success && data.user) {
            const user = data.user;
            if (usernameEl) usernameEl.textContent = user.username;
            if (refcodeEl) refcodeEl.textContent = user.referral_code || 'N/A';
            
            // Fetch balances separately
            try {
                const balancesData = await fetchWithAuth('/api/user/balances');
                
                if (balancesData.success && balancesEl) {
                    const mainBalance = parseFloat(balancesData.balances.main_balance || 0).toFixed(2);
                    const commissionBalance = parseFloat(balancesData.balances.commission_balance || 0).toFixed(2);
                    balancesEl.innerHTML = `Main: <strong>${mainBalance}</strong> USDT | Commission: <strong>${commissionBalance}</strong> USDT`;
                }
            } catch (error) {
                console.error('Error fetching balances:', error);
            }
            
            // Update localStorage cache
            localStorage.setItem('user_data', JSON.stringify(user));
            
            // Update membership tier display
            updateMembershipTier(user.tier || 'bronze');
        }
    } catch (error) {
        console.error('Error in fallback dashboard initialization:', error);
          // Use cached data as fallback
        if (cachedUserData) {
            try {
                const user = JSON.parse(cachedUserData);
                if (usernameEl) usernameEl.textContent = user.username;
                if (refcodeEl) refcodeEl.textContent = user.referral_code || 'N/A';
                if (balancesEl) balancesEl.innerHTML = 'Balance: Using cached data';
                
                updateMembershipTier(user.tier || 'bronze');
            } catch (e) {
                console.error('Error parsing cached user data:', e);
            }
        }
    }
}

// Wait for the DOM and then potentially wait for the sidebar component
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard script loaded');
    
    // Apply simplified i18n text conversion immediately
    updatePageTranslations();
    
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

    if (sidebarPlaceholder) {
        // If the sidebar placeholder exists, wait for the component to load
        sidebarPlaceholder.addEventListener('componentLoaded', (event) => {
            if (event.detail.path === '/components/sidebar.html') {
                console.log('Sidebar component loaded, initializing dashboard.');
                
                // Update translations again after sidebar loads
                updatePageTranslations();
                
                // Initialize dashboard after sidebar loads
                initializeDashboard();
            }
        });
    } else {
        // If there's no sidebar placeholder, initialize immediately
        console.warn('Sidebar placeholder not found, initializing dashboard immediately.');
        initializeDashboard();
    }
});

// Remove the old i18next language change listener since it's no longer available

/**
 * Fetch and update total withdrawals on the dashboard
 */
async function fetchTotalWithdrawals() {    
    try {
        console.log('Making API call to /api/user/withdrawals');
        
        const hasSimpleAuth = typeof SimpleAuth !== 'undefined' && typeof SimpleAuth.authenticatedFetch === 'function';
        const hasFetchWithAuth = typeof fetchWithAuth === 'function';
        
        if (!hasSimpleAuth && !hasFetchWithAuth) {
            throw new Error('No authentication method available');
        }
        
        const response = hasSimpleAuth ? 
                        await SimpleAuth.authenticatedFetch('/api/user/withdrawals') :
                        await fetchWithAuth('/api/user/withdrawals');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Total withdrawals API response:', data);
        
        const withdrawBalanceElement = document.getElementById('withdrawBalance');
        
        if (data && data.success && withdrawBalanceElement) {
            const totalWithdrawals = data.totalWithdrawals || 0;
            withdrawBalanceElement.textContent = `$${parseFloat(totalWithdrawals).toFixed(2)}`;
            console.log('Updated total withdrawals:', totalWithdrawals);
        } else {
            console.error('Failed to fetch total withdrawals:', data ? (data.message || 'Unknown error') : 'No data returned');
            if (withdrawBalanceElement) {
                withdrawBalanceElement.textContent = '$0.00';
            }
        }
    } catch (error) {
        console.error('Failed to fetch total withdrawals:', error.message || 'Unknown error');
        
        const withdrawBalanceElement = document.getElementById('withdrawBalance');
        if (withdrawBalanceElement) {
            withdrawBalanceElement.textContent = '$0.00';
        }
    }
}

/**
 * Fetch and update the drive progress on the dashboard using real-time session data
 */
async function fetchDriveProgress() {    
    try {
        console.log('Making API call to get real-time drive progress');
        
        // Check what authentication methods are available
        const hasSimpleAuth = typeof SimpleAuth !== 'undefined' && typeof SimpleAuth.authenticatedFetch === 'function';
        const hasFetchWithAuth = typeof fetchWithAuth === 'function';
        
        if (!hasSimpleAuth && !hasFetchWithAuth) {
            throw new Error('No authentication method available');
        }
        
        // First, get user ID from profile
        const profileResponse = hasSimpleAuth ? 
                        await SimpleAuth.authenticatedFetch('/api/user/profile') :
                        await fetchWithAuth('/api/user/profile');
        
        if (!profileResponse.ok) {
            throw new Error(`HTTP error getting profile! status: ${profileResponse.status}`);
        }
        
        const profileData = await profileResponse.json();
        
        if (!profileData.success || !profileData.user?.id) {
            throw new Error('Could not get user ID from profile');
        }
        
        const userId = profileData.user.id;
        
        // Now get real-time drive progress using admin endpoint pattern
        const response = hasSimpleAuth ? 
                        await SimpleAuth.authenticatedFetch(`/api/admin/drive-management/users/${userId}/drive-progress`) :
                        await fetchWithAuth(`/api/admin/drive-management/users/${userId}/drive-progress`);
        
        if (!response.ok) {
            // If admin endpoint fails, fall back to old endpoint
            console.warn('Admin drive progress endpoint failed, falling back to user endpoint');
            return await fetchDriveProgressFallback();
        }
        
        const data = await response.json();
        console.log('Real-time drive progress API response:', data);
        
        if (data && data.drive_session_id) {
            // Update the "Completed" counter with actual session data
            const completedEl = document.querySelector('[data-i18n="completedWorkingDays"]');
            if (completedEl) {
                const completedCount = data.completed_original_tasks || 0;
                completedEl.setAttribute('data-i18n-options', `{"count": ${completedCount}}`);
                completedEl.innerHTML = `<b>Completed (${completedCount})</b>`;
            }
            
            // Update the progress bar and text with real-time data
            const progressTextEl = document.querySelector('[data-i18n="progressWorkingDays"]');
            const progressBarEl = document.querySelector('.progress-bar.bg-info');
            
            if (progressTextEl && progressBarEl) {
                const completed = data.completed_original_tasks || 0;
                const total = data.total_task_items || 1;
                
                progressTextEl.setAttribute('data-i18n-options', `{"completed": ${completed}, "total": ${total}}`);
                progressTextEl.textContent = `Progress (${completed}/${total})`;
                
                const percentage = Math.min(Math.round((completed / total) * 100), 100);
                progressBarEl.style.width = `${percentage}%`;
                
                // Add a tooltip to show more details
                progressBarEl.setAttribute('title', `${percentage}% of current drive completed`);
                
                // Add drive configuration info
                const workingDaysDescEl = document.querySelector('[data-i18n="workingDaysDescription"]');
                if (workingDaysDescEl) {
                    workingDaysDescEl.innerHTML = `Current Drive: ${data.drive_configuration_name || 'Unknown'}`;
                    if (percentage === 100) {
                        workingDaysDescEl.innerHTML += '<span class="badge bg-success ms-2">Drive Complete!</span>';
                    }
                }
            }
            
            console.log('Real-time drive progress updated successfully');
        } else {
            console.log('No active drive session, showing default progress');
            await fetchDriveProgressFallback();
        }
    } catch (error) {
        console.error('Failed to fetch real-time drive progress:', error.message || 'Unknown error');
        console.error('Drive progress error details:', error);
        // Fall back to old system
        await fetchDriveProgressFallback();
    }
}

/**
 * Fallback function for drive progress using the old static system
 */
async function fetchDriveProgressFallback() {
    try {
        console.log('Using fallback drive progress system');
        
        const hasSimpleAuth = typeof SimpleAuth !== 'undefined' && typeof SimpleAuth.authenticatedFetch === 'function';
        const hasFetchWithAuth = typeof fetchWithAuth === 'function';
        
        const response = hasSimpleAuth ? 
                        await SimpleAuth.authenticatedFetch('/api/user/drive-progress') :
                        await fetchWithAuth('/api/user/drive-progress');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fallback drive progress API response:', data);
        
        if (data && data.success) {
            // Update using old system data
            const completedEl = document.querySelector('[data-i18n="completedWorkingDays"]');
            if (completedEl) {
                const completedCount = data.total_working_days || 0;
                completedEl.setAttribute('data-i18n-options', `{"count": ${completedCount}}`);
                completedEl.innerHTML = `<b>Completed (${completedCount})</b>`;
            }
            
            const progressTextEl = document.querySelector('[data-i18n="progressWorkingDays"]');
            const progressBarEl = document.querySelector('.progress-bar.bg-info');
            
            if (progressTextEl && progressBarEl) {
                const completed = data.weekly?.progress || 0;
                const total = data.weekly?.total || 7;
                
                progressTextEl.setAttribute('data-i18n-options', `{"completed": ${completed}, "total": ${total}}`);
                progressTextEl.textContent = `Progress (${completed}/${total})`;
                
                const percentage = Math.min(Math.round((completed / total) * 100), 100);
                progressBarEl.style.width = `${percentage}%`;
                progressBarEl.setAttribute('title', `${percentage}% of weekly goal completed`);
                
                if (data.today?.is_working_day) {
                    const workingDaysDescEl = document.querySelector('[data-i18n="workingDaysDescription"]');
                    if (workingDaysDescEl) {
                        workingDaysDescEl.innerHTML += '<span class="badge bg-success ms-2">Today Complete!</span>';
                    }
                }
            }
            
            console.log('Fallback drive progress updated successfully');
        }
    } catch (error) {
        console.error('Fallback drive progress also failed:', error);
    }
}

/**
 * Update the membership tier section based on user's current tier
 * @param {string} tier - User's membership tier (bronze, silver, gold, platinum)
 */
function updateMembershipTier(tier) {
    console.log(`Updating membership display for tier: ${tier}`);
    
    // Default to bronze if tier is not provided
    tier = tier || 'bronze';
    
    // Define tier-specific information
    const tierInfo = {        bronze: {
            displayName: 'Bronze Member',
            imageSrc: './assets/uploads/packages/bronze_665c04ea981d91717306602.PNG',
            commissionPerData: 1.0,
            commissionMergeData: 3.0,
            dataLimit: 40,
            setsPerDay: 2,
            withdrawalLimit: 25000,
            withdrawalTimes: 1,
            handlingFee: 0
        },
        silver: {
            displayName: 'Silver Member',
            imageSrc: './assets/uploads/packages/silver_665c0568227141717306728.PNG',
            commissionPerData: 1.2,
            commissionMergeData: 3.5,
            dataLimit: 40,
            setsPerDay: 2,
            withdrawalLimit: 35000,
            withdrawalTimes: 1,
            handlingFee: 0
        },
        gold: {
            displayName: 'Gold Member',
            imageSrc: './assets/uploads/packages/gold_665c05eea02a21717306862.PNG',
            commissionPerData: 1.5,
            commissionMergeData: 4.5,
            dataLimit: 45,
            setsPerDay: 2,
            withdrawalLimit: 50000,
            withdrawalTimes: 2,
            handlingFee: 0
        },
        platinum: {
            displayName: 'Platinum Member',
            imageSrc: './assets/uploads/packages/platinum_665c064b7faf81717306955.PNG',
            commissionPerData: 2.0,
            commissionMergeData: 5.0,
            dataLimit: 50,
            setsPerDay: 2,
            withdrawalLimit: 75000,
            withdrawalTimes: 3,
            handlingFee: 0
        }
    };
    
    // Get tier data
    const currentTier = tierInfo[tier.toLowerCase()] || tierInfo.bronze;
    
    // Update the DOM elements
    const tierImage = document.querySelector('.flex.justify-between.items-center img');
    const tierTitle = document.querySelector('[data-i18n="eliteMemberTitle"]');
    const commissionPerData = document.querySelector('[data-i18n="eliteMemberCommissionPerData"]');
    const commissionMergeData = document.querySelector('[data-i18n="eliteMemberCommissionMergeData"]');
    const dataLimit = document.querySelector('[data-i18n="eliteMemberDataLimit"]');
    const withdrawalLimit = document.querySelector('[data-i18n="eliteMemberWithdrawalLimit"]');
    const withdrawalTimes = document.querySelector('[data-i18n="eliteMemberWithdrawalTimes"]');
    const handlingFee = document.querySelector('[data-i18n="eliteMemberHandlingFee"]');
    
    // Update image source
    if (tierImage) {
        tierImage.src = currentTier.imageSrc;
        tierImage.alt = currentTier.displayName;
    }
      // Update tier information with fallback text
    if (tierTitle) {
        tierTitle.textContent = currentTier.displayName;
    }
      // Update commission per data
    if (commissionPerData) {
        commissionPerData.textContent = `● ${currentTier.commissionPerData}% commission per data`;
    }
    
    // Update commission for merge data
    if (commissionMergeData) {
        commissionMergeData.textContent = `● ${currentTier.commissionMergeData}% commission for merge data`;
    }
    
    // Update data limit
    if (dataLimit) {
        dataLimit.textContent = `● Limited to ${currentTier.dataLimit} data per set, ${currentTier.setsPerDay} sets of data everyday`;
    }
    
    // Update withdrawal limit
    if (withdrawalLimit) {
        withdrawalLimit.textContent = `● withdrawal limit: ${currentTier.withdrawalLimit} USDT`;
    }
    
    // Update withdrawal times
    if (withdrawalTimes) {
        withdrawalTimes.textContent = `● ${currentTier.withdrawalTimes} times of withdrawal`;
    }
    
    // Update handling fee
    if (handlingFee) {
        handlingFee.textContent = `● ${currentTier.handlingFee}% handling fee`;
    }
      // If i18next is initialized, update translations
    if (window.i18next && window.i18next.isInitialized) {
        updatePageTranslations();
    }
    
    // Add a badge or visual indicator for the tier level
    const membershipHeader = document.querySelector('[data-i18n="tierMembershipHeader"]');
    if (membershipHeader) {
        // Remove any existing badges
        const existingBadge = membershipHeader.querySelector('.tier-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Create and add a new badge
        const badge = document.createElement('span');
        badge.className = `tier-badge badge ms-2 bg-${tier.toLowerCase()}`;
        badge.textContent = tier.charAt
        badge.style.marginLeft = '5px';
        badge.style.fontSize = '10px';
        
        // Set badge color based on tier
        switch(tier.toLowerCase()) {
            case 'bronze':
                badge.style.backgroundColor = '#CD7F32';
                break;
            case 'silver':
                badge.style.backgroundColor = '#C0C0C0';
                badge.style.color = '#333';
                break;
            case 'gold':
                badge.style.backgroundColor = '#FFD700';
                badge.style.color = '#333';
                break;
            case 'platinum':
                badge.style.backgroundColor = '#E5E4E2';
                badge.style.color = '#333';
                break;
        }
        
        // Insert after the "Tier Membership" text but before the "View more" link
        const viewMoreLink = membershipHeader.querySelector('span');
        if (viewMoreLink) {
            membershipHeader.insertBefore(badge, viewMoreLink);
        } else {
            membershipHeader.appendChild(badge);
        }
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

// Make it globally available
window.generateUserInitials = generateUserInitials;

// Check if SimpleAuth is available and retry if needed
function checkAndInitializeDashboard() {
    if (typeof SimpleAuth !== 'undefined') {
        console.log('SimpleAuth is now available, initializing dashboard');
        initializeDashboard();
    } else if (typeof fetchWithAuth === 'function') {
        console.log('Using fallback authentication for dashboard');
        const authData = isAuthenticated();
        if (authData) {
            initializeDashboardWithFallback(authData);
        }
    } else {
        console.warn('No authentication system available, will retry in 500ms');
        setTimeout(checkAndInitializeDashboard, 500);
    }
}

// Make functions globally available
window.checkAndInitializeDashboard = checkAndInitializeDashboard;
window.initializeDashboard = initializeDashboard;
window.displayFrozenState = displayFrozenState;

// Function to display frozen state popup modal
function displayFrozenState(message, amountNeeded, tasksCompleted = '0 of 0', totalCommission = '0.00') {
    console.log('=== displayFrozenState called from dashboard.js ===');
    console.log('Message:', message);
    console.log('Amount needed:', amountNeeded);
    console.log('Tasks completed:', tasksCompleted);
    console.log('Total commission:', totalCommission);
    
    // Remove existing modal if present
    const existingModal = document.getElementById('drive-frozen-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Calculate progress percentage
    let percentage = 0;
    if (tasksCompleted && tasksCompleted !== '0 of 0' && tasksCompleted !== 'undefined of undefined') {
        const match = tasksCompleted.match(/(\d+)\s*of\s*(\d+)/);
        if (match) {
            const completed = parseInt(match[1]);
            const total = parseInt(match[2]);
            if (!isNaN(completed) && !isNaN(total) && total > 0) {
                percentage = Math.min((completed / total) * 100, 100);
            }
        }
    }

    // Find the progress section to insert the modal before it
    const progressSection = document.querySelector('.progress-section');
    const insertTarget = progressSection || document.body;
    if (!progressSection) {
        console.warn('Progress section not found, using body as fallback');
    }

    // Create modal with better positioning
    const modalHTML = `
        <div id="drive-frozen-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.85) !important;
            backdrop-filter: blur(10px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        ">
            <div style="
                background: linear-gradient(145deg, #2d3748 0%, #4a5568 50%, #667eea 100%) !important;
                border-radius: 24px !important;
                box-shadow: 
                    0 40px 120px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
                max-width: 500px !important;
                width: 100% !important;
                max-height: 95vh !important;
                overflow-y: auto !important;
                position: relative !important;
                color: white !important;
                transform: scale(0.9) !important;
                animation: modalEntrance 0.5s ease-out forwards !important;
            ">
                <div style="
                    padding: 45px 40px 40px !important;
                    text-align: center !important;
                    position: relative !important;
                ">
                    <!-- Close Button -->
                    <button id="drive-frozen-close" style="
                        position: absolute !important;
                        top: 20px !important;
                        right: 20px !important;
                        background: rgba(255, 255, 255, 0.15) !important;
                        border: none !important;
                        border-radius: 50% !important;
                        width: 44px !important;
                        height: 44px !important;
                        color: white !important;
                        font-size: 20px !important;
                        cursor: pointer !important;
                        transition: all 0.3s ease !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-weight: bold !important;
                        backdrop-filter: blur(10px) !important;
                    " onmouseover="this.style.background='rgba(255,255,255,0.25)'; this.style.transform='scale(1.1) rotate(90deg)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'; this.style.transform='scale(1) rotate(0deg)'">×</button>
                    
                    <!-- Icon with enhanced animation -->
                    <div style="margin-bottom: 25px !important;">
                        <div style="
                            width: 120px !important;
                            height: 120px !important;
                            background: radial-gradient(circle, rgba(255, 215, 0, 0.2), transparent) !important;
                            border-radius: 50% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            margin: 0 auto !important;
                            animation: iconPulse 3s infinite ease-in-out !important;
                        ">
                            <i class="fas fa-exclamation-triangle" style="
                                font-size: 64px !important;
                                color: #FFD700 !important;
                                text-shadow: 0 0 30px rgba(255, 215, 0, 0.5) !important;
                                animation: iconGlow 2s infinite alternate !important;
                            "></i>
                        </div>
                    </div>
                    
                    <!-- Title with gradient -->
                    <h2 style="
                        font-size: 32px !important;
                        font-weight: 800 !important;
                        margin: 0 0 15px 0 !important;
                        background: linear-gradient(135deg, #FFD700, #FFA500) !important;
                        -webkit-background-clip: text !important;
                        -webkit-text-fill-color: transparent !important;
                        background-clip: text !important;
                        text-shadow: none !important;
                    ">🔒 Account Frozen</h2>
                    
                    <!-- Message -->
                    <p style="
                        font-size: 18px !important;
                        margin: 0 0 25px 0 !important;
                        opacity: 0.9 !important;
                        line-height: 1.6 !important;
                        color: #e2e8f0 !important;
                    ">${message}</p>
                    
                    <!-- Amount Section with better styling -->
                    ${amountNeeded ? `
                    <div style="
                        font-size: 20px !important;
                        margin-bottom: 30px !important;
                        padding: 20px !important;
                        background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1)) !important;
                        border-radius: 16px !important;
                        border: 2px solid rgba(239, 68, 68, 0.3) !important;
                        backdrop-filter: blur(20px) !important;
                    ">
                        <div style="font-size: 16px; color: #fecaca; margin-bottom: 8px;">Amount needed:</div>
                        <div style="
                            color: #FFD700 !important;
                            font-weight: 900 !important;
                            font-size: 28px !important;
                            text-shadow: 0 0 20px rgba(255, 215, 0, 0.4) !important;
                        ">${amountNeeded} USDT</div>
                    </div>
                    ` : ''}
                    
                    <!-- Enhanced Stats Section -->
                    <div style="
                        margin-bottom: 35px !important;
                        padding: 25px !important;
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)) !important;
                        border-radius: 20px !important;
                        border: 1px solid rgba(255, 255, 255, 0.15) !important;
                        backdrop-filter: blur(20px) !important;
                    ">
                        <!-- Progress Section -->
                        <div style="margin-bottom: 25px !important;">
                            <div style="
                                font-size: 14px !important;
                                opacity: 0.8 !important;
                                margin-bottom: 12px !important;
                                color: #cbd5e0 !important;
                                text-transform: uppercase !important;
                                letter-spacing: 1px !important;
                                font-weight: 600 !important;
                            ">Drive Progress</div>
                            <div style="
                                font-size: 20px !important;
                                font-weight: 700 !important;
                                margin-bottom: 15px !important;
                                color: #FFD700 !important;
                            ">${tasksCompleted} ${percentage > 0 ? `(${Math.round(percentage)}%)` : ''}</div>
                            
                            <!-- Enhanced Progress Bar -->
                            <div style="
                                width: 100% !important;
                                height: 12px !important;
                                background: rgba(255, 255, 255, 0.15) !important;
                                border-radius: 8px !important;
                                overflow: hidden !important;
                                margin-bottom: 10px !important;
                                box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                                position: relative !important;
                            ">
                                <div id="drive-progress-bar" style="
                                    height: 100% !important;
                                    background: linear-gradient(90deg, #4ECDC4 0%, #44A08D 50%, #36D1DC 100%) !important;
                                    border-radius: 8px !important;
                                    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                                    width: ${percentage}% !important;
                                    box-shadow: 0 0 15px rgba(78, 205, 196, 0.6) !important;
                                    position: relative !important;
                                ">
                                    <div style="
                                        position: absolute !important;
                                        top: 0 !important;
                                        left: 0 !important;
                                        right: 0 !important;
                                        bottom: 0 !important;
                                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent) !important;
                                        animation: shimmer 2s infinite !important;
                                    "></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Commission with enhanced styling -->
                        <div style="margin: 0 !important; text-align: center !important;">
                            <div style="
                                color: #4ECDC4 !important;
                                font-size: 24px !important;
                                font-weight: 900 !important;
                                text-shadow: 0 0 20px rgba(78, 205, 196, 0.4) !important;
                                margin-bottom: 8px !important;
                            ">${totalCommission} USDT</div>
                            <div style="
                                display: block !important;
                                opacity: 0.8 !important;
                                font-size: 14px !important;
                                line-height: 1.5 !important;
                                color: #cbd5e0 !important;
                            ">Your earned commission is safe and will be available when you resume</div>
                        </div>
                    </div>
                    
                    <!-- Enhanced Buttons -->
                    <div style="
                        display: flex !important;
                        gap: 18px !important;
                        flex-direction: column !important;
                    ">
                        <button id="drive-deposit-funds-btn" style="
                            padding: 18px 28px !important;
                            border-radius: 16px !important;
                            border: none !important;
                            font-weight: 700 !important;
                            font-size: 17px !important;
                            cursor: pointer !important;
                            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            gap: 12px !important;
                            text-transform: uppercase !important;
                            letter-spacing: 1px !important;
                            min-height: 58px !important;
                            background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 50%, #36D1DC 100%) !important;
                            color: white !important;
                            box-shadow: 0 8px 30px rgba(78, 205, 196, 0.4) !important;
                            position: relative !important;
                            overflow: hidden !important;
                        " onmouseover="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 12px 40px rgba(78, 205, 196, 0.6)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 30px rgba(78, 205, 196, 0.4)'">
                            <i class="fas fa-plus-circle"></i> Deposit Funds
                        </button>
                        
                        <button id="drive-contact-support-btn" style="
                            padding: 18px 28px !important;
                            border-radius: 16px !important;
                            border: 2px solid rgba(255, 255, 255, 0.3) !important;
                            font-weight: 700 !important;
                            font-size: 17px !important;
                            cursor: pointer !important;
                            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            gap: 12px !important;
                            text-transform: uppercase !important;
                            letter-spacing: 1px !important;
                            min-height: 58px !important;
                            background: rgba(255, 255, 255, 0.08) !important;
                            color: white !important;
                            backdrop-filter: blur(20px) !important;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(255, 255, 255, 0.5)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.transform='translateY(0)'; this.style.borderColor='rgba(255, 255, 255, 0.3)'">
                            <i class="fas fa-headset"></i> Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <style id="drive-frozen-modal-styles">
            @keyframes modalEntrance {
                0% { 
                    opacity: 0;
                    transform: scale(0.7) translateY(-50px);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.05) translateY(0);
                }
                100% { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes iconPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes iconGlow {
                0% { text-shadow: 0 0 30px rgba(255, 215, 0, 0.5); }
                100% { text-shadow: 0 0 50px rgba(255, 215, 0, 0.8), 0 0 70px rgba(255, 215, 0, 0.3); }
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.9); }
            }
        </style>
    `;

    // Insert modal before progress section or append to body as fallback
    if (insertTarget === document.body) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('Modal appended to body (fallback)');
    } else {
        insertTarget.insertAdjacentHTML('beforebegin', modalHTML);
        console.log('Modal inserted before progress section');
    }

    // Get modal elements and add event listeners
    const modal = document.getElementById('drive-frozen-modal');
    const closeBtn = document.getElementById('drive-frozen-close');
    const depositBtn = document.getElementById('drive-deposit-funds-btn');
    const supportBtn = document.getElementById('drive-contact-support-btn');

    // Close button event
    closeBtn.addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => modal.remove(), 300);
    });

    // Close on overlay click (clicking outside modal)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => modal.remove(), 300);
        }
    });

    // Deposit funds button
    depositBtn.addEventListener('click', () => {
        modal.remove();
        window.location.href = './deposits.html';
    });

    // Contact support button
    supportBtn.addEventListener('click', () => {
        modal.remove();
        window.location.href = './contact.html';
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Test function to manually trigger the frozen modal (for debugging)
window.testFrozenModal = function() {
    console.log('Testing frozen modal from dashboard...');
    displayFrozenState(
        'Drive frozen. Please deposit funds and contact admin.',
        '100.00',
        '3 of 5',
        '25.50'
    );
};
