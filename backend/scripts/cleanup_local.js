const db = require('../database');

db.serialize(() => {
  console.log('Cleaning up .local users...');
  
  // Find IDs to delete
  db.all("SELECT id FROM users WHERE email LIKE '%.local'", [], (err, rows) => {
    if (err) {
      console.error('Error finding users:', err);
      return;
    }
    
    const ids = rows.map(r => r.id);
    if (ids.length === 0) {
      console.log('No .local users found.');
      return;
    }

    console.log(`Found ${ids.length} users to delete: ${ids.join(', ')}`);

    const placeholders = ids.map(() => '?').join(',');
    
    // Delete related records first due to foreign keys (though SQLite might cascade if configured, but let's be safe)
    db.run(`DELETE FROM attendance WHERE user_id IN (${placeholders})`, ids, (e) => {
      if(e) console.error('Error deleting attendance:', e);
    });
    db.run(`DELETE FROM leaves WHERE user_id IN (${placeholders})`, ids, (e) => {
      if(e) console.error('Error deleting leaves:', e);
    });
    db.run(`DELETE FROM employees WHERE user_id IN (${placeholders})`, ids, (e) => {
      if(e) console.error('Error deleting employees:', e);
    });
    
    // Finally delete users
    db.run(`DELETE FROM users WHERE id IN (${placeholders})`, ids, function(e) {
      if (e) {
        console.error('Error deleting users:', e);
      } else {
        console.log(`Successfully deleted ${this.changes} users.`);
      }
    });
  });
});
