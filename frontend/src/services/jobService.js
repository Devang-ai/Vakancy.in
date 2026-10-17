import api from './api';

/**
 * Job Service
 * Authoritative API client for real MySQL published jobs on Vakancy.in
 * Connects Guest and Candidate portals to backend /api/jobs
 */

// Deprecated mock export retained as an empty array to prevent broken imports
export const fallbackJobs = [];
export const fallbackFeaturedJobs = [];

/**
 * Format real job details for rich UI presentation
 * Only derives or displays attributes that actually exist in the database record.
 */
export const enrichJobDetails = (job) => {
  if (!job) return null;

  const company = job.company || job.company_name || 'Hiring Organization';
  const title = job.title || 'Open Position';
  const prefix = company.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'VKN';
  const shortId = job.id ? String(job.id).slice(0, 8).toUpperCase() : 'REQ';

  const reqId = `#${prefix}-${shortId}`;
  const vacancies = job.vacancies || (job.openings_count ? `${job.openings_count} Openings` : '1 Opening');

  // Build clean mission overview from description
  const missionOverview = [];
  if (job.description) {
    const paragraphs = job.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 0) {
      missionOverview.push(...paragraphs);
    } else {
      missionOverview.push(job.description);
    }
  }

  // Parse responsibilities
  let responsibilities = [];
  if (Array.isArray(job.responsibilities)) {
    responsibilities = job.responsibilities;
  } else if (job.responsibilities) {
    try {
      const parsed = JSON.parse(job.responsibilities);
      if (Array.isArray(parsed)) responsibilities = parsed;
    } catch (_) {
      responsibilities = String(job.responsibilities)
        .split('\n')
        .map(l => l.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter(Boolean)
        .map(t => ({ title: t, desc: '' }));
    }
  }

  // Parse qualifications / requirements
  let qualifications = [];
  if (Array.isArray(job.requirements)) {
    qualifications = job.requirements;
  } else if (job.requirements) {
    try {
      const parsed = JSON.parse(job.requirements);
      if (Array.isArray(parsed)) qualifications = parsed;
    } catch (_) {
      qualifications = String(job.requirements)
        .split('\n')
        .map(l => l.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter(Boolean)
        .map(desc => ({ category: 'Key Qualification', desc }));
    }
  }

  // Parse perks / benefits
  let perks = [];
  if (Array.isArray(job.perks) && job.perks.length > 0) {
    perks = job.perks;
  } else if (Array.isArray(job.benefits)) {
    perks = job.benefits.map(b => (typeof b === 'string' ? { title: b, desc: 'Company offered benefit' } : b));
  } else if (job.benefits) {
    try {
      const parsed = JSON.parse(job.benefits);
      if (Array.isArray(parsed)) {
        perks = parsed.map(b => (typeof b === 'string' ? { title: b, desc: 'Company offered benefit' } : b));
      }
    } catch (_) {
      perks = String(job.benefits)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(b => ({ title: b, desc: 'Company offered benefit' }));
    }
  }

  // Parse stack tokens / skills
  const stackTokens = Array.isArray(job.skills) ? job.skills : [];

  return {
    ...job,
    reqId,
    vacancies,
    domain: job.department || job.job_domain || job.company_industry || 'Technology',
    missionOverview,
    responsibilities,
    stackTokens,
    qualifications,
    perks,
    companyProfile: {
      name: company,
      about: job.company_about || `${company} is hiring for this position on Vakancy.in.`,
      website: job.company_website || null,
      size: job.company_size || null,
      industry: job.company_industry || job.department || null,
    },
  };
};

export const jobService = {
  // Get featured jobs for landing page
  getFeaturedJobs: async (limit = 6) => {
    try {
      const response = await api.get('/jobs', {
        params: { featured: true, limit, sortBy: 'newest' },
      });
      if (response && Array.isArray(response.jobs)) {
        return response.jobs;
      }
      return [];
    } catch (err) {
      console.warn('Backend API /jobs error fetching featured jobs:', err.message);
      return [];
    }
  },

  // Get job listings with search/filters
  getJobs: async (filters = {}) => {
    try {
      const response = await api.get('/jobs', { params: filters });
      if (response && Array.isArray(response.jobs)) {
        return {
          jobs: response.jobs,
          total: response.total !== undefined ? response.total : response.jobs.length,
          page: response.page || 1,
          totalPages: response.totalPages || 1,
        };
      }
      return {
        jobs: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };
    } catch (err) {
      console.warn('Backend API /jobs error fetching jobs:', err.message);
      return {
        jobs: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };
    }
  },

  // Get job by ID with authoritative real database values
  getJobById: async (id) => {
    try {
      const response = await api.get(`/jobs/${id}`);
      if (response && response.job) {
        return enrichJobDetails(response.job);
      }
      return null;
    } catch (err) {
      console.warn('Backend API /jobs/:id error:', err.message);
      return null;
    }
  },

  // Get autocomplete keyword suggestions (roles, skills, keywords)
  getKeywordSuggestions: async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const response = await api.get('/jobs/suggestions/keywords', {
        params: { q: query.trim() },
      });
      return response?.suggestions || [];
    } catch (err) {
      console.warn('API error fetching keyword suggestions:', err.message);
      return [];
    }
  },

  // Get autocomplete location suggestions
  getLocationSuggestions: async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const response = await api.get('/jobs/suggestions/locations', {
        params: { q: query.trim() },
      });
      return response?.suggestions || [];
    } catch (err) {
      console.warn('API error fetching location suggestions:', err.message);
      return [];
    }
  },

  // Get canonical Job Categories from master API
  getJobCategories: async (search = '') => {
    try {
      const response = await api.get('/master/categories', {
        params: search && search.trim() ? { q: search.trim() } : undefined,
      });
      return response?.categories || [];
    } catch (err) {
      console.warn('API error fetching job categories:', err.message);
      return [];
    }
  },
};

export default jobService;
