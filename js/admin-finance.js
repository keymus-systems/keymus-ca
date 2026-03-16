// Finance Management Module for Admin Panel
// Handles Deposits and Withdrawals functionality

// Dependencies - will be imported from the main module
let fetchWithAuth;
let showNotification;
let isInitialized = false; // Flag to track initialization

// Initialize dependencies from the main module
export function initDependencies(dependencies) {
    fetchWithAuth = dependencies.fetchWithAuth;
    showNotification = dependencies.showNotification;
    
    if (!fetchWithAuth || !showNotification) {
        console.error("CRITICAL: fetchWithAuth or showNotification not passed to admin-finance.js initDependencies");
        isInitialized = false;
        return;
    }
    isInitialized = true;
    console.log("admin-finance.js initialized with dependencies.");
}

// Check if module is initialized before executing functions
function ensureInitialized() {
    if (!isInitialized) {
        console.error("admin-finance.js not initialized. Call initDependencies first.");
        showNotification('Finance module not properly initialized', 'error');
        return false;
    }
    return true;
}

// ============================================================================
// DEPOSITS MANAGEMENT
// ============================================================================

// Load deposits for admin view
export async function loadDeposits() {
    if (!ensureInitialized()) return;
    
    try {
        // Fetch only pending deposits for the admin view
        const response = await fetchWithAuth('/admin/deposits');
        if (response.success) {
            renderDepositsTable(response.deposits, 'deposits-list');
        }
    } catch (error) {
        console.error('Error loading deposits:', error);
        showNotification('Failed to load deposits', 'error');
    }
}

