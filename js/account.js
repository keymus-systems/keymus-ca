document.addEventListener('DOMContentLoaded', () => {
    // API Endpoints
    const profileUrl = `${window.API_BASE_URL || '.'}/api/user/profile`;
    const balancesUrl = `${window.API_BASE_URL || '.'}/api/user/balances`;
    const driveProgressUrl = `${window.API_BASE_URL || '.'}/api/user/drive-progress`;
    
    // DOM Elements
    const usernameElem = document.getElementById('account-username');
    const referralCodeElem = document.getElementById('account-referral-code');
    const copyReferralBtn = document.getElementById('copy-referral-btn');
    const tierImageElem = document.getElementById('account-tier-image');
    const dailyProfitsElem = document.getElementById('account-daily-profits');
    const totalBalanceElem = document.getElementById('account-total-balance');
    const frozenBalanceElem = document.getElementById('account-frozen-balance');
    
    // Credit Score Elements
    const creditScoreNumber = document.getElementById('credit-score-number');
    const creditScoreProgress = document.getElementById('credit-score-progress');
    const creditScoreRating = document.getElementById('credit-score-rating');
    const creditScoreDetails = document.getElementById('credit-score-details');
    const avgDrivesElem = document.getElementById('avg-drives');
    // Use centralized authentication check - but handle gracefully
    const authData = isAuthenticated(); // Use silent check instead of requireAuth
    
    if (!authData || !authData.token) {
        console.warn('User not authenticated on account page');
        // Show error state instead of redirecting
        setErrorState('Please log in to view account information');
        return;
    }    // Tier Image Mapping
    const tierImagePaths = {
        bronze: './assets/uploads/packages/bronze_665c04ea981d91717306602.PNG',
        silver: './assets/uploads/packages/silver_665c0568227141717306728.PNG',
        gold: './assets/uploads/packages/gold_665c05eea02a21717306862.PNG',
        platinum: './assets/uploads/packages/platinum_665c064b7faf81717306955.PNG',
        default: './assets/uploads/v2.PNG'
    };
    
    // Helper function to format balance display
    const formatBalance = (value) => {
        const amount = parseFloat(value || 0).toFixed(2);
        return `$${amount}<small style="font-size:14px"> USDT</small>`;
    };

    // Global variable to store referral code
    let currentReferralCode = '';

    // Credit Score Configuration
    const DAILY_DRIVE_TARGET = 2;
    const CREDIT_SCORE_DAYS = 30; // Calculate over last 30 days

    // Credit Score Calculation Functions
    const calculateCreditScore = (driveProgressData) => {
        try {
            console.log('Calculating credit score with data:', driveProgressData);
            
            // The API now returns: { data: { today, weekly, monthly, total_working_days } }
            if (!driveProgressData || !driveProgressData.data) {
                console.log('No valid drive progress data available');
                return {
                    score: 0,
                    rating: 'very-poor',
                    ratingText: 'No Data',
                    avgDrives: 0,
                    totalWorkingDays: 0
                };
            }

            const data = driveProgressData.data;
            const today = data.today || {};
            const monthly = data.monthly || {};
            const totalWorkingDays = data.total_working_days || 0;

            // Get monthly progress data (last 30 days)
            const monthlyProgress = monthly.progress || [];
            
            console.log(`Monthly progress entries: ${monthlyProgress.length}, Total working days: ${totalWorkingDays}`);

            if (monthlyProgress.length === 0) {
                // No historical data - new user or no drives yet
                const todayDrives = parseInt(today.drives_completed || 0);
                
                if (todayDrives === 0) {
                    // Complete newcomer - show encouraging message
                    return {
                        score: 0,
                        rating: 'newcomer',
                        ratingText: 'New User',
                        avgDrives: '0.0',
                        totalWorkingDays: 0,
                        isNewUser: true
                    };
                } else {
                    // Has done some drives today
                    const score = Math.min(Math.round((todayDrives / DAILY_DRIVE_TARGET) * 100), 100);
                    
                    let rating, ratingText;
                    if (score >= 90) { rating = 'excellent'; ratingText = 'Excellent'; }
                    else if (score >= 70) { rating = 'good'; ratingText = 'Good'; }
                    else if (score >= 50) { rating = 'fair'; ratingText = 'Fair'; }
                    else if (score >= 30) { rating = 'poor'; ratingText = 'Poor'; }
                    else { rating = 'very-poor'; ratingText = 'Very Poor'; }

                    return {
                        score,
                        rating,
                        ratingText,
                        avgDrives: todayDrives.toFixed(1),
                        totalWorkingDays: 0,
                        isNewUser: true
                    };
                }
            }

            // Calculate total drives and working days over the last 30 days
            let totalDrives = 0;
            let workingDays = 0;
            
            monthlyProgress.forEach(day => {
                if (day.is_working_day) {
                    workingDays++;
                    totalDrives += parseInt(day.drives_completed || 0);
                }
            });

            console.log(`Total drives: ${totalDrives}, Working days: ${workingDays}`);

            // Calculate average drives per working day
            const avgDrives = workingDays > 0 ? totalDrives / workingDays : 0;
            
            // Calculate credit score as percentage of target (2 drives per day)
            const scorePercentage = (avgDrives / DAILY_DRIVE_TARGET) * 100;
            const score = Math.min(Math.round(scorePercentage), 100); // Cap at 100

            // Determine rating based on score
            let rating, ratingText;
            if (score >= 90) {
                rating = 'excellent';
                ratingText = 'Excellent';
            } else if (score >= 70) {
                rating = 'good';
                ratingText = 'Good';
            } else if (score >= 50) {
                rating = 'fair';
                ratingText = 'Fair';
            } else if (score >= 30) {
                rating = 'poor';
                ratingText = 'Poor';
            } else {
                rating = 'very-poor';
                ratingText = 'Very Poor';
            }

            return {
                score,
                rating,
                ratingText,
                avgDrives: avgDrives.toFixed(1),
                totalWorkingDays: workingDays
            };
        } catch (error) {
            console.error('Error calculating credit score:', error);
            return {
                score: 0,
                rating: 'very-poor',
                ratingText: 'Error',
                avgDrives: 0,
                totalWorkingDays: 0
            };
        }
    };

    // Update Credit Score Display
    const updateCreditScoreDisplay = (creditData) => {
        try {
            console.log('Updating credit score display with:', creditData);
            
            // Handle new user case with special messaging
            if (creditData.isNewUser && creditData.score === 0) {
                // Special handling for brand new users
                if (creditScoreNumber) {
                    creditScoreNumber.textContent = '--';
                }

                if (creditScoreProgress) {
                    creditScoreProgress.style.width = '5%'; // Small visual indicator
                    creditScoreProgress.classList.remove('excellent', 'good', 'fair', 'poor', 'very-poor');
                    creditScoreProgress.classList.add('newcomer');
                }

                if (creditScoreRating) {
                    creditScoreRating.textContent = 'Welcome!';
                    creditScoreRating.classList.remove('excellent', 'good', 'fair', 'poor', 'very-poor');
                    creditScoreRating.classList.add('newcomer');
                }

                if (creditScoreDetails) {
                    creditScoreDetails.innerHTML = 'Complete your first drive to build your score';
                }

                return;
            }
            
            // Update score number
            if (creditScoreNumber) {
                creditScoreNumber.textContent = creditData.score;
            }

            // Update progress bar
            if (creditScoreProgress) {
                creditScoreProgress.style.width = `${creditData.score}%`;
                // Remove existing rating classes
                creditScoreProgress.classList.remove('excellent', 'good', 'fair', 'poor', 'very-poor', 'newcomer');
                // Add new rating class
                creditScoreProgress.classList.add(creditData.rating);
            }

            // Update rating badge
            if (creditScoreRating) {
                creditScoreRating.textContent = creditData.ratingText;
                // Remove existing rating classes
                creditScoreRating.classList.remove('excellent', 'good', 'fair', 'poor', 'very-poor', 'newcomer');
                // Add new rating class
                creditScoreRating.classList.add(creditData.rating);
            }

            // Update details with contextual messaging
            if (creditScoreDetails && avgDrivesElem) {
                avgDrivesElem.textContent = creditData.avgDrives;
                
                if (creditData.isNewUser) {
                    creditScoreDetails.innerHTML = `<span id="avg-drives">${creditData.avgDrives}</span> drives today - keep going!`;
                } else {
                    creditScoreDetails.innerHTML = `<span id="avg-drives">${creditData.avgDrives}</span> avg drives/day over 30 days`;
                }
            }

            console.log('Credit score display updated successfully');
        } catch (error) {
            console.error('Error updating credit score display:', error);
        }
    };

    // Fetch and Update Credit Score
    const updateCreditScore = async () => {
        try {
            console.log('Fetching drive progress data for credit score...');
            
            // Determine which fetch function to use
            const fetchFunction = typeof SimpleAuth !== 'undefined' && SimpleAuth.authenticatedFetch ? 
                SimpleAuth.authenticatedFetch.bind(SimpleAuth) : 
                fetchWithAuth;
                
            const driveProgressResponse = await fetchFunction('/api/user/drive-progress');
            
            // Handle different response formats
            let driveProgressData;
            if (driveProgressResponse && typeof driveProgressResponse.json === 'function') {
                driveProgressData = await driveProgressResponse.json();
            } else {
                driveProgressData = driveProgressResponse;
            }
            
            console.log('Drive progress response:', driveProgressData);

            if (driveProgressData.success) {
                const creditData = calculateCreditScore(driveProgressData.data);
                updateCreditScoreDisplay(creditData);
            } else {
                console.error('Failed to fetch drive progress:', driveProgressData.message);
                // Show graceful new user state instead of error
                updateCreditScoreDisplay({
                    score: 0,
                    rating: 'newcomer',
                    ratingText: 'Welcome!',
                    avgDrives: '0.0',
                    totalWorkingDays: 0,
                    isNewUser: true
                });
            }
        } catch (error) {
            console.error('Error updating credit score:', error);
            // Show graceful new user state for any errors
            updateCreditScoreDisplay({
                score: 0,
                rating: 'newcomer',
                ratingText: 'Welcome!',
                avgDrives: '0.0',
                totalWorkingDays: 0,
                isNewUser: true
            });
        }
    };

    // Copy to clipboard functionality
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // Modern async clipboard API
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            console.error('Failed to copy text: ', error);
            return false;
        }
    };

    // Setup copy button functionality
    const setupCopyFunctionality = () => {
        if (copyReferralBtn) {
            copyReferralBtn.addEventListener('click', async () => {
                if (!currentReferralCode) {
                    if (typeof showNotification === 'function') {
                        showNotification('No referral code available to copy', 'warning');
                    }
                    return;
                }

                const success = await copyToClipboard(currentReferralCode);
                
                if (success) {
                    // Visual feedback - change icon temporarily
                    const icon = copyReferralBtn.querySelector('i');
                    const originalClass = icon.className;
                    icon.className = 'fas fa-check';
                    copyReferralBtn.style.color = '#28a745';
                    
                    setTimeout(() => {
                        icon.className = originalClass;
                        copyReferralBtn.style.color = '';
                    }, 2000);

                    if (typeof showNotification === 'function') {
                        showNotification('Referral code copied to clipboard!', 'success');
                    }
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('Failed to copy referral code', 'error');
                    }
                }
            });
        }
    };// Helper function to update DOM with error state
    const setErrorState = (message = 'Error loading data') => {
        console.error('Setting error state:', message);
        
        // Update UI elements with error states
        if (usernameElem) usernameElem.textContent = 'Not Available';
        if (referralCodeElem) referralCodeElem.textContent = 'Not Available';
        if (dailyProfitsElem) dailyProfitsElem.innerHTML = formatBalance(0);
        if (totalBalanceElem) totalBalanceElem.innerHTML = formatBalance(0);
        if (frozenBalanceElem) frozenBalanceElem.innerHTML = formatBalance(0);
        if (tierImageElem) tierImageElem.src = tierImagePaths.default;
        
        // Show notification if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        }
        
        // Add login button if not authenticated
        if (!isAuthenticated()) {
            const container = document.querySelector('.container');
            if (container) {
                const loginButton = document.createElement('div');
                loginButton.className = 'd-grid gap-2 mt-4';
                loginButton.innerHTML = `
                    <a href="./login.html" class="btn btn-modern">
                        <i class="fas fa-sign-in-alt me-2"></i> Login to View Account
                    </a>
                `;
                container.appendChild(loginButton);
            }
        }
    };    // Auto-update function to refresh account data
    const updateAccountData = async () => {
        try {
            console.log('Fetching account data...');
            
            // Determine which fetch function to use
            const fetchFunction = typeof SimpleAuth !== 'undefined' && SimpleAuth.authenticatedFetch ? 
                SimpleAuth.authenticatedFetch.bind(SimpleAuth) : 
                fetchWithAuth;
                
            // Use fetchWithAuth for better error handling
            const [profileData, balancesData] = await Promise.all([
                fetchFunction('/api/user/profile'),
                fetchFunction('/api/user/balances')
            ]);
            
            console.log('Profile data:', profileData);
            console.log('Balances data:', balancesData);

            // Handle different response formats
            let processedProfileData;
            if (profileData && typeof profileData.json === 'function') {
                // This is a Response object, parse it
                processedProfileData = await profileData.json();
            } else {
                // This is already parsed data
                processedProfileData = profileData;
            }
            
            console.log('Processed profile data:', processedProfileData);
            
            // Update Profile Info
            if (processedProfileData.success && processedProfileData.user) {
                const user = processedProfileData.user;
                console.log('User data:', user);
                
                if (usernameElem) {
                    usernameElem.textContent = user.username || 'N/A';
                    console.log('Updated username to:', user.username);
                }
                
                if (referralCodeElem) {
                    const referralCode = user.referral_code || 'N/A';
                    referralCodeElem.textContent = referralCode;
                    currentReferralCode = referralCode; // Store for copying
                    console.log('Updated referral code to:', referralCode);
                }

                // Update Tier Image
                if (tierImageElem) {
                    const tier = user.tier ? user.tier.toLowerCase() : 'default';
                    const imagePath = tierImagePaths[tier] || tierImagePaths.default;
                    tierImageElem.style.backgroundImage = `url(${imagePath})`;
                }
            } else {
                console.error('Profile data fetch failed:', profileData.message);
                setErrorState(`Profile error: ${profileData.message || 'Unknown error'}`);
                return;
            }

            // Handle different response formats for balances
            let processedBalanceData;
            if (balancesData && typeof balancesData.json === 'function') {
                // This is a Response object, parse it
                processedBalanceData = await balancesData.json();
            } else {
                // This is already parsed data
                processedBalanceData = balancesData;
            }
            
            console.log('Processed balance data:', processedBalanceData);
            
            // Update Balances with animation
            if (processedBalanceData.success && processedBalanceData.balances) {
                const balances = processedBalanceData.balances;
                console.log('Balance data:', balances);
                
                // Add update animation
                const updateWithAnimation = (element, newValue) => {
                    if (element) {
                        console.log(`Updating element with value: ${newValue}`);
                        element.style.transition = 'opacity 0.3s ease';
                        element.style.opacity = '0.7';
                        setTimeout(() => {
                            element.innerHTML = formatBalance(newValue);
                            element.style.opacity = '1';
                        }, 150);
                    }
                };                // Get commission balance for daily profits
                const commissionBalance = parseFloat(balances.commission_balance || 0);
                console.log('Commission balance:', commissionBalance);
                updateWithAnimation(dailyProfitsElem, commissionBalance);
                
                // Calculate total balance (main + commission) to match dashboard
                const mainBalance = parseFloat(balances.main_balance || 0);
                console.log('Main balance:', mainBalance);
                const totalBalance = mainBalance + commissionBalance;
                console.log('Total balance:', totalBalance);
                updateWithAnimation(totalBalanceElem, totalBalance);
                
                // Update frozen balance
                const frozenBalance = parseFloat(balances.frozen_balance || 0);
                console.log('Frozen balance:', frozenBalance);
                updateWithAnimation(frozenBalanceElem, frozenBalance);
            } else {
                console.error('Balances data fetch failed:', processedBalanceData.message || 'Unknown error');
                // Update UI with zeros but don't show full error state
                updateWithAnimation(dailyProfitsElem, 0);
                updateWithAnimation(totalBalanceElem, 0);
                updateWithAnimation(frozenBalanceElem, 0);
                
                // Show notification if available
                if (typeof showNotification === 'function') {
                    showNotification('Could not load balance data', 'warning');
                }
            }

            // Update Credit Score (independent of other data)
            await updateCreditScore();

        } catch (error) {
            console.error('Error updating account data:', error);
            // Try to show as much data as possible even if one call fails
            if (typeof showNotification === 'function') {
                showNotification(`Error: ${error.message}`, 'error');
            }
        }
    };// Initial load
    updateAccountData().catch(error => {
        console.error('Initial account data load failed:', error);
        setErrorState(`Error loading account data: ${error.message}`);
    });

    // Setup copy functionality
    setupCopyFunctionality();// Initialize logout functionality
    if (typeof attachLogoutHandlers === 'function') {
        attachLogoutHandlers();
    } else {
        console.warn('attachLogoutHandlers not available, setting up fallback');
        // Fallback logout handler for account page
        const accountLogoutBtn = document.getElementById('account-logout-btn');        if (accountLogoutBtn) {
            accountLogoutBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                console.log('Account logout clicked (fallback)...');
                
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
                    // Clear authentication data
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    
                    // Show notification if available
                    if (typeof showNotification === 'function') {
                        showNotification('Logout successful!', 'success');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 1000);
                    } else {
                        window.location.href = 'login.html';
                    }
                }
            });
        }
    }

    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(updateAccountData, 30000);

    // Clean up interval when page is hidden/unloaded
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(refreshInterval);
        } else {
            // Refresh immediately when page becomes visible again
            updateAccountData();
            // Restart the interval
            setInterval(updateAccountData, 30000);
        }
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(refreshInterval);
    });
});
