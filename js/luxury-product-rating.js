/**
 * Luxury Product Rating Modal Component
 * Handles post-purchase product rating with tier-based compensation
 * Uses unique function names to avoid conflicts with existing modal systems
 */

class LuxuryProductRatingModal {
    constructor() {
        this.isOpen = false;
        this.currentProductData = null;
        this.onContinueCallback = null;
        this.selectedStars = 0;
        this.reviewText = '';
        this.ratingType = 'manual'; // 'manual' or 'ai'
        
        // Compensation matrix based on user tier
        // AI reviews get higher commission than manual reviews
        this.compensationMatrix = {
            'Bronze': { manual: 0.20, ai: 0.40 },
            'Silver': { manual: 0.30, ai: 0.70 },
            'Gold': { manual: 0.50, ai: 0.90 }
        };
    }
    
    /**
     * Show the rating modal for a product
     * @param {Object} productData - Product information
     * @param {Function} onContinue - Callback to execute after rating submission
     */
    show(productData, onContinue) {
        console.log('Rating modal opening with product data:', productData);
        
        if (this.isOpen) {
            console.warn('LuxuryProductRatingModal: Modal is already open');
            return;
        }
        
        this.currentProductData = productData;
        this.onContinueCallback = onContinue;
        this.isOpen = true;
        
        this.createModal();
        this.attachEventListeners();
        
        // Show with animation
        requestAnimationFrame(() => {
            const overlay = document.getElementById('lux-rating-modal-overlay');
            if (overlay) {
                overlay.classList.add('show');
            }
        });
    }
    
