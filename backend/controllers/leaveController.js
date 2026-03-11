const db = require('../database');
const { sendLeaveRequestEmail } = require('../services/mailer');

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentYear() {
  return new Date().getFullYear();
}

/**
 * Ensure a leave_balance row exists for the given user + year.
 * Creates one with defaults (6 annual, 6 sick) if missing.
 */
function ensureBalance(userId, year, cb) {
  db.run(
    `INSERT OR IGNORE INTO leave_balances(user_id, year, annual_total, annual_used, sick_total, sick_used)
     VALUES(?, ?, 6, 0, 6, 0)`,
    [userId, year],
    (err) => cb(err)
  );
}

/**
 * Count business days (Mon–Fri) between two ISO date strings, inclusive.
 */
function businessDays(startStr, endStr) {
  const start = new Date(startStr);
  const end   = new Date(endStr);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Apply Leave ────────────────────────────────────────────────────────────────

exports.apply = (req, res) => {
  const userId = req.user.id;
  const { start_date, end_date, reason, leave_type } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ message: 'Missing dates' });

  const type = ['Annual', 'Sick', 'Other'].includes(leave_type) ? leave_type : 'Annual';
  const year = currentYear();

  // For Annual / Sick leaves, validate remaining balance before inserting
  if (type !== 'Other') {
    ensureBalance(userId, year, (initErr) => {
      if (initErr) return res.status(500).json({ message: 'DB error' });
      db.get(
        'SELECT * FROM leave_balances WHERE user_id = ? AND year = ?',
        [userId, year],
        (err, bal) => {
          if (err || !bal) return res.status(500).json({ message: 'DB error' });
          const days = businessDays(start_date, end_date);
          const field = type === 'Annual' ? 'annual' : 'sick';
          const remaining = bal[`${field}_total`] - bal[`${field}_used`];
          if (days > remaining) {
            return res.status(400).json({
              message: `Insufficient ${type} Leave balance. You have ${remaining} day(s) remaining but requested ${days}.`,
            });
          }
          insertLeave(userId, start_date, end_date, reason, type, res);
        }
      );
    });
  } else {
    insertLeave(userId, start_date, end_date, reason, type, res);
  }
};

function insertLeave(userId, start_date, end_date, reason, leave_type, res) {
  db.run(
    'INSERT INTO leaves(user_id, start_date, end_date, reason, status, leave_type) VALUES(?,?,?,?,?,?)',
    [userId, start_date, end_date, reason || null, 'Pending', leave_type],
    function (err) {
      if (err) return res.status(500).json({ message: 'DB error' });
      const leaveId = this.lastID;
      db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
        [userId, 'leave_apply', JSON.stringify({ start_date, end_date, leave_type })]);

      // Notify approver(s) via email
      db.get('SELECT name, email, reports_to FROM users WHERE id = ?', [userId], (e, employee) => {
        if (e || !employee) return;
        if (employee.reports_to) {
          // Notify direct manager
          db.get('SELECT name, email FROM users WHERE id = ?', [employee.reports_to], (e2, mgr) => {
            if (!e2 && mgr) {
              sendLeaveRequestEmail({
                approverEmail: mgr.email, approverName: mgr.name,
                employeeName: employee.name, leaveType: leave_type,
                startDate: start_date, endDate: end_date, reason,
              });
            }
          });
        } else {
          // No direct manager — notify all Founders
          db.all("SELECT name, email FROM users WHERE role = 'Founder'", [], (e3, founders) => {
            if (!e3 && founders) {
              founders.forEach(f => sendLeaveRequestEmail({
                approverEmail: f.email, approverName: f.name,
                employeeName: employee.name, leaveType: leave_type,
                startDate: start_date, endDate: end_date, reason,
              }));
            }
          });
        }
      });

      res.status(201).json({ id: leaveId });
    }
  );
}

// ── Approve / Reject Leave ─────────────────────────────────────────────────────

