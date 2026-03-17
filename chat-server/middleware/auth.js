/**
 * Keymus Chat — JWT Authentication Middleware
 * Verifies tokens for both Express routes and Socket.io connections.
 * Uses the SAME JWT_SECRET as the main backend to validate tokens.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Sign a new JWT token (used for anonymous guest sessions)
 */
function signToken(payload, expiresIn) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: expiresIn || process.env.GUEST_TOKEN_EXPIRY || '7d'
    });
}

/**
 * Express middleware — requires valid JWT in Authorization header
 */
function expressAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

/**
 * Express middleware — requires admin role
 */
function adminAuth(req, res, next) {
    expressAuth(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

/**
 * Socket.io middleware — verifies JWT from handshake auth
 */
function socketAuth(socket, next) {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return next(new Error('Invalid or expired token'));
    }

    socket.user = decoded;
    next();
}

/**
 * Socket.io middleware — admin namespace only
 */
function socketAdminAuth(socket, next) {
    socketAuth(socket, (err) => {
        if (err) return next(err);
        if (!socket.user || socket.user.role !== 'admin') {
            return next(new Error('Admin access required'));
        }
        next();
    });
}

module.exports = {
    verifyToken,
    signToken,
    expressAuth,
    adminAuth,
    socketAuth,
    socketAdminAuth
};
