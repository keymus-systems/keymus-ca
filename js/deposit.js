document.addEventListener('DOMContentLoaded', () => {
  // Use centralized authentication check
  const authData = checkAuthentication();
  if (!authData) {
    return; // checkAuthentication will handle redirect
  }

  console.log('Deposits page initialized');

  // Check if required functions are available
  if (typeof fetchWithAuth !== 'function') {
    console.error('fetchWithAuth function not available');
    return;
  }

  // Initialize i18next if not already initialized
  if (typeof initI18next === 'function') {
    initI18next().then(() => {
      updateDepositTranslations();
    });
  } else {
    console.warn('i18next initialization function not found');
  }

  // Function to refresh all deposit data
  const refreshDepositData = async () => {
    try {
      console.log('Loading deposit data...');
      
      // Load deposit totals and history
      await loadDepositTotals();
      await loadDepositHistory();
      
      console.log('Deposit data loaded successfully');
    } catch (error) {
      console.error('Error loading deposit data:', error);
    }
  };
  // Function to load deposit totals
  const loadDepositTotals = async () => {
    try {
      console.log('Attempting to fetch deposit totals from /api/user/deposits/total');
      const response = await fetchWithAuth('/api/user/deposits/total');
      console.log('Deposit totals response:', response);

      const depositElement = document.getElementById('user-deposited-amount');
      if (depositElement && response.success) {
        const totalDeposits = response.totalDeposits || response.data?.totalDeposits || 0;
        depositElement.innerHTML = `$${parseFloat(totalDeposits).toFixed(2)}`;
        console.log('Updated total deposits:', totalDeposits);
      } else if (depositElement) {
        depositElement.innerHTML = '$0.00';
        console.log('No deposit data available or element not found, showing $0.00');
        if (!response.success) {
          console.error('API response was not successful:', response);
        }
      }
    } catch (error) {
      console.error('Error loading deposit totals:', error);
      const depositElement = document.getElementById('user-deposited-amount');
      if (depositElement) {
        depositElement.innerHTML = '$0.00';
      }
    }
  };  // Function to load deposit history (including admin adjustments)
  const loadDepositHistory = async () => {
    try {
      console.log('Attempting to fetch deposit history from /api/user/deposits');
      const response = await fetchWithAuth('/api/user/deposits');
      console.log('Deposit history response:', response);

      const historyElement = document.querySelector('#deposit-history table tbody');
      console.log('History element found:', !!historyElement);
      
      if (historyElement) {
        if (response.success && response.data && response.data.length > 0) {
          console.log(`Found ${response.data.length} deposit records`);
          historyElement.innerHTML = response.data
            .map((entry) => {
              // Determine the type and styling for admin adjustments
              let typeDisplay = entry.type || 'deposit';
              let statusClass = 'status-completed';
              let amountPrefix = '+';
              
              if (entry.type === 'admin_adjustment') {
                if (entry.amount < 0) {
                  typeDisplay = 'Admin Deduction';
                  statusClass = 'status-warning';
                  amountPrefix = '';
                } else {
                  typeDisplay = 'Admin Credit';
                  statusClass = 'status-success';
                }              } else if (entry.type === 'deposit') {
                typeDisplay = 'Deposit';
              }

              // Handle client image display - Hidden in history tab
              // let imageDisplay = '-';
              // if (entry.client_image_url) {
              //   imageDisplay = `<a href="${entry.client_image_url}" target="_blank" title="View payment proof">
              //     <img src="${entry.client_image_url}" alt="Payment proof" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;">
              //   </a>`;
              // }

                return `
                <tr>
                  <td>${new Date(entry.date || entry.created_at).toLocaleDateString()}</td>
                  <td>${new Date(entry.date || entry.created_at).toLocaleTimeString()}</td>
                  <td>${amountPrefix}$${Math.abs(parseFloat(entry.amount)).toFixed(2)}</td>
                  <td><span class="status-badge status-${(entry.status || 'completed').toLowerCase()}">${entry.status || 'Completed'}</span></td>
                  <!-- Image and Note columns hidden -->
                </tr>
              `;
            })            .join('');
        } else {
          console.log('No deposit data found or response not successful:', {
            success: response.success,
            dataLength: response.data ? response.data.length : 'null/undefined',
            response: response
          });          historyElement.innerHTML = `
            <tr>
              <td colspan="4" class="empty-state">
                <i class="fas fa-history"></i>
                <p>No deposit history found</p>
              </td>
            </tr>
          `;
        }
      }    } catch (error) {
      console.error('Error loading deposit history:', error);
      const historyElement = document.querySelector('#deposit-history table tbody');
      if (historyElement) {        historyElement.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error loading deposit history</p>
            </td>
          </tr>        `;
      }
    }
  };
  // Load QR code on page initialization
  const loadDepositQRCode = async () => {
    try {
      console.log('Loading deposit QR code...');
      const response = await fetch(`${API_BASE_URL}/api/user/qr-code`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const qrCodeImg = document.getElementById('deposit-qr-code');
        const qrCodeDesc = document.getElementById('qr-code-description');
        const walletAddressSection = document.getElementById('wallet-address-section');
        const walletAddressInput = document.getElementById('wallet-address-input');
        
        if (qrCodeImg && qrCodeDesc) {
          qrCodeImg.src = data.data.qr_code_url;
          qrCodeDesc.textContent = data.data.description || 'Scan to make payment';
          qrCodeImg.style.display = 'block';
          
          // Handle wallet address
          if (data.data.wallet_address && data.data.wallet_address.trim() !== '') {
            if (walletAddressInput) {
              walletAddressInput.value = data.data.wallet_address;
            }
            if (walletAddressSection) {
              walletAddressSection.style.display = 'block';
            }
          } else {
            if (walletAddressSection) {
              walletAddressSection.style.display = 'none';
            }
          }
          
          console.log('QR code and wallet address loaded successfully');
        }
      } else {
        console.warn('No QR code available');
        const qrCodeDesc = document.getElementById('qr-code-description');
        if (qrCodeDesc) {
          qrCodeDesc.textContent = 'QR code not available';
        }
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      const qrCodeDesc = document.getElementById('qr-code-description');
      if (qrCodeDesc) {
        qrCodeDesc.textContent = 'Error loading QR code';
      }
    }
  };

  // Handle image preview
  const imageInput = document.getElementById('payment_proof');
  const imagePreview = document.getElementById('image-preview');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const removeImageBtn = document.getElementById('remove-image');

  if (imageInput && imagePreview && imagePreviewContainer && removeImageBtn) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          e.target.value = '';
          return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          alert('Only image files (JPEG, PNG, GIF) are allowed');
          e.target.value = '';
          return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
          imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    removeImageBtn.addEventListener('click', () => {
      imageInput.value = '';
      imagePreview.src = '';
      imagePreviewContainer.style.display = 'none';
    });
  }

  // Modified deposit submission to handle image upload
  const depositButton = document.getElementById('deposit');
  if (depositButton) {
    depositButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const amountInput = document.getElementById('deposit_amount');
      const descriptionInput = document.getElementById('deposit_description');
      const imageInput = document.getElementById('payment_proof');
      
      if (!amountInput) {
        console.error('Amount input not found');
        return;
      }

      const amount = parseFloat(amountInput.value);
      if (!amount || amount <= 0) {
        alert('Please enter a valid deposit amount');
        return;
      }

      try {
        // Disable button during submission
        depositButton.disabled = true;
        depositButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('description', descriptionInput?.value || '');
        formData.append('type', 'direct'); // Add deposit type
        
        if (imageInput?.files[0]) {
          formData.append('image', imageInput.files[0]);
        }

        const response = await fetch(`${API_BASE_URL}/api/user/deposit-with-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.token}`
          },
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          // Show success modal instead of alert
          showDirectDepositSuccessModal(amount);
          
          // Clear form
          amountInput.value = '';
          if (descriptionInput) descriptionInput.value = '';
          if (imageInput) {
            imageInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
          }
          
          // Refresh deposit data
          await refreshDepositData();
        } else {
          alert(result.message || 'Failed to submit deposit request');
        }
      } catch (error) {
        console.error('Error submitting deposit:', error);
        alert('Error submitting deposit request. Please try again.');
      } finally {
        // Re-enable button
        depositButton.disabled = false;
        depositButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Direct Deposit Request';
      }    });
  }

  // Copy wallet address function
  window.copyWalletAddress = async () => {
    const walletAddressInput = document.getElementById('wallet-address-input');
    const copyBtn = document.getElementById('copy-wallet-btn');
    
    if (!walletAddressInput || !walletAddressInput.value) {
      return;
    }
    
    try {
      // Use the modern Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(walletAddressInput.value);
      } else {
        // Fallback for older browsers
        walletAddressInput.select();
        walletAddressInput.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
      }
      
      // Visual feedback
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
      copyBtn.classList.remove('btn-outline-primary');
      copyBtn.classList.add('btn-success');
      
      // Reset button after 2 seconds
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove('btn-success');
        copyBtn.classList.add('btn-outline-primary');
      }, 2000);
      
      // Optional: Show toast notification if available
      if (typeof showNotification === 'function') {
        showNotification('Wallet address copied to clipboard!', 'success');
      }
      
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
      
      // Visual feedback for error
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-times me-1"></i>Failed';
      copyBtn.classList.remove('btn-outline-primary');
      copyBtn.classList.add('btn-danger');
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove('btn-danger');
        copyBtn.classList.add('btn-outline-primary');
      }, 2000);
      
      // Optional: Show error notification if available
      if (typeof showNotification === 'function') {
        showNotification('Failed to copy wallet address', 'error');
      }
    }
  };

  // Load QR code when page loads
  loadDepositQRCode();

  // Initial data load
  refreshDepositData();

});

// Simplified Bank Deposit API Functions
async function processBankDepositSimpleAPI(depositData) {
  try {
    console.log('Processing simplified bank deposit:', depositData);
    
    const response = await fetchWithAuth('/api/user/deposits/bank-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bank_name: depositData.bankName,
        amount: depositData.amount,
        notes: depositData.notes || ''
      })
    });
    
    console.log('Bank deposit response:', response);
    
    if (response.success) {
      // Bank deposit submitted successfully
      console.log('Bank deposit submitted successfully');
      return response;
    } else {
      throw new Error(response.message || 'Bank deposit submission failed');
    }
  } catch (error) {
    console.error('Error processing bank deposit:', error);
    throw error;
  }
}

// Function to update translations on the deposit page
function updateDepositTranslations() {
  // Only run if i18next is available and initialized
  if (window.i18next && window.i18next.isInitialized) {
    // Call the global updateContent function from i18n.js
    if (typeof updateContent === 'function') {
      updateContent();
      console.log('Updated deposit page translations');
    } else {
      console.warn('updateContent function not available');
    }
  } else {
    console.warn('i18next not initialized yet for deposit page');
  }
}

// Function to show direct deposit success modal
function showDirectDepositSuccessModal(amount) {
  try {
    // Update the amount in the modal
    const modalAmountElement = document.getElementById('direct-modal-deposit-amount');
    if (modalAmountElement) {
      modalAmountElement.textContent = `$${amount.toFixed(2)}`;
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('directDepositSuccessModal'));
    modal.show();
    
    // Add click handler for the OK button to refresh data
    const okButton = document.getElementById('direct-modal-ok-button');
    if (okButton) {
      okButton.addEventListener('click', function() {
        // Optionally refresh data when modal is closed
        console.log('Direct deposit modal closed');
      }, { once: true }); // Use once: true to prevent multiple listeners
    }
    
  } catch (error) {
    console.error('Error showing direct deposit success modal:', error);
    // Fallback to alert if modal fails
    alert(`Direct deposit request for $${amount.toFixed(2)} submitted successfully!`);
  }
}

// Listen for language changes
document.addEventListener('languageChanged', () => {
  updateDepositTranslations();
});
