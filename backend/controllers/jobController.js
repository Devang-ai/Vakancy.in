const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Format salary range display
const formatSalaryRange = (min, max, currency = 'INR', period = 'Per Year') => {
  const numMin = parseFloat(min) || 0;
  const numMax = parseFloat(max) || 0;
  const symbol = currency === 'INR' ? '₹' : (currency || '$');

  if (numMin === 0 && numMax === 0) {
    return 'Competitive';
  }

  // Format LPA for annual INR salaries >= 1,00,000
  if (currency === 'INR' && (numMin >= 100000 || numMax >= 100000)) {
    const minLpa = numMin > 0 ? (numMin / 100000).toFixed(numMin % 100000 === 0 ? 0 : 1) : null;
    const maxLpa = numMax > 0 ? (numMax / 100000).toFixed(numMax % 100000 === 0 ? 0 : 1) : null;

    if (minLpa && maxLpa && minLpa !== maxLpa) {
      return `${symbol}${minLpa} – ${symbol}${maxLpa} LPA`;
    }
    if (minLpa && !maxLpa) return `From ${symbol}${minLpa} LPA`;
    if (!minLpa && maxLpa) return `Up to ${symbol}${maxLpa} LPA`;
    if (minLpa) return `${symbol}${minLpa} LPA`;
  }

  // Standard numeric formatting
  if (numMin > 0 && numMax > 0 && numMin !== numMax) {
    return `${symbol}${numMin.toLocaleString()} – ${symbol}${numMax.toLocaleString()} ${period ? `(${period})` : ''}`.trim();
  }
  if (numMin > 0) return `From ${symbol}${numMin.toLocaleString()} ${period ? `(${period})` : ''}`.trim();
  if (numMax > 0) return `Up to ${symbol}${numMax.toLocaleString()} ${period ? `(${period})` : ''}`.trim();

  return 'Competitive';
};

// Format experience range display
const formatExperience = (min, max, fresherAllowed) => {
  const numMin = parseFloat(min) || 0;
  const numMax = parseFloat(max) || 0;

  if (fresherAllowed || (numMin === 0 && numMax === 0)) {
    return 'Fresher / 0 Yrs';
  }
  if (numMin > 0 && numMax > 0 && numMin !== numMax) {
    return `${numMin} – ${numMax} Yrs`;
  }
  if (numMin > 0 && numMax === 0) {
    return `${numMin}+ Yrs`;
  }
  if (numMax > 0 && numMin === 0) {
    return `Up to ${numMax} Yrs`;
  }
  if (numMin > 0) {
    return `${numMin} Yrs`;
  }
  return 'Not specified';
};

// Parse skills from database string or array
const parseSkills = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (_) {}
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
};

