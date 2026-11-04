const db = require('../config/db');
const { canSendDigestEmail } = require('./notificationPreferenceService');
const { sendJobDigestEmail } = require('./emailService');

/**
 * Find matching jobs for a candidate based on preferences, alerts, and profile
 */
async function getMatchingJobsForCandidate(candidate, limit = 5) {
  // 1. Fetch active job alerts for this user
  const alerts = await db.query(
    'SELECT title, location FROM JOB_ALERT WHERE user_id = ? AND is_active = 1',
    [candidate.user_id]
  );

  // 2. Build match terms from alerts and candidate profile
  const matchTerms = [];
  if (candidate.professional_headline) matchTerms.push(candidate.professional_headline.trim());
  if (candidate.current_designation) matchTerms.push(candidate.current_designation.trim());
  alerts.forEach(a => {
    if (a.title) matchTerms.push(a.title.trim());
  });

  const preferredLoc = (candidate.preferred_location || candidate.current_location || '').trim();

  // 3. Query active, open, non-archived, public jobs
  const openJobs = await db.query(`
    SELECT 
      j.id, 
      j.title, 
      j.location, 
      j.job_domain, 
      j.department, 
      j.min_experience, 
      j.max_experience, 
      j.min_salary, 
      j.max_salary, 
      j.currency, 
      j.salary_period,
      COALESCE(e.company_name, j.manual_company_name, 'Hiring Partner') as company_name
    FROM JOB j
    LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
    WHERE j.status = 'open' 
      AND j.is_archived = 0 
      AND j.is_internal_only = 0 
      AND (j.application_deadline IS NULL OR j.application_deadline >= CURDATE())
    ORDER BY j.created_at DESC
    LIMIT 50
  `);

  if (!openJobs || openJobs.length === 0) return [];

  // 4. Score and filter jobs
  const scoredJobs = openJobs.map(job => {
    let score = 0;
    const jobTitleLower = (job.title || '').toLowerCase();
    const jobDomainLower = (job.job_domain || '').toLowerCase();
    const jobLocLower = (job.location || '').toLowerCase();

    // Match keywords/titles
    for (const term of matchTerms) {
      const termLower = term.toLowerCase();
      const words = termLower.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (jobTitleLower.includes(w)) score += 3;
        if (jobDomainLower.includes(w)) score += 2;
      }
    }

    // Match location
    if (preferredLoc) {
      const locWords = preferredLoc.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2);
      for (const lw of locWords) {
        if (jobLocLower.includes(lw)) score += 2;
      }
    }

    // Match experience
    const candExp = Number(candidate.total_experience || 0);
    const minExp = Number(job.min_experience || 0);
    const maxExp = Number(job.max_experience || 99);
    if (candExp >= minExp && candExp <= maxExp) {
      score += 1;
    }

    return { job, score };
  });

  // Filter only jobs that have some relevance (score > 0) or fallback to top general jobs if candidate has no specific preferences
  const relevantJobs = scoredJobs
    .filter(item => matchTerms.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => {
      const j = item.job;
      let salaryText = '';
      if (j.min_salary && j.max_salary) {
        salaryText = `₹${Number(j.min_salary).toLocaleString('en-IN')} - ₹${Number(j.max_salary).toLocaleString('en-IN')} ${j.salary_period || ''}`;
      }
      let expText = '';
      if (j.min_experience !== undefined && j.max_experience !== undefined) {
        expText = `${j.min_experience} - ${j.max_experience} yrs exp`;
      }

      return {
        id: j.id,
        title: j.title,
        company: j.company_name,
        location: j.location,
        salary: salaryText,
        experience: expText
      };
    });

  return relevantJobs;
}

/**
 * Dispatch job recommendation digest for a candidate (respecting preferences)
 */
async function sendCandidateJobDigest(candidateId) {
  const cands = await db.query(
    'SELECT c.*, u.email FROM CANDIDATES c JOIN USERS u ON c.user_id = u.id WHERE c.id = ?',
    [candidateId]
  );

  if (cands.length === 0) return { skipped: true, reason: 'Candidate not found' };
  const candidate = cands[0];

  // Enforce candidate's digestEmail preference
  const isAllowed = await canSendDigestEmail(candidate.user_id);
  if (!isAllowed) {
    return { skipped: true, reason: 'Digest email disabled by candidate preferences' };
  }

  const jobs = await getMatchingJobsForCandidate(candidate, 5);
  if (jobs.length === 0) {
    return { skipped: true, reason: 'No matching jobs available' };
  }

  return sendJobDigestEmail(candidate.email, {
    candidateName: candidate.name || 'Candidate',
    jobs
  });
}

module.exports = {
  getMatchingJobsForCandidate,
  sendCandidateJobDigest
};
