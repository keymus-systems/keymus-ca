// --- Login Form Handling ---
async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.target;
    clearErrors(form); // Clear previous errors from main.js
    console.log('Login form submitted via auth.js');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = form.querySelector('button[type="submit"]');
    const originalButtonText = loginButton.textContent;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Basic Client-Side Validation
    let isValid = true;
    if (!username) {
        showError(usernameInput, 'Username or email is required.'); // Use showError from main.js
        isValid = false;
    }
    if (!password) {
        showError(passwordInput, 'Password is required.'); // Use showError from main.js
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        console.log('Login API response:', data);        if (response.ok && data.success) {
            // Use simple auth system to store token and user data
            const isAdmin = data.user?.role === 'admin';
            
            // Store auth data using SimpleAuth system
            if (typeof SimpleAuth !== 'undefined') {
                SimpleAuth.storeAuth(data.token, data.user);
                console.log('Auth data stored via SimpleAuth');
            } else {
                // Fallback to localStorage
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                console.log('Auth data stored via localStorage fallback');
            }

            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                // Redirect based on the role received from the backend
                const redirectPath = isAdmin ? 'admin.html' : 'dashboard.html';
                window.location.href = redirectPath;
            }, 1000);
        }else {
            // Use server's error message or a default
            const message = data.message || `Login failed (Status: ${response.status})`;
            showNotification(message, 'error');
            console.error('Login failed:', message);
        }
    } catch (error) {
        console.error('Login fetch error:', error);
        showNotification('Network error during login. Please try again.', 'error');
    } finally {
        loginButton.textContent = originalButtonText;
        loginButton.disabled = false;
    }
}

// --- Registration Form Handling ---

// Re-implement validation logic here or ensure it's globally available from main.js
function validateRegistrationForm() {
    let isValid = true;
    const form = document.getElementById('signupForm');
    clearErrors(form); // Clear previous errors

    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const repeatPassword = document.getElementById('repeat-password');
    const referralCode = document.getElementById('referralCode');
    const revenueSource = form.querySelector('input[name="revenue_source"]:checked');

    if (!firstName.value.trim()) { showError(firstName, 'First name is required'); isValid = false; }
    if (!lastName.value.trim()) { showError(lastName, 'Last name is required'); isValid = false; }
    if (!username.value.trim()) { showError(username, 'Username is required'); isValid = false; }
    if (!email.value.trim() || !email.value.includes('@')) { showError(email, 'Valid email is required'); isValid = false; }
    if (!referralCode.value.trim()) { showError(referralCode, 'Referral code is required'); isValid = false; }
    if (password.value.length < 8) { showError(password, 'Password must be at least 8 characters'); isValid = false; }
    if (password.value !== repeatPassword.value) { showError(repeatPassword, 'Passwords do not match'); isValid = false; }
    if (!revenueSource) { const radioGroup = form.querySelector('.radio-group'); showError(radioGroup, 'Please select a revenue source'); isValid = false; }

    // Additional name validation
    if (firstName.value.trim().length < 2) { showError(firstName, 'First name must be at least 2 characters'); isValid = false; }
    if (lastName.value.trim().length < 2) { showError(lastName, 'Last name must be at least 2 characters'); isValid = false; }
    if (username.value.trim().length < 3) { showError(username, 'Username must be at least 3 characters'); isValid = false; }

    return isValid;
}


async function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.target;
    console.log('Register form submitted via auth.js');

    if (!validateRegistrationForm()) {
        console.log('Registration form validation failed');
        showNotification('Please correct the errors in the form.', 'error');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Creating account...';
    submitButton.disabled = true;

const formData = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    repeatPassword: document.getElementById('repeat-password').value.trim(),
    referralCode: document.getElementById('referralCode').value.trim(),
    revenueSource: form.querySelector('input[name="revenue_source"]:checked').value
};

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        console.log('Register API response:', data);        if (response.ok && data.success) {
            // Store user data temporarily for onboarding
            localStorage.setItem('temp_user_data', JSON.stringify(data.user));
            
            // Store username for login page prefill (fallback)
            sessionStorage.setItem('registered_username', formData.username);

            showNotification(data.message || 'Registration successful! Redirecting to onboarding...', 'success');
            
            // Check if we should redirect to onboarding
            if (data.redirectTo === 'onboarding') {
                setTimeout(() => {
                    window.location.href = 'onboarding.html';
                }, 1500);
            } else {
                // Fallback to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } else {
            const message = data.message || `Registration failed (Status: ${response.status})`;
            showNotification(message, 'error');
            console.error('Registration failed:', message);
        }
    } catch (error) {
        console.error('Registration fetch error:', error);
        showNotification('Network error during registration. Please try again.', 'error');
    } finally {
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}