    /**
     * Create the modal HTML structure
     */
    createModal() {
        const userTier = this.getUserTier();
        const compensation = this.calculateCompensation('manual', userTier);
        
        // Remove any existing styles to prevent duplicates
        const existingStyles = document.getElementById('lux-rating-modal-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        // Add CSS styles for white theme
        const modalCSS = `
            <style id="lux-rating-modal-styles">
                .lux-rating-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .lux-rating-modal-overlay.show {
                    opacity: 1;
                }
                
                .lux-rating-modal {
                    background: white;
                    border: 1px solid #e5e5e5;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }
                
                .lux-rating-modal-overlay.show .lux-rating-modal {
                    transform: scale(1);
                }
                
                .lux-rating-modal-header {
                    background: white;
                    border-bottom: 1px solid #f0f0f0;
                    padding: 20px;
                    text-align: center;
                    border-radius: 12px 12px 0 0;
                    position: relative;
                }
                
                .lux-rating-modal-close {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 50%;
                    width: 35px;
                    height: 35px;
                    color: #6c757d;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .lux-rating-modal-close:hover {
                    background: #e9ecef;
                    color: #495057;
                    transform: scale(1.1);
                }
                
                .lux-rating-modal-title {
                    margin: 0 0 8px 0;
                    color: #212529;
                    font-size: 24px;
                    font-weight: 600;
                }
                
                .lux-rating-modal-subtitle {
                    margin: 0;
                    color: #6c757d;
                    font-size: 16px;
                }
                
                .lux-rating-tabs {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .lux-tab-btn {
                    flex: 1;
                    background: #f8f9fa;
                    border: none;
                    border-bottom: 3px solid transparent;
                    color: #495057;
                    padding: 15px 20px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .lux-tab-btn:hover {
                    background: #e9ecef;
                    color: #212529;
                }
                
                .lux-tab-btn.active {
                    background: white;
                    border-bottom-color: #007bff;
                    color: #007bff;
                    font-weight: 600;
                }
                
                .lux-rating-content {
                    padding: 25px;
                }
                
                .lux-tab-content {
                    display: none;
                }
                
                .lux-tab-content.active {
                    display: block;
                }
                
                .lux-star-rating {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .lux-star {
                    color: #ddd;
                    cursor: pointer;
                    font-size: 32px;
                    margin: 0 5px;
                    transition: all 0.2s ease;
                    user-select: none;
                }
                
                .lux-star:hover,
                .lux-star.active {
                    color: #ffc107;
                    transform: scale(1.1);
                }
                
                .lux-review-textarea {
                    width: 100%;
                    min-height: 120px;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                    font-size: 16px;
                    font-family: inherit;
                    resize: vertical;
                    transition: border-color 0.3s ease;
                }
                
                .lux-review-textarea:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
                }
                
                .lux-ai-generate-btn {
                    width: 100%;
                    background: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    color: #6c757d;
                    padding: 25px 20px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 15px;
                }
                
                .lux-ai-generate-btn:hover {
                    background: #e9ecef;
                    border-color: #adb5bd;
                    color: #495057;
                }
                
                .lux-ai-generate-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .lux-ai-preview {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                    font-style: italic;
                    color: #495057;
                    line-height: 1.5;
                }
                
                .lux-compensation-info {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 25px;
                }
                
                .lux-tier-display {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .lux-user-tier {
                    color: #495057;
                    font-weight: 500;
                    font-size: 16px;
                }
                
                .lux-compensation {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 16px;
                }
                
                .lux-modal-actions {
                    padding: 20px 25px 25px;
                    display: flex;
                    gap: 15px;
                }
                
                .lux-submit-rating-btn {
                    flex: 1;
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    border: none;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .lux-submit-rating-btn:hover {
                    background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
                    transform: translateY(-1px);
                }
                
                .lux-submit-rating-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .lux-skip-rating-btn {
                    background: white;
                    border: 2px solid #dee2e6;
                    color: #6c757d;
                    padding: 15px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .lux-skip-rating-btn:hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                    color: #495057;
                    transform: translateY(-1px);
                }
                
                /* Success Modal Styles */
                .lux-success-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .lux-success-modal-overlay.show {
                    opacity: 1;
                }
                
                .lux-success-modal-content {
                    background: white;
                    border: 1px solid #e5e5e5;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 450px;
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }
                
                .lux-success-modal-overlay.show .lux-success-modal-content {
                    transform: scale(1);
                }
                
                .lux-success-header {
                    background: white;
                    border-bottom: 1px solid #f0f0f0;
                    padding: 30px 25px 20px;
                    text-align: center;
                    border-radius: 12px 12px 0 0;
                }
                
                .lux-success-icon {
                    color: #28a745;
                    font-size: 48px;
                    margin-bottom: 15px;
                }
                
                .lux-success-header h3 {
                    margin: 0 0 10px 0;
                    color: #212529;
                    font-size: 24px;
                    font-weight: 600;
                }
                
                .lux-success-header p {
                    margin: 0;
                    color: #6c757d;
                    font-size: 16px;
                }
                
                .lux-success-details {
                    padding: 25px;
                }
                
                .lux-bonus-earned {
                    text-align: center;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 25px;
                }
                
                .lux-bonus-label {
                    display: block;
                    color: #6c757d;
                    font-size: 14px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                
                .lux-bonus-amount {
                    color: #28a745;
                    font-size: 28px;
                    font-weight: 700;
                }
                
                .lux-rating-summary {
                    margin-bottom: 25px;
                }
                
                .lux-summary-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .lux-summary-item:last-child {
                    border-bottom: none;
                }
                
                .lux-summary-label {
                    color: #6c757d;
                    font-weight: 500;
                }
                
                .lux-summary-value {
                    color: #212529;
                    font-weight: 600;
                }
                
                .lux-next-steps h4 {
                    color: #212529;
                    font-size: 18px;
                    margin: 0 0 15px 0;
                }
                
                .lux-next-steps ul {
                    margin: 0;
                    padding-left: 20px;
                    color: #6c757d;
                }
                
                .lux-next-steps li {
                    margin-bottom: 8px;
                }
                
                .lux-success-actions {
                    padding: 20px 25px 25px;
                    text-align: center;
                }
                
                .lux-continue-btn {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    border: none;
                    color: white;
                    padding: 15px 35px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .lux-continue-btn:hover {
                    background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
                    transform: translateY(-1px);
                }
            </style>
        `;
        
        const modalHTML = `
            ${modalCSS}
            <div id="lux-rating-modal-overlay" class="lux-rating-modal-overlay">
                <div class="lux-rating-modal">
                    <div class="lux-rating-modal-header">
                        <button class="lux-rating-modal-close" id="lux-rating-close">×</button>
                        <h3 class="lux-rating-modal-title">Rate Your Experience</h3>
                        <p class="lux-rating-modal-subtitle">Help others and earn extra commission</p>
                    </div>
                    
                    <div class="lux-rating-tabs">
                        <button class="lux-tab-btn active" data-tab="manual" id="lux-tab-manual">
                            Manual Review
                        </button>
                        <button class="lux-tab-btn" data-tab="ai" id="lux-tab-ai">
                            AI Generated
                        </button>
                    </div>
                    
                    <div class="lux-rating-content">
                        <!-- Manual Rating Tab -->
                        <div id="lux-manual-rating" class="lux-tab-content active">
                            <div class="lux-star-rating" id="lux-star-rating">
                                ${this.createStarRating()}
                            </div>
                            <textarea 
                                class="lux-review-textarea" 
                                id="lux-review-text"
                                placeholder="Share your thoughts about this product..."
                                maxlength="500"></textarea>
                        </div>
                        
                        <!-- AI Generated Tab -->
                        <div id="lux-ai-rating" class="lux-tab-content">
                            <button class="lux-ai-generate-btn" id="lux-ai-generate">
                                <i class="fas fa-magic"></i> Generate AI Review
                            </button>
                            <div class="lux-ai-preview" id="lux-ai-preview" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="lux-compensation-info">
                        <div class="lux-tier-display">
                            <span class="lux-user-tier">${userTier} Tier</span>
                            <span class="lux-compensation" id="lux-compensation-amount">+$${compensation.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="lux-modal-actions">
                        <button class="lux-submit-rating-btn" id="lux-submit-rating">
                            Submit & Claim Bonus
                        </button>
                        <button class="lux-skip-rating-btn" id="lux-skip-rating">
                            Skip This Time
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * Create star rating HTML
     */
    createStarRating() {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<span class="lux-star" data-rating="${i}">★</span>`;
        }
        return starsHTML;
    }
    
    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        const overlay = document.getElementById('lux-rating-modal-overlay');
        const closeBtn = document.getElementById('lux-rating-close');
        const tabButtons = document.querySelectorAll('.lux-tab-btn');
        const stars = document.querySelectorAll('.lux-star');
        const aiGenerateBtn = document.getElementById('lux-ai-generate');
        const submitBtn = document.getElementById('lux-submit-rating');
        const skipBtn = document.getElementById('lux-skip-rating');
        const reviewTextarea = document.getElementById('lux-review-text');
        
