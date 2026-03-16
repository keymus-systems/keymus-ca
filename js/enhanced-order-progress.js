/**
 * Enhanced Order Progress Component
 * Matches the design from the provided image with modern progress steps and task counters
 */

class EnhancedOrderProgress {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            totalSteps: 5,
            currentStep: 1,
            tasksCompleted: 10,
            pendingOrders: 5,
            showStats: true,
            showCounters: true,
            animated: true,
            ...options
        };
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Enhanced Order Progress: Container not found');
            return;
        }
        
        this.render();
        this.attachEvents();
        
        if (this.options.animated) {
            this.container.classList.add('order-progress-animate-in');
        }
    }

    render() {
        this.container.innerHTML = this.generateHTML();
        this.updateProgress();
    }

    generateHTML() {
        return `
            <div class="order-progress-card">
                ${this.generateHeader()}
                ${this.generateProgressSteps()}
                ${this.options.showCounters ? this.generateTaskCounters() : ''}
                ${this.options.showStats ? this.generateProgressStats() : ''}
            </div>
        `;
    }

    generateHeader() {
        return `
            <div class="order-progress-header">
                <h3 class="order-progress-title">Order Progress</h3>
                <p class="order-progress-subtitle">Track your current task completion status</p>
            </div>
        `;
    }

    generateProgressSteps() {
        const steps = [];
        const progressPercentage = ((this.options.currentStep - 1) / (this.options.totalSteps - 1)) * 100;
        
        for (let i = 1; i <= this.options.totalSteps; i++) {
            const stepClass = this.getStepClass(i);
            const stepLabel = this.getStepLabel(i);
            
            steps.push(`
                <div class="order-step">
                    <div class="order-step-circle ${stepClass}">${i}</div>
                    <div class="order-step-label ${stepClass}">${stepLabel}</div>
                </div>
            `);
        }

        return `
            <div class="order-progress-steps">
                <div class="order-progress-line">
                    <div class="order-progress-line-fill" style="width: ${progressPercentage}%"></div>
                </div>
                ${steps.join('')}
            </div>
        `;
    }

    generateTaskCounters() {
        return `
            <div class="order-task-counters">
                <div class="task-counter-card completed">
                    <div class="task-counter-header">
                        <p class="task-counter-label">Task Complete</p>
                        <div class="task-counter-icon">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    <h2 class="task-counter-value" id="tasks-completed-count">${this.options.tasksCompleted}</h2>
                    <p class="task-counter-description">Successfully completed tasks</p>
                </div>
                
                <div class="task-counter-card pending">
                    <div class="task-counter-header">
                        <p class="task-counter-label">Pending Orders</p>
                        <div class="task-counter-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <h2 class="task-counter-value" id="pending-orders-count">${this.options.pendingOrders}</h2>
                    <p class="task-counter-description">Orders awaiting completion</p>
                </div>
            </div>
        `;
    }

    generateProgressStats() {
        const completionRate = Math.round((this.options.tasksCompleted / (this.options.tasksCompleted + this.options.pendingOrders)) * 100);
        const totalTasks = this.options.tasksCompleted + this.options.pendingOrders;
        
        return `
            <div class="order-progress-stats">
                <div class="progress-stat-item">
                    <div class="progress-stat-value">${completionRate}%</div>
                    <div class="progress-stat-label">Completion Rate</div>
                </div>
                <div class="progress-stat-item">
                    <div class="progress-stat-value">${totalTasks}</div>
                    <div class="progress-stat-label">Total Tasks</div>
                </div>
                <div class="progress-stat-item">
                    <div class="progress-stat-value">Step ${this.options.currentStep}</div>
                    <div class="progress-stat-label">Current</div>
                </div>
            </div>
        `;
    }

    getStepClass(stepNumber) {
        if (stepNumber < this.options.currentStep) {
            return 'completed';
        } else if (stepNumber === this.options.currentStep) {
            return 'current';
        } else {
            return 'pending';
        }
    }

    getStepLabel(stepNumber) {
        const labels = {
            1: 'Start',
            2: 'Process',
            3: 'Review',
            4: 'Complete',
            5: 'Finish'
        };
        
        return labels[stepNumber] || `Step ${stepNumber}`;
    }

    updateProgress(newStep = null, tasksCompleted = null, pendingOrders = null) {
        if (newStep !== null) {
            this.options.currentStep = Math.max(1, Math.min(newStep, this.options.totalSteps));
        }
        
        if (tasksCompleted !== null) {
            this.options.tasksCompleted = Math.max(0, tasksCompleted);
        }
        
        if (pendingOrders !== null) {
            this.options.pendingOrders = Math.max(0, pendingOrders);
        }
        
        // Update progress line
        const progressPercentage = ((this.options.currentStep - 1) / (this.options.totalSteps - 1)) * 100;
        const progressFill = this.container.querySelector('.order-progress-line-fill');
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Update step circles and labels
        this.updateStepStates();
        
        // Update counters
        this.updateCounters();
        
        // Update stats
        this.updateStats();
        
        // Add update animation
        if (this.options.animated) {
            this.container.classList.add('order-progress-update');
            setTimeout(() => {
                this.container.classList.remove('order-progress-update');
            }, 800);
        }
        
        // Trigger custom event
        this.container.dispatchEvent(new CustomEvent('progressUpdated', {
            detail: {
                currentStep: this.options.currentStep,
                tasksCompleted: this.options.tasksCompleted,
                pendingOrders: this.options.pendingOrders
            }
        }));
    }

    updateStepStates() {
        const steps = this.container.querySelectorAll('.order-step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            const circle = step.querySelector('.order-step-circle');
            const label = step.querySelector('.order-step-label');
            
            // Remove all state classes
            circle.classList.remove('completed', 'current', 'pending');
            label.classList.remove('completed', 'current', 'pending');
            
            // Add appropriate state class
            const stepClass = this.getStepClass(stepNumber);
            circle.classList.add(stepClass);
            label.classList.add(stepClass);
        });
    }

    updateCounters() {
        const completedCount = this.container.querySelector('#tasks-completed-count');
        const pendingCount = this.container.querySelector('#pending-orders-count');
        
        if (completedCount) {
            this.animateCounterUpdate(completedCount, this.options.tasksCompleted);
        }
        
        if (pendingCount) {
            this.animateCounterUpdate(pendingCount, this.options.pendingOrders);
        }
    }

    updateStats() {
        const statsContainer = this.container.querySelector('.order-progress-stats');
        if (!statsContainer) return;
        
        const completionRate = Math.round((this.options.tasksCompleted / (this.options.tasksCompleted + this.options.pendingOrders)) * 100);
        const totalTasks = this.options.tasksCompleted + this.options.pendingOrders;
        
        const statItems = statsContainer.querySelectorAll('.progress-stat-value');
        if (statItems.length >= 3) {
            this.animateCounterUpdate(statItems[0], completionRate, '%');
            this.animateCounterUpdate(statItems[1], totalTasks);
            statItems[2].textContent = `Step ${this.options.currentStep}`;
        }
    }

    animateCounterUpdate(element, newValue, suffix = '') {
        const currentValue = parseInt(element.textContent) || 0;
        const duration = 800;
        const steps = 30;
        const stepValue = (newValue - currentValue) / steps;
        let currentStep = 0;
        
        const timer = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = value + suffix;
            
            if (currentStep >= steps) {
                clearInterval(timer);
                element.textContent = newValue + suffix;
            }
        }, duration / steps);
    }

    attachEvents() {
        // Add click handlers for step navigation (optional)
        const stepCircles = this.container.querySelectorAll('.order-step-circle');
        stepCircles.forEach((circle, index) => {
            circle.addEventListener('click', () => {
                const stepNumber = index + 1;
                if (stepNumber <= this.options.currentStep) {
                    this.updateProgress(stepNumber);
                }
            });
        });
    }

    nextStep() {
        if (this.options.currentStep < this.options.totalSteps) {
            this.updateProgress(this.options.currentStep + 1);
        }
    }

    previousStep() {
        if (this.options.currentStep > 1) {
            this.updateProgress(this.options.currentStep - 1);
        }
    }

    setTotalSteps(totalSteps) {
        this.options.totalSteps = Math.max(1, totalSteps);
        this.render();
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.container.classList.add('order-progress-loading');
        } else {
            this.container.classList.remove('order-progress-loading');
        }
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove('order-progress-animate-in', 'order-progress-update', 'order-progress-loading');
        }
    }
}