// Format relative time (e.g., 'Posted 2d ago')
const formatPostedAgo = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const posted = new Date(dateStr);
    const now = new Date();
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `Posted ${Math.max(1, diffMins)}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Posted ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Posted yesterday';
    if (diffDays < 30) return `Posted ${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Posted ${diffMonths}mo ago`;
  } catch (_) {
    return 'Recently';
  }
};

// Standard 8 Public Department groupings mapped to underlying category IDs and domain/department patterns
const DEPARTMENT_CATEGORY_MAP = {
  'Engineering & Technology': {
    categoryIds: [
      'cat-software-dev',
      'cat00000-0000-0000-0000-000000000001',
      'cat-software-qa',
      'cat-web-dev',
      'cat-mobile-dev',
      'cat-frontend-dev',
      'cat-backend-dev',
      'cat-fullstack-dev',
      'cat-devops',
      'cat-cloud-infra',
      'cat00000-0000-0000-0000-000000000002',
      'cat-data-analytics',
      'cat-ai-ml',
      'cat-cyber-security',
      'cat-database-admin',
      'cat-engineering'
    ],
    terms: ['Engineering', 'Technology', 'Developer', 'Software', 'DevOps', 'Cloud', 'Infrastructure', 'Architect', 'Data Science', 'AI']
  },
  'Sales & Business Development': {
    categoryIds: ['cat-sales-bdev', 'cat-enterprise-sales', 'cat-account-mgmt'],
    terms: ['Sales', 'Business Development', 'BD', 'Account Management']
  },
  'Marketing & Communications': {
    categoryIds: [
      'cat00000-0000-0000-0000-000000000004',
      'cat-digital-marketing',
      'cat-social-media',
      'cat-seo-sem',
      'cat-content-marketing',
      'cat-media-comm'
    ],
    terms: ['Marketing', 'Communications', 'Media', 'Social Media', 'Content', 'Growth']
  },
  'Finance & Accounting': {
    categoryIds: [
      'cat00000-0000-0000-0000-000000000005',
      'cat-statutory-audit',
      'cat-investment-banking'
    ],
    terms: ['Finance', 'Accounting', 'Audit', 'Taxation', 'Banking']
  },
  'Human Resources': {
    categoryIds: [
      'cat-human-resources',
      'cat-recruitment',
      'cat-payroll-benefits'
    ],
    terms: ['Human Resources', 'HR', 'Recruitment', 'Talent', 'Payroll']
  },
  'Operations & Administration': {
    categoryIds: [
      'cat-operations-logistics',
      'cat-procurement-supply',
      'cat-manufacturing',
      'cat-quality-control',
      'cat-general-mgmt'
    ],
    terms: ['Operations', 'Administration', 'Logistics', 'Supply Chain', 'Procurement', 'Management']
  },
  'Product & Design': {
    categoryIds: [
      'cat00000-0000-0000-0000-000000000003',
      'cat-ui-ux-design',
      'cat-product-mgmt',
      'cat-project-mgmt'
    ],
    terms: ['Product', 'Design', 'UI/UX', 'Project Management']
  },
  'Customer Support': {
    categoryIds: [
      'cat-customer-support',
      'cat-customer-success'
    ],
    terms: ['Customer Support', 'Customer Success', 'Support', 'Client Service']
  },
  'Software Engineering': {
    categoryIds: ['cat00000-0000-0000-0000-000000000001', 'cat-software-dev', 'cat-backend-dev', 'cat-frontend-dev', 'cat-fullstack-dev'],
    terms: ['Software', 'Engineering', 'Developer', 'Engineer']
  },
  'Software Development': {
    categoryIds: ['cat-software-dev', 'cat00000-0000-0000-0000-000000000001'],
    terms: ['Software', 'Developer', 'Engineering']
  },
  'Data Science & AI': {
    categoryIds: ['cat00000-0000-0000-0000-000000000002', 'cat-data-analytics', 'cat-ai-ml'],
    terms: ['Data Science', 'AI', 'Analytics', 'Machine Learning']
  },
  'Sales & Marketing': {
    categoryIds: ['cat00000-0000-0000-0000-000000000004', 'cat-sales-bdev', 'cat-digital-marketing'],
    terms: ['Sales', 'Marketing', 'Business Development']
  },
  'DevOps & Infrastructure': {
    categoryIds: ['cat-devops', 'cat-cloud-infra'],
    terms: ['DevOps', 'Infrastructure', 'Cloud', 'SRE', 'Architect']
  },
  'Full Stack Development': {
    categoryIds: ['cat-fullstack-dev'],
    terms: ['Full Stack', 'Fullstack', 'Web Development', 'Software']
  },
  'Digital Marketing': {
    categoryIds: ['cat-digital-marketing', 'cat-seo-sem'],
    terms: ['Digital Marketing', 'Marketing', 'SEO', 'Performance']
  },
  'Customer Support & Service': {
    categoryIds: ['cat-customer-support', 'cat-customer-success'],
    terms: ['Customer Support', 'Customer Service', 'Support', 'Service']
  }
};

// List / Search Jobs with authoritative MySQL querying
const getJobs = async (req, res) => {
  try {
    const {
      search,
      location,
      category,
      category_id,
      department,
      workplace_type,
      workMode,
      employment_type,
      experience,
      min_experience,
      max_experience,
      min_salary,
      max_salary,
      ctcRange,
      company_type,
      employer_id,
      client_id,
      status,
      sortBy,
      featured,
      recommended,
      is_recommended,
      page = 1,
      limit = 10,
    } = req.query;

    const isInternalStaff = req.user && ['recruiter', 'admin', 'director', 'tl_coordinator', 'bd_lead'].includes(req.user.role);

    // Base query selects only public safe columns + company info
    let whereClauses = [];
    let queryParams = [];

    // 1. Published / Public status enforcement: drafts never appear in candidate search or employer-facing general search
    if (!isInternalStaff) {
      whereClauses.push("(j.status = 'open' OR j.status = 'active') AND (j.is_internal_only IS NULL OR j.is_internal_only = 0)");
    } else if (status) {
      whereClauses.push("j.status = ?");
      queryParams.push(status);
    }

    // 1b. Recommended Jobs filter — Phase 7: return only jobs genuinely marked as Vakancy.in-recommended
    const isRecFilterRequested = Boolean(
      recommended === 'true' ||
      recommended === true ||
      recommended === '1' ||
      is_recommended === 'true' ||
      is_recommended === true ||
      is_recommended === '1'
    );
    if (isRecFilterRequested) {
      whereClauses.push("(j.priority = 'recommended' OR (j.priority != 'not_recommended' AND (j.created_by_type = 'INTERNAL_STAFF' OR j.source_type IN ('EXECUTIVE_SEARCH', 'Vakancy Recruitment'))))");
    }

    if (employer_id) {
      whereClauses.push("j.employer_id = ?");
      queryParams.push(employer_id);
    }
    if (client_id) {
      whereClauses.push("j.client_id = ?");
      queryParams.push(client_id);
    }

    // 2. Search query (title, description, required_skills, keywords, department, company name)
    if (search && search.trim()) {
      const q = search.trim();
      const terms = q.includes(',') ? q.split(',').map(t => t.trim()).filter(Boolean) : [q];

      const searchOrClauses = [];
      for (const term of terms) {
        const likeTerm = `%${term}%`;
        searchOrClauses.push(`(
          j.title LIKE ? OR
          j.description LIKE ? OR
          j.required_skills LIKE ? OR
          j.keywords LIKE ? OR
          j.department LIKE ? OR
          j.job_domain LIKE ? OR
          e.company_name LIKE ? OR
          c.name LIKE ?
        )`);
        queryParams.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
      }
      if (searchOrClauses.length > 0) {
        whereClauses.push(`(${searchOrClauses.join(' OR ')})`);
      }
    }

    // 3. Location filter
    if (location && location.trim()) {
      const loc = `%${location.trim()}%`;
      whereClauses.push(`(
        j.location LIKE ? OR
        j.city LIKE ? OR
        j.state LIKE ? OR
        j.country LIKE ? OR
        j.locality LIKE ?
      )`);
      queryParams.push(loc, loc, loc, loc, loc);
    }

    // 4. Category / Department filter (supporting array or string of standard departments or direct categories)
    const rawDept = department || category;
    if (rawDept) {
      const depts = Array.isArray(rawDept)
        ? rawDept
        : String(rawDept).split(',').map((d) => d.trim()).filter(Boolean);

      if (depts.length > 0) {
        const deptOrConditions = [];
        for (const d of depts) {
          const mapping = DEPARTMENT_CATEGORY_MAP[d];
          if (mapping) {
            const orParts = [];
            if (mapping.categoryIds && mapping.categoryIds.length > 0) {
              const inPlaceholders = mapping.categoryIds.map(() => '?').join(', ');
              orParts.push(`j.category_id IN (${inPlaceholders})`);
              queryParams.push(...mapping.categoryIds);
            }
            if (mapping.terms && mapping.terms.length > 0) {
              for (const term of mapping.terms) {
                orParts.push(`j.department LIKE ? OR j.job_domain LIKE ? OR j.title LIKE ?`);
                const lk = `%${term}%`;
                queryParams.push(lk, lk, lk);
              }
            }
            if (orParts.length > 0) {
              deptOrConditions.push(`(${orParts.join(' OR ')})`);
            }
          } else {
            // Direct category or department text match with title & subterm support
            const orParts = [
              `j.department LIKE ? OR j.job_domain LIKE ? OR j.title LIKE ? OR j.category_id = ? OR j.category_id = (SELECT id FROM JOB_CATEGORY WHERE name = ? OR slug = ? LIMIT 1)`
            ];
            const lk = `%${d}%`;
            queryParams.push(lk, lk, lk, d, d, d.toLowerCase().replace(/\s+/g, '-'));

            const subTerms = d.split(/[&,/]+/).map((t) => t.trim()).filter((t) => t.length > 2);
            if (subTerms.length > 1) {
              for (const term of subTerms) {
                orParts.push(`j.department LIKE ? OR j.job_domain LIKE ? OR j.title LIKE ?`);
                const termLk = `%${term}%`;
                queryParams.push(termLk, termLk, termLk);
              }
            }
            deptOrConditions.push(`(${orParts.join(' OR ')})`);
          }
        }
        if (deptOrConditions.length > 0) {
          whereClauses.push(`(${deptOrConditions.join(' OR ')})`);
        }
      }
    } else if (category_id) {
      whereClauses.push('j.category_id = ?');
      queryParams.push(category_id);
    }

    // 5. Workplace Mode / Work Arrangement filter (array or single string)
    const rawWorkMode = workplace_type || workMode;
    if (rawWorkMode) {
      const modes = Array.isArray(rawWorkMode)
        ? rawWorkMode
        : String(rawWorkMode).split(',').map(m => m.trim()).filter(Boolean);

      if (modes.length > 0) {
        const modeConditions = [];
        for (const m of modes) {
          if (m.toLowerCase().includes('home') || m.toLowerCase().includes('remote')) {
            modeConditions.push("(j.workplace_type LIKE '%Remote%' OR j.workplace_type LIKE '%Home%')");
          } else if (m.toLowerCase().includes('hybrid')) {
            modeConditions.push("j.workplace_type LIKE '%Hybrid%'");
          } else if (m.toLowerCase().includes('site') || m.toLowerCase().includes('office') || m.toLowerCase().includes('campus')) {
            modeConditions.push("(j.workplace_type LIKE '%On-site%' OR j.workplace_type LIKE '%Onsite%')");
          } else {
            modeConditions.push("j.workplace_type LIKE ?");
            queryParams.push(`%${m}%`);
          }
        }
        if (modeConditions.length > 0) {
          whereClauses.push(`(${modeConditions.join(' OR ')})`);
        }
      }
    }

    // 6. Employment type filter
    if (employment_type) {
      const types = Array.isArray(employment_type)
        ? employment_type
        : String(employment_type).split(',').map(t => t.trim()).filter(Boolean);

      if (types.length > 0) {
        const typeClauses = types.map(() => 'j.employment_type LIKE ?');
        whereClauses.push(`(${typeClauses.join(' OR ')})`);
        types.forEach(t => queryParams.push(`%${t}%`));
      }
    }

    // 7. Experience filter
    if (experience && typeof experience === 'string' && experience.trim()) {
      const expStr = experience.toLowerCase();
      if (expStr.includes('0-2') || expStr.includes('0 - 2') || expStr.includes('entry')) {
        whereClauses.push('(j.min_experience <= 2 OR j.fresher_allowed = 1)');
      } else if (expStr.includes('3-5') || expStr.includes('3 - 5') || expStr.includes('mid')) {
        whereClauses.push('((j.min_experience <= 5 AND j.max_experience >= 3) OR (j.min_experience >= 3 AND j.min_experience <= 5))');
      } else if (expStr.includes('6-9') || expStr.includes('6 - 9') || expStr.includes('senior') || expStr.includes('5 - 8') || expStr.includes('5-8')) {
        whereClauses.push('((j.min_experience <= 9 AND j.max_experience >= 5) OR (j.min_experience >= 5 AND j.min_experience <= 9))');
      } else if (expStr.includes('10+') || expStr.includes('10') || expStr.includes('leadership') || expStr.includes('12+')) {
        whereClauses.push('(j.min_experience >= 8 OR j.max_experience >= 10)');
      }
    } else if (min_experience !== undefined || max_experience !== undefined) {
      if (min_experience !== undefined && min_experience !== '') {
        whereClauses.push('j.max_experience >= ?');
        queryParams.push(parseFloat(min_experience) || 0);
      }
      if (max_experience !== undefined && max_experience !== '') {
        whereClauses.push('j.min_experience <= ?');
        queryParams.push(parseFloat(max_experience) || 0);
      }
    }

    // 8. Salary / CTC range filter
    if (ctcRange) {
      const ranges = Array.isArray(ctcRange)
        ? ctcRange
        : String(ctcRange).split(',').map(r => r.trim()).filter(Boolean);

      if (ranges.length > 0) {
        const ctcConditions = [];
        for (const r of ranges) {
          if (r.includes('<5') || r.includes('Up to 5L')) {
            ctcConditions.push('(j.max_salary <= 500000 AND j.max_salary > 0)');
          } else if (r.includes('6 - 10') || r.includes('6-10')) {
            ctcConditions.push('(j.min_salary <= 1000000 AND j.max_salary >= 600000)');
          } else if (r.includes('10 - 15') || r.includes('10-15')) {
            ctcConditions.push('(j.min_salary <= 1500000 AND j.max_salary >= 1000000)');
          } else if (r.includes('15 - 25') || r.includes('15-25')) {
            ctcConditions.push('(j.min_salary <= 2500000 AND j.max_salary >= 1500000)');
          } else if (r.includes('25 - 50') || r.includes('25-50') || r.includes('25L – ₹40L') || r.includes('40L – ₹60L')) {
            ctcConditions.push('(j.min_salary <= 6000000 AND j.max_salary >= 2500000)');
          } else if (r.includes('50+') || r.includes('50 Lakhs+') || r.includes('60L') || r.includes('80L')) {
            ctcConditions.push('(j.max_salary >= 5000000 OR j.min_salary >= 5000000)');
          }
        }
        if (ctcConditions.length > 0) {
          whereClauses.push(`(${ctcConditions.join(' OR ')})`);
        }
      }
    } else if (min_salary !== undefined || max_salary !== undefined) {
      if (min_salary !== undefined && min_salary !== '') {
        whereClauses.push('j.max_salary >= ?');
        queryParams.push(parseFloat(min_salary) || 0);
      }
      if (max_salary !== undefined && max_salary !== '') {
        whereClauses.push('j.min_salary <= ?');
        queryParams.push(parseFloat(max_salary) || 0);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching jobs
    const countSql = `
      SELECT COUNT(DISTINCT j.id) AS total
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN CLIENT c ON j.client_id = c.id
      ${whereSql}
    `;
    const countResult = await db.query(countSql, queryParams);
    const totalJobs = countResult && countResult[0] ? countResult[0].total : 0;

    // Check if active user search or filters are applied
    const isFilterActive = Boolean(
      (search && search.trim()) ||
      (location && location.trim()) ||
      department ||
      category ||
      category_id ||
      workplace_type ||
      workMode ||
      employment_type ||
      experience ||
      min_experience ||
      max_experience ||
      min_salary ||
      max_salary ||
      ctcRange ||
      company_type
    );

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || (featured ? 6 : 10)));
    const offset = (pageNum - 1) * limitNum;

    // Sorting — Phase 7 Spec:
    // Default listing displays all eligible published jobs in normal newest-first order (created_at DESC).
    // Does not artificially push recommended jobs to the top or reserve top slots.
    let orderSql = 'ORDER BY j.created_at DESC';
    if (sortBy === 'Salary (High to Low)' || sortBy === 'salary' || sortBy === 'salary_high') {
      orderSql = 'ORDER BY j.max_salary DESC, j.created_at DESC';
    } else if (sortBy === 'Date Posted (Newest)' || sortBy === 'newest' || sortBy === 'recent' || !sortBy || sortBy === 'Relevance') {
      orderSql = 'ORDER BY j.created_at DESC';
    }

    const querySql = `
      SELECT 
        j.id,
        j.title,
        j.department,
        j.job_domain,
        j.employment_type,
        j.workplace_type,
        j.seniority_level,
        j.openings_count,
        j.country,
        j.state,
        j.city,
        j.locality,
        j.location,
        j.min_experience,
        j.max_experience,
        j.fresher_allowed,
        j.min_qualification,
        j.degree,
        j.specialization,
        j.required_skills,
        j.description,
        j.responsibilities,
        j.requirements,
        j.benefits,
        j.status,
        j.priority,
        j.min_salary,
        j.max_salary,
        j.salary_period,
        j.currency,
        j.salary_type,
        j.created_by_type,
        j.source_type,
        (CASE 
          WHEN j.priority = 'recommended' THEN 1 
          WHEN j.priority = 'not_recommended' THEN 0 
          WHEN (j.created_by_type = 'INTERNAL_STAFF' OR j.source_type IN ('EXECUTIVE_SEARCH', 'Vakancy Recruitment')) THEN 1 
          ELSE 0 
        END) AS is_rec,
        j.created_at,
        j.updated_at,
        COALESCE(e.company_name, c.name, 'Vakancy Client') AS company_name,
        e.website AS company_website,
        e.logo_url AS company_logo
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN CLIENT c ON j.client_id = c.id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const jobs = await db.query(querySql, [...queryParams, limitNum, offset]);

    // Format safe and consistent public job objects
    const enrichedJobs = jobs.map((j) => {
      const skillsArr = parseSkills(j.required_skills);
      const salRange = formatSalaryRange(j.min_salary, j.max_salary, j.currency, j.salary_period);
      const expStr = formatExperience(j.min_experience, j.max_experience, j.fresher_allowed);
      const postedAgoStr = formatPostedAgo(j.created_at);

      const isRecommended = Boolean(
        j.is_rec === 1 ||
        j.priority === 'recommended' ||
        (j.priority !== 'not_recommended' && (
          j.created_by_type === 'INTERNAL_STAFF' ||
          j.source_type === 'Vakancy Recruitment' ||
          j.source_type === 'EXECUTIVE_SEARCH'
        ))
      );

      return {
        id: j.id,
        title: j.title,
        company: j.company_name,
        company_name: j.company_name,
        companyLogo: j.company_logo || null,
        location: j.location,
        city: j.city || '',
        state: j.state || '',
        country: j.country || 'India',
        workplaceType: j.workplace_type || 'On-site',
        workMode: j.workplace_type || 'On-site',
        employmentType: j.employment_type || 'Full Time',
        employment_type: j.employment_type || 'Full Time',
        experience: expStr,
        min_experience: j.min_experience,
        max_experience: j.max_experience,
        salaryRange: salRange,
        min_salary: j.min_salary,
        max_salary: j.max_salary,
        currency: j.currency,
        salary_period: j.salary_period,
        skills: skillsArr,
        description: j.description || '',
        snippet: j.description ? (j.description.length > 200 ? j.description.slice(0, 197) + '...' : j.description) : '',
        department: j.department || 'General',
        job_domain: j.job_domain || 'General',
        openings_count: j.openings_count || 1,
        vacancies: j.openings_count ? `${j.openings_count} Openings` : '1 Opening',
        status: j.status,
        created_by_type: j.created_by_type,
        source_type: j.source_type,
        is_recommended: isRecommended,
        recommendation_badge: isRecommended ? 'Vakancy.in Recommended' : null,
        badge: isRecommended ? 'Vakancy.in Recommended' : null,
        badgeType: isRecommended ? 'growth' : null,
        postedAgo: postedAgoStr,
        created_at: j.created_at,
      };
    });

    res.json({
      success: true,
      total: totalJobs,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(totalJobs / limitNum)),
      count: enrichedJobs.length,
      jobs: enrichedJobs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching jobs.', error: error.message });
  }
};