        // Close modal events
        closeBtn?.addEventListener('click', () => this.close());
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });
        
        // Tab switching
        tabButtons.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Star rating
        stars.forEach(star => {
            star.addEventListener('click', () => this.setStarRating(parseInt(star.dataset.rating)));
            star.addEventListener('mouseenter', () => this.highlightStars(parseInt(star.dataset.rating)));
            star.addEventListener('mouseleave', () => this.highlightStars(this.selectedStars));
        });
        
        // AI generation
        aiGenerateBtn?.addEventListener('click', () => this.generateAIReview());
        
        // Form submission
        submitBtn?.addEventListener('click', () => this.submitRating());
        skipBtn?.addEventListener('click', () => this.skipRating());
        
        // Review text change
        reviewTextarea?.addEventListener('input', (e) => {
            this.reviewText = e.target.value;
        });
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    /**
     * Switch between manual and AI tabs
     */
    switchTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('.lux-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabType);
        });
        
        // Update tab content
        document.querySelectorAll('.lux-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `lux-${tabType}-rating`);
        });
        
        // Update rating type and compensation
        this.ratingType = tabType;
        this.updateCompensationDisplay();
    }
    
    /**
     * Set star rating
     */
    setStarRating(rating) {
        this.selectedStars = rating;
        this.highlightStars(rating);
    }
    
    /**
     * Highlight stars up to the given rating
     */
    highlightStars(rating) {
        document.querySelectorAll('.lux-star').forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }
    
    /**
     * Generate AI review (placeholder implementation)
     */
    async generateAIReview() {
        const generateBtn = document.getElementById('lux-ai-generate');
        const preview = document.getElementById('lux-ai-preview');
        
        if (!generateBtn || !preview) return;
        
        // Show loading state
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        
        try {
            // Simulate AI generation (replace with actual AI service)
            await this.delay(2000);
            
            const aiReview = this.generateMockAIReview();
            
            preview.textContent = aiReview;
            preview.style.display = 'block';
            
            generateBtn.textContent = 'Regenerate AI Review';
            generateBtn.disabled = false;
            
            // Set default 5-star rating for AI
            this.selectedStars = 5;
            this.reviewText = aiReview;
            
            // Update star display
            this.highlightStars(5);
            
        } catch (error) {
            console.error('Error generating AI review:', error);
            generateBtn.textContent = 'Try Again';
            generateBtn.disabled = false;
        }
    }
    
    /**
     * Generate a mock AI review (replace with actual AI service)
     */
    generateMockAIReview() {
        const positiveAdjectives = [
            'excellent', 'outstanding', 'impressive', 'reliable', 'high-quality',
            'exceptional', 'remarkable', 'superb', 'fantastic', 'amazing',
            'premium', 'top-notch', 'first-class', 'superior', 'professional'
        ];
        
        const features = [
            'build quality', 'performance', 'design', 'functionality', 'value',
            'durability', 'craftsmanship', 'user experience', 'efficiency', 'innovation',
            'attention to detail', 'materials', 'finish quality', 'ergonomics', 'versatility'
        ];
        
        const conclusions = [
            'Highly recommended!', 'Great purchase decision.', 'Exceeded expectations.',
            'Worth every penny!', 'Perfect for my needs.', 'Outstanding value for money.',
            'Will definitely buy again.', 'Impressive quality overall.', 'Couldn\'t be happier!',
            'Exceptional product quality.', 'Best purchase I\'ve made recently.'
        ];
        
        const experiences = [
            'The overall experience has been very satisfying and meets all my requirements.',
            'I\'m thoroughly impressed with every aspect of this product.',
            'This has proven to be an excellent investment in quality.',
            'The attention to detail really shows in the final product.',
            'Everything about this product demonstrates superior craftsmanship.',
            'I can confidently say this exceeds industry standards.',
            'The quality is immediately apparent from the first use.'
        ];
        
        const adj = positiveAdjectives[Math.floor(Math.random() * positiveAdjectives.length)];
        const feature = features[Math.floor(Math.random() * features.length)];
        const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
        const experience = experiences[Math.floor(Math.random() * experiences.length)];
        
        return `This product offers ${adj} ${feature}. ${experience} ${conclusion}`;
    }
    
    /**
     * Submit the rating
     */
    async submitRating() {
        if (!this.validateRating()) return;
        
        const submitBtn = document.getElementById('lux-submit-rating');
        if (submitBtn) {
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
        }
        
        try {
            const ratingData = {
                type: this.ratingType,
                stars: this.selectedStars,
                review: this.reviewText,
                productId: this.currentProductData?.product_id || this.currentProductData?.id || 0
            };
            
            // Validate that we have the required data
            if (!ratingData.productId && ratingData.productId !== 0) {
                throw new Error('Product ID is missing');
            }
            
            await this.submitRatingToServer(ratingData);
            
            // Show success but don't auto-close - let user decide
            this.showSubmissionSuccess();
            // Note: Removed auto-close timeout - user controls when to continue
            
        } catch (error) {
            console.error('Error submitting rating:', error);
            if (submitBtn) {
                submitBtn.textContent = 'Submit & Claim Bonus';
                submitBtn.disabled = false;
            }
            this.showError('Failed to submit rating. Please try again.');
        }
    }
    
    /**
     * Validate rating data before submission
     */
    validateRating() {
        if (this.ratingType === 'manual') {
            if (this.selectedStars === 0) {
                this.showError('Please select a star rating.');
                return false;
            }
            if (!this.reviewText.trim()) {
                this.showError('Please write a review.');
                return false;
            }
        } else if (this.ratingType === 'ai') {
            if (!this.reviewText.trim()) {
                this.showError('Please generate an AI review first.');
                return false;
            }
            if (this.selectedStars === 0) {
                this.showError('AI review star rating not set. Please regenerate the review.');
                return false;
            }
        }
        return true;
    }
    
    /**
     * Submit rating to server and add compensation
     */
    async submitRatingToServer(ratingData) {
        const userTier = this.getUserTier();
        
        // Get auth token (using existing system)
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        // Get product name from current product data
        const productName = this.currentProductData?.product_name || 
                           this.currentProductData?.name || 
                           'Unknown Product';
        
        // Prepare request data
        const requestData = {
            rating: ratingData.stars,
            productId: ratingData.productId,
            productName: productName,
            userTier: userTier,
            reviewText: ratingData.review || this.reviewText || null
        };
        
        console.log('Submitting rating data:', requestData);
        
        // Add compensation to current drive session
        const response = await fetch(`${window.API_BASE_URL || ''}/api/drive/add-commission`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Rating response status:', response.status);
        
        if (!response.ok) {
            let errorMessage = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If we can't parse the error response, use the status code
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Rating response data:', result);
        
        if (result.code !== 0) {
            throw new Error(result.message || 'Failed to add commission');
        }
        
        // Get the commission amount from the server response
        const compensation = result.data?.commissionEarned || 0;
        
        // Update UI commission display if function exists
        if (typeof window.updateCommissionDisplay === 'function') {
            window.updateCommissionDisplay(compensation);
        }
        
        return result;
    }
    
    /**
     * Skip rating and continue
     */
    skipRating() {
        this.close();
        if (this.onContinueCallback) {
            this.onContinueCallback();
        }
    }
    
    /**
     * Get user tier (implement based on your user system)
     */
    getUserTier() {
        // TODO: Implement actual user tier detection
        // For now, return a default tier
        return 'Gold'; // Could be 'Bronze', 'Silver', or 'Gold'
    }
    
    /**
     * Calculate compensation based on type and tier
     */
    calculateCompensation(type, tier = null) {
        const userTier = tier || this.getUserTier();
        const ratingType = type === 'ai' ? 'ai' : 'manual';
        return this.compensationMatrix[userTier]?.[ratingType] || 0;
    }
    
    /**
     * Update compensation display
     */
    updateCompensationDisplay() {
        const compensationElement = document.getElementById('lux-compensation-amount');
        if (compensationElement) {
            const compensation = this.calculateCompensation(this.ratingType);
            compensationElement.textContent = `+$${compensation.toFixed(2)}`;
        }
    }
    
    /**
     * Show submission success with detailed bonus information
     */
    showSubmissionSuccess() {
        const submitBtn = document.getElementById('lux-submit-rating');
        if (submitBtn) {
            submitBtn.textContent = '✓ Success!';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        }
        
        // Create and show detailed success modal
        this.createSuccessModal();
    }
    
    /**
     * Create detailed success modal with compensation info
     */
    createSuccessModal() {
        const userTier = this.getUserTier();
        const compensation = this.compensationMatrix[userTier][this.ratingType];
        
        const successModalHTML = `
            <div class="lux-success-modal-overlay" id="lux-success-modal-overlay">
                <div class="lux-success-modal-content">
                    <div class="lux-success-header">
                        <div class="lux-success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Rating Submitted Successfully!</h3>
                        <p>Thank you for your valuable feedback</p>
                    </div>
                    
                    <div class="lux-success-details">
                        <div class="lux-bonus-earned">
                            <span class="lux-bonus-label">Bonus Earned</span>
                            <span class="lux-bonus-amount">+$${compensation.toFixed(2)}</span>
                        </div>
                        
                        <div class="lux-rating-summary">
                            <div class="lux-summary-item">
                                <span class="lux-summary-label">Rating Type:</span>
                                <span class="lux-summary-value">${this.ratingType === 'manual' ? 'Manual Review' : 'AI Generated'}</span>
                            </div>
                            <div class="lux-summary-item">
                                <span class="lux-summary-label">Your Tier:</span>
                                <span class="lux-summary-value">${userTier}</span>
                            </div>
                            <div class="lux-summary-item">
                                <span class="lux-summary-label">Stars Given:</span>
                                <span class="lux-summary-value">${'★'.repeat(this.selectedStars)}</span>
                            </div>
                        </div>
                        
                        <div class="lux-next-steps">
                            <h4>What's Next?</h4>
                            <ul>
                                <li>Your bonus has been added to your account</li>
                                <li>Click "Continue Driving" when ready to proceed</li>
                                <li>Higher tiers earn bigger bonuses</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="lux-success-actions">
                        <button class="lux-continue-btn" id="lux-success-continue">
                            Continue Driving
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', successModalHTML);
        
        // Add event listeners
        const overlay = document.getElementById('lux-success-modal-overlay');
        const continueBtn = document.getElementById('lux-success-continue');
        
        // Show with animation
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
        
        // Handle continue button
        continueBtn?.addEventListener('click', () => {
            this.closeSuccessModal();
            // Execute the continue callback after success modal closes
            if (this.onContinueCallback) {
                this.onContinueCallback();
            }
            // Also close the main rating modal
            this.close();
        });
        
        // Close on overlay click
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSuccessModal();
            }
        });
        
        // Note: Removed auto-close timeout - user controls when to continue
        // Users can click "Continue Driving" button or click outside to close
    }
    
    /**
     * Close success modal
     */
    closeSuccessModal() {
        const overlay = document.getElementById('lux-success-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        // You can implement a toast notification system here
        alert(message); // Temporary implementation
    }
    
    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        if (!this.isOpen) return;
        
        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            this.submitRating();
        }
    }
    
    /**
     * Close the modal
     */
    close() {
        const overlay = document.getElementById('lux-rating-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            
            // Remove from DOM after animation
            setTimeout(() => {
                overlay.remove();
                // Also remove the styles
                const styles = document.getElementById('lux-rating-modal-styles');
                if (styles) {
                    styles.remove();
                }
            }, 400);
        }
        
        // Cleanup
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        this.isOpen = false;
        this.currentProductData = null;
        this.onContinueCallback = null;
        this.selectedStars = 0;
        this.reviewText = '';
        this.ratingType = 'manual';
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Global function to show product rating modal
 * Uses unique name to avoid conflicts with existing functions
 */
function showLuxuryProductRatingModal(productData, onContinue) {
    if (!window.luxuryRatingModal) {
        window.luxuryRatingModal = new LuxuryProductRatingModal();
    }
    
    window.luxuryRatingModal.show(productData, onContinue);
}

/**
 * Initialize rating modal system
 */
function initLuxuryProductRatingModal() {
    // Check if we're on the task page
    if (!document.getElementById('show-product-modal-btn')) {
        return;
    }
    
    // Create global instance
    window.luxuryRatingModal = new LuxuryProductRatingModal();
    
    console.log('LuxuryProductRatingModal: Initialized successfully');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLuxuryProductRatingModal);
} else {
    initLuxuryProductRatingModal();
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LuxuryProductRatingModal, showLuxuryProductRatingModal };
}
