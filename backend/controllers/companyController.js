const db = require('../config/db');

/**
 * Public Company Controller
 * Strictly serves safe public company information.
 * Does NOT expose:
 * - employer login/user credentials
 * - private account email
 * - internal employer ATS notes
 * - candidate applications
 */

const getPublicCompanies = async (req, res) => {
  try {
    const employers = await db.query('SELECT id, company_name as name, industry, website FROM EMPLOYERS');
    const jobs = await db.query('SELECT id, employer_id, status FROM JOB WHERE status = "open"');

    const companies = employers.map((emp) => {
      const openCount = jobs.filter((j) => j.employer_id === emp.id).length;
      return {
        id: emp.id,
        name: emp.name,
        industry: emp.industry || 'Technology & Services',
        website: emp.website || null,
        openJobsNum: openCount,
        openingsCount: `${openCount} Open Jobs`,
      };
    });

    res.json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching public companies.', error: error.message });
  }
};

const getPublicCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const employers = await db.query('SELECT id, company_name as name, industry, website FROM EMPLOYERS WHERE id = ?', [id]);
    if (!employers || employers.length === 0) {
      return res.status(404).json({ success: false, message: 'Company profile not found.' });
    }

    const emp = employers[0];
    const jobs = await db.query(
      'SELECT id, title, location, status, employment_type, min_salary, max_salary FROM JOB WHERE employer_id = ? AND status = "open"',
      [emp.id]
    );

    res.json({
      success: true,
      company: {
        id: emp.id,
        name: emp.name,
        industry: emp.industry || 'Technology & Services',
        website: emp.website || null,
        openJobsNum: jobs.length,
        openingsCount: `${jobs.length} Open Jobs`,
        jobs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching company profile.', error: error.message });
  }
};

module.exports = {
  getPublicCompanies,
  getPublicCompanyById,
};
