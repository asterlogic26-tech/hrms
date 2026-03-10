const db = require('../database');

exports.apply = (req, res) => {
  const userId = req.user.id;
  const { start_date, end_date, reason } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ message: 'Missing dates' });
  db.run(
    'INSERT INTO leaves(user_id, start_date, end_date, reason, status) VALUES(?,?,?,?,?)',
    [userId, start_date, end_date, reason || null, 'Pending'],
    function (err) {
      if (err) return res.status(500).json({ message: 'DB error' });
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'leave_apply', JSON.stringify({ start_date, end_date })]);
      res.status(201).json({ id: this.lastID });
    }
  );
};

exports.approve = (req, res) => {
  const approver = req.user;
  const { leave_id, approve } = req.body;
  if (!leave_id) return res.status(400).json({ message: 'Missing leave_id' });
  db.get('SELECT l.*, u.name, u.role, u.reports_to FROM leaves l JOIN users u ON u.id = l.user_id WHERE l.id = ?', [leave_id], (err, leave) => {
    if (err || !leave) return res.status(404).json({ message: 'Leave not found' });
    if (approver.role === 'Founder') {
      if (!(leave.role === 'Manager' && leave.name === 'Shubham')) return res.status(403).json({ message: 'Not allowed' });
    } else if (approver.role === 'Manager') {
      if (leave.reports_to !== approver.id) return res.status(403).json({ message: 'Not allowed' });
    } else {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const status = approve ? 'Approved' : 'Rejected';
    db.run('UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?', [status, approver.id, leave_id], function (e2) {
      if (e2) return res.status(500).json({ message: 'DB error' });
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [approver.id, 'leave_' + status.toLowerCase(), JSON.stringify({ leave_id })]);
      res.json({ status });
    });
  });
};

exports.list = (req, res) => {
  const user = req.user;
  if (user.role === 'Founder') {
    db.all('SELECT l.*, u.name FROM leaves l JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC', [], (e, rows) => {
      if (e) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
  } else if (user.role === 'Manager') {
    db.all(
      'SELECT l.*, u.name FROM leaves l JOIN users u ON u.id = l.user_id WHERE u.reports_to = ? ORDER BY l.created_at DESC',
      [user.id],
      (e, rows) => {
        if (e) return res.status(500).json({ message: 'DB error' });
        res.json(rows);
      }
    );
  } else {
    db.all('SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC', [user.id], (e, rows) => {
      if (e) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
  }
};
