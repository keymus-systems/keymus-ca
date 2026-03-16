document.addEventListener('DOMContentLoaded', () => {
    // Use centralized authentication check
    const authData = requireAuth();
    if (!authData) {
        return; // requireAuth will handle redirect
    }

    const currentAddressElem = document.getElementById('current-wallet-address');
    const addressInputElem = document.getElementById('wallet_address');
    const bindForm = document.getElementById('bindAddressForm'); // Get the form element
    const submitButton = document.getElementById('bindwallet');

    // Function to fetch and display the current address
    const fetchCurrentAddress = async () => {
        if (!currentAddressElem || !addressInputElem) return; // Elements not found

        currentAddressElem.textContent = 'Loading...';
        addressInputElem.value = ''; // Clear input initially

        try {
            const data = await fetchWithAuth('/api/user/withdrawal-address'); // Assumes fetchWithAuth is global
            if (data.success) {
                const currentAddress = data.address || 'Not set';
                currentAddressElem.textContent = currentAddress;
                addressInputElem.value = ''; // Pre-fill input if address exists
                console.log('Current withdrawal address fetched:', currentAddress);
            } else {
                currentAddressElem.textContent = 'Could not load address.';
                console.error('Failed to fetch withdrawal address:', data.message);
                showNotification(data.message || 'Failed to load current address.', 'error');
            }
        } catch (error) {
            currentAddressElem.textContent = 'Error loading address.';
            console.error('Error fetching withdrawal address:', error);
             if (error.message !== 'Unauthorized') {
                showNotification('Error loading current address.', 'error');
             }
        }
    };

    // Add submit listener to the form
    if (bindForm && addressInputElem && submitButton) {
        bindForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const newAddress = addressInputElem.value.trim();

            // Basic validation
            if (!newAddress) {
                showNotification('Please enter a wallet address.', 'error');
                return;
            }
            // TODO: Add more robust validation (e.g., TRC20 format check)
            if (newAddress.length < 26 || !newAddress.startsWith('T')) { 
                 showNotification('Invalid TRC20 address format.', 'error');
                 return;
            }


            console.log(`Attempting to update address to: ${newAddress}`);
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetchWithAuth('/api/user/withdrawal-address', {
                    method: 'PUT',
                    body: JSON.stringify({
                        address: newAddress,
                        address_type: 'TRC20' // Explicitly set type
                    })
                });

                if (response.success) {
                    showNotification('Withdrawal address updated successfully!', 'success');
                    // Update the displayed current address
                    if (currentAddressElem) {
                        currentAddressElem.textContent = response.address || newAddress;
                    }
                     addressInputElem.value = response.address || newAddress; // Update input field as well
                } else {
                    showNotification(response.message || 'Failed to update address.', 'error');
                }
            } catch (error) {
                console.error('Error updating withdrawal address:', error);
                 if (error.message !== 'Unauthorized') {
                    showNotification('Could not update address. Please try again.', 'error');
                 }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Update Address';
            }
        });
    } else {
         console.error('Could not find form elements for bind address.');
    }

    // Initial fetch of the address when the page loads
    fetchCurrentAddress();
});
