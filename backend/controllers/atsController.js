const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// --- ATS Stages ---
const getStages = async (req, res) => {
  try {
    const stages = await db.query('SELECT * FROM ATS_STAGE WHERE is_active = 1 ORDER BY `order` ASC');
    res.json({ success: true, count: stages.length, stages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching ATS stages.', error: error.message });
  }
};

const createStage = async (req, res) => {
  try {
    const { name, description, order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Stage name is required.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO ATS_STAGE (id, name, description, `order`, is_active) VALUES (?, ?, ?, ?, 1)',
      [id, name, description || null, order || 1]
    );
    res.status(201).json({ success: true, message: 'ATS stage created.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating ATS stage.', error: error.message });
  }
};

// --- Recruiter Manual Candidate Addition ---
const manuallyAddCandidate = async (req, res) => {
  try {
    const { name, email, phone, location, profile_type, tags, initial_notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const existing = await db.query('SELECT id FROM USERS WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const userId = uuidv4();
    const candId = uuidv4();

    // Create user placeholder with random password hash
    await db.query(
      'INSERT INTO USERS (id, email, password_hash, role, phone, is_active) VALUES (?, ?, "MANUAL_RECRUITER_ADDED", "candidate", ?, 1)',
      [userId, email, phone || null]
    );

    await db.query(
      'INSERT INTO CANDIDATES (id, user_id, name, current_location, profile_type, is_premium) VALUES (?, ?, ?, ?, ?, 0)',
      [candId, userId, name, location || 'Not Specified', profile_type || 'experienced']
    );

    // Tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await db.query('INSERT INTO CANDIDATE_TAG (id, candidate_id, tag) VALUES (?, ?, ?)', [uuidv4(), candId, tag]);
      }
    }

    // Notes
    if (initial_notes) {
      await db.query(
        'INSERT INTO CANDIDATE_NOTE (id, candidate_id, author_id, note) VALUES (?, ?, ?, ?)',
        [uuidv4(), candId, req.user.id, initial_notes]
      );
    }

    res.status(201).json({ success: true, message: 'Candidate added manually to database.', candidate_id: candId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding candidate manually.', error: error.message });
  }
};

// --- Candidate Assignment to Job/Client Pipeline ---
const assignToPipeline = async (req, res) => {
  try {
    const { candidate_id, job_id, client_id, stage_id } = req.body;
    const recruiterId = req.user.id;

    if (!candidate_id || (!job_id && !client_id)) {
      return res.status(400).json({ success: false, message: 'Candidate ID and Job or Client ID required.' });
    }

    // Default stage if not passed
    let stage = stage_id;
    if (!stage) {
      const defaultStages = await db.query('SELECT id FROM ATS_STAGE WHERE `order` = 1 LIMIT 1');
      if (defaultStages.length > 0) stage = defaultStages[0].id;
    }

    // Check existing pipeline entry
    const existing = await db.query('SELECT id FROM CANDIDATE_PIPELINE WHERE candidate_id = ? AND job_id = ?', [candidate_id, job_id || null]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Candidate is already assigned to this job pipeline.' });
    }

    const pipId = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_PIPELINE (id, candidate_id, job_id, client_id, stage_id, recruiter_id) VALUES (?, ?, ?, ?, ?, ?)',
      [pipId, candidate_id, job_id || null, client_id || null, stage, recruiterId]
    );

    // Log pipeline stage history
    const histId = uuidv4();
    await db.query(
      'INSERT INTO PIPELINE_STAGE_HISTORY (id, pipeline_id, to_stage_id, moved_by, remarks) VALUES (?, ?, ?, ?, "Assigned candidate to job pipeline.")',
      [histId, pipId, stage, recruiterId]
    );

    res.status(201).json({ success: true, message: 'Candidate assigned to ATS pipeline.', pipeline_id: pipId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning candidate to pipeline.', error: error.message });
  }
};

// --- Move Candidate ATS Stage ---
const moveCandidateStage = async (req, res) => {
  try {
    const { pipeline_id, to_stage_id, remarks } = req.body;
    const movedBy = req.user.id;

    const pipelines = await db.query('SELECT * FROM CANDIDATE_PIPELINE WHERE id = ?', [pipeline_id]);
    if (pipelines.length === 0) {
      return res.status(404).json({ success: false, message: 'Pipeline record not found.' });
    }

    const pipeline = pipelines[0];
    const fromStageId = pipeline.stage_id;

    // Update pipeline stage
    await db.query('UPDATE CANDIDATE_PIPELINE SET stage_id = ?, recruiter_id = ? WHERE id = ?', [to_stage_id, movedBy, pipeline_id]);

    // Log history record as required by ERD PIPELINE_STAGE_HISTORY
    const histId = uuidv4();
    await db.query(
      'INSERT INTO PIPELINE_STAGE_HISTORY (id, pipeline_id, from_stage_id, to_stage_id, moved_by, remarks) VALUES (?, ?, ?, ?, ?, ?)',
      [histId, pipeline_id, fromStageId, to_stage_id, movedBy, remarks || null]
    );

    res.json({ success: true, message: 'Candidate stage updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error moving candidate stage.', error: error.message });
  }
};

// --- Get Pipeline Board (grouped by stages) ---
const getPipelineBoard = async (req, res) => {
  try {
    const { job_id, client_id } = req.query;

    const stages = await db.query('SELECT * FROM ATS_STAGE WHERE is_active = 1 ORDER BY `order` ASC');
    let pipelines = await db.query('SELECT * FROM CANDIDATE_PIPELINE');

    if (job_id) pipelines = pipelines.filter(p => p.job_id === job_id);
    if (client_id) pipelines = pipelines.filter(p => p.client_id === client_id);

    const board = await Promise.all(stages.map(async (stg) => {
      const stagePipelines = pipelines.filter(p => p.stage_id === stg.id);

      const items = await Promise.all(stagePipelines.map(async (p) => {
        const cands = await db.query('SELECT id, name, current_location, profile_type, is_premium FROM CANDIDATES WHERE id = ?', [p.candidate_id]);
        const cand = cands.length > 0 ? cands[0] : null;

        const recruiterUsers = await db.query('SELECT email FROM USERS WHERE id = ?', [p.recruiter_id]);
        const recruiterEmail = recruiterUsers.length > 0 ? recruiterUsers[0].email : 'System';

        const notes = await db.query('SELECT * FROM CANDIDATE_NOTE WHERE candidate_id = ? ORDER BY created_at DESC', [p.candidate_id]);
        const tags = await db.query('SELECT tag FROM CANDIDATE_TAG WHERE candidate_id = ?', [p.candidate_id]);

        return {
          pipeline_id: p.id,
          updated_at: p.updated_at,
          recruiter_email: recruiterEmail,
          candidate: cand,
          notes_count: notes.length,
          tags: tags.map(t => t.tag)
        };
      }));

      return {
        stage: stg,
        candidates: items
      };
    }));

    res.json({ success: true, board });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pipeline board.', error: error.message });
  }
};

// --- Get Pipeline Stage History Audit Log ---
const getPipelineHistory = async (req, res) => {
  try {
    const { pipeline_id } = req.params;

    const histories = await db.query('SELECT * FROM PIPELINE_STAGE_HISTORY WHERE pipeline_id = ? ORDER BY moved_at DESC', [pipeline_id]);

    const enriched = await Promise.all(histories.map(async (h) => {
      let fromStageName = 'Initial Assignment';
      if (h.from_stage_id) {
        const fs = await db.query('SELECT name FROM ATS_STAGE WHERE id = ?', [h.from_stage_id]);
        if (fs.length > 0) fromStageName = fs[0].name;
      }

      const ts = await db.query('SELECT name FROM ATS_STAGE WHERE id = ?', [h.to_stage_id]);
      const toStageName = ts.length > 0 ? ts[0].name : 'Unknown';

      const users = await db.query('SELECT email, role FROM USERS WHERE id = ?', [h.moved_by]);
      const userObj = users.length > 0 ? users[0] : { email: 'Unknown', role: 'system' };

      return {
        ...h,
        from_stage_name: fromStageName,
        to_stage_name: toStageName,
        moved_by_email: userObj.email,
        moved_by_role: userObj.role
      };
    }));

    res.json({ success: true, history: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pipeline history.', error: error.message });
  }
};

// --- Candidate Notes ---
const addCandidateNote = async (req, res) => {
  try {
    const { candidate_id, pipeline_id, note } = req.body;
    if (!candidate_id || !note) return res.status(400).json({ success: false, message: 'Candidate ID and note text are required.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_NOTE (id, candidate_id, author_id, pipeline_id, note) VALUES (?, ?, ?, ?, ?)',
      [id, candidate_id, req.user.id, pipeline_id || null, note]
    );

    res.status(201).json({ success: true, message: 'Note added successfully.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding note.', error: error.message });
  }
};

const getCandidateNotes = async (req, res) => {
  try {
    const { candidate_id } = req.params;
    const notes = await db.query('SELECT * FROM CANDIDATE_NOTE WHERE candidate_id = ? ORDER BY created_at DESC', [candidate_id]);

    const enriched = await Promise.all(notes.map(async (n) => {
      const users = await db.query('SELECT email, role FROM USERS WHERE id = ?', [n.author_id]);
      return {
        ...n,
        author_email: users.length > 0 ? users[0].email : 'Recruiter'
      };
    }));

    res.json({ success: true, notes: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notes.', error: error.message });
  }
};

// --- Candidate Tags ---
const addCandidateTag = async (req, res) => {
  try {
    const { candidate_id, tag } = req.body;
    if (!candidate_id || !tag) return res.status(400).json({ success: false, message: 'Candidate ID and tag are required.' });

    const id = uuidv4();
    await db.query('INSERT INTO CANDIDATE_TAG (id, candidate_id, tag) VALUES (?, ?, ?)', [id, candidate_id, tag]);
    res.status(201).json({ success: true, message: 'Tag added.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding tag.', error: error.message });
  }
};

const removeCandidateTag = async (req, res) => {
  try {
    await db.query('DELETE FROM CANDIDATE_TAG WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tag removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing tag.', error: error.message });
  }
};

module.exports = {
  getStages,
  createStage,
  manuallyAddCandidate,
  assignToPipeline,
  moveCandidateStage,
  getPipelineBoard,
  getPipelineHistory,
  addCandidateNote,
  getCandidateNotes,
  addCandidateTag,
  removeCandidateTag
};
