const db = require('../database');

exports.getHolidays = (req, res) => {
  const { year } = req.query;
  let sql = 'SELECT * FROM holidays ORDER BY date ASC';
  let params = [];
  
  if (year) {
    sql = 'SELECT * FROM holidays WHERE strftime("%Y", date) = ? ORDER BY date ASC';
    params = [year];
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json(rows);
  });
};

exports.createHoliday = (req, res) => {
  const { date, name, type } = req.body || {};
  if (!date || !name) return res.status(400).json({ message: 'date and name are required' });
  db.run(
    'INSERT INTO holidays(date, name, type) VALUES(?,?,?)',
    [date, name, type || 'Holiday'],
    function (err) {
      if (err) {
        if (String(err.message || '').includes('UNIQUE')) return res.status(409).json({ message: 'Holiday already exists for that date' });
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
};
