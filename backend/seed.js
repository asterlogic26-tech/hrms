const db = require('./database');
const bcrypt = require('bcrypt');

async function seed() {
  const adminEmail = 'shalini@asterlogic.in';
  const adminName = 'Shalini';
  const shouldPurge = process.argv.includes('--purge') || process.argv.includes('--reset') || process.env.PURGE_NON_ADMIN === '1';

  await new Promise((resolve) => db.run('INSERT OR IGNORE INTO departments(name) VALUES(?)', ['Engineering'], resolve));
  const dept = await new Promise((resolve) =>
    db.get('SELECT id FROM departments WHERE name = ?', ['Engineering'], (_, row) => resolve(row))
  );

  const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'All60$$$';
  const password = await bcrypt.hash(adminPasswordPlain, 10);

  if (shouldPurge) {
    // Purge everything except the super admin account. This is useful for demos/clean deploys.
    await new Promise((resolve) => db.run('DELETE FROM attendance WHERE user_id IN (SELECT id FROM users WHERE email <> ?)', [adminEmail], resolve));
    await new Promise((resolve) => db.run('DELETE FROM leaves WHERE user_id IN (SELECT id FROM users WHERE email <> ?)', [adminEmail], resolve));
    await new Promise((resolve) => db.run('DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email <> ?)', [adminEmail], resolve));
    await new Promise((resolve) => db.run('DELETE FROM employees WHERE user_id IN (SELECT id FROM users WHERE email <> ?)', [adminEmail], resolve));
    await new Promise((resolve) => db.run('DELETE FROM users WHERE email <> ?', [adminEmail], resolve));
  }

  await new Promise((resolve) =>
    db.run(
      `INSERT INTO users(name, email, password, role, reports_to)
       VALUES(?,?,?,?,NULL)
       ON CONFLICT(email) DO UPDATE SET
         name=excluded.name,
         password=excluded.password,
         role='Founder',
         reports_to=NULL`,
      [adminName, adminEmail, password, 'Founder'],
      resolve
    )
  );

  const admin = await new Promise((resolve) =>
    db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (_, row) => resolve(row))
  );
  if (admin) {
    await new Promise((resolve) =>
      db.run(
        `INSERT INTO employees(user_id, department_id, designation)
         VALUES(?,?,?)
         ON CONFLICT(user_id) DO UPDATE SET
           department_id=excluded.department_id,
           designation=excluded.designation`,
        [admin.id, dept ? dept.id : null, 'Founder'],
        resolve
      )
    );
  }
  console.log('Seed complete (admin only)');
  process.exit(0);
}

seed();
