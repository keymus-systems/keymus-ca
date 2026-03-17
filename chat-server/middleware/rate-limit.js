/**
 * Keymus Chat — Rate Limiting
 */
const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX) || 60;

/**
 * General rate limiter — 60 requests per minute
 */
const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip;
    }
});

/**
 * Strict rate limiter — 10 requests per minute (for session creation, etc.)
 */
const strictLimiter = rateLimit({
    windowMs: 60000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please wait before trying again.' },
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip;
    }
});

/**
 * Socket.io event throttle — track events per socket
 * Returns a function that returns true if the event should be allowed
 */
function createSocketThrottle(maxPerMinute = 30) {
    const counters = new Map();

    // Clean up every 2 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [key, data] of counters) {
            if (now - data.windowStart > 120000) {
                counters.delete(key);
            }
        }
    }, 120000);

    return function throttle(socketId) {
        const now = Date.now();
        let data = counters.get(socketId);

        if (!data || now - data.windowStart > 60000) {
            data = { count: 0, windowStart: now };
            counters.set(socketId, data);
        }

        data.count++;
        return data.count <= maxPerMinute;
    };
}

module.exports = { limiter, strictLimiter, createSocketThrottle };
