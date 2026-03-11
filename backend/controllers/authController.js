const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ── Login ──────────────────────────────────────────────────────────────────────

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  db.get('SELECT id, name, email, password, role, status FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'pending') {
      return res.status(403).json({
        code: 'PENDING_APPROVAL',
        message: 'Your account is awaiting Founder approval. You will be notified once approved.',
      });
    }

    if (user.status === 'terminated') {
      return res.status(403).json({
        code: 'ACCOUNT_TERMINATED',
        message: 'This account has been deactivated. Please contact HR.',
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '8h' }
    );
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
};

// ── Register (pending by default, no auto-login) ───────────────────────────────

exports.register = async (req, res) => {
  const { name, email, password, manager_email } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    let managerId = null;
    if (manager_email) {
      const manager = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ?', [manager_email], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
      });
      if (!manager) return res.status(400).json({ message: 'Manager email not found' });
      managerId = manager.id;
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users(name, email, password, role, reports_to, status) VALUES(?,?,?,?,?,?)",
      [name, email, hash, 'Employee', managerId, 'pending'],
      function (err) {
        if (err) {
          if (String(err.message).includes('UNIQUE')) return res.status(409).json({ message: 'Email already registered' });
          return res.status(500).json({ message: 'DB error' });
        }
        const id = this.lastID;
        db.run('INSERT OR IGNORE INTO departments(name) VALUES(?)', ['General']);
        db.get('SELECT id FROM departments WHERE name = ?', ['General'], (e2, dept) => {
          db.run('INSERT INTO employees(user_id, department_id, designation) VALUES(?,?,?)',
            [id, dept ? dept.id : null, 'Employee']);
        });
        return res.status(201).json({
          pending: true,
          message: 'Registration submitted. Please wait for Founder approval before logging in.',
        });
      }
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── Public: managers list for register dropdown ────────────────────────────────

exports.listManagers = (req, res) => {
  db.all(
    "SELECT id, name, email, role FROM users WHERE role IN ('Founder','Manager','Team Lead') AND status = 'active' ORDER BY name ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
};

// ── Founder: list pending registrations ───────────────────────────────────────

exports.listPending = (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.email, u.created_at, m.name AS manager_name
     FROM users u
     LEFT JOIN users m ON m.id = u.reports_to
     WHERE u.status = 'pending'
     ORDER BY u.created_at ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
};

// ── Founder: approve or reject a pending registration ─────────────────────────

exports.approveRegistration = (req, res) => {
  const { id } = req.params;
  const { approve } = req.body;
  const newStatus = approve ? 'active' : 'terminated';

  db.get("SELECT id, name, status FROM users WHERE id = ?", [id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found' });
    if (user.status !== 'pending') return res.status(400).json({ message: 'User is not pending approval' });

    db.run("UPDATE users SET status = ? WHERE id = ?", [newStatus, id], function (e2) {
      if (e2) return res.status(500).json({ message: 'DB error' });
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
        [req.user.id, approve ? 'user_approved' : 'user_rejected',
         JSON.stringify({ target_user_id: id, name: user.name })]);
      res.json({ id: Number(id), status: newStatus });
    });
  });
};
