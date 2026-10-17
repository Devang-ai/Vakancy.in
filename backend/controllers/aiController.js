const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateResumeEnhancement, generateJobDescription } = require('../services/aiService');

const handleResumeEnhancer = async (req, res) => {
  try {
    const { input_info, candidate_id } = req.body;
    const userId = req.user.id;

    // Resolve candidate profile strictly from authenticated token context
    const candidates = await db.query('SELECT * FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate profile record not found.' });
    }

    const candidate = candidates[0];

    // Cross-candidate isolation check: if frontend passed a candidate_id, it MUST match token's candidate
    if (candidate_id && String(candidate_id) !== String(candidate.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only enhance your own candidate profile.'
      });
    }

    const reqId = uuidv4();
    const inputRef = typeof input_info === 'object' ? JSON.stringify(input_info) : String(input_info || 'Candidate profile info');

    // Create pending AI_REQUEST log
    await db.query(
      'INSERT INTO AI_REQUEST (id, user_id, type, status, input_reference, model) VALUES (?, ?, "resume_builder", "pending", ?, "gemini-1.5-flash")',
      [reqId, userId, inputRef]
    );

    const aiRes = await generateResumeEnhancement(input_info || {});

    if (!aiRes || aiRes.isValid === false || aiRes.error) {
      console.warn(`[AI Controller] ⚠️ AI Resume Enhancement failed (${aiRes?.errorCode || 'UNKNOWN'}): ${aiRes?.message}`);
      await db.query(
        'UPDATE AI_REQUEST SET status = "failed", output = ?, model = ? WHERE id = ?',
        [aiRes?.message || 'AI resume enhancement failed', aiRes?.model || 'gemini', reqId]
      );
      return res.status(422).json({
        success: false,
        error: true,
        error_code: aiRes?.errorCode || 'AI_GENERATION_FAILED',
        message: aiRes?.message || 'AI resume enhancement is currently unavailable.',
        is_simulated: false,
        source: 'GEMINI'
      });
    }

    const generatedText = typeof aiRes === 'object' && aiRes.text ? aiRes.text : String(aiRes);
    const modelUsed = typeof aiRes === 'object' && aiRes.model ? aiRes.model : 'gemini';

    // Update log with result and actual model
    await db.query(
      'UPDATE AI_REQUEST SET status = "completed", output = ?, model = ? WHERE id = ?',
      [generatedText, modelUsed, reqId]
    );

    res.json({
      success: true,
      request_id: reqId,
      result: generatedText,
      is_simulated: false,
      source: 'GEMINI',
      model: modelUsed
    });
  } catch (error) {
    console.error('AI Resume Builder error:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI generation is temporarily unavailable. Please try again.',
      error: 'Service temporarily unavailable'
    });
  }
};

const handleJdGenerator = async (req, res) => {
  try {
    const { title, location, skills, industry, target, department, category, job_domain, workplace_type, employment_type, seniority_level, tone, emphasis, job_id } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required for AI generation.' });
    }

    // Resolve employer profile strictly from authenticated token context
    let employers = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [userId]);
    let employer = employers.length > 0 ? employers[0] : null;

    if (!employer && req.user.role === 'admin') {
      const allEmps = await db.query('SELECT * FROM EMPLOYERS');
      employer = allEmps.length > 0 ? allEmps[0] : null;
    }

    // If job_id is provided, verify server-side that this employer owns the job
    if (job_id) {
      const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [job_id]);
      if (jobs.length > 0) {
        const job = jobs[0];
        if (employer && job.employer_id && String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only generate descriptions for your own jobs.'
          });
        }
      }
    }

    const reqId = uuidv4();
    let companyName = req.body.company_name || req.body.companyName || '';
    if (!companyName && employer && employer.company_name && employer.company_name !== 'Pending Company Profile') {
      companyName = employer.company_name;
    }
    if (!companyName || companyName === 'Pending Company Profile') {
      companyName = 'Scan2Serve';
    }

    const payload = {
      title: title.trim(),
      company_name: companyName,
      companyName: companyName,
      location: location || 'Flexible',
      skills: skills || '',
      industry: industry || category || job_domain || 'General',
      category: category || job_domain || industry || 'General',
      department: department || 'General Operations',
      workplace_type: workplace_type || 'On-site',
      employment_type: employment_type || 'Full-time Permanent',
      seniority_level: seniority_level || 'Mid Level',
      tone: tone || 'Professional & Engaging',
      emphasis: emphasis || 'Key Deliverables, Ownership, Compliance',
      target: target || ''
    };
    const inputRef = JSON.stringify(payload);

    await db.query(
      'INSERT INTO AI_REQUEST (id, user_id, type, status, input_reference, model) VALUES (?, ?, "jd_generator", "pending", ?, "gemini-1.5-flash")',
      [reqId, userId, inputRef]
    );

    const aiRes = await generateJobDescription(payload);

    if (!aiRes || aiRes.isValid === false) {
      await db.query(
        'UPDATE AI_REQUEST SET status = "failed", output = ?, model = ? WHERE id = ?',
        [aiRes?.message || aiRes?.error || 'AI generation failed', aiRes?.model || 'gemini', reqId]
      );
      return res.status(422).json({
        success: false,
        message: aiRes?.message || 'AI job description generation is currently unavailable. Please try again.',
        error_code: aiRes?.errorCode || 'AI_GENERATION_FAILED'
      });
    }

    const generatedJd = typeof aiRes === 'object' && aiRes.text ? aiRes.text : String(aiRes);
    const isSimulated = typeof aiRes === 'object' && aiRes.is_simulated !== undefined ? aiRes.is_simulated : false;
    const modelUsed = typeof aiRes === 'object' && aiRes.model ? aiRes.model : 'gemini';

    await db.query(
      'UPDATE AI_REQUEST SET status = "completed", output = ?, model = ? WHERE id = ?',
      [generatedJd, modelUsed, reqId]
    );

    res.json({
      success: true,
      request_id: reqId,
      result: generatedJd,
      job_description: generatedJd,
      is_simulated: isSimulated,
      model: modelUsed
    });
  } catch (error) {
    console.error('AI JD Generator error:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI generation is temporarily unavailable. Please try again.',
      error: 'Service temporarily unavailable'
    });
  }
};

const getAiHistory = async (req, res) => {
  try {
    const requests = await db.query('SELECT * FROM AI_REQUEST WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching AI request history.', error: error.message });
  }
};

module.exports = {
  handleResumeEnhancer,
  handleJdGenerator,
  getAiHistory
};
