const db = require('../config/db');

async function check() {
  await db.initDB();
  const u = await db.query("SELECT * FROM USERS WHERE id = 'a36db283-a2e9-4fa6-9583-e941b9a283c2'");
  console.log('USER for Scan2Serve:', u);
  process.exit(0);
}

check().catch(console.error);
