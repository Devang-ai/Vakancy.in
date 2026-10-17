const db = require('../config/db');

async function run() {
  await db.initDB();
  
  console.log('Finding duplicate cities...');
  const rows = await db.query('SELECT state_region_id, LOWER(TRIM(name)) as norm_name, COUNT(*) as cnt, MIN(id) as keep_id FROM CITY GROUP BY state_region_id, LOWER(TRIM(name)) HAVING cnt > 1');
  
  if (rows.length === 0) {
    console.log('No duplicate cities found!');
    process.exit(0);
  }

  for (const row of rows) {
    console.log(`Found ${row.cnt} copies of ${row.norm_name} in state ${row.state_region_id}`);
    const copies = await db.query('SELECT id FROM CITY WHERE state_region_id = ? AND LOWER(TRIM(name)) = ?', [row.state_region_id, row.norm_name]);
    
    const keepId = row.keep_id;
    const deleteIds = copies.map(c => c.id).filter(id => id !== keepId);
    
    if (deleteIds.length > 0) {
      const placeholders = deleteIds.map(() => '?').join(',');
      try {
         await db.query(`UPDATE JOB_LOCATION SET city_id = ? WHERE city_id IN (${placeholders})`, [keepId, ...deleteIds]);
      } catch (e) {}
      
      try {
         await db.query(`UPDATE USER_CANDIDATE SET city_id = ? WHERE city_id IN (${placeholders})`, [keepId, ...deleteIds]);
      } catch (e) {}
      
      await db.query(`DELETE FROM CITY WHERE id IN (${placeholders})`, deleteIds);
      console.log(`Merged and deleted ${deleteIds.length} duplicates for ${row.norm_name}`);
    }
  }
  
  console.log('Duplicate states check...');
  const sRows = await db.query('SELECT country_id, LOWER(TRIM(name)) as norm_name, COUNT(*) as cnt, MIN(id) as keep_id FROM STATE_REGION GROUP BY country_id, LOWER(TRIM(name)) HAVING cnt > 1');
  for (const row of sRows) {
    console.log(`Found duplicate state: ${row.norm_name}`);
    const copies = await db.query('SELECT id FROM STATE_REGION WHERE country_id = ? AND LOWER(TRIM(name)) = ?', [row.country_id, row.norm_name]);
    const keepId = row.keep_id;
    const deleteIds = copies.map(c => c.id).filter(id => id !== keepId);
    if(deleteIds.length > 0) {
      const placeholders = deleteIds.map(() => '?').join(',');
      await db.query(`UPDATE CITY SET state_region_id = ? WHERE state_region_id IN (${placeholders})`, [keepId, ...deleteIds]);
      await db.query(`DELETE FROM STATE_REGION WHERE id IN (${placeholders})`, deleteIds);
      console.log(`Merged state ${row.norm_name}`);
    }
  }

  process.exit(0);
}
run().catch(console.error);
