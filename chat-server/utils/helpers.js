/**
 * Keymus Chat — Utility Helpers
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a UUID v4
 */
function generateId() {
    return uuidv4();
}

/**
 * Generate a short guest ID
 */
function generateGuestId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `guest_${suffix}`;
}

/**
 * Generate a friendly guest display name
 */
function generateGuestName() {
    const adjectives = [
        'Happy', 'Bright', 'Swift', 'Cool', 'Smart',
        'Kind', 'Bold', 'Calm', 'Keen', 'Warm',
        'Quick', 'Fair', 'True', 'Noble', 'Brave'
    ];
    const nouns = [
        'Fox', 'Eagle', 'Wolf', 'Bear', 'Lion',
        'Hawk', 'Deer', 'Dove', 'Lynx', 'Puma',
        'Owl', 'Raven', 'Falcon', 'Otter', 'Hare'
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

/**
 * Format a timestamp as ISO string
 */
function formatTimestamp(date) {
    return new Date(date).toISOString();
}

/**
 * Truncate a string to a max length with ellipsis
 */
function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

module.exports = { generateId, generateGuestId, generateGuestName, formatTimestamp, truncate };
