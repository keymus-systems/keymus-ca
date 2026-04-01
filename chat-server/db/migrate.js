#!/usr/bin/env node
/**
 * Keymus Chat — Database Migration Script
 * Run: node db/migrate.js
 *
 * Migrations applied in order:
 *   schema.sql        — Base schema (tables, indexes, updated_at trigger)
 *   migration-002.sql — admin_users + registered_users tables
 *   migration-003.sql — conversations.resolved_at column + trigger
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./database');
const fs = require('fs');
const path = require('path');

const MIGRATIONS = [
    'schema.sql',
    'migration-002.sql',
    'migration-003.sql',
];

async function migrate() {
    console.log('Running Keymus Chat database migrations...');
    console.log(`Database: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/keymus_chat'}\n`);

    try {
        await db.pool.connect(); // Ensure connection is live before starting

        for (const filename of MIGRATIONS) {
            const filepath = path.join(__dirname, filename);
            if (!fs.existsSync(filepath)) {
                console.warn(`  ⚠ Skipping missing file: ${filename}`);
                continue;
            }
            const sql = fs.readFileSync(filepath, 'utf8');
            console.log(`  Applying ${filename}...`);
            await db.pool.query(sql);
            console.log(`  ✓ ${filename} applied`);
        }

        console.log('\n✓ All migrations applied successfully');

        // Print table info
        const tables = await db.getMany(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log(`\nTables: ${tables.map(t => t.table_name).join(', ')}`);

        // Print column info for conversations
        const cols = await db.getMany(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'conversations'
            ORDER BY ordinal_position
        `);
        console.log('\nconversations columns:');
        cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

    } catch (err) {
        console.error('\n✗ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

migrate();
