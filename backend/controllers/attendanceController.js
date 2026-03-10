const db = require('../database');

function today() {
  return new Date().toISOString().slice(0, 10);
}

exports.clockIn = (req, res) => {
  const userId = req.user.id;
  const date = today();
  const now = new Date().toISOString();
  db.get('SELECT id, clock_in FROM attendance WHERE user_id = ? AND date = ?', [userId, date], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    if (row && row.clock_in) return res.status(400).json({ message: 'Already clocked in' });
    if (row) {
      db.run('UPDATE attendance SET clock_in = ? WHERE id = ?', [now, row.id], function (e2) {
        if (e2) {
          console.error(e2);
          return res.status(500).json({ message: 'DB error', error: e2.message });
        }
        db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_in', JSON.stringify({ date })]);
        res.json({ status: 'clocked_in', date, time: now });
      });
    } else {
      db.run('INSERT INTO attendance(user_id, date, clock_in, status) VALUES(?,?,?,?)', [userId, date, now, 'Present'], function (e3) {
        if (e3) {
          // If (user_id, date) uniqueness exists, fall back to update on conflict.
          if (String(e3.message || '').includes('UNIQUE')) {
            db.run('UPDATE attendance SET clock_in = COALESCE(clock_in, ?) WHERE user_id = ? AND date = ?', [now, userId, date], function (e4) {
              if (e4) {
                console.error(e4);
                return res.status(500).json({ message: 'DB error', error: e4.message });
              }
              db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_in', JSON.stringify({ date })]);
              return res.json({ status: 'clocked_in', date, time: now });
            });
            return;
          }
          console.error(e3);
          return res.status(500).json({ message: 'DB error', error: e3.message });
        }
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
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    if (!row) return res.status(400).json({ message: 'Not clocked in' });
    if (row.clock_out) return res.status(400).json({ message: 'Already clocked out' });
    db.run('UPDATE attendance SET clock_out = ? WHERE id = ?', [now, row.id], function (e2) {
      if (e2) {
        console.error(e2);
        return res.status(500).json({ message: 'DB error', error: e2.message });
      }
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'clock_out', JSON.stringify({ date })]);
      res.json({ status: 'clocked_out', date, time: now });
    });
  });
};

exports.summary = (req, res) => {
  const date = today();
  db.get('SELECT COUNT(*) as total FROM users', [], (e1, totalRow) => {
    if (e1) {
      console.error(e1);
      return res.status(500).json({ message: 'DB error', error: e1.message });
    }
    db.get('SELECT COUNT(DISTINCT user_id) as present FROM attendance WHERE date = ?', [date], (e2, presentRow) => {
      if (e2) {
        console.error(e2);
        return res.status(500).json({ message: 'DB error', error: e2.message });
      }
      res.json({ totalEmployees: totalRow.total, presentToday: presentRow.present });
    });
  });
};

exports.myAttendance = (req, res) => {
  const userId = req.user.id;
  db.all('SELECT date, clock_in, clock_out, status FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 31', [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    res.json(rows);
  });
};

exports.allAttendance = (req, res) => {
  const { date } = req.query;
  const targetDate = date || today();
  const sql = `
    SELECT a.date, a.clock_in, a.clock_out, a.status,
           u.id as user_id, u.name, u.email, u.role
    FROM attendance a
    JOIN users u ON u.id = a.user_id
    WHERE a.date = ?
    ORDER BY u.name ASC
  `;
  db.all(sql, [targetDate], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    res.json({ date: targetDate, rows });
  });
};
