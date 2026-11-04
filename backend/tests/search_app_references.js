const db = require('../config/db');

async function searchAppReferences() {
  await db.initDB();
  const appId = 'ac7fda0c-998f-4162-a138-a50a658d8bb7';
  const tables = await db.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log(`Searching for appId ${appId} across ${tableNames.length} tables...`);
  for (const table of tableNames) {
    try {
      const cols = await db.query(`DESCRIBE \`${table}\``);
      const varcharCols = cols.filter(c => c.Type.includes('varchar') || c.Type.includes('text')).map(c => c.Field);
      if (varcharCols.length === 0) continue;

      const whereClause = varcharCols.map(c => `\`${c}\` = ?`).join(' OR ');
      const params = Array(varcharCols.length).fill(appId);
      const matches = await db.query(`SELECT * FROM \`${table}\` WHERE ${whereClause}`, params);
      if (matches.length > 0) {
        console.log(`Found ${matches.length} matches in table [${table}]:`, matches);
      }
    } catch (e) {
      // skip
    }
  }

  // Also check candidate files in `files` table
  const files = await db.query('SELECT * FROM files WHERE candidate_id = ? OR owner_user_id = ?', ['7fb54d99-21e1-42a2-933c-5271f81b654b', '85d519ba-7084-440c-aa3f-a53334538c7e']);
  console.log('Files for candidate in files table:', files);

  process.exit(0);
}

searchAppReferences().catch(console.error);
