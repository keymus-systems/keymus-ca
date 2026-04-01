/**
 * One-time script to create a new admin account.
 * Run with: node create-admin.js
 * Delete this file after use.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const crypto = require('crypto');

async function createAdmin() {
    const username    = 'admin';
    const password    = 'Admin@1234';
    const displayName = 'Admin';
    const email       = 'admin@keymus.ca';
    const adminId     = 'admin_' + crypto.randomBytes(4).toString('hex');

    const hash = await bcrypt.hash(password, 12);

    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/keymus_chat'
    });
    await client.connect();

    // Upsert: if username already exists, just reset the password and re-activate
    const res = await client.query(
        `INSERT INTO admin_users (id, username, password_hash, display_name, email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE
             SET password_hash = EXCLUDED.password_hash,
                 is_active     = TRUE
         RETURNING id, username, display_name, email`,
        [adminId, username, hash, displayName, email]
    );

    const row = res.rows[0];

    // Ensure the admin also exists in chat_users
    await client.query(
        `INSERT INTO chat_users (id, display_name, email, is_guest, is_admin, is_online)
         VALUES ($1, $2, $3, FALSE, TRUE, FALSE)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.display_name, row.email]
    );

    console.log('\n✅  Admin account ready!');
    console.log('─────────────────────────────');
    console.log('  Username :', row.username);
    console.log('  Password : Admin@1234');
    console.log('─────────────────────────────');
    console.log('⚠️  Change your password after first login.\n');

    await client.end();
}

createAdmin().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
