const db = require('./database');
const bcrypt = require('bcrypt');

async function seed() {
  await new Promise((resolve) => db.run('INSERT OR IGNORE INTO departments(name) VALUES(?)', ['Engineering'], resolve));
  const dept = await new Promise((resolve) => db.get('SELECT id FROM departments WHERE name = ?', ['Engineering'], (_, row) => resolve(row)));

  const adminEmail = 'shalini@asterlogic.in';
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'All60$$$';
  const password = await bcrypt.hash(adminPasswordPlain, 10);

  await new Promise((resolve) =>
    db.run(
      'INSERT OR IGNORE INTO users(name, email, password, role) VALUES(?,?,?,?)',
      ['Shalini', adminEmail, password, 'Founder'],
      resolve
    )
  );
  const admin = await new Promise((resolve) => db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (_, row) => resolve(row)));
  if (admin) {
    await new Promise((resolve) =>
      db.run(
        'INSERT OR IGNORE INTO employees(user_id, department_id, designation) VALUES(?,?,?)',
        [admin.id, dept.id, 'Founder'],
        resolve
      )
    );
  }
  console.log('Seed complete (admin only)');
  process.exit(0);
}

seed();
