const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function seedLanguages() {
  const languages = [
    'Hindi', 'English', 'Gujarati', 'Marathi', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 
    'Kannada', 'Malayalam', 'Odia', 'Assamese', 'Urdu', 'Sanskrit', 'Nepali', 'Konkani', 
    'Kashmiri', 'Sindhi', 'Maithili', 'Manipuri', 'Bodo', 'Dogri', 'Santali',
    'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Russian', 'Portuguese'
  ];

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'vakancy_main_db',
      port: 3306
    });

    const [rows] = await conn.execute("SELECT name FROM LANGUAGE");
    const existing = rows.map(r => r.name.toLowerCase());

    for (const lang of languages) {
      if (!existing.includes(lang.toLowerCase())) {
        const id = crypto.randomUUID();
        await conn.execute("INSERT INTO LANGUAGE (id, name, is_active) VALUES (?, ?, ?)", [id, lang, true]);
        console.log(`Inserted: ${lang}`);
      }
    }
    await conn.end();
  } catch (e) {
    console.error("MySQL ERROR:", e.message);
  }
}
seedLanguages();
