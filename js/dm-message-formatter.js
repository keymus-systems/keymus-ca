/**
 * Message Formatter for DM module
 * Handles formatting of messages, including URL detection, emojis, and markdown-like syntax
 */

const DMMessageFormatter = {
    /**
     * Format message text for display
     * @param {string} text - Raw message text
     * @returns {string} Formatted HTML
     */
    format(text) {
        if (!text) return '';
        
        // Escape HTML to prevent XSS
        let formatted = this.escapeHtml(text);
        
        // Format URLs
        formatted = this.formatUrls(formatted);
        
        // Format line breaks
        formatted = this.formatLineBreaks(formatted);
        
        return formatted;
    },
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Format URLs into clickable links
     * @param {string} text - Text containing URLs
     * @returns {string} Text with formatted URLs
     */
    formatUrls(text) {
        // URL regex pattern
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        
        // Replace URLs with clickable links
        return text.replace(urlPattern, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    },
    
    /**
     * Format line breaks
     * @param {string} text - Text with line breaks
     * @returns {string} Text with HTML line breaks
     */
    formatLineBreaks(text) {
        return text.replace(/\n/g, '<br>');
    },
    
    /**
     * Format timestamp for display
     * @param {Date} date - Date object
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(date) {
        if (!date) return '';
        
        const now = new Date();
        const diff = now - date;
        
        // Today - show time only
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Yesterday
        if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
            return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Within a week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' }) + ', ' + 
                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Older - show date and time
        return date.toLocaleDateString() + ', ' + 
               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    /**
     * Format a file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Get file icon based on file type
     * @param {string} fileType - MIME type of file
     * @returns {string} Font Awesome icon class
     */
    getFileIcon(fileType) {
        if (!fileType) return 'fas fa-file';
        
        if (fileType.startsWith('image/')) {
            return 'fas fa-file-image';
        } else if (fileType.startsWith('audio/')) {
            return 'fas fa-file-audio';
        } else if (fileType.startsWith('video/')) {
            return 'fas fa-file-video';
        } else if (fileType.includes('pdf')) {
            return 'fas fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('document')) {
            return 'fas fa-file-word';
        } else if (fileType.includes('excel') || fileType.includes('sheet')) {
            return 'fas fa-file-excel';
        } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
            return 'fas fa-file-powerpoint';
        } else if (fileType.includes('zip') || fileType.includes('compressed')) {
            return 'fas fa-file-archive';
        } else if (fileType.includes('text/')) {
            return 'fas fa-file-alt';
        } else if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('json')) {
            return 'fas fa-file-code';
        }
        
        return 'fas fa-file';
    }
};

// Export to global scope
window.DMMessageFormatter = DMMessageFormatter;
