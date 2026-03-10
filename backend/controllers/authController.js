const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  db.get('SELECT id, name, email, password, role FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users(name, email, password, role) VALUES(?,?,?,?)',
      [name, email, hash, 'Employee'],
      function (err) {
        if (err) {
          if (String(err.message).includes('UNIQUE')) return res.status(409).json({ message: 'Email already registered' });
          return res.status(500).json({ message: 'DB error' });
        }
        const id = this.lastID;
        db.run('INSERT OR IGNORE INTO departments(name) VALUES(?)', ['General']);
        db.get('SELECT id FROM departments WHERE name = ?', ['General'], (e2, dept) => {
          if (e2) return res.status(500).json({ message: 'DB error' });
          db.run('INSERT INTO employees(user_id, department_id, designation) VALUES(?,?,?)', [id, dept ? dept.id : null, 'Employee']);
        });
        const token = jwt.sign({ id, name, role: 'Employee' }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' });
        return res.status(201).json({ token, user: { id, name, email, role: 'Employee' } });
      }
    );
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};
