const db = require('../config/db');

async function recoverHistoricalApplication() {
  await db.initDB();
  const appId = 'ac7fda0c-998f-4162-a138-a50a658d8bb7';

  // Fetch the legitimate primary resume of Meet Soni
  const [resume] = await db.query(
    'SELECT * FROM CANDIDATE_RESUME WHERE id = ?',
    ['3df3b8ff-0bca-4d93-87c7-1c5160d01c2f']
  );

  if (!resume) {
    console.error('Target primary resume not found in CANDIDATE_RESUME');
    process.exit(1);
  }

  // Fetch candidate profile and user details
  const [cand] = await db.query('SELECT * FROM CANDIDATES WHERE id = ?', ['7fb54d99-21e1-42a2-933c-5271f81b654b']);
  const [user] = await db.query('SELECT * FROM USERS WHERE id = ?', [cand.user_id]);

  const candidateSnapshot = JSON.stringify({
    candidate_id: cand.id,
    name: user?.name || cand.name,
    email: user?.email,
    phone: user?.phone,
    professional_headline: cand.professional_headline,
    current_location: cand.current_location,
    total_experience: cand.total_experience,
    current_organization: cand.current_organization,
    current_designation: cand.current_designation,
    snapshot_taken_at: '2026-10-02T08:47:11.000Z'
  });

  await db.query(
    `UPDATE APPLICATION 
     SET resume_id = ?, resume_url = ?, resume_filename = ?, candidate_snapshot = ?
     WHERE id = ?`,
    [
      resume.id,
      resume.file_url,
      resume.file_name || resume.resume_title,
      candidateSnapshot,
      appId
    ]
  );

  console.log('✅ Successfully recovered and linked verified legitimate resume to application:', {
    appId,
    resume_id: resume.id,
    resume_filename: resume.file_name,
    file_url: resume.file_url
  });

  const [updated] = await db.query('SELECT id, resume_id, resume_filename, resume_url FROM APPLICATION WHERE id = ?', [appId]);
  console.log('Updated application row in DB:', updated);

  process.exit(0);
}

recoverHistoricalApplication().catch(console.error);
