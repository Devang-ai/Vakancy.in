// Master Data Controller for Vakancy.in
// Serves reusable master data for Employer Profile Setup and Job Posting

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { LOCATION_HIERARCHY } = require('../database/locationData');
const locationCountries = require('../config/locationCountries');
const { relationalSeed, resolveCanonicalCountryName } = require('../database/seedLocationData');

// Helper to sanitize text fields
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/<[^>]*>/g, '');
};

// 1. Predefined 51 Industries Master List (Canonical & Normalized)
const INDUSTRIES_MASTER = [
  'Agriculture & Agribusiness',
  'Automotive',
  'Banking & Financial Services',
  'Construction',
  'Consumer Goods & FMCG',
  'Education',
  'Energy & Power',
  'Engineering',
  'Healthcare & Pharmaceuticals',
  'Hospitality & Tourism',
  'Information Technology',
  'Manufacturing',
  'Mining & Metals',
  'Oil & Gas',
  'Real Estate',
  'Retail & E-commerce',
  'Telecommunications',
  'Logistics & Transportation',
  'Food & Beverage',
  'FMCG',
  'Chemicals & Petrochemicals',
  'Textiles & Apparel',
  'Electronics & Electrical',
  'Security Services',
  'Human Resources & Recruitment',
  'Media & Entertainment',
  'Government & Public Sector',
  'Marine & Shipping',
  'Aviation',
  'Renewable Energy',
  'Consulting & Professional Services',
  'Telecommunications & Networking',
  'Warehousing & Supply Chain',
  'Insurance',
  'Legal Services',
  'Beauty & Personal Care',
  'Facilities Management',
  'Hospitality & Catering',
  'Printing & Packaging',
  'Plastics & Rubber',
  'Cement & Building Materials',
  'Steel & Metal Fabrication',
  'Pharmaceuticals & Medical Devices',
  'Fisheries & Aquaculture',
  'Forestry & Timber',
  'Telecommunications Infrastructure',
  'Water & Waste Management',
  'Travel & Aviation',
  'Security & Defence',
  'Oilfield & Industrial Services',
  'Other'
];

// 2. Predefined Company Types Master
const COMPANY_TYPES_MASTER = [
  'Private Limited Company (Pvt Ltd)',
  'Public Limited Company (PLC)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Limited Liability Partnership (LLP)',
  'Multinational Corporation (MNC)',
  'Startup / Early Stage',
  'Non-Profit / NGO',
  'Government / Public Sector Unit',
  'Educational Institution',
  'Healthcare / Hospital Organization',
  'Joint Venture',
  'Other'
];

// 3. Predefined Employee Size Ranges
const COMPANY_SIZE_RANGES = [
  '1–10',
  '11–50',
  '51–200',
  '201–500',
  '501–1,000',
  '1,001–5,000',
  '5,001–10,000',
  '10,001+'
];

// 4. Predefined Department Master List
const DEPARTMENTS_MASTER = [
  'Engineering',
  'Technology',
  'Software Development',
  'IT',
  'Information Technology',
  'Human Resources',
  'Recruitment',
  'Talent Acquisition',
  'Marketing',
  'Digital Marketing',
  'Sales',
  'Business Development',
  'Finance',
  'Accounting',
  'Operations',
  'Administration',
  'Customer Support',
  'Customer Success',
  'Product',
  'Product Management',
  'Project Management',
  'Program Management',
  'Design',
  'UI/UX',
  'Research & Development',
  'Data',
  'Data Science',
  'Artificial Intelligence',
  'Machine Learning',
  'Cyber Security',
  'Quality Assurance',
  'Legal',
  'Compliance',
  'Procurement',
  'Supply Chain',
  'Logistics',
  'Manufacturing',
  'Production',
  'Engineering & Maintenance',
  'Healthcare',
  'Medical',
  'Pharmaceuticals',
  'Hospitality',
  'Hotel Operations',
  'Travel & Tourism',
  'Retail',
  'E-commerce',
  'Construction',
  'Real Estate',
  'Facilities Management',
  'Security',
  'Media',
  'Content',
  'Public Relations',
  'Corporate Communications',
  'Other'
];