// Get single job with full public specifications
const getJobById = async (req, res) => {
  try {
    const isInternalUser = req.user && ['employer', 'recruiter', 'admin'].includes(req.user.role);

    const querySql = `
      SELECT 
        j.id,
        j.employer_id,
        j.title,
        j.department,
        j.job_domain,
        j.employment_type,
        j.workplace_type,
        j.seniority_level,
        j.openings_count,
        j.country,
        j.state,
        j.city,
        j.locality,
        j.location,
        j.min_experience,
        j.max_experience,
        j.fresher_allowed,
        j.min_qualification,
        j.degree,
        j.specialization,
        j.required_skills,
        j.description,
        j.responsibilities,
        j.requirements,
        j.benefits,
        j.status,
        j.priority,
        j.application_deadline,
        j.min_salary,
        j.max_salary,
        j.salary_period,
        j.currency,
        j.salary_type,
        j.created_by_type,
        j.source_type,
        j.created_at,
        j.updated_at,
        COALESCE(e.company_name, c.name, 'Vakancy Client') AS company_name,
        e.website AS company_website,
        e.logo_url AS company_logo,
        e.industry AS company_industry,
        e.company_size,
        e.about AS company_about
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN CLIENT c ON j.client_id = c.id
      WHERE j.id = ?
    `;

    const jobs = await db.query(querySql, [req.params.id]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobs[0];

    const isStaff = req.user && ['recruiter', 'admin', 'director', 'tl_coordinator', 'bd_lead'].includes(req.user.role);

    // Strictly protect internal-only jobs from candidates, public, and employers
    if (job.is_internal_only && !isStaff) {
      return res.status(404).json({ success: false, message: 'Job not found or is no longer accepting applications.' });
    }

    // For public / guest / candidate, strictly restrict to 'open' or 'active' status
    if (!isStaff && job.status !== 'open' && job.status !== 'active') {
      // Explicitly allow employer to view ONLY if they own this draft job
      if (req.user && req.user.role === 'employer') {
        try {
          const emps = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [req.user.id]);
          if (emps.length === 0 || job.employer_id !== emps[0].id) {
            return res.status(404).json({ success: false, message: 'Job not found or is no longer accepting applications.' });
          }
        } catch (err) {
          return res.status(500).json({ success: false, message: 'Error verifying job ownership.' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Job not found or is no longer accepting applications.' });
      }
    }

    // Check if candidate user has applied
    let hasApplied = false;
    if (req.user && req.user.role === 'candidate') {
      try {
        const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
        if (cands.length > 0) {
          const apps = await db.query('SELECT id FROM APPLICATION WHERE job_id = ? AND candidate_id = ?', [job.id, cands[0].id]);
          hasApplied = apps.length > 0;
        }
      } catch (_) {}
    }


    // Relational locations
    let locationsList = [];
    if (job.location) {
      locationsList = [job.location];
    }
    try {
      const dbLocations = await db.query('SELECT location_text FROM JOB_LOCATION WHERE job_id = ? ORDER BY id ASC', [job.id]);
      if (dbLocations && dbLocations.length > 0) {
        locationsList = dbLocations.map(l => l.location_text);
      }
    } catch (_) {}

    // Relational benefits

    let benefitsList = [];
    try {
      const dbBenefits = await db.query('SELECT benefit_name FROM JOB_BENEFIT WHERE job_id = ? ORDER BY created_at ASC', [job.id]);
      if (dbBenefits && dbBenefits.length > 0) {
        benefitsList = dbBenefits.map(b => b.benefit_name);
      }
    } catch (_) {}

    if (benefitsList.length === 0 && job.benefits) {
      benefitsList = parseSkills(job.benefits);
    }

    // Relational skills
    let skillsList = parseSkills(job.required_skills);
    try {
      const dbSkills = await db.query('SELECT skill_name FROM JOB_SKILL WHERE job_id = ? ORDER BY id ASC', [job.id]);
      if (dbSkills && dbSkills.length > 0) {
        const extraSkills = dbSkills.map(s => s.skill_name);
        skillsList = Array.from(new Set([...skillsList, ...extraSkills]));
      }
    } catch (_) {}

    const salRange = formatSalaryRange(job.min_salary, job.max_salary, job.currency, job.salary_period);
    const expStr = formatExperience(job.min_experience, job.max_experience, job.fresher_allowed);
    const postedAgoStr = formatPostedAgo(job.created_at);

    // Format responsibilities list
    let responsibilitiesList = [];
    if (job.responsibilities) {
      try {
        const parsed = JSON.parse(job.responsibilities);
        if (Array.isArray(parsed)) {
          responsibilitiesList = parsed.map(item => {
            if (typeof item === 'string') return { title: item, desc: '' };
            return { title: item.title || item.task || '', desc: item.desc || item.description || '' };
          });
        }
      } catch (_) {}
      if (responsibilitiesList.length === 0) {
        responsibilitiesList = String(job.responsibilities)
          .split('\n')
          .map(line => line.replace(/^[-*•0-9.)\s]+/, '').trim())
          .filter(Boolean)
          .map(title => ({ title, desc: '' }));
      }
    }

    // Format requirements / qualifications list
    let requirementsList = [];
    if (job.requirements) {
      try {
        const parsed = JSON.parse(job.requirements);
        if (Array.isArray(parsed)) {
          requirementsList = parsed.map(item => {
            if (typeof item === 'string') return { category: 'Requirement', desc: item };
            return { category: item.category || 'Requirement', desc: item.desc || item.description || '' };
          });
        }
      } catch (_) {}
      if (requirementsList.length === 0) {
        requirementsList = String(job.requirements)
          .split('\n')
          .map(line => line.replace(/^[-*•0-9.)\s]+/, '').trim())
          .filter(Boolean)
          .map(desc => ({ category: 'Key Qualification', desc }));
      }
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        company: job.company_name,
        company_name: job.company_name,
        company_website: job.company_website || null,
        company_logo: job.company_logo || null,
        company_industry: job.company_industry || job.department || 'Technology',
        company_size: job.company_size || null,
        company_about: job.company_about || null,
        locations: locationsList,
        location: job.location,
        city: job.city || '',
        state: job.state || '',
        country: job.country || 'India',
        locality: job.locality || '',
        workplaceType: job.workplace_type || 'On-site',
        workMode: job.workplace_type || 'On-site',
        employmentType: job.employment_type || 'Full Time',
        employment_type: job.employment_type || 'Full Time',
        seniority_level: job.seniority_level || 'Mid Level',
        experience: expStr,
        min_experience: job.min_experience,
        max_experience: job.max_experience,
        fresher_allowed: job.fresher_allowed,
        salaryRange: salRange,
        min_salary: job.min_salary,
        max_salary: job.max_salary,
        currency: job.currency,
        salary_period: job.salary_period,
        salary_type: job.salary_type,
        skills: skillsList,
        stackTokens: skillsList,
        benefits: benefitsList,
        perks: benefitsList.map(b => (typeof b === 'string' ? { title: b, desc: 'Company offered benefit' } : b)),
        description: job.description || '',
        responsibilities: responsibilitiesList,
        requirements: requirementsList,
        qualifications: requirementsList,
        department: job.department || 'General',
        job_domain: job.job_domain || 'General',
        openings_count: job.openings_count || 1,
        vacancies: job.openings_count ? `${job.openings_count} Openings` : '1 Opening',
        status: job.status,
        created_by_type: job.created_by_type,
        source_type: job.source_type,
        is_recommended: Boolean(
          job.priority === 'recommended' ||
          (job.priority !== 'not_recommended' && (
            job.created_by_type === 'INTERNAL_STAFF' ||
            job.source_type === 'Vakancy Recruitment' ||
            job.source_type === 'EXECUTIVE_SEARCH'
          ))
        ),
        recommendation_badge: (
          job.priority === 'recommended' ||
          (job.priority !== 'not_recommended' && (
            job.created_by_type === 'INTERNAL_STAFF' ||
            job.source_type === 'Vakancy Recruitment' ||
            job.source_type === 'EXECUTIVE_SEARCH'
          ))
        ) ? 'Vakancy.in Recommended' : null,
        badge: (
          job.priority === 'recommended' ||
          (job.priority !== 'not_recommended' && (
            job.created_by_type === 'INTERNAL_STAFF' ||
            job.source_type === 'Vakancy Recruitment' ||
            job.source_type === 'EXECUTIVE_SEARCH'
          ))
        ) ? 'Vakancy.in Recommended' : null,
        badgeType: (
          job.priority === 'recommended' ||
          (job.priority !== 'not_recommended' && (
            job.created_by_type === 'INTERNAL_STAFF' ||
            job.source_type === 'Vakancy Recruitment' ||
            job.source_type === 'EXECUTIVE_SEARCH'
          ))
        ) ? 'growth' : null,
        application_deadline: job.application_deadline || null,
        postedAgo: postedAgoStr,
        created_at: job.created_at,
        has_applied: hasApplied,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching job details.', error: error.message });
  }
};

// Post / Create Job
const createJob = async (req, res) => {
  try {
    const { title, description, location, client_id, status } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ success: false, message: 'Title, description, and location are required.' });
    }

    let employerId = null;
    if (req.user.role === 'employer') {
      const emps = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [req.user.id]);
      if (emps.length === 0) return res.status(404).json({ success: false, message: 'Employer profile not found.' });
      employerId = emps[0].id;
    }

    const id = uuidv4();
    const jobStatus = status || 'open';

    await db.query(
      'INSERT INTO JOB (id, employer_id, client_id, title, description, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, employerId, client_id || null, title, description, location, jobStatus]
    );

    res.status(201).json({ success: true, message: 'Job created successfully.', job_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating job.', error: error.message });
  }
};

