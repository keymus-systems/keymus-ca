document.addEventListener('DOMContentLoaded', () => {
  // Use centralized authentication check
  const authData = checkAuthentication();
  if (!authData) {
    return; // checkAuthentication will handle redirect
  }
  
  console.log('Withdrawals page initialized');

  // Check if required functions are available
  if (typeof fetchWithAuth !== 'function') {
    console.error('fetchWithAuth function not available');
    // Clear loading states immediately
    const withdrawableElement = document.getElementById('withdrawable-balance');
    const totalWithdrawnElement = document.getElementById('user-withdrawn-amount');
    
    if (withdrawableElement) {
      withdrawableElement.innerHTML = '$0.00';
      withdrawableElement.classList.remove('loading');
    }
    if (totalWithdrawnElement) {
      totalWithdrawnElement.innerHTML = '$0.00';
      totalWithdrawnElement.classList.remove('loading');
    }
    return;
  }

  // Initialize i18n (simplified - no longer using i18next)
  if (typeof updateContent === 'function') {
    updateContent(); // Apply text conversions immediately
    console.log('Applied text conversions to withdrawal page');
  } else {
    console.warn('updateContent function not found');
  }  // Function to refresh all data on the page
  const refreshWithdrawalData = async () => {
    try {
      console.log('Loading withdrawal data...');
      
      // Load balances using the same approach as dashboard
      await loadBalances();
      
      // Load withdrawal history
      await loadWithdrawalHistory();
      
      // Load withdrawal address
      await loadWithdrawalAddress();
      
      console.log('Withdrawal data loaded successfully');
    } catch (error) {
      console.error('Error loading withdrawal data:', error);
      // Ensure loading states are cleared even on error
      const withdrawableElement = document.getElementById('withdrawable-balance');
      const totalWithdrawnElement = document.getElementById('user-withdrawn-amount');
      
      if (withdrawableElement && withdrawableElement.classList.contains('loading')) {
        withdrawableElement.innerHTML = '$0.00';
        withdrawableElement.classList.remove('loading');
      }
      if (totalWithdrawnElement && totalWithdrawnElement.classList.contains('loading')) {
        totalWithdrawnElement.innerHTML = '$0.00';
        totalWithdrawnElement.classList.remove('loading');
      }
    }
  };

  // Function to load balances
  const loadBalances = async () => {
    try {
      // Get total withdrawals and balances data
      const [withdrawalsResponse, balancesResponse] = await Promise.all([
        fetchWithAuth('/api/user/withdrawals'),
        fetchWithAuth('/api/user/balances')
      ]);

      console.log('Withdrawals response:', withdrawalsResponse);
      console.log('Balances response:', balancesResponse);

      // Update withdrawable balance (main balance)
      const withdrawableElement = document.getElementById('withdrawable-balance');
      if (withdrawableElement) {
        withdrawableElement.classList.remove('loading');
        if (balancesResponse.success) {
          const mainBalance = balancesResponse.balances?.main_balance || 
                             balancesResponse.data?.main_balance || 0;
          withdrawableElement.innerHTML = `$${parseFloat(mainBalance).toFixed(2)}`;
          console.log('Updated withdrawable balance:', mainBalance);
        } else {
          console.warn('Balances API failed, using fallback');
          withdrawableElement.innerHTML = '$0.00';
        }
      }

      // Update total withdrawals
      const totalWithdrawnElement = document.getElementById('user-withdrawn-amount');
      if (totalWithdrawnElement) {
        totalWithdrawnElement.classList.remove('loading');
        if (withdrawalsResponse.success && typeof withdrawalsResponse.totalWithdrawals !== 'undefined') {
          const totalWithdrawals = withdrawalsResponse.totalWithdrawals;
          totalWithdrawnElement.innerHTML = `$${parseFloat(totalWithdrawals).toFixed(2)}`;
          console.log('Updated total withdrawals from API:', totalWithdrawals);
        } else {
          // Fallback if the API fails
          totalWithdrawnElement.innerHTML = `$0.00`;
          console.warn('Could not fetch total withdrawals from API.');
        }
      }

    } catch (error) {
      console.error('Error loading balances:', error);
      // Set default values on error
      const withdrawableElement = document.getElementById('withdrawable-balance');
      const totalWithdrawnElement = document.getElementById('user-withdrawn-amount');
      
      if (withdrawableElement) {
        withdrawableElement.innerHTML = '$0.00';
        withdrawableElement.classList.remove('loading');
      }
      if (totalWithdrawnElement) {
        totalWithdrawnElement.innerHTML = '$0.00';
        totalWithdrawnElement.classList.remove('loading');
      }
    }
  };

  // Function to load withdrawal history  // Function to load withdrawal history (including admin adjustments)
  const loadWithdrawalHistory = async () => {
    try {
      const response = await fetchWithAuth('/api/user/withdraw-history');
      console.log('Withdrawal history response:', response);

      const historyElement = document.querySelector('#withdraw-history-tbody');
      if (historyElement) {
        if (response.success && response.data && response.data.length > 0) {
          
          historyElement.innerHTML = response.data
            .map((entry) => {
              // Determine styling based on entry type (for amount display)
              let amountPrefix = '-';
              if (entry.type === 'admin_adjustment' && entry.amount > 0) {
                amountPrefix = '+';
              }
              
              return `
                <tr>
                  <td>${new Date(entry.date || entry.created_at).toLocaleDateString()}</td>
                  <td>${new Date(entry.date || entry.created_at).toLocaleTimeString()}</td>
                  <td>${amountPrefix}$${Math.abs(parseFloat(entry.amount)).toFixed(2)}</td>
                  <td><span class="status-badge status-${(entry.status || 'pending').toLowerCase()}">${entry.status || 'Pending'}</span></td>
                </tr>
              `;
            })
            .join('');

        } else {
          historyElement.innerHTML = `
            <tr>
              <td colspan="4" class="empty-state">
                <i class="fas fa-history"></i>
                <p>No withdrawal history found</p>
              </td>
            </tr>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
      const historyElement = document.querySelector('#withdraw-history-tbody');
      if (historyElement) {
        historyElement.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error loading withdrawal history</p>
            </td>
          </tr>
        `;
      }
    }
  };
  // Function to load withdrawal address
  const loadWithdrawalAddress = async () => {
    try {
      const response = await fetchWithAuth('/api/user/withdrawal-address');
      console.log('Withdrawal address response:', response);

      const addressDisplayElement = document.getElementById('withdrawal-address-display');
      
      if (response.success && response.address) {
        // Store the address globally for use in withdrawal submission
        window.userWithdrawalAddress = response.address;
        
        // Display the address in the UI
        if (addressDisplayElement) {
          addressDisplayElement.textContent = response.address;
          addressDisplayElement.style.color = '#28a745'; // Green color for valid address
        }
        
        console.log('Loaded withdrawal address:', response.address);
      } else {
        console.warn('No withdrawal address set or failed to load');
        window.userWithdrawalAddress = null;
        
        // Show warning in UI
        if (addressDisplayElement) {
          addressDisplayElement.innerHTML = '<span style="color: #dc3545;">No address set</span>';
        }
      }
    } catch (error) {
      console.error('Error loading withdrawal address:', error);
      window.userWithdrawalAddress = null;
      
      // Show error in UI
      const addressDisplayElement = document.getElementById('withdrawal-address-display');
      if (addressDisplayElement) {
        addressDisplayElement.innerHTML = '<span style="color: #dc3545;">Error loading address</span>';
      }
    }
  };

  // Initial data load
  refreshWithdrawalData();

  // Fallback: Clear loading states after 10 seconds if they're still showing
  setTimeout(() => {
    const withdrawableElement = document.getElementById('withdrawable-balance');
    const totalWithdrawnElement = document.getElementById('user-withdrawn-amount');
    
    if (withdrawableElement && withdrawableElement.classList.contains('loading')) {
      console.warn('Withdrawable balance still loading after 10s, showing fallback');
      withdrawableElement.innerHTML = '$0.00';
      withdrawableElement.classList.remove('loading');
    }
    if (totalWithdrawnElement && totalWithdrawnElement.classList.contains('loading')) {
      console.warn('Total withdrawals still loading after 10s, showing fallback');
      totalWithdrawnElement.innerHTML = '$0.00';
      totalWithdrawnElement.classList.remove('loading');
    }
  }, 10000);

  // Set up the withdraw form submission
  const withdrawButton = document.getElementById('withdraw');
  if (withdrawButton) {
    withdrawButton.addEventListener('click', async (e) => {
      e.preventDefault();

      const amountInput = document.getElementById('withdraw_amount');
      const passwordInput = document.getElementById('withdraw_password');

      const amount = amountInput ? amountInput.value : null;
      const withdrawal_password = passwordInput ? passwordInput.value : null;      // Validation
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        showNotification('Please enter a valid withdrawal amount.', 'warning');
        return;
      }
      
      if (!withdrawal_password) {
        showNotification('Please enter your withdrawal password.', 'warning');
        return;
      }

      // Check if withdrawal address is available
      if (!window.userWithdrawalAddress) {
        showNotification('No withdrawal address found. Please set your withdrawal address first in the Bind Address page.', 'error');
        return;
      }      // Prepare data for the request
      const withdrawalData = {
        amount: parseFloat(amount),
        withdrawal_password: withdrawal_password,
        withdrawal_account_details: window.userWithdrawalAddress
      };      // Show confirmation dialog
      const confirmed = await showConfirmDialog(
        'Are you sure you want to withdraw $' + parseFloat(amount).toFixed(2) + ' to your TRC20 address?',
        'Confirm Withdrawal',
        {
          confirmText: 'Withdraw',
          cancelText: 'Cancel',
          type: 'warning'
        }
      );

      if (!confirmed) {
        return;
      }

      try {
        // Show loading indicator
        const originalText = withdrawButton.innerHTML;
        withdrawButton.disabled = true;
        withdrawButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

        const response = await fetchWithAuth('/api/user/withdraw/request', {
          method: 'POST',
          body: JSON.stringify(withdrawalData)
        });

        // Restore button
        withdrawButton.disabled = false;
        withdrawButton.innerHTML = originalText;        if (response.success) {
          // Show success modal instead of notification
          showWithdrawalSuccessModal(withdrawalData.amount);
          // Clear form
          if (amountInput) amountInput.value = '';
          if (passwordInput) passwordInput.value = '';
          // Only refresh withdrawal history, not balances (since withdrawal is pending)
          await loadWithdrawalHistory();
        } else {
          showNotification('Withdrawal failed: ' + (response.message || 'Failed to submit withdrawal request.'), 'error');
        }
      } catch (error) {
        console.error('Error submitting withdrawal request:', error);
        // Restore button
        withdrawButton.disabled = false;
        withdrawButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Withdrawal';
        showNotification('An error occurred while submitting the withdrawal request.', 'error');
      }
    });
  } else {
    console.warn('Withdraw button not found.');
  }

});

