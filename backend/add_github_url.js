const mysql = require('mysql2/promise');
async function test() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'vakancy_main_db',
      port: 3306
    });
    const [rows] = await conn.execute("SHOW COLUMNS FROM CANDIDATES LIKE 'github_url'");
    if(rows.length === 0) {
      await conn.execute("ALTER TABLE CANDIDATES ADD COLUMN github_url VARCHAR(255)");
      console.log("Added github_url");
    } else {
      console.log("github_url exists");
    }
    await conn.end();
  } catch (e) {
    console.error(e.message);
  }
}
test();