// Update Job
const updateJob = async (req, res) => {
  try {
    const { title, description, location, status, client_id } = req.body;
    const jobId = req.params.id;

    await db.query(
      'UPDATE JOB SET title = ?, description = ?, location = ?, status = ?, client_id = ? WHERE id = ?',
      [title, description, location, status || 'open', client_id || null, jobId]
    );

    res.json({ success: true, message: 'Job updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating job.', error: error.message });
  }
};

// Delete Job
const deleteJob = async (req, res) => {
  try {
    await db.query('DELETE FROM JOB WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Job deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting job.', error: error.message });
  }
};

// Autocomplete Keyword Suggestions (Roles / Skills / Keywords / Categories)
// Only queries eligible public open published jobs and standard masters
const getKeywordSuggestions = async (req, res) => {
  try {
    const rawQ = req.query.q || req.query.search || '';
    const q = rawQ.trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const likeTerm = `%${q}%`;
    const titlesPromise = db.query(
      `SELECT DISTINCT title FROM JOB 
       WHERE (status = 'open' OR status = 'active') 
         AND (is_internal_only IS NULL OR is_internal_only = 0) 
         AND title LIKE ? 
       ORDER BY title ASC LIMIT 6`,
      [likeTerm]
    );

    const skillsPromise = db.query(
      `SELECT DISTINCT name FROM SKILL WHERE name LIKE ? ORDER BY name ASC LIMIT 6`,
      [likeTerm]
    ).catch(() => []);

    const catsPromise = db.query(
      `SELECT DISTINCT name FROM JOB_CATEGORY WHERE name LIKE ? ORDER BY name ASC LIMIT 4`,
      [likeTerm]
    ).catch(() => []);

    const [titles, skills, cats] = await Promise.all([titlesPromise, skillsPromise, catsPromise]);

    const seen = new Set();
    const suggestions = [];

    const addSuggestion = (text, type) => {
      if (!text) return;
      const clean = text.trim();
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && suggestions.length < 8) {
        seen.add(lower);
        suggestions.push({ text: clean, type });
      }
    };

    // Priority: Job Titles first, then Skills, then Categories
    (titles || []).forEach(t => addSuggestion(t.title, 'role'));
    (skills || []).forEach(s => addSuggestion(s.name, 'skill'));
    (cats || []).forEach(c => addSuggestion(c.name, 'category'));

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('getKeywordSuggestions error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving suggestions.', error: error.message });
  }
};

