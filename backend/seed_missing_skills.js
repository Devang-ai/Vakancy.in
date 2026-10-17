const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function seedMissingSkills() {
  const QUICK_ESSENTIAL_SKILLS = [
    'MS Excel',
    'Basic Computer Knowledge',
    'Hands-on Computer',
    'Data Entry',
    'MS Office',
    'Communication Skills',
    'Tally Prime',
    'Email Communication'
  ];

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'vakancy_main_db',
      port: 3306
    });

    const [rows] = await conn.execute("SELECT id, name FROM SKILL");
    const existingNames = rows.map(r => r.name.toLowerCase());

    for (const skill of QUICK_ESSENTIAL_SKILLS) {
      if (!existingNames.includes(skill.toLowerCase())) {
        const id = crypto.randomUUID();
        await conn.execute("INSERT INTO SKILL (id, name, category) VALUES (?, ?, ?)", [id, skill, 'General']);
        console.log(`Inserted: ${skill}`);
      } else {
        console.log(`Already exists: ${skill}`);
      }
    }
    await conn.end();
  } catch (e) {
    console.error("MySQL ERROR:", e.message);
  }
}
seedMissingSkills();