// Render deposits table
function renderDepositsTable(deposits, containerId) {
    const depositsList = document.getElementById(containerId);
    if (!depositsList) {
        console.warn(`Deposits list element ('${containerId}') not found.`);
        return;
    }

    depositsList.innerHTML = deposits.map(deposit => {
        // Determine deposit type based on deposit_type field
        const depositType = deposit.deposit_type === 'bank' ? 'Bank' : 'Direct';
        
        // Build bank info for bank deposits
        let bankInfo = '';
        if (deposit.deposit_type === 'bank' && deposit.bank_name) {
            bankInfo = `
                <div class="small text-muted mt-1">
                    <i class="fas fa-university me-1"></i>Bank: ${deposit.bank_name}
                    ${deposit.notes ? `<br><i class="fas fa-sticky-note me-1"></i>Notes: ${deposit.notes}` : ''}
                </div>
            `;
        }
        
        // Build attachments column
        let attachmentsHtml = '';
        if (deposit.client_image_url) {
            const fileName = deposit.client_image_filename || deposit.client_image_url.split('/').pop();
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
            const isPdf = fileExtension === 'pdf';
            
            attachmentsHtml = `
                <div class="deposit-attachments">
                    ${isImage ? `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="FinanceModuleAPI.viewDepositImage('${deposit.client_image_url}', '${fileName}')" title="View Image">
                            <i class="fas fa-image"></i>
                        </button>
                    ` : ''}
                    ${isPdf ? `
                        <button class="btn btn-sm btn-outline-info me-1" onclick="FinanceModuleAPI.viewDepositPdf('${deposit.client_image_url}', '${fileName}')" title="View PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-success" onclick="FinanceModuleAPI.downloadDepositFile('${deposit.client_image_url}', '${fileName}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        } else {
            attachmentsHtml = '<span class="text-muted small">No attachments</span>';
        }
        
        return `
            <tr>
                <td>${deposit.id}</td>
                <td>
                    ${deposit.username}
                    ${bankInfo}
                </td>
                <td>$${deposit.amount}</td>
                <td>
                    <span class="badge ${depositType === 'Bank' ? 'bg-info' : 'bg-primary'}">
                        <i class="fas ${depositType === 'Bank' ? 'fa-university' : 'fa-qrcode'} me-1"></i>
                        ${depositType}
                    </span>
                </td>
                <td>${new Date(deposit.created_at).toLocaleDateString()}</td>
                <td>${attachmentsHtml}</td>
                <td>
                    <span class="status-badge status-${deposit.status.toLowerCase()}">
                        ${deposit.status}
                    </span>
                </td>
                <td>
                    ${deposit.status === 'PENDING' ? `
                        <button class="btn btn-sm btn-success approve-deposit-btn" data-id="${deposit.id}">
                            Approve
                        </button>
                        <button class="btn btn-sm btn-danger reject-deposit-btn" data-id="${deposit.id}">
                            Reject
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Deposit Attachment Functions
export function viewDepositImage(imagePath, fileName) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-image me-2"></i>Deposit Proof - ${fileName}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <img src="${imagePath}" alt="Deposit Proof" class="img-fluid rounded" style="max-height: 70vh;">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-success" onclick="FinanceModuleAPI.downloadDepositFile('${imagePath}', '${fileName}')">
                        <i class="fas fa-download me-2"></i>Download
                    </button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Clean up modal after it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

export function viewDepositPdf(pdfPath, fileName) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-file-pdf me-2"></i>Deposit Proof - ${fileName}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <iframe src="${pdfPath}" style="width: 100%; height: 70vh; border: none;"></iframe>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-success" onclick="FinanceModuleAPI.downloadDepositFile('${pdfPath}', '${fileName}')">
                        <i class="fas fa-download me-2"></i>Download
                    </button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Clean up modal after it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

export function downloadDepositFile(filePath, fileName) {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Deposit Approval/Rejection Functions
export async function approveDeposit(depositId) {
    if (!ensureInitialized()) return;
    
    try {
        const response = await fetchWithAuth(`/admin/deposits/${depositId}/approve`, {
            method: 'POST'
        });
        
        if (response.success) {
            showNotification('Deposit approved successfully', 'success');
            loadDeposits(); // Reload the deposits list
        } else {
            showNotification(response.message || 'Failed to approve deposit', 'error');
        }
    } catch (error) {
        console.error('Error approving deposit:', error);
        showNotification('Failed to approve deposit: ' + error.message, 'error');
    }
}

export async function rejectDeposit(depositId) {
    if (!ensureInitialized()) return;
    
    try {
        const response = await fetchWithAuth(`/admin/deposits/${depositId}/reject`, {
            method: 'POST'
        });
        
        if (response.success) {
            showNotification('Deposit rejected successfully', 'success');
            loadDeposits(); // Reload the deposits list
        } else {
            showNotification(response.message || 'Failed to reject deposit', 'error');
        }
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showNotification('Failed to reject deposit: ' + error.message, 'error');
    }
}

// Deposit History Functions
export function showDepositHistoryModal() {
    console.log('showDepositHistoryModal called');
    
    const modalElement = document.getElementById('depositHistoryModal');
    if (!modalElement) {
        console.error('depositHistoryModal element not found!');
        showNotification('Deposit history modal not found in the page', 'error');
        return;
    }
    
    console.log('Modal element:', modalElement);
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        console.log('Bootstrap modal created:', modal);
        
        modal.show();
        console.log('Modal show() called');
        
        // Try a simple test instead of loading data initially
        document.getElementById('deposit-history-list').innerHTML = 
            '<tr><td colspan="8" class="text-center">Modal opened successfully! Loading data...</td></tr>';
        
        // Load data after a short delay to test modal display first
        setTimeout(() => {
            loadDepositHistory();
        }, 1000);
        
    } catch (error) {
        console.error('Error creating/showing modal:', error);
        showNotification('Error showing modal: ' + error.message, 'error');
    }
}

export async function loadDepositHistory() {
    if (!ensureInitialized()) return;
    
    try {
        console.log('loadDepositHistory started');
        
        const statusFilter = document.getElementById('historyStatusFilter')?.value || '';
        const limit = document.getElementById('historyLimitSelect')?.value || '50';
        
        // Build query parameters
        let queryParams = new URLSearchParams({
            limit: limit,
            offset: '0'
        });
        
        if (statusFilter) {
            queryParams.append('status', statusFilter);
        }
        
        const url = `/admin/deposits/all?${queryParams.toString()}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetchWithAuth(url);
        console.log('getAllDeposits response:', response);
        
        if (response && response.success) {
            console.log('API success, deposits count:', response.deposits?.length);
            renderDepositHistory(response.deposits || [], response.total || 0);
            
            // Update pagination info
            const paginationInfo = document.getElementById('deposits-pagination-info');
            if (paginationInfo) {
                const start = 1;
                const end = Math.min(response.deposits?.length || 0, response.total || 0);
                paginationInfo.textContent = `Showing ${start}-${end} of ${response.total || 0} deposits`;
            }
        } else {
            console.error('API returned success: false or invalid response:', response);
            document.getElementById('deposit-history-list').innerHTML = 
                '<tr><td colspan="8" class="text-center text-danger">API returned error: ' + (response?.message || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('Error in loadDepositHistory:', error);
        document.getElementById('deposit-history-list').innerHTML = 
            '<tr><td colspan="8" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
        showNotification('Failed to load deposit history: ' + error.message, 'error');
    }
}

function renderDepositHistory(deposits, total = 0) {
    const historyList = document.getElementById('deposit-history-list');
    if (!historyList) {
        console.warn("Deposit history list element not found.");
        return;
    }

    if (!deposits || deposits.length === 0) {
        historyList.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No deposits found</td></tr>';
        return;
    }

    historyList.innerHTML = deposits.map(deposit => {
        // Determine deposit type
        const depositType = deposit.deposit_type === 'bank' ? 'Bank' : 'Direct';
        
        // Build bank info for bank deposits
        let userInfo = deposit.username;
        if (deposit.deposit_type === 'bank' && deposit.bank_name) {
            userInfo += `<br><small class="text-muted"><i class="fas fa-university me-1"></i>${deposit.bank_name}</small>`;
        }
        if (deposit.notes) {
            userInfo += `<br><small class="text-muted"><i class="fas fa-sticky-note me-1"></i>${deposit.notes}</small>`;
        }
        
        // Status badge styling
        let statusClass = 'bg-secondary';
        let statusIcon = 'fa-clock';
        switch (deposit.status) {
            case 'APPROVED':
                statusClass = 'bg-success';
                statusIcon = 'fa-check';
                break;
            case 'REJECTED':
                statusClass = 'bg-danger';
                statusIcon = 'fa-times';
                break;
            case 'PENDING':
                statusClass = 'bg-warning';
                statusIcon = 'fa-clock';
                break;
        }
        
        // Processed date
        const processedDate = deposit.approved_at ? 
            new Date(deposit.approved_at).toLocaleString() : 
            (deposit.status === 'PENDING' ? '-' : 'Unknown');
        
        // Build attachments
        let attachmentsHtml = '';
        if (deposit.client_image_url) {
            const fileName = deposit.client_image_filename || deposit.client_image_url.split('/').pop();
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
            const isPdf = fileExtension === 'pdf';
            
            attachmentsHtml = `
                <div class="deposit-attachments">
                    ${isImage ? `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="FinanceModuleAPI.viewDepositImage('${deposit.client_image_url}', '${fileName}')" title="View Image">
                            <i class="fas fa-image"></i>
                        </button>
                    ` : ''}
                    ${isPdf ? `
                        <button class="btn btn-sm btn-outline-info me-1" onclick="FinanceModuleAPI.viewDepositPdf('${deposit.client_image_url}', '${fileName}')" title="View PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-success" onclick="FinanceModuleAPI.downloadDepositFile('${deposit.client_image_url}', '${fileName}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        } else {
            attachmentsHtml = '<span class="text-muted small">None</span>';
        }
        
        return `
            <tr>
                <td>${deposit.id}</td>
                <td>${userInfo}</td>
                <td>$${parseFloat(deposit.amount).toFixed(2)}</td>
                <td>
                    <span class="badge ${depositType === 'Bank' ? 'bg-info' : 'bg-primary'}">
                        <i class="fas ${depositType === 'Bank' ? 'fa-university' : 'fa-qrcode'} me-1"></i>
                        ${depositType}
                    </span>
                </td>
                <td>${new Date(deposit.created_at).toLocaleString()}</td>
                <td>${processedDate}</td>
                <td>
                    <span class="badge ${statusClass}">
                        <i class="fas ${statusIcon} me-1"></i>
                        ${deposit.status}
                    </span>
                </td>
                <td>${attachmentsHtml}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// WITHDRAWALS MANAGEMENT
// ============================================================================

// Load withdrawals for admin view
export async function loadWithdrawals() {
    if (!ensureInitialized()) return;
    
    try {
        // Fetch only pending withdrawals for the admin view
        const response = await fetchWithAuth('/admin/withdrawals');
        if (response.success) {
            renderWithdrawalsTable(response.withdrawals, 'withdrawals-list');
        }
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        showNotification('Failed to load withdrawals', 'error');
    }
}

// Render withdrawals table
function renderWithdrawalsTable(withdrawals, containerId) {
    const withdrawalsList = document.getElementById(containerId);
    if (!withdrawalsList) {
        console.warn(`Withdrawals list element ('${containerId}') not found.`);
        return;
    }

    withdrawalsList.innerHTML = withdrawals.map(withdrawal => `
        <tr>
            <td>${withdrawal.id}</td>
            <td>${withdrawal.username}</td>
            <td>$${parseFloat(withdrawal.amount).toFixed(2)}</td>
            <td>
                <span class="text-monospace small" title="${withdrawal.address}">
                    ${withdrawal.address ? withdrawal.address.substring(0, 20) + '...' : 'N/A'}
                </span>
            </td>
            <td>${new Date(withdrawal.created_at).toLocaleDateString()}</td>
            <td>
                <span class="status-badge status-${withdrawal.status.toLowerCase()}">
                    ${withdrawal.status}
                </span>
            </td>
            <td>
                ${withdrawal.status === 'PENDING' ? `
                    <button class="btn btn-sm btn-success approve-withdrawal-btn" data-id="${withdrawal.id}">
                        <i class="fas fa-check me-1"></i>Approve
                    </button>
                    <button class="btn btn-sm btn-danger reject-withdrawal-btn" data-id="${withdrawal.id}">
                        <i class="fas fa-times me-1"></i>Reject
                    </button>
                ` : `
                    <span class="text-muted small">
                        ${withdrawal.status === 'APPROVED' ? 
                            '<i class="fas fa-check-circle text-success"></i> Approved' : 
                            '<i class="fas fa-times-circle text-danger"></i> Rejected'
                        }
                    </span>
                `}
            </td>
        </tr>
    `).join('');
}

// Withdrawal Approval/Rejection Functions - MISSING FUNCTIONALITY IMPLEMENTED
export async function approveWithdrawal(withdrawalId) {
    if (!ensureInitialized()) return;
    
    // Add confirmation dialog for withdrawal approval
    const confirmMessage = `
        Are you sure you want to APPROVE this withdrawal?
        
        This action will:
        • Mark the withdrawal as approved
        • The funds should be sent to the user's wallet
        • This action cannot be undone
        
        Please ensure you have processed the payment before approving.
    `;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Show loading state on the button
    const approveButton = document.querySelector(`[data-id="${withdrawalId}"].approve-withdrawal-btn`);
    if (approveButton) {
        approveButton.disabled = true;
        approveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Approving...';
    }
    
    try {
        const response = await fetchWithAuth(`/admin/withdrawals/${withdrawalId}/approve`, {
            method: 'POST'
        });
        
        if (response.success) {
            showNotification('✓ Withdrawal approved successfully', 'success');
            loadWithdrawals(); // Reload the withdrawals list
        } else {
            showNotification(response.message || 'Failed to approve withdrawal', 'error');
            // Reset button state on API error
            if (approveButton) {
                approveButton.disabled = false;
                approveButton.innerHTML = '<i class="fas fa-check me-1"></i>Approve';
            }
        }
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        showNotification('Failed to approve withdrawal: ' + error.message, 'error');
        
        // Reset button state on error
        if (approveButton) {
            approveButton.disabled = false;
            approveButton.innerHTML = '<i class="fas fa-check me-1"></i>Approve';
        }
    }
}

export async function rejectWithdrawal(withdrawalId) {
    if (!ensureInitialized()) return;
    
    // Add confirmation dialog for withdrawal rejection
    const confirmMessage = `
        Are you sure you want to REJECT this withdrawal?
        
        This action will:
        • Mark the withdrawal as rejected
        • Return the funds to the user's main balance
        • Send a notification to the user
        • This action cannot be undone
        
        Please provide a reason for rejection when prompted.
    `;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Optional: Add reason for rejection
    const reason = prompt('Please provide a reason for rejecting this withdrawal (optional):');
    
    // Show loading state on the button
    const rejectButton = document.querySelector(`[data-id="${withdrawalId}"].reject-withdrawal-btn`);
    if (rejectButton) {
        rejectButton.disabled = true;
        rejectButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Rejecting...';
    }
    
    try {
        const requestBody = {
            reason: reason || 'Rejected by admin'
        };
        
        const response = await fetchWithAuth(`/admin/withdrawals/${withdrawalId}/reject`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        if (response.success) {
            showNotification('✓ Withdrawal rejected successfully', 'success');
            loadWithdrawals(); // Reload the withdrawals list
        } else {
            showNotification(response.message || 'Failed to reject withdrawal', 'error');
            // Reset button state on API error
            if (rejectButton) {
                rejectButton.disabled = false;
                rejectButton.innerHTML = '<i class="fas fa-times me-1"></i>Reject';
            }
        }
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        showNotification('Failed to reject withdrawal: ' + error.message, 'error');
        
        // Reset button state on error
        if (rejectButton) {
            rejectButton.disabled = false;
            rejectButton.innerHTML = '<i class="fas fa-times me-1"></i>Reject';
        }
    }
}

// Withdrawal History Functions
export function showWithdrawalHistoryModal() {
    console.log('showWithdrawalHistoryModal called');
    
    const modalElement = document.getElementById('withdrawalHistoryModal');
    if (!modalElement) {
        console.error('withdrawalHistoryModal element not found!');
        showNotification('Withdrawal history modal not found in the page', 'error');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Show loading message
        document.getElementById('withdrawal-history-list').innerHTML = 
            '<tr><td colspan="7" class="text-center">Loading withdrawal history...</td></tr>';
        
        // Load data after a short delay
        setTimeout(() => {
            loadWithdrawalHistory();
        }, 500);
        
    } catch (error) {
        console.error('Error creating/showing withdrawal history modal:', error);
        showNotification('Error showing withdrawal history modal: ' + error.message, 'error');
    }
}

export async function loadWithdrawalHistory() {
    if (!ensureInitialized()) return;
    
    try {
        const statusFilter = document.getElementById('withdrawalHistoryStatusFilter')?.value || '';
        const limit = document.getElementById('withdrawalHistoryLimitSelect')?.value || '50';
        
        // Build query parameters
        let queryParams = new URLSearchParams({
            limit: limit,
            offset: '0'
        });
        
        if (statusFilter) {
            queryParams.append('status', statusFilter);
        }
        
        const url = `/admin/withdrawals/all?${queryParams.toString()}`;
        console.log('Fetching withdrawal history from URL:', url);
        
        const response = await fetchWithAuth(url);
        
        if (response && response.success) {
            renderWithdrawalHistory(response.withdrawals || [], response.total || 0);
            
            // Update pagination info if element exists
            const paginationInfo = document.getElementById('withdrawals-pagination-info');
            if (paginationInfo) {
                const start = 1;
                const end = Math.min(response.withdrawals?.length || 0, response.total || 0);
                paginationInfo.textContent = `Showing ${start}-${end} of ${response.total || 0} withdrawals`;
            }
        } else {
            console.error('API returned success: false or invalid response:', response);
            document.getElementById('withdrawal-history-list').innerHTML = 
                '<tr><td colspan="7" class="text-center text-danger">API returned error: ' + (response?.message || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('Error in loadWithdrawalHistory:', error);
        document.getElementById('withdrawal-history-list').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
        showNotification('Failed to load withdrawal history: ' + error.message, 'error');
    }
}

function renderWithdrawalHistory(withdrawals, total = 0) {
    const historyList = document.getElementById('withdrawal-history-list');
    if (!historyList) {
        console.warn("Withdrawal history list element not found.");
        return;
    }

    if (!withdrawals || withdrawals.length === 0) {
        historyList.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No withdrawals found</td></tr>';
        return;
    }

    historyList.innerHTML = withdrawals.map(withdrawal => {
        // Status badge styling
        let statusClass = 'bg-secondary';
        let statusIcon = 'fa-clock';
        switch (withdrawal.status) {
            case 'APPROVED':
                statusClass = 'bg-success';
                statusIcon = 'fa-check';
                break;
            case 'REJECTED':
                statusClass = 'bg-danger';
                statusIcon = 'fa-times';
                break;
            case 'PENDING':
                statusClass = 'bg-warning';
                statusIcon = 'fa-clock';
                break;
        }
        
        // Processed date
        const processedDate = withdrawal.approved_at ? 
            new Date(withdrawal.approved_at).toLocaleString() : 
            (withdrawal.status === 'PENDING' ? '-' : 'Unknown');
        
        return `
            <tr>
                <td>${withdrawal.id}</td>
                <td>${withdrawal.username}</td>
                <td>$${parseFloat(withdrawal.amount).toFixed(2)}</td>
                <td>
                    <span class="text-monospace small" title="${withdrawal.address}">
                        ${withdrawal.address ? withdrawal.address.substring(0, 15) + '...' : 'N/A'}
                    </span>
                </td>
                <td>${new Date(withdrawal.created_at).toLocaleString()}</td>
                <td>${processedDate}</td>
                <td>
                    <span class="badge ${statusClass}">
                        <i class="fas ${statusIcon} me-1"></i>
                        ${withdrawal.status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// GLOBAL API OBJECT FOR EXTERNAL ACCESS
// ============================================================================

// Create global API object for external access (similar to DriveModuleAPI)
window.FinanceModuleAPI = {
    // Initialization
    initDependencies,
    
    // Deposits
    loadDeposits,
    approveDeposit,
    rejectDeposit,
    viewDepositImage,
    viewDepositPdf,
    downloadDepositFile,
    showDepositHistoryModal,
    loadDepositHistory,
    
    // Withdrawals
    loadWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    showWithdrawalHistoryModal,
    loadWithdrawalHistory
};

console.log('admin-finance.js module loaded and FinanceModuleAPI created');