// Autocomplete Location Suggestions
// Only queries eligible public open published jobs and standard masters
const getLocationSuggestions = async (req, res) => {
  try {
    const rawQ = req.query.q || req.query.location || '';
    const q = rawQ.trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const likeTerm = `%${q}%`;
    const lowerQ = q.toLowerCase();

    // Query open jobs locations
    const jobLocsPromise = db.query(
      `SELECT DISTINCT city, state, location FROM JOB 
       WHERE (status = 'open' OR status = 'active') 
         AND (is_internal_only IS NULL OR is_internal_only = 0)
         AND (city LIKE ? OR state LIKE ? OR location LIKE ?)
       LIMIT 10`,
      [likeTerm, likeTerm, likeTerm]
    );

    const cityMasterPromise = db.query(
      `SELECT DISTINCT name FROM CITY WHERE name LIKE ? ORDER BY name ASC LIMIT 6`,
      [likeTerm]
    ).catch(() => []);

    const [jobLocs, cityMaster] = await Promise.all([jobLocsPromise, cityMasterPromise]);

    const seen = new Set();
    const suggestions = [];

    const addSuggestion = (text) => {
      if (!text) return;
      const clean = text.trim().replace(/^,+|,+$/g, '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && suggestions.length < 8) {
        seen.add(lower);
        suggestions.push(clean);
      }
    };

    // If query matches remote
    if ('remote'.includes(lowerQ) || 'work from home'.includes(lowerQ)) {
      addSuggestion('Remote');
    }

    // Add city & state from jobs
    (jobLocs || []).forEach(loc => {
      if (loc.city && loc.city.toLowerCase().includes(lowerQ)) {
        addSuggestion(loc.state ? `${loc.city}, ${loc.state}` : loc.city);
      }
      if (loc.location) {
        const parts = loc.location.split(';').map(p => p.trim());
        parts.forEach(part => {
          if (part.toLowerCase().includes(lowerQ)) {
            addSuggestion(part);
          }
        });
      }
    });

    // Add from city master
    (cityMaster || []).forEach(c => addSuggestion(c.name));

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('getLocationSuggestions error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving location suggestions.', error: error.message });
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getKeywordSuggestions,
  getLocationSuggestions,
  DEPARTMENT_CATEGORY_MAP
};

