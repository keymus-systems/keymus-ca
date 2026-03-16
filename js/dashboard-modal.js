// Drive Progress Modal JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const modal = document.getElementById('detailedProgressModal');
    const openModalBtn = document.getElementById('viewDetailedProgressBtn');
    const closeModalBtn = document.getElementById('closeDetailedProgressModal');
    const refreshProgressBtn = document.getElementById('refreshProgressBtn');
    
    // Modal functionality
    if (openModalBtn) {
        openModalBtn.addEventListener('click', function() {
            openDetailedProgressModal();
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            closeDetailedProgressModal();
        });
    }
    
    if (refreshProgressBtn) {
        refreshProgressBtn.addEventListener('click', function() {
            refreshDetailedProgress();
        });
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDetailedProgressModal();
            }
        });
    }
    
    // Close modal with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
            closeDetailedProgressModal();
        }
    });
    
    // Functions
    function openDetailedProgressModal() {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            loadDetailedProgressData();
        }
    }
    
    function closeDetailedProgressModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    async function loadDetailedProgressData() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error('No auth token found');
                showNoSessionMessage();
                return;
            }
            
            // Fetch detailed progress data
            const response = await fetch(`${API_BASE_URL}/api/drive/detailed-progress`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Detailed progress data:', data);
                
                if (data.code === 0) {
                    updateModalWithProgressData(data);
                } else {
                    showNoSessionMessage();
                }
            } else {
                console.error('Failed to fetch detailed progress');
                showErrorMessage();
            }
        } catch (error) {
            console.error('Error loading detailed progress:', error);
            showErrorMessage();
        }
    }
    
    function updateModalWithProgressData(data) {
        // Update header information
        const driveConfigEl = document.getElementById('modalDriveConfigName');
        if (driveConfigEl) {
            driveConfigEl.textContent = data.drive_configuration_name || 'Drive Configuration';
        }
        
        const sessionIdEl = document.getElementById('modalSessionId');
        if (sessionIdEl) {
            sessionIdEl.textContent = `Session: ${data.drive_session_id || 'N/A'}`;
        }
        
        // Update status badge
        const statusBadge = document.getElementById('modalDriveStatus');
        if (statusBadge) {
            statusBadge.textContent = data.is_completed ? 'Completed' : (data.can_continue ? 'Active' : 'Pending');
            statusBadge.style.background = data.is_completed ? 'var(--success-green)' : (data.can_continue ? 'var(--primary-blue)' : 'var(--warning-orange)');
        }
        
        // Update commission
        const totalCommission = (data.task_items || [])
            .filter(item => item.user_status === 'COMPLETED')
            .reduce((sum, item) => sum + (parseFloat(item.product_1_price || 0) * 0.045), 0);
        const commissionEl = document.getElementById('modalTotalCommission');
        if (commissionEl) {
            commissionEl.textContent = `$${totalCommission.toFixed(2)} USDT`;
        }
        
        // Update progress circle
        const progressPercentage = data.progress_percentage || 0;
        const progressCircle = document.getElementById('modalProgressCircle');
        if (progressCircle) {
            const circumference = 314; // 2 * π * 50
            const offset = circumference - (progressPercentage / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
        }
        
        const progressPercentageEl = document.getElementById('modalProgressPercentage');
        if (progressPercentageEl) {
            progressPercentageEl.textContent = `${Math.round(progressPercentage)}%`;
        }
        
        // Update stats
        const completedTasksEl = document.getElementById('modalCompletedTasks');
        if (completedTasksEl) {
            completedTasksEl.textContent = data.completed_original_tasks || 0;
        }
        
        const remainingTasksEl = document.getElementById('modalRemainingTasks');
        if (remainingTasksEl) {
            remainingTasksEl.textContent = (data.total_task_items || 0) - (data.completed_original_tasks || 0);
        }
        
        const totalTasksEl = document.getElementById('modalTotalTasks');
        if (totalTasksEl) {
            totalTasksEl.textContent = data.total_task_items || 0;
        }
        
        // Update task list
        updateTasksList(data.task_items || []);
        
        // Update current task
        updateCurrentTask(data.current_task);
        
        // Update timestamp
        const lastUpdatedEl = document.getElementById('modalLastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date().toLocaleTimeString();
        }
    }
    
    function updateTasksList(taskItems) {
        const tasksList = document.getElementById('modalTasksList');
        if (!tasksList) return;
        
        if (taskItems.length === 0) {
            tasksList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No tasks available</div>';
            return;
        }
        
        const tasksHTML = taskItems.map((task, index) => {
            const statusIcon = task.user_status === 'COMPLETED' ? 'fa-check-circle' : 
                              task.user_status === 'CURRENT' ? 'fa-play-circle' : 'fa-circle';
            const statusColor = task.user_status === 'COMPLETED' ? 'var(--success-green)' : 
                               task.user_status === 'CURRENT' ? 'var(--warning-orange)' : 'var(--text-secondary)';
            const isCombo = task.is_combo || task.task_type === 'combo_order';
            
            return `
                <div style="display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); ${index === taskItems.length - 1 ? 'border-bottom: none;' : ''}">
                    <div style="margin-right: 0.75rem; color: ${statusColor};">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                            ${task.task_name || `Task ${task.order_in_drive}`}
                            ${isCombo ? '<span style="background: var(--primary-blue); color: white; padding: 0.125rem 0.5rem; border-radius: 10px; font-size: 0.75rem; margin-left: 0.5rem;">COMBO</span>' : ''}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                            ${task.product_1_name || 'Product'} - $${(parseFloat(task.product_1_price || 0)).toFixed(2)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--text-primary);">#${task.order_in_drive}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${task.user_status.toLowerCase()}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        tasksList.innerHTML = tasksHTML;
    }
    
    function updateCurrentTask(currentTask) {
        const currentTaskSection = document.getElementById('currentTaskSection');
        if (!currentTaskSection) return;
        
        if (!currentTask) {
            currentTaskSection.style.display = 'none';
            return;
        }
        
        currentTaskSection.style.display = 'block';
        
        const taskNameEl = document.getElementById('modalCurrentTaskName');
        if (taskNameEl) {
            taskNameEl.textContent = currentTask.task_name || `Task ${currentTask.order_in_drive}`;
        }
        
        const taskDetailsEl = document.getElementById('modalCurrentTaskDetails');
        if (taskDetailsEl) {
            taskDetailsEl.textContent = 
                `${currentTask.product_1_name || 'Product'} - $${(parseFloat(currentTask.product_1_price || 0)).toFixed(2)} - Commission: $${(parseFloat(currentTask.product_1_price || 0) * 0.045).toFixed(2)}`;
        }
    }
    
    function showNoSessionMessage() {
        const elements = {
            'modalDriveConfigName': 'No Active Drive Session',
            'modalSessionId': 'Start a new drive to see progress',
            'modalDriveStatus': 'No Session',
            'modalTotalCommission': '$0.00 USDT',
            'modalProgressPercentage': '0%',
            'modalCompletedTasks': '0',
            'modalRemainingTasks': '0',
            'modalTotalTasks': '0'
        };
        
        Object.entries(elements).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        });
        
        const tasksList = document.getElementById('modalTasksList');
        if (tasksList) {
            tasksList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No active drive session found. <a href="./task.html" style="color: var(--primary-blue);">Start a new drive</a> to see progress.</div>';
        }
        
        const currentTaskSection = document.getElementById('currentTaskSection');
        if (currentTaskSection) {
            currentTaskSection.style.display = 'none';
        }
    }
    
    function showErrorMessage() {
        const tasksList = document.getElementById('modalTasksList');
        if (tasksList) {
            tasksList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger-red);">Error loading progress data. Please try again.</div>';
        }
    }
    
    function refreshDetailedProgress() {
        const refreshBtn = document.getElementById('refreshProgressBtn');
        if (!refreshBtn) return;
        
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Refreshing...';
        refreshBtn.disabled = true;
        
        loadDetailedProgressData().finally(() => {
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 1000);
        });
    }
    
    // Also refresh main dashboard progress when modal is closed
    window.refreshDashboardProgress = function() {
        // This function will be called from the main dashboard script
        loadDetailedProgressData();
    };
});
