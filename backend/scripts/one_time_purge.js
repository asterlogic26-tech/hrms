/**
 * One-time migration: remove all users except shalini@asterlogic.in
 * and their associated data (attendance, leaves, employees, audit_logs).
 *
 * A marker file is created in backend/data/ after the first run so this
 * script is a no-op on every subsequent deploy.
 */
const path = require('path');
const fs = require('fs');

const markerFile = path.resolve(__dirname, '../data/.purge_done');

if (fs.existsSync(markerFile)) {
  console.log('One-time purge already completed – skipping.');
  process.exit(0);
}

const db = require('../database');
const ADMIN_EMAIL = 'shalini@asterlogic.in';

async function run() {
  const steps = [
    'DELETE FROM attendance  WHERE user_id IN (SELECT id FROM users WHERE email <> ?)',
    'DELETE FROM leaves      WHERE user_id IN (SELECT id FROM users WHERE email <> ?)',
    'DELETE FROM audit_logs  WHERE user_id IN (SELECT id FROM users WHERE email <> ?)',
    'DELETE FROM employees   WHERE user_id IN (SELECT id FROM users WHERE email <> ?)',
    'DELETE FROM users       WHERE email <> ?',
  ];

  for (const sql of steps) {
    await new Promise((resolve, reject) =>
      db.run(sql, [ADMIN_EMAIL], (err) => (err ? reject(err) : resolve()))
    );
  }

  // Write marker so this never runs again
  fs.mkdirSync(path.dirname(markerFile), { recursive: true });
  fs.writeFileSync(markerFile, new Date().toISOString() + '\n');
  console.log('One-time purge complete – all non-admin users removed.');
  process.exit(0);
}

run().catch((e) => {
  console.error('One-time purge failed:', e.message);
  process.exit(1);
});
