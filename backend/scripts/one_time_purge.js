/**
 * Cleanup migration (v2): keep only the core team, delete test accounts.
 *
 * Users kept:
 *   shalini@asterlogic.in   – Founder  (super admin)
 *   shubham@asterlogic.local – Manager
 *   abhishek@asterlogic.local – Team Lead
 *   aditya@asterlogic.local  – Team Lead  (promoted from Employee)
 *
 * Everyone else is removed along with their attendance, leaves, and audit logs.
 *
 * Uses a versioned marker file (purge_v2_done) so an old failed run does NOT
 * block this version from executing.
 */
const path = require('path');
const fs   = require('fs');

const MARKER = path.resolve(__dirname, '../data/.purge_v2_done');

if (fs.existsSync(MARKER)) {
  console.log('Purge v2 already done – skipping.');
  process.exit(0);
}

const db = require('../database');

// Emails of users we want to KEEP
const KEEP = [
  'shalini@asterlogic.in',
  'shubham@asterlogic.local',
  'abhishek@asterlogic.local',
  'aditya@asterlogic.local',
];

const placeholders = KEEP.map(() => '?').join(',');

async function run() {
  // Remove data belonging to unwanted users
  const deleteData = [
    `DELETE FROM attendance WHERE user_id IN (SELECT id FROM users WHERE email NOT IN (${placeholders}))`,
    `DELETE FROM leaves     WHERE user_id IN (SELECT id FROM users WHERE email NOT IN (${placeholders}))`,
    `DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email NOT IN (${placeholders}))`,
    `DELETE FROM employees  WHERE user_id IN (SELECT id FROM users WHERE email NOT IN (${placeholders}))`,
    `DELETE FROM users      WHERE email NOT IN (${placeholders})`,
  ];

  for (const sql of deleteData) {
    await new Promise((resolve, reject) =>
      db.run(sql, KEEP, (err) => (err ? reject(err) : resolve()))
    );
  }

  // Ensure correct roles for the manager dropdown
  // (Founder/Manager/Team Lead appear in the dropdown)
  const roleUpdates = [
    ['Founder',   'shalini@asterlogic.in'],
    ['Manager',   'shubham@asterlogic.local'],
    ['Team Lead', 'abhishek@asterlogic.local'],
    ['Team Lead', 'aditya@asterlogic.local'],
  ];

  for (const [role, email] of roleUpdates) {
    await new Promise((resolve, reject) =>
      db.run('UPDATE users SET role = ? WHERE email = ?', [role, email],
        (err) => (err ? reject(err) : resolve()))
    );
  }

  // Write versioned marker
  fs.mkdirSync(path.dirname(MARKER), { recursive: true });
  fs.writeFileSync(MARKER, new Date().toISOString() + '\n');

  console.log('Purge v2 complete – only core team remains.');
  db.close(() => process.exit(0));
}

run().catch((e) => {
  console.error('Purge v2 failed:', e.message);
  db.close(() => process.exit(1));
});