// 5. Predefined Job Categories Master List
const JOB_CATEGORIES_MASTER = [
  'Software Development',
  'Web Development',
  'Mobile App Development',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'DevOps',
  'Cloud & Infrastructure',
  'Data Science',
  'Artificial Intelligence',
  'Machine Learning',
  'Cyber Security',
  'Database Administration',
  'QA & Testing',
  'UI/UX Design',
  'Product Management',
  'Project Management',
  'HR / Recruitment',
  'Human Resources',
  'Talent Acquisition',
  'Recruitment',
  'Payroll',
  'Learning & Development',
  'Digital Marketing',
  'Marketing',
  'SEO',
  'SEM',
  'Social Media Marketing',
  'Content Marketing',
  'Brand Marketing',
  'Performance Marketing',
  'Sales',
  'Business Development',
  'Inside Sales',
  'Field Sales',
  'Account Management',
  'Customer Success',
  'Finance',
  'Accounting',
  'Audit',
  'Taxation',
  'Investment Banking',
  'Financial Analysis',
  'Operations',
  'Administration',
  'Customer Support',
  'Customer Service',
  'Procurement',
  'Supply Chain',
  'Logistics',
  'Manufacturing',
  'Production',
  'Quality Control',
  'Maintenance',
  'Healthcare',
  'Medical',
  'Pharmaceutical',
  'Nursing',
  'Clinical Research',
  'Education',
  'Teaching',
  'Training',
  'Academic Operations',
  'Hospitality',
  'Hotel Management',
  'Food & Beverage',
  'Travel & Tourism',
  'Construction',
  'Architecture',
  'Civil Engineering',
  'Real Estate',
  'Legal',
  'Compliance',
  'Corporate Legal',
  'Media',
  'Content',
  'Journalism',
  'Public Relations',
  'Other'
];

// 6. Regional Location Data: Africa (54), Middle East (17), Southeast Asia (13), India (States & Cities)
const AFRICA_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon',
  'Central African Republic', 'Chad', 'Comoros', 'Democratic Republic of the Congo', 'Republic of the Congo',
  'Côte d’Ivoire', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon',
  'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
  'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa',
  'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
];

const MIDDLE_EAST_COUNTRIES = [
  'Bahrain', 'Cyprus', 'Egypt', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Oman',
  'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Türkiye', 'United Arab Emirates', 'Yemen'
];

const SOUTHEAST_ASIA_COUNTRIES = [
  'Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore',
  'Thailand', 'Timor-Leste', 'Vietnam', 'Fiji', 'PNG'
];

const INDIA_STATES_CITIES = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Nellore', 'Anantapur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Anand'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davangere', 'Shivamogga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Kottayam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Solapur', 'Navi Mumbai'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali (SAS Nagar)', 'Bathinda'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bhilwara'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Noida', 'Greater Noida', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Ghaziabad', 'Meerut'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Kharagpur'],
  'Delhi NCR': ['New Delhi', 'Delhi', 'Gurugram', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad'],
  'Chandigarh': ['Chandigarh'],
  'Puducherry': ['Puducherry', 'Karaikal']
};

// Default Predefined Master Benefits
const DEFAULT_BENEFITS = [
  'Health Insurance',
  'Paid Leave',
  'Performance Bonus',
  'Work From Home',
  'Flexible Hours',
  'Provident Fund',
  'Travel Allowance',
  'Meal Allowance',
  'ESOPs / Equity',
  'Life Insurance',
  'Parental Leave',
  'Wellness & Therapy Support',
  'Learning & Development Allowance'
];

// Controller functions

const getIndustries = async (req, res) => {
  res.json({
    success: true,
    count: INDUSTRIES_MASTER.length,
    industries: INDUSTRIES_MASTER
  });
};

const getCompanyTypes = async (req, res) => {
  res.json({
    success: true,
    company_types: COMPANY_TYPES_MASTER
  });
};

const getCompanySizes = async (req, res) => {
  res.json({
    success: true,
    company_sizes: COMPANY_SIZE_RANGES
  });
};

const getDepartments = async (req, res) => {
  res.json({
    success: true,
    departments: DEPARTMENTS_MASTER
  });
};

