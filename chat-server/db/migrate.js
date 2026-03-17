#!/usr/bin/env node
/**
 * Keymus Chat — Database Migration Script
 * Run: node db/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./database');

async function migrate() {
    console.log('Running Keymus Chat database migrations...');
    console.log(`Database: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/keymus_chat'}\n`);

    try {
        await db.initialize();
        console.log('\n✓ All migrations applied successfully');

        // Print table info
        const tables = await db.getMany(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log(`\nTables created: ${tables.map(t => t.table_name).join(', ')}`);

    } catch (err) {
        console.error('\n✗ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

migrate();
