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

exports.dailyReport = (req, res) => {
  const date = today();
  const sql = `
    SELECT
      u.id, u.name, u.email, u.role,
      a.clock_in, a.clock_out,
      l.id as leave_id
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
    LEFT JOIN leaves l ON l.user_id = u.id
                       AND l.status = 'Approved'
                       AND ? BETWEEN l.start_date AND l.end_date
    ORDER BY u.name ASC
  `;
  db.all(sql, [date, date], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    const employees = rows.map(r => {
      let hoursWorked = null;
      let status;
      if (r.leave_id) {
        status = 'on_leave';
      } else if (r.clock_in && r.clock_out) {
        hoursWorked = Math.round((new Date(r.clock_out) - new Date(r.clock_in)) / 36000) / 100;
        status = 'present';
      } else if (r.clock_in) {
        hoursWorked = Math.round((Date.now() - new Date(r.clock_in)) / 36000) / 100;
        status = 'in_progress';
      } else {
        status = 'absent';
      }
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        clock_in: r.clock_in || null,
        clock_out: r.clock_out || null,
        hoursWorked,
        underHours: hoursWorked !== null && hoursWorked < 4,
        status,
      };
    });
    const summary = {
      total: employees.length,
      present: employees.filter(e => e.status === 'present').length,
      inProgress: employees.filter(e => e.status === 'in_progress').length,
      onLeave: employees.filter(e => e.status === 'on_leave').length,
      absent: employees.filter(e => e.status === 'absent').length,
      underHours: employees.filter(e => e.underHours).length,
    };
    db.all(
      `SELECT l.id, l.start_date, l.end_date, l.reason, u.name, u.role
       FROM leaves l JOIN users u ON u.id = l.user_id
       WHERE l.status = 'Pending' ORDER BY l.created_at DESC`,
      [],
      (e2, pendingLeaves) => {
        if (e2) {
          console.error(e2);
          return res.status(500).json({ message: 'DB error', error: e2.message });
        }
        res.json({
          date,
          employees,
          summary: { ...summary, pendingLeaves: pendingLeaves.length },
          pendingLeaves,
        });
      }
    );
  });
};

// ── Attendance Regularization ─────────────────────────────────────────────────

exports.applyRegularization = (req, res) => {
  const userId = req.user.id;
  const { date, clock_in, clock_out, reason } = req.body;
  if (!date || !clock_in) return res.status(400).json({ message: 'date and clock_in are required' });
  const past = new Date(date);
  const todayDate = new Date(today());
  if (past >= todayDate) return res.status(400).json({ message: 'Regularization is only for past dates' });

  db.run(
    'INSERT INTO attendance_regularization(user_id, date, clock_in, clock_out, reason) VALUES(?,?,?,?,?)',
    [userId, date, clock_in, clock_out || null, reason || null],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)', [userId, 'regularize_apply', JSON.stringify({ date })]);
      res.status(201).json({ id: this.lastID });
    }
  );
};

exports.myRegularizations = (req, res) => {
  const userId = req.user.id;
  db.all(
    `SELECT r.*, u.name as approved_by_name
     FROM attendance_regularization r
     LEFT JOIN users u ON u.id = r.approved_by
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC LIMIT 30`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json(rows);
    }
  );
};

exports.pendingRegularizations = (req, res) => {
  const approver = req.user;
  let sql, params;
  if (approver.role === 'Founder') {
    sql = `SELECT r.*, u.name, u.email, u.role
           FROM attendance_regularization r
           JOIN users u ON u.id = r.user_id
           WHERE r.status = 'Pending'
           ORDER BY r.date DESC`;
    params = [];
  } else {
    sql = `SELECT r.*, u.name, u.email, u.role
           FROM attendance_regularization r
           JOIN users u ON u.id = r.user_id
           WHERE r.status = 'Pending' AND u.reports_to = ?
           ORDER BY r.date DESC`;
    params = [approver.id];
  }
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    res.json(rows);
  });
};

exports.approveRegularization = (req, res) => {
  const approver = req.user;
  const { id } = req.params;
  const { approve } = req.body;
  db.get(
    `SELECT r.*, u.reports_to FROM attendance_regularization r
     JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    [id],
    (err, reg) => {
      if (err || !reg) return res.status(404).json({ message: 'Request not found' });
      if (reg.status !== 'Pending') return res.status(400).json({ message: 'Already processed' });
      if (approver.role !== 'Founder' && reg.reports_to !== approver.id) {
        return res.status(403).json({ message: 'Not allowed' });
      }
      const status = approve ? 'Approved' : 'Rejected';
      db.run(
        'UPDATE attendance_regularization SET status = ?, approved_by = ? WHERE id = ?',
        [status, approver.id, id],
        function (err2) {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ message: 'DB error', error: err2.message });
          }
          if (!approve) {
            db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
              [approver.id, 'regularize_reject', JSON.stringify({ reg_id: id })]);
            return res.json({ status });
          }
          // On approval: create / update the attendance record
          const clockIn = `${reg.date}T${reg.clock_in}:00`;
          const clockOut = reg.clock_out ? `${reg.date}T${reg.clock_out}:00` : null;
          db.run(
            `INSERT INTO attendance(user_id, date, clock_in, clock_out, status)
             VALUES(?,?,?,?,'Present')
             ON CONFLICT(user_id, date) DO UPDATE SET
               clock_in  = excluded.clock_in,
               clock_out = excluded.clock_out,
               status    = 'Present'`,
            [reg.user_id, reg.date, clockIn, clockOut],
            function (err3) {
              if (err3) {
                console.error(err3);
                return res.status(500).json({ message: 'DB error', error: err3.message });
              }
              db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
                [approver.id, 'regularize_approve', JSON.stringify({ reg_id: id, date: reg.date, user_id: reg.user_id })]);
              res.json({ status });
            }
          );
        }
      );
    }
  );
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