const getJobCategories = async (req, res) => {
  try {
    const search = (req.query.search || req.query.query || req.query.q || '').trim();
    let dbCategories = [];

    try {
      if (search) {
        const searchTerm = `%${search}%`;
        dbCategories = await db.query(
          'SELECT id, name, slug, description FROM JOB_CATEGORY WHERE is_active = 1 AND name LIKE ? ORDER BY name ASC LIMIT 50',
          [searchTerm]
        );
      } else {
        dbCategories = await db.query(
          'SELECT id, name, slug, description FROM JOB_CATEGORY WHERE is_active = 1 ORDER BY name ASC LIMIT 100'
        );
      }
    } catch (_) {
      dbCategories = [];
    }

    // Predefined Canonical Master Categories List
    const defaultMasterCategories = [
      { id: 'cat00000-0000-0000-0000-000000000001', name: 'Software Engineering', slug: 'software-engineering' },
      { id: 'cat-software-dev', name: 'Software Development', slug: 'software-development' },
      { id: 'cat-software-qa', name: 'Software Testing / QA', slug: 'software-testing-qa' },
      { id: 'cat-social-media', name: 'Social Media', slug: 'social-media' },
      { id: 'cat-web-dev', name: 'Web Development', slug: 'web-development' },
      { id: 'cat-mobile-dev', name: 'Mobile App Development', slug: 'mobile-app-development' },
      { id: 'cat-frontend-dev', name: 'Frontend Development', slug: 'frontend-development' },
      { id: 'cat-backend-dev', name: 'Backend Development', slug: 'backend-development' },
      { id: 'cat-fullstack-dev', name: 'Full Stack Development', slug: 'full-stack-development' },
      { id: 'cat-devops', name: 'DevOps & Infrastructure', slug: 'devops-infrastructure' },
      { id: 'cat-cloud-infra', name: 'Cloud & Infrastructure', slug: 'cloud-infrastructure' },
      { id: 'cat00000-0000-0000-0000-000000000002', name: 'Data Science & AI', slug: 'data-science-ai' },
      { id: 'cat-data-analytics', name: 'Data Science & Analytics', slug: 'data-science-analytics' },
      { id: 'cat-ai-ml', name: 'Artificial Intelligence / ML', slug: 'artificial-intelligence-ml' },
      { id: 'cat-cyber-security', name: 'Cyber Security', slug: 'cyber-security' },
      { id: 'cat-database-admin', name: 'Database Administration', slug: 'database-administration' },
      { id: 'cat00000-0000-0000-0000-000000000003', name: 'Product & Design', slug: 'product-design' },
      { id: 'cat-ui-ux-design', name: 'UI/UX Design', slug: 'ui-ux-design' },
      { id: 'cat-product-mgmt', name: 'Product Management', slug: 'product-management' },
      { id: 'cat-project-mgmt', name: 'Project Management', slug: 'project-management' },
      { id: 'cat-human-resources', name: 'Human Resources', slug: 'human-resources' },
      { id: 'cat-recruitment', name: 'Recruitment & Talent Acquisition', slug: 'recruitment-talent-acquisition' },
      { id: 'cat-payroll-benefits', name: 'Payroll & HR Compliance', slug: 'payroll-hr-compliance' },
      { id: 'cat00000-0000-0000-0000-000000000004', name: 'Sales & Marketing', slug: 'sales-marketing' },
      { id: 'cat-digital-marketing', name: 'Digital Marketing', slug: 'digital-marketing' },
      { id: 'cat-seo-sem', name: 'SEO & Performance Marketing', slug: 'seo-performance-marketing' },
      { id: 'cat-content-marketing', name: 'Content Strategy & Writing', slug: 'content-strategy-writing' },
      { id: 'cat-sales-bdev', name: 'Sales & Business Development', slug: 'sales-business-development' },
      { id: 'cat-enterprise-sales', name: 'Enterprise B2B Sales', slug: 'enterprise-b2b-sales' },
      { id: 'cat-account-mgmt', name: 'Account Management', slug: 'account-management' },
      { id: 'cat-customer-support', name: 'Customer Support & Service', slug: 'customer-support-service' },
      { id: 'cat-customer-success', name: 'Customer Success', slug: 'customer-success' },
      { id: 'cat00000-0000-0000-0000-000000000005', name: 'Finance & Accounting', slug: 'finance-accounting' },
      { id: 'cat-statutory-audit', name: 'Statutory Audit & Taxation', slug: 'statutory-audit-taxation' },
      { id: 'cat-investment-banking', name: 'Investment Banking', slug: 'investment-banking' },
      { id: 'cat-operations-logistics', name: 'Operations & Logistics', slug: 'operations-logistics' },
      { id: 'cat-procurement-supply', name: 'Procurement & Supply Chain', slug: 'procurement-supply-chain' },
      { id: 'cat-manufacturing', name: 'Manufacturing & Production', slug: 'manufacturing-production' },
      { id: 'cat-quality-control', name: 'Quality Control & Maintenance', slug: 'quality-control-maintenance' },
      { id: 'cat-healthcare-medical', name: 'Healthcare & Medical', slug: 'healthcare-medical' },
      { id: 'cat-nursing-clinical', name: 'Nursing & Clinical Support', slug: 'nursing-clinical-support' },
      { id: 'cat-pharmaceuticals', name: 'Pharmaceuticals & Life Sciences', slug: 'pharmaceuticals-life-sciences' },
      { id: 'cat-education-training', name: 'Education & Academics', slug: 'education-academics' },
      { id: 'cat-teaching-pedagogy', name: 'Teaching & Pedagogy', slug: 'teaching-pedagogy' },
      { id: 'cat-hospitality-tourism', name: 'Hospitality & Tourism', slug: 'hospitality-tourism' },
      { id: 'cat-construction-eng', name: 'Construction & Civil Engineering', slug: 'construction-civil-engineering' },
      { id: 'cat-legal-compliance', name: 'Legal & Corporate Compliance', slug: 'legal-corporate-compliance' },
      { id: 'cat-media-comm', name: 'Media & Public Relations', slug: 'media-public-relations' },
      { id: 'cat-general-mgmt', name: 'General Management', slug: 'general-management' }
    ];

    const combinedMap = new Map();

    dbCategories.forEach((cat) => {
      combinedMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });
    });

    defaultMasterCategories.forEach((cat) => {
      const existingByName = Array.from(combinedMap.values()).find(
        (c) => c.name.toLowerCase() === cat.name.toLowerCase()
      );
      if (!existingByName) {
        combinedMap.set(cat.id, cat);
      }
    });

    let allCategories = Array.from(combinedMap.values());

    if (search) {
      const lowerSearch = search.toLowerCase();
      const startsWithMatches = [];
      const containsMatches = [];

      allCategories.forEach((cat) => {
        const lowerName = cat.name.toLowerCase();
        if (lowerName.startsWith(lowerSearch)) {
          startsWithMatches.push(cat);
        } else if (lowerName.includes(lowerSearch)) {
          containsMatches.push(cat);
        }
      });

      allCategories = [...startsWithMatches, ...containsMatches];
    }

    res.json({
      success: true,
      count: allCategories.length,
      categories: allCategories
    });
  } catch (error) {
    console.error('Error fetching job categories:', error);
    res.status(500).json({ success: false, message: 'Error fetching job categories.' });
  }
};

