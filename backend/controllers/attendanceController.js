const db = require('../database');

function today() {
  return new Date().toISOString().slice(0, 10);
}

exports.clockIn = (req, res) => {
  const userId = req.user.id;
  const date = today();
  const now = new Date().toISOString();
  db.get('SELECT id, clock_in FROM attendance WHERE user_id = ? AND date = ?', [userId, date], (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (row && row.clock_in) return res.status(400).json({ message: 'Already clocked in' });
    if (row) {
      db.run('UPDATE attendance SET clock_in = ? WHERE id = ?', [now, row.id], function (e2) {
        if (e2) return res.status(500).json({ message: 'DB error' });
        db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_in', JSON.stringify({ date })]);
        res.json({ status: 'clocked_in', date, time: now });
      });
    } else {
      db.run('INSERT INTO attendance(user_id, date, clock_in, status) VALUES(?,?,?,?)', [userId, date, now, 'Present'], function (e3) {
        if (e3) return res.status(500).json({ message: 'DB error' });
        db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_in', JSON.stringify({ date })]);
        res.json({ status: 'clocked_in', date, time: now });
      });
    }
  });
};

exports.clockOut = (req, res) => {
  const userId = req.user.id;
  const date = today();
  const now = new Date().toISOString();
  db.get('SELECT id, clock_out FROM attendance WHERE user_id = ? AND date = ?', [userId, date], (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!row) return res.status(400).json({ message: 'Not clocked in' });
    if (row.clock_out) return res.status(400).json({ message: 'Already clocked out' });
    db.run('UPDATE attendance SET clock_out = ? WHERE id = ?', [now, row.id], function (e2) {
      if (e2) return res.status(500).json({ message: 'DB error' });
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_out', JSON.stringify({ date })]);
      res.json({ status: 'clocked_out', date, time: now });
    });
  });
};

exports.summary = (req, res) => {
  const date = today();
  db.get('SELECT COUNT(*) as total FROM users', [], (e1, totalRow) => {
    if (e1) return res.status(500).json({ message: 'DB error' });
    db.get('SELECT COUNT(DISTINCT user_id) as present FROM attendance WHERE date = ?', [date], (e2, presentRow) => {
      if (e2) return res.status(500).json({ message: 'DB error' });
      res.json({ totalEmployees: totalRow.total, presentToday: presentRow.present });
    });
  });
};

exports.myAttendance = (req, res) => {
  const userId = req.user.id;
  db.all('SELECT date, clock_in, clock_out, status FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 31', [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json(rows);
  });
};
