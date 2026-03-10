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