// Integration with existing task system
function initializeEnhancedOrderProgress() {
    console.log('Initializing Enhanced Order Progress...');
    
    // Find existing progress containers
    const containers = [
        document.querySelector('.progress-section .app-card'),
        document.querySelector('#order-progress-container'),
        document.querySelector('.drive-progress-container')
    ].filter(Boolean);
    
    if (containers.length === 0) {
        // Create a new container if none exists
        const mainContent = document.querySelector('.main-content .container');
        if (mainContent) {
            const progressContainer = document.createElement('div');
            progressContainer.id = 'enhanced-order-progress';
            progressContainer.className = 'enhanced-progress-section';
            
            // Insert after stats grid
            const statsGrid = mainContent.querySelector('.stats-grid');
            if (statsGrid) {
                statsGrid.insertAdjacentElement('afterend', progressContainer);
                containers.push(progressContainer);
            }
        }
    }
    
    // Initialize progress components
    containers.forEach((container, index) => {
        const progressInstance = new EnhancedOrderProgress(container, {
            totalSteps: window.totalTasksRequired || 5,
            currentStep: Math.max(1, window.tasksCompleted || 1),
            tasksCompleted: window.tasksCompleted || 0,
            pendingOrders: Math.max(0, (window.totalTasksRequired || 5) - (window.tasksCompleted || 0)),
            showStats: index === 0, // Only show stats in the first instance
            showCounters: true,
            animated: true
        });
        
        // Store instance for global access
        window[`orderProgress${index}`] = progressInstance;
        if (index === 0) {
            window.orderProgress = progressInstance; // Primary instance
        }
    });
    
    console.log('Enhanced Order Progress initialized successfully');
}

// Update progress when drive data changes
function updateOrderProgressFromDrive() {
    if (window.orderProgress) {
        const currentStep = Math.min(Math.max(1, (window.tasksCompleted || 0) + 1), window.totalTasksRequired || 5);
        const tasksCompleted = window.tasksCompleted || 0;
        const totalTasks = window.totalTasksRequired || 5;
        const pendingOrders = Math.max(0, totalTasks - tasksCompleted);
        
        window.orderProgress.updateProgress(currentStep, tasksCompleted, pendingOrders);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeEnhancedOrderProgress, 500); // Delay to ensure other scripts load
    });
} else {
    setTimeout(initializeEnhancedOrderProgress, 500);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EnhancedOrderProgress,
        initializeEnhancedOrderProgress,
        updateOrderProgressFromDrive
    };
}

// Make globally available
window.EnhancedOrderProgress = EnhancedOrderProgress;
window.initializeEnhancedOrderProgress = initializeEnhancedOrderProgress;
window.updateOrderProgressFromDrive = updateOrderProgressFromDrive;
