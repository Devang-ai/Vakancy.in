const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function inspect() {
  const p = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  const [tables] = await p.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  console.log('=== DATABASE TABLES & ROW COUNTS ===');
  console.log(`Total Tables: ${tables.length}`);

  const tableDetails = [];

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cntRes] = await p.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    const [cols] = await p.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const [fks] = await p.query(`
      SELECT 
        COLUMN_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME, tableName]);

    tableDetails.push({
      tableName,
      rows: cntRes[0].cnt,
      columns: cols.map(c => ({ name: c.Field, type: c.Type, null: c.Null, key: c.Key, default: c.Default })),
      foreignKeys: fks
    });
    console.log(`- ${tableName} (${cntRes[0].cnt} rows, ${cols.length} cols, ${fks.length} FKs)`);
  }

  const fs = require('fs');
  fs.writeFileSync(
    path.join(__dirname, '../scratch/db_schema_dump.json'),
    JSON.stringify(tableDetails, null, 2)
  );
  console.log('Saved detailed schema dump to backend/scratch/db_schema_dump.json');

  await p.end();
}

inspect().catch(console.error);
