const db = require('../database');
const bcrypt = require('bcrypt');

exports.list = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.reports_to,
           m.name AS manager_name,
           e.designation, d.name AS department
    FROM users u
    LEFT JOIN users m ON u.reports_to = m.id
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN departments d ON d.id = e.department_id
    ORDER BY u.name ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json(rows);
  });
};

exports.updateRole = (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const VALID = ['Founder', 'Manager', 'Team Lead', 'Employee'];
  if (!role || !VALID.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function (err) {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ id, role });
  });
};

exports.create = async (req, res) => {
  const { name, email, password, role, reports_to, department, designation } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  db.serialize(() => {
    db.run('INSERT OR IGNORE INTO departments(name) VALUES(?)', [department || 'General']);
    db.get('SELECT id FROM departments WHERE name = ?', [department || 'General'], (err, dept) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      db.run(
        'INSERT INTO users(name, email, password, role, reports_to) VALUES(?,?,?,?,?)',
        [name, email, hash, role, reports_to || null],
        function (err2) {
          if (err2) return res.status(400).json({ message: 'User exists or invalid', error: err2.message });
          const userId = this.lastID;
          db.run(
            'INSERT INTO employees(user_id, department_id, designation) VALUES(?,?,?)',
            [userId, dept ? dept.id : null, designation || null],
            function (err3) {
              if (err3) return res.status(500).json({ message: 'DB error' });
              res.status(201).json({ id: userId });
            }
          );
        }
      );
    });
  });
};
