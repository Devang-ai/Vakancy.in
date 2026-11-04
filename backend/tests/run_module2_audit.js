const db = require('../config/db');

async function auditBaseline() {
  await db.initDB();
  console.log('--- Phase 1: Live Database Inspection ---');
  
  const jobs = await db.query(`
    SELECT j.id, j.title, j.created_by_type, j.is_archived, j.is_recommended, 
           j.allow_candidate_access, j.employer_id, j.manual_company_name,
           e.company_name as emp_company,
           (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as app_count
    FROM JOB j
    LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
    ORDER BY j.created_at ASC
  `);
  console.log(`\nJobs Count: ${jobs.length}`);
  jobs.forEach((j, i) => {
    console.log(`[${i+1}] ${j.id} | ${j.title} | ${j.created_by_type} | apps=${j.app_count} | rec=${j.is_recommended} | access=${j.allow_candidate_access} | archived=${j.is_archived} | ${j.emp_company || j.manual_company_name || 'N/A'}`);
  });

  const apps = await db.query(`
    SELECT a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
           a.resume_id, a.resume_url, a.resume_filename,
           CASE WHEN a.candidate_snapshot IS NOT NULL THEN 'PRESENT' ELSE 'NULL' END as snapshot_status,
           c.name as candidate_name, j.title as job_title
    FROM APPLICATION a
    JOIN CANDIDATES c ON a.candidate_id = c.id
    JOIN JOB j ON a.job_id = j.id
  `);
  console.log(`\nApplications Count: ${apps.length}`);
  apps.forEach((a, i) => {
    console.log(`[${i+1}] ${a.id} | Job: ${a.job_title} | Cand: ${a.candidate_name} | status: ${a.status} | resume: ${a.resume_filename || 'NONE'} | snapshot: ${a.snapshot_status}`);
  });

  const callbacks = await db.query(`
    SELECT cr.id, cr.job_id, cr.employer_id, cr.status, cr.created_at,
           j.title as job_title, e.company_name
    FROM CALLBACK_REQUEST cr
    LEFT JOIN JOB j ON cr.job_id = j.id
    LEFT JOIN EMPLOYERS e ON cr.employer_id = e.id
  `);
  console.log(`\nCallback Requests Count: ${callbacks.length}`);
  callbacks.forEach((c, i) => {
    console.log(`[${i+1}] ${c.id} | Job: ${c.job_title} | Emp: ${c.company_name} | status: ${c.status}`);
  });

  const shares = await db.query(`
    SELECT cs.id, cs.candidate_id, cs.job_id, cs.status, cs.candidate_consent,
           cs.share_token, cs.access_code_encrypted IS NOT NULL as has_encrypted_code,
           cs.access_code_hash IS NOT NULL as has_hash, cs.expires_at
    FROM CANDIDATE_SHARING cs
  `);
  console.log(`\nCandidate Shares Count: ${shares.length}`);
  shares.forEach((s, i) => {
    console.log(`[${i+1}] ${s.id} | status: ${s.status} | consent: ${s.candidate_consent} | token: ${s.share_token?.substring(0, 10)}... | hasEncrypted: ${s.has_encrypted_code} | hasHash: ${s.has_hash}`);
  });

  const activities = await db.query(`
    SELECT ra.id, ra.action_type, ra.entity_type, ra.entity_id, ra.changed_field,
           ra.previous_value, ra.new_value, ra.created_at
    FROM RECRUITMENT_ACTIVITY ra
    ORDER BY ra.created_at DESC LIMIT 10
  `);
  console.log(`\nRecent Audit Activities Count: ${activities.length}`);
  activities.forEach((ra, i) => {
    console.log(`[${i+1}] ${ra.action_type} on ${ra.entity_type} (${ra.entity_id}) | field: ${ra.changed_field || 'N/A'} | prev: ${ra.previous_value || 'N/A'} -> new: ${ra.new_value || 'N/A'}`);
  });

  process.exit(0);
}

auditBaseline().catch(err => {
  console.error('Audit Baseline Error:', err);
  process.exit(1);
});
