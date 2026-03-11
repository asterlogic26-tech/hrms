const db = require('../database');
const bcrypt = require('bcrypt');

exports.list = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.reports_to, u.status,
           m.name AS manager_name,
           e.designation, d.name AS department
    FROM users u
    LEFT JOIN users m ON u.reports_to = m.id
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE u.status != 'pending'
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
  db.run('UPDATE users SET role = ? WHERE id = ? AND status != ?', [role, id, 'terminated'], function (err) {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found or is terminated' });
    res.json({ id, role });
  });
};

exports.updateManager = (req, res) => {
  const { id } = req.params;
  const { reports_to } = req.body; // null or a user id

  if (reports_to !== null && reports_to !== undefined) {
    // Verify the target manager exists and is active
    db.get("SELECT id, role FROM users WHERE id = ? AND status = 'active'", [reports_to], (err, mgr) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      if (!mgr) return res.status(400).json({ message: 'Manager not found or inactive' });

      db.run('UPDATE users SET reports_to = ? WHERE id = ?', [reports_to, id], function (e2) {
        if (e2) return res.status(500).json({ message: 'DB error' });
        if (this.changes === 0) return res.status(404).json({ message: 'Employee not found' });
        db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
          [req.user.id, 'manager_changed', JSON.stringify({ employee_id: id, new_manager: reports_to })]);
        res.json({ id, reports_to });
      });
    });
  } else {
    // Remove manager assignment
    db.run('UPDATE users SET reports_to = NULL WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ message: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ message: 'Employee not found' });
      res.json({ id, reports_to: null });
    });
  }
};

exports.terminate = (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.id;

  if (Number(id) === requesterId) {
    return res.status(400).json({ message: 'You cannot terminate your own account' });
  }

  db.get("SELECT id, name, role, status FROM users WHERE id = ?", [id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found' });
    if (user.status === 'terminated') return res.status(400).json({ message: 'User is already terminated' });

    db.run("UPDATE users SET status = 'terminated' WHERE id = ?", [id], function (e2) {
      if (e2) return res.status(500).json({ message: 'DB error' });
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
        [requesterId, 'employee_terminated', JSON.stringify({ target_id: id, name: user.name })]);
      res.json({ id: Number(id), status: 'terminated', name: user.name });
    });
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
        "INSERT INTO users(name, email, password, role, reports_to, status) VALUES(?,?,?,?,?,?)",
        [name, email, hash, role, reports_to || null, 'active'],
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