function attachLogoutHandlers() {
  // Select all elements with the "logout" class
  const logoutElements = document.querySelectorAll('.logout');
  
  // Attach click event listeners to each logout element
  logoutElements.forEach(function(el) {
    el.addEventListener('click', async function(e) {
      e.preventDefault();
      console.log('Logout clicked...');
      
      // Show modern confirmation dialog
      const confirmed = await showConfirmDialog(
        'You will be signed out of your account.',
        'Sign Out',
        {
          // confirmText: 'Sign Out',
          // cancelText: 'Cancel',
          type: 'warning'
        }
      );
      
      if (confirmed) {
        performLogoutProcess();
      }
    });
  });
}

function performLogoutProcess() {
  console.log('Performing logout process...');
  
  try {
    // Preserve drive session data before clearing localStorage
    const driveSessionData = localStorage.getItem('current_drive_session');
    
    // Determine current panel type based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const isAdminPanel = currentPage === 'admin.html';
    const panelType = isAdminPanel ? 'admin' : 'client';
    
    let token;
    
    // Clear authentication data using DualAuth if available
    if (typeof DualAuth !== 'undefined') {
      token = DualAuth.getToken(panelType);
      
      // For admin panel, only clear admin auth, keep client auth
      // For client panel, only clear client auth, keep admin auth
      DualAuth.clearAuth(panelType);
    } else {
      // Fallback to old system
      token = localStorage.getItem('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    
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
    
    // Show notification and redirect
    if (typeof showNotification === 'function') {
      // Ensure i18next is initialized before calling t()
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
      window.location.href = 'login.html';    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Force redirect even if there's an error
    window.location.href = 'login.html';
  }
}

// Make the function available globally
window.attachLogoutHandlers = attachLogoutHandlers;
window.performLogoutProcess = performLogoutProcess;

// Ensure logout handlers are attached when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, attempting to attach logout handlers...');
  
  // Wait a bit for other scripts to load
  setTimeout(() => {
    if (typeof attachLogoutHandlers === 'function') {
      attachLogoutHandlers();
    }
  }, 100);
  
  // Also set up a listener for when components are loaded (like sidebar)
  document.addEventListener('componentLoaded', function(event) {
    if (event.detail.path === '/components/sidebar.html') {
      console.log('Sidebar component loaded, re-attaching logout handlers...');
      setTimeout(() => {
        if (typeof attachLogoutHandlers === 'function') {
          attachLogoutHandlers();
        }
      }, 100);
    }
  });
});

// --- Forgot Password Form Handling ---
async function handleForgotPasswordSubmit(event) {
    event.preventDefault();
    const form = event.target;
    // Assuming clearErrors and showNotification are available globally from main.js
    clearErrors(form); 
    console.log('Forgot password form submitted via auth.js');

    const emailInput = document.getElementById('email');
    const resetButton = form.querySelector('button[type="submit"]');
    const originalButtonText = resetButton.textContent;

    const email = emailInput.value.trim();

    // Basic Client-Side Validation
    if (!email) {
        showError(emailInput, i18next.t('emailRequiredError'));
        return;
    }

    resetButton.textContent = 'Sending...';
    resetButton.disabled = true;

    try {
        // Assuming a server endpoint for forgot password requests
        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        console.log('Forgot password API response:', data);

        if (response.ok && data.success) {
            showNotification(data.message || i18next.t('passwordResetSuccessNotification'), 'success');
            // Optionally redirect to a confirmation page or back to login
            // setTimeout(() => {
            //     window.location.href = 'login.html';
            // }, 3000);
        } else {
            const message = data.message || i18next.t('passwordResetFailedNotification', { status: response.status });
            showNotification(message, 'error');
            console.error('Forgot password request failed:', message);
        }
    } catch (error) {
        console.error('Forgot password fetch error:', error);
        showNotification(i18next.t('passwordResetNetworkError'), 'error');
    } finally {
        resetButton.textContent = originalButtonText;
        resetButton.disabled = false;
    }
}

// Make functions available globally
window.handleLoginSubmit = handleLoginSubmit;
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;
