const db = require('../config/db');

async function printCandidateResumes() {
  await db.initDB();
  const rows = await db.query('SELECT * FROM candidate_resume');
  console.log('Total candidate_resume rows:', rows.length);
  for (const r of rows) {
    console.log({
      id: r.id,
      candidate_id: r.candidate_id,
      resume_title: r.resume_title,
      file_name: r.file_name,
      file_url: r.file_url,
      cloudinary_public_id: r.cloudinary_public_id,
      is_primary: r.is_primary,
      created_at: r.created_at
    });
  }
  process.exit(0);
}

printCandidateResumes().catch(console.error);
