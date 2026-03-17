/**
 * Keymus Chat — Input Sanitization
 * Prevents XSS in message content
 */
const xss = require('xss');

// Strict XSS filter — strip all HTML
const strictOptions = {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
};

// Permissive filter — allows basic formatting
const permissiveOptions = {
    whiteList: {
        b: [],
        i: [],
        em: [],
        strong: [],
        br: [],
        p: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
};

/**
 * Sanitize chat message content (strict — no HTML)
 */
function sanitizeMessage(content) {
    if (typeof content !== 'string') return '';
    return xss(content.trim(), strictOptions);
}

/**
 * Sanitize with basic formatting allowed
 */
function sanitizeRich(content) {
    if (typeof content !== 'string') return '';
    return xss(content.trim(), permissiveOptions);
}

/**
 * Sanitize all string values in an object recursively
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') return sanitizeMessage(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    }
    return obj;
}

module.exports = { sanitizeMessage, sanitizeRich, sanitizeObject };