// Function to show withdrawal success modal
function showWithdrawalSuccessModal(amount) {
  try {
    // Find the modal element
    const modalElement = document.getElementById('withdrawalSuccessModal');
    if (!modalElement) {
      console.error('Withdrawal success modal not found in DOM');
      // Fallback to notification if modal not found
      showNotification('Withdrawal request submitted successfully! Your request is pending admin approval.', 'success', 7000);
      return;
    }

    // Update the amount in the modal
    const amountElement = document.getElementById('withdrawal-modal-amount');
    if (amountElement) {
      amountElement.textContent = `$${parseFloat(amount).toFixed(2)}`;
    }

    // Show the modal using Bootstrap 5
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Handle modal OK button click to switch to history tab
    const okButton = document.getElementById('withdrawal-modal-ok-button');
    if (okButton) {
      // Remove any existing event listeners to prevent duplicates
      okButton.removeEventListener('click', handleWithdrawalModalOk);
      okButton.addEventListener('click', handleWithdrawalModalOk);
    }

  } catch (error) {
    console.error('Error showing withdrawal success modal:', error);
    // Fallback to notification if modal fails
    showNotification('Withdrawal request submitted successfully! Your request is pending admin approval.', 'success', 7000);
  }
}

// Handle withdrawal modal OK button click
function handleWithdrawalModalOk() {
  try {
    // Switch to withdrawal history tab
    const historyTab = document.getElementById('history-tab');
    if (historyTab) {
      // Use Bootstrap's tab methods to switch
      const tabTrigger = new bootstrap.Tab(historyTab);
      tabTrigger.show();
    }
  } catch (error) {
    console.error('Error switching to history tab:', error);
  }
}

// Function to update text conversions on the withdrawal page
function updateWithdrawalTranslations() {
  // Use the global updateContent function from i18n.js
  if (typeof updateContent === 'function') {
    updateContent();
    console.log('Updated withdrawal page text conversions');
  } else {
    console.warn('updateContent function not available');
  }
}

// Listen for language changes (even though we're not using translations now)
document.addEventListener('languageChanged', () => {
  updateWithdrawalTranslations();
});
