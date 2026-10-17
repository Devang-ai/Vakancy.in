const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const db = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'', database:'vakancy_main_db'});
    const hash = await bcrypt.hash('Password@123', 10);
    await db.execute("UPDATE USERS SET password_hash=? WHERE email='chauhandevang075@gmail.com'", [hash]);
    console.log('Password successfully reset.');
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
run();