const getLocationsHierarchy = async (req, res) => {
  res.json({
    success: true,
    canonical_countries: locationCountries,
    hierarchy: LOCATION_HIERARCHY
  });
};

const getCountries = async (req, res) => {
  try {
    const search = (req.query.search || req.query.q || '').trim().toLowerCase();
    let countries = [];

    try {
      if (search) {
        countries = await db.query('SELECT id, name, iso_code, iso3_code FROM COUNTRY WHERE status = 1 AND LOWER(name) LIKE ? ORDER BY name ASC', [`%${search}%`]);
      } else {
        countries = await db.query('SELECT id, name, iso_code, iso3_code FROM COUNTRY WHERE status = 1 ORDER BY name ASC');
      }
    } catch (_) {
      countries = [];
    }

    if (!countries || countries.length === 0) {
      countries = relationalSeed.countries.map(c => ({ id: c.id, name: c.name, iso_code: c.iso_code, iso3_code: c.iso3_code }));
      if (search) {
        countries = countries.filter(c => c.name.toLowerCase().includes(search));
      }
    }

    res.json({
      success: true,
      count: countries.length,
      countries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching countries.' });
  }
};

const getStates = async (req, res) => {
  try {
    const countryInput = (req.query.country_id || req.query.country || '').trim();
    const search = (req.query.search || req.query.q || '').trim().toLowerCase();

    if (!countryInput) {
      return res.status(400).json({ success: false, message: 'country_id or country parameter is required to fetch states.' });
    }

    const canonicalCountry = resolveCanonicalCountryName(countryInput);
    let matchedCountryObj = null;

    try {
      const dbCountries = await db.query('SELECT * FROM COUNTRY WHERE id = ? OR LOWER(name) = LOWER(?)', [countryInput, canonicalCountry]);
      if (dbCountries && dbCountries.length > 0) matchedCountryObj = dbCountries[0];
    } catch (_) {}

    if (!matchedCountryObj) {
      matchedCountryObj = relationalSeed.countries.find(c => c.id === countryInput || c.name.toLowerCase() === canonicalCountry.toLowerCase());
    }

    const countryId = matchedCountryObj ? matchedCountryObj.id : countryInput;
    const countryName = matchedCountryObj ? matchedCountryObj.name : canonicalCountry;

    let states = [];
    try {
      if (search) {
        states = await db.query('SELECT id, country_id, name, type, code FROM STATE_REGION WHERE country_id = ? AND status = 1 AND LOWER(name) LIKE ? ORDER BY name ASC', [countryId, `%${search}%`]);
      } else {
        states = await db.query('SELECT id, country_id, name, type, code FROM STATE_REGION WHERE country_id = ? AND status = 1 ORDER BY name ASC', [countryId]);
      }
    } catch (_) {
      states = [];
    }

    if (!states || states.length === 0) {
      states = relationalSeed.states
        .filter(s => s.country_id === countryId || s.country_name.toLowerCase() === countryName.toLowerCase())
        .map(s => ({ id: s.id, country_id: s.country_id, name: s.name, type: s.type, code: s.code }));
      if (search) {
        states = states.filter(s => s.name.toLowerCase().includes(search));
      }
    }

    res.json({
      success: true,
      country_id: countryId,
      country: countryName,
      count: states.length,
      states
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching states.' });
  }
};

const getCities = async (req, res) => {
  try {
    const stateInput = (req.query.state_region_id || req.query.state_id || req.query.state || '').trim();
    const countryInput = (req.query.country_id || req.query.country || '').trim();
    const search = (req.query.search || req.query.q || '').trim().toLowerCase();

    if (!stateInput && !countryInput) {
      return res.status(400).json({ success: false, message: 'state_region_id or state parameter is required to fetch cities.' });
    }

    let matchedStateObj = null;
    try {
      const dbStates = await db.query('SELECT * FROM STATE_REGION WHERE id = ? OR LOWER(name) = LOWER(?)', [stateInput, stateInput]);
      if (dbStates && dbStates.length > 0) matchedStateObj = dbStates[0];
    } catch (_) {}

    if (!matchedStateObj) {
      matchedStateObj = relationalSeed.states.find(s => s.id === stateInput || s.name.toLowerCase() === stateInput.toLowerCase());
    }

    const stateId = matchedStateObj ? matchedStateObj.id : stateInput;
    const stateName = matchedStateObj ? matchedStateObj.name : stateInput;

    let cities = [];
    try {
      if (search) {
        cities = await db.query('SELECT id, country_id, state_region_id, name FROM CITY WHERE state_region_id = ? AND status = 1 AND LOWER(name) LIKE ? ORDER BY name ASC', [stateId, `%${search}%`]);
      } else {
        cities = await db.query('SELECT id, country_id, state_region_id, name FROM CITY WHERE state_region_id = ? AND status = 1 ORDER BY name ASC', [stateId]);
      }
    } catch (_) {
      cities = [];
    }

    if (!cities || cities.length === 0) {
      cities = relationalSeed.cities
        .filter(c => c.state_region_id === stateId || c.state_name.toLowerCase() === stateName.toLowerCase())
        .map(c => ({ id: c.id, country_id: c.country_id, state_region_id: c.state_region_id, name: c.name }));
      if (search) {
        cities = cities.filter(c => c.name.toLowerCase().includes(search));
      }
    }

    res.json({
      success: true,
      state_region_id: stateId,
      state: stateName,
      count: cities.length,
      cities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cities.' });
  }
};

const validateLocationHierarchy = (country, state, city) => {
  if (!country) return { valid: false, message: 'Country is required.' };
  const canonicalCountry = resolveCanonicalCountryName(country);
  const matchedCountry = relationalSeed.countries.find(c => c.name.toLowerCase() === canonicalCountry.toLowerCase() || c.id === country);
  if (!matchedCountry) {
    return { valid: false, message: `Invalid country '${country}'.` };
  }

  if (state && state.trim()) {
    const matchedState = relationalSeed.states.find(s =>
      (s.country_id === matchedCountry.id || s.country_name.toLowerCase() === matchedCountry.name.toLowerCase()) &&
      (s.name.toLowerCase() === state.trim().toLowerCase() || s.id === state.trim())
    );
    if (!matchedState) {
      return { valid: false, message: `State '${state}' does not belong to country '${matchedCountry.name}'.` };
    }
  }

  return { valid: true };
};

// Search or fetch master skills
const getSkills = async (req, res) => {
  try {
    const searchParam = (req.query.search || req.query.query || req.query.q || '').trim();
    let skills = [];

    try {
      if (searchParam) {
        const searchTerm = `%${searchParam}%`;
        skills = await db.query('SELECT * FROM SKILL WHERE name LIKE ? ORDER BY name ASC LIMIT 100', [searchTerm]);
      } else {
        skills = await db.query('SELECT * FROM SKILL ORDER BY name ASC LIMIT 200');
      }
    } catch (_) {
      skills = [];
    }

    const defaultSkills = [
      // Basic & Everyday Computer Skills (Hands-on, Office & Admin)
      'MS Excel', 'Excel', 'Advanced Excel', 'VLOOKUP & Pivot Tables', 'Basic Computer Knowledge',
      'Hands-on Computer', 'Computer Basics', 'Computer Operating', 'Computer Fundamentals',
      'MS Office', 'Microsoft Office', 'MS Word', 'Microsoft Word', 'MS PowerPoint', 'PowerPoint',
      'Google Sheets', 'Google Docs', 'Google Slides', 'Google Workspace', 'Spreadsheets',
      'Data Entry', 'Data Entry Operations', 'Fast Typing', 'Typing', 'English Typing', 'Hindi Typing',
      'Internet Browsing', 'Web Research', 'Email Writing', 'Email Communication', 'Email Drafting',
      'Outlook', 'Microsoft Teams', 'Zoom', 'Google Meet', 'File Management', 'Document Verification',
      'Back Office Operations', 'Front Office Management', 'Receptionist', 'Office Administration',
      'Filing & Documentation', 'Computer Troubleshooting', 'Desktop Support',

      // Customer Support, BPO & Telecalling
      'Telecalling', 'Customer Support', 'Customer Service', 'Inbound Calling', 'Outbound Calling',
      'Cold Calling', 'Voice Process', 'Non-Voice Process', 'Chat Support', 'Email Support',
      'Helpdesk Support', 'Technical Support', 'Client Servicing', 'Grievance Handling', 'Call Center Operations',
      'BPO Operations', 'KPO Operations', 'Customer Relationship Management (CRM)',

      // Sales, Retail & Business Development
      'Sales', 'Field Sales', 'Counter Sales', 'Direct Sales', 'Retail Sales', 'B2B Sales', 'B2C Sales',
      'Lead Generation', 'Inside Sales', 'Business Development', 'Store Operations', 'Cash Handling',
      'POS Operations', 'Billing & Invoicing', 'Billing', 'Invoicing', 'Retail Operations',
      'Salesforce', 'HubSpot', 'Zoho CRM', 'Client Relationship', 'Negotiation', 'Closing Deals',
      'Merchant Onboarding', 'Channel Sales', 'Key Account Management',

      // Accounting, Finance & Banking
      'Finance', 'Accounting', 'Bookkeeping', 'Tally', 'Tally ERP 9', 'Tally Prime', 'GST',
      'GST Compliance', 'GST Filing', 'TDS', 'Income Tax Filing', 'Accounts Payable',
      'Accounts Receivable', 'Bank Reconciliation', 'Petty Cash Management', 'Payroll Processing',
      'Financial Analysis', 'Auditing', 'Internal Audit', 'Statutory Audit', 'SAP FICO', 'Taxation',
      'Balance Sheet Finalization', 'Cost Accounting', 'Financial Modeling', 'Corporate Finance',

      // Soft Skills & Communication
      'Communication Skills', 'Good Communication', 'English Communication', 'Spoken English',
      'Hindi Communication', 'Verbal Communication', 'Written Communication', 'Interpersonal Skills',
      'Teamwork', 'Team Player', 'Leadership', 'Multitasking', 'Active Listening', 'Public Speaking',
      'Time Management', 'Problem Solving', 'Conflict Resolution', 'Decision Making',

      // HR, Recruitment & Administration
      'Human Resources (HR)', 'Recruitment', 'Talent Acquisition', 'Sourcing', 'Screening Candidates',
      'Technical Sourcing', 'HR Operations', 'HR Payroll', 'Statutory Compliance', 'Employee Engagement',
      'Employee Relations', 'Onboarding', 'Labor Laws', 'Executive Assistant', 'Personal Assistant',
      'Team Management', 'Office Management', 'Performance Appraisal',

      // Operations, Logistics & Supply Chain
      'Operations Management', 'Supply Chain Management', 'Logistics', 'Procurement', 'Inventory Management',
      'Warehouse Management', 'Vendor Management', 'Vendor Negotiation', 'Dispatch Management',
      'Stock Verification', 'Fleet Management', 'Six Sigma', 'Quality Assurance (QA)', 'Quality Control (QC)',
      'Facility Management', 'E-commerce Operations',

      // Software Development & Web
      'React', 'React.js', 'React Native', 'Node.js', 'Express.js', 'Next.js', 'Vue.js', 'Angular',
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', '.NET', 'ASP.NET', 'PHP', 'Laravel',
      'Ruby', 'Ruby on Rails', 'Go', 'Rust', 'Swift', 'Kotlin', 'Flutter', 'Dart', 'HTML5', 'CSS3',
      'Tailwind CSS', 'Bootstrap', 'jQuery', 'Redux', 'REST API', 'GraphQL', 'Microservices', 'System Design',

      // Cloud, DevOps & Databases
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle DB', 'SQL Server', 'Firebase', 'Elasticsearch',
      'AWS', 'Microsoft Azure', 'Google Cloud Platform (GCP)', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins',
      'Terraform', 'Ansible', 'Git', 'GitHub', 'Linux', 'Bash Scripting', 'Nginx', 'Cyber Security',

      // Data Science, AI & Analytics
      'Data Analysis', 'Data Science', 'Machine Learning', 'Artificial Intelligence', 'Pandas', 'NumPy',
      'Scikit-learn', 'TensorFlow', 'PyTorch', 'Power BI', 'Tableau', 'Big Data',
      'Hadoop', 'Apache Spark', 'Business Intelligence',

      // Creative, Design & Media
      'Graphic Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'CorelDRAW', 'Canva',
      'Video Editing', 'Premiere Pro', 'After Effects', 'Social Media Management', 'Content Writing',
      'Copywriting', 'Content Strategy', 'Public Relations (PR)', 'UI/UX Design', 'User Research',

      // Marketing
      'Digital Marketing', 'SEO', 'SEM', 'Google Ads', 'Meta Ads', 'Social Media Marketing', 'Email Marketing',
      'Performance Marketing', 'Affiliate Marketing', 'Brand Management',

      // Healthcare & Life Sciences
      'Nursing', 'Patient Care', 'Clinical Operations', 'Medical Coding', 'Pharmacovigilance', 'Clinical Trials',
      'Hospital Administration', 'Pharmacy', 'First Aid', 'Patient Counseling',

      // Engineering & Construction
      'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'AutoCAD', 'Revit',
      'SolidWorks', 'Site Inspection', 'HVAC', 'Construction Management', 'Electrical Wiring',

      // Hospitality, Retail & Legal
      'Hotel Operations', 'Front Desk', 'Food & Beverage', 'Corporate Law', 'Legal Drafting', 'Contract Management'
    ];

    const dbSkillNames = skills.map((s) => s.name);
    // Combine and case-insensitively deduplicate while preserving title casing
    const seen = new Set();
    const combined = [];
    for (const item of [...dbSkillNames, ...defaultSkills]) {
      if (!item || typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(trimmed);
      }
    }

    if (searchParam) {
      const lower = searchParam.toLowerCase();

      const exactMatches = [];
      const startsWithMatches = [];
      const wordStartsWithMatches = [];
      const containsMatches = [];

      for (const skill of combined) {
        const sLower = skill.toLowerCase();

        if (sLower === lower) {
          exactMatches.push(skill);
        } else if (sLower.startsWith(lower)) {
          startsWithMatches.push(skill);
        } else {
          // Check if any sub-word begins with query (e.g. "MS Excel" or "Microsoft Excel" when searching "excel")
          const words = sLower.split(/[\s/(),.-]+/);
          if (words.some((w) => w.startsWith(lower))) {
            wordStartsWithMatches.push(skill);
          } else if (sLower.includes(lower)) {
            containsMatches.push(skill);
          }
        }
      }

      const sortFn = (a, b) => a.localeCompare(b);
      exactMatches.sort(sortFn);
      startsWithMatches.sort(sortFn);
      wordStartsWithMatches.sort(sortFn);
      containsMatches.sort(sortFn);

      const ranked = [
        ...exactMatches,
        ...startsWithMatches,
        ...wordStartsWithMatches,
        ...containsMatches
      ].slice(0, 40);

      return res.json({
        success: true,
        count: ranked.length,
        skills: ranked
      });
    }

    // Default top list when no search query is specified
    res.json({
      success: true,
      count: combined.length,
      skills: combined.slice(0, 80)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching skills.', error: error.message });
  }
};

// Create a new skill in Skills Master
const createSkill = async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    const cleanName = sanitizeText(name.trim());
    if (cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'Skill name exceeds maximum limit of 100 characters.' });
    }

    // Check if skill already exists (case insensitive check)
    let existing = [];
    try {
      existing = await db.query('SELECT * FROM SKILL WHERE LOWER(name) = LOWER(?)', [cleanName]);
    } catch (_) {}

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Skill already exists in Master catalog.',
        skill: existing[0]
      });
    }

    const id = uuidv4();
    try {
      await db.query('INSERT INTO SKILL (id, name, category, is_active) VALUES (?, ?, ?, TRUE)', [
        id,
        cleanName,
        category ? sanitizeText(category) : 'General'
      ]);
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Skill added to Master catalog successfully.',
      skill: { id, name: cleanName, category: category || 'General' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating skill.', error: error.message });
  }
};

// Get master benefits
const getBenefits = async (req, res) => {
  try {
    let dbBenefits = [];
    try {
      dbBenefits = await db.query('SELECT id, name, category FROM BENEFIT_MASTER WHERE is_active = 1 ORDER BY name ASC');
    } catch (_) {}

    const nameMap = new Map();
    // Seed standard benefits into map
    for (const b of DEFAULT_BENEFITS) {
      nameMap.set(b.toLowerCase(), { id: 'bm-' + b.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: b, category: 'Standard' });
    }
    // Overlay database records
    for (const row of dbBenefits) {
      nameMap.set(row.name.toLowerCase(), { id: row.id, name: row.name, category: row.category || 'General' });
    }

    const items = Array.from(nameMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const names = items.map(i => i.name);

    res.json({
      success: true,
      count: items.length,
      benefits: names,
      items: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching benefits.', error: error.message });
  }
};

// Create a new custom benefit in Benefits Master
const createBenefit = async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Benefit name is required.' });
    }

    const cleanName = sanitizeText(name.trim());
    if (cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'Benefit name exceeds maximum limit of 100 characters.' });
    }

    // Check if already in master case-insensitively
    let existing = [];
    try {
      existing = await db.query('SELECT * FROM BENEFIT_MASTER WHERE LOWER(name) = LOWER(?)', [cleanName]);
    } catch (_) {}

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Benefit already exists in Master catalog.',
        benefit: existing[0].name,
        item: existing[0]
      });
    }

    const id = uuidv4();
    const finalCategory = category ? sanitizeText(category) : 'Custom';
    try {
      await db.query('INSERT INTO BENEFIT_MASTER (id, name, category, is_active) VALUES (?, ?, ?, 1)', [id, cleanName, finalCategory]);
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Custom benefit added to Master catalog.',
      benefit: cleanName,
      item: { id, name: cleanName, category: finalCategory }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating benefit.', error: error.message });
  }
};

const getLanguages = async (req, res) => {
  try {
    const rows = await db.query('SELECT id, name FROM LANGUAGE WHERE is_active = 1 ORDER BY name ASC');
    res.json({ success: true, languages: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching languages', error: error.message });
  }
};

module.exports = {
  getLanguages,
  getIndustries,
  getCompanyTypes,
  getCompanySizes,
  getDepartments,
  getJobCategories,
  getLocationsHierarchy,
  getCountries,
  getStates,
  getCities,
  validateLocationHierarchy,
  getSkills,
  createSkill,
  getBenefits,
  createBenefit,
  AFRICA_COUNTRIES,
  MIDDLE_EAST_COUNTRIES,
  SOUTHEAST_ASIA_COUNTRIES,
  INDIA_STATES_CITIES
};