exports.approve = (req, res) => {
  const approver = req.user;
  const { leave_id, approve } = req.body;
  if (!leave_id) return res.status(400).json({ message: 'Missing leave_id' });

  db.get(
    'SELECT l.*, u.name, u.role, u.reports_to FROM leaves l JOIN users u ON u.id = l.user_id WHERE l.id = ?',
    [leave_id],
    (err, leave) => {
      if (err || !leave) return res.status(404).json({ message: 'Leave not found' });
      if (leave.status !== 'Pending') return res.status(400).json({ message: 'Leave already processed' });

      if (approver.role === 'Founder') {
        // Founder can approve/reject any leave.
      } else if (approver.role === 'Manager' || approver.role === 'Team Lead') {
        if (leave.reports_to !== approver.id) return res.status(403).json({ message: 'Not allowed' });
      } else {
        return res.status(403).json({ message: 'Not allowed' });
      }

      const status = approve ? 'Approved' : 'Rejected';
      db.run(
        'UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?',
        [status, approver.id, leave_id],
        function (e2) {
          if (e2) return res.status(500).json({ message: 'DB error' });
          db.run('INSERT INTO audit_logs(user_id, action, meta) VALUES(?,?,?)',
            [approver.id, 'leave_' + status.toLowerCase(), JSON.stringify({ leave_id })]);

          // When approved: deduct balance for Annual / Sick leaves
          if (approve && leave.leave_type && leave.leave_type !== 'Other') {
            const year = new Date(leave.start_date).getFullYear();
            const days = businessDays(leave.start_date, leave.end_date);
            const field = leave.leave_type === 'Annual' ? 'annual_used' : 'sick_used';
            ensureBalance(leave.user_id, year, () => {
              db.run(
                `UPDATE leave_balances SET ${field} = ${field} + ?, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND year = ?`,
                [days, leave.user_id, year]
              );
            });
          }

          res.json({ status });
        }
      );
    }
  );
};

// ── List Leaves ────────────────────────────────────────────────────────────────

exports.list = (req, res) => {
  const user = req.user;
  if (user.role === 'Founder') {
    db.all(
      'SELECT l.*, u.name FROM leaves l JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC',
      [],
      (e, rows) => {
        if (e) return res.status(500).json({ message: 'DB error' });
        res.json(rows);
      }
    );
  } else if (user.role === 'Manager' || user.role === 'Team Lead') {
    db.all(
      'SELECT l.*, u.name FROM leaves l JOIN users u ON u.id = l.user_id WHERE u.reports_to = ? ORDER BY l.created_at DESC',
      [user.id],
      (e, rows) => {
        if (e) return res.status(500).json({ message: 'DB error' });
        res.json(rows);
      }
    );
  } else {
    db.all(
      'SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC',
      [user.id],
      (e, rows) => {
        if (e) return res.status(500).json({ message: 'DB error' });
        res.json(rows);
      }
    );
  }
};

// ── Leave Balance ──────────────────────────────────────────────────────────────

exports.getBalance = (req, res) => {
  const userId = req.user.id;
  const year = currentYear();

  ensureBalance(userId, year, (initErr) => {
    if (initErr) return res.status(500).json({ message: 'DB error' });
    db.get(
      'SELECT * FROM leave_balances WHERE user_id = ? AND year = ?',
      [userId, year],
      (err, bal) => {
        if (err || !bal) return res.status(500).json({ message: 'DB error' });
        res.json({
          year,
          annual: {
            total:     bal.annual_total,
            used:      bal.annual_used,
            remaining: bal.annual_total - bal.annual_used,
          },
          sick: {
            total:     bal.sick_total,
            used:      bal.sick_used,
            remaining: bal.sick_total - bal.sick_used,
          },
        });
      }
    );
  });
};

// ── Pending Count (for notification badge) ─────────────────────────────────────

exports.pendingCount = (req, res) => {
  const user = req.user;
  if (user.role === 'Founder') {
    db.get(
      `SELECT COUNT(*) AS count FROM leaves WHERE status = 'Pending'`,
      [],
      (err, row) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json({ count: row.count });
      }
    );
  } else if (user.role === 'Manager' || user.role === 'Team Lead') {
    db.get(
      `SELECT COUNT(*) AS count FROM leaves l JOIN users u ON u.id = l.user_id
       WHERE l.status = 'Pending' AND u.reports_to = ?`,
      [user.id],
      (err, row) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json({ count: row.count });
      }
    );
  } else {
    res.json({ count: 0 });
  }
};

/**
 * Called internally (or via a cron / admin action) every Jan 1
 * to reset all non-Founder balances for the new year.
 */
exports.renewBalances = (req, res) => {
  const year = currentYear();
  // Insert a fresh row for every non-Founder user for the current year
  db.run(
    `INSERT OR IGNORE INTO leave_balances(user_id, year, annual_total, annual_used, sick_total, sick_used)
     SELECT id, ?, 6, 0, 6, 0 FROM users WHERE role != 'Founder'`,
    [year],
    function (err) {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json({ renewed: this.changes, year });
    }
  );
};
