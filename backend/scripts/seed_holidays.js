const db = require('../database');

const holidays2026 = [
  { date: '2026-01-01', name: 'New Year' },
  { date: '2026-01-14', name: 'Sankranti' },
  { date: '2026-01-15', name: 'NMC Election' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-04-03', name: 'Baba jumdevji Jayanti' },
  { date: '2026-04-14', name: 'Dr. babasahed Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'Workers day/Maharashtra day' },
  { date: '2026-09-03', name: 'Hawan Karya' },
  { date: '2026-09-14', name: 'Ganesh chaturthi' },
  { date: '2026-10-02', name: 'Gandhi jayanti' },
  { date: '2026-10-20', name: 'Dusherra' },
  { date: '2026-11-09', name: 'Diwali holiday' },
  { date: '2026-11-10', name: 'Diwali holiday' },
  { date: '2026-11-11', name: 'Diwali holiday' },
  { date: '2026-12-25', name: 'Christmas' },
  { date: '2026-12-28', name: 'Freeze period' },
  { date: '2026-12-29', name: 'Freeze period' },
  { date: '2026-12-30', name: 'Freeze period' },
  { date: '2026-12-31', name: 'Freeze period' },
];

db.serialize(() => {
  console.log('Seeding holidays...');
  const stmt = db.prepare('INSERT OR IGNORE INTO holidays (date, name) VALUES (?, ?)');
  
  holidays2026.forEach(h => {
    stmt.run(h.date, h.name);
  });
  
  stmt.finalize(() => {
    console.log('Holidays seeded successfully.');
  });
});
