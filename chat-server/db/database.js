/**
 * Keymus Chat — PostgreSQL Database Module
 * Provides connection pool and query helpers
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/keymus_chat',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

/**
 * Execute a parameterized query
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`Slow query (${duration}ms): ${text.substring(0, 120)}...`);
        }
        return result;
    } catch (err) {
        console.error(`Query error: ${text.substring(0, 120)}`, err.message);
        throw err;
    }
}

/**
 * Get a single row or null
 */
async function getOne(text, params) {
    const result = await query(text, params);
    return result.rows[0] || null;
}

/**
 * Get multiple rows
 */
async function getMany(text, params) {
    const result = await query(text, params);
    return result.rows;
}

/**
 * Execute within a transaction
 */
async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Initialize the database schema
 */
async function initialize() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('  Database schema applied');
}

/**
 * Close the connection pool
 */
async function close() {
    await pool.end();
    console.log('  Database pool closed');
}

module.exports = { query, getOne, getMany, transaction, initialize, close, pool };
