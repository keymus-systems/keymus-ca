/**
 * Emoji Picker for DM module
 */

class DMEmojiPicker {
    constructor() {
        this.emojis = [
            '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', 
            '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗',
            '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
            '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
            '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
            '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
            '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
            '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '👏',
            '🙌', '👐', '🤲', '🙏', '💪', '❤️', '💔', '💯', '🔥', '👀'
        ];
        
        this.pickerElement = null;
        this.isOpen = false;
        this.toggleButton = null;
        this.onEmojiSelected = null;
    }
    
    /**
     * Initialize the emoji picker
     * @param {HTMLElement} container - Container to add emoji picker to
     * @param {Function} onSelect - Callback when emoji is selected
     */
    init(container, onSelect) {
        // Save callback
        this.onEmojiSelected = onSelect;
        
        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'dm-emoji-btn';
        this.toggleButton.innerHTML = '<i class="far fa-smile"></i>';
        this.toggleButton.title = 'Insert emoji';
        
        // Add to container
        container.appendChild(this.toggleButton);
        
        // Create picker
        this.createPicker();
        
        // Add event listeners
        this.toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePicker();
        });
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.pickerElement.contains(e.target) && !this.toggleButton.contains(e.target)) {
                this.closePicker();
            }
        });
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Create emoji picker element
     */
    createPicker() {
        // Create picker container
        this.pickerElement = document.createElement('div');
        this.pickerElement.className = 'dm-emoji-picker';
        
        // Add emojis
        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'dm-emoji-grid';
        
        this.emojis.forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'dm-emoji-item';
            emojiButton.textContent = emoji;
            emojiButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectEmoji(emoji);
            });
            emojiGrid.appendChild(emojiButton);
        });
        
        // Add to picker
        this.pickerElement.appendChild(emojiGrid);
        
        // Hide initially
        this.pickerElement.style.display = 'none';
        
        // Add to document
        document.body.appendChild(this.pickerElement);
    }
    
    /**
     * Toggle picker visibility
     */
    togglePicker() {
        if (this.isOpen) {
            this.closePicker();
        } else {
            this.openPicker();
        }
    }
    
    /**
     * Open picker
     */
    openPicker() {
        if (!this.pickerElement) return;
        
        // Position picker near button
        const buttonRect = this.toggleButton.getBoundingClientRect();
        this.pickerElement.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`;
        this.pickerElement.style.left = `${buttonRect.left}px`;
        
        // Show picker
        this.pickerElement.style.display = 'block';
        this.isOpen = true;
    }
    
    /**
     * Close picker
     */
    closePicker() {
        if (!this.pickerElement) return;
        
        // Hide picker
        this.pickerElement.style.display = 'none';
        this.isOpen = false;
    }
    
    /**
     * Handle emoji selection
     * @param {string} emoji - Selected emoji
     */
    selectEmoji(emoji) {
        // Call callback if exists
        if (typeof this.onEmojiSelected === 'function') {
            this.onEmojiSelected(emoji);
        }
        
        // Close picker
        this.closePicker();
    }
    
    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('dm-emoji-picker-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dm-emoji-picker-styles';
        style.textContent = `
            .dm-emoji-btn {
                background: none;
                border: none;
                color: #6c757d;
                cursor: pointer;
                font-size: 18px;
                padding: 5px;
                margin-right: 5px;
                transition: color 0.2s;
            }
            
            .dm-emoji-btn:hover {
                color: #343a40;
            }
            
            .dm-emoji-picker {
                position: fixed;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
                width: 320px;
                max-width: 90vw;
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .dm-emoji-grid {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 5px;
                padding: 10px;
            }
            
            .dm-emoji-item {
                background: none;
                border: none;
                font-size: 22px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 40px;
            }
            
            .dm-emoji-item:hover {
                background-color: #f0f0f0;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.pickerElement && this.pickerElement.parentNode) {
            this.pickerElement.parentNode.removeChild(this.pickerElement);
        }
    }
}

// Export to global scope
window.DMEmojiPicker = DMEmojiPicker;
