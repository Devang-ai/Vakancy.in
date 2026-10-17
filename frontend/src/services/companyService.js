import api from './api';

/**
 * Company Service
 * Handles API calls for companies with Stitch-aligned fallback mock data.
 */
export const companyService = {
  // Get top hiring companies for landing page
  getFeaturedCompanies: async (limit = 7) => {
    try {
      const response = await api.get('/companies', {
        params: { featured: true, limit },
      });
      if (response.data && response.data.success && Array.isArray(response.data.companies)) {
        return response.data.companies.map(c => ({
           ...c,
           code: c.name.slice(0, 3).toUpperCase(),
           location: c.location || 'Headquarters',
           category: c.industry || 'technology'
        })).slice(0, limit);
      }
      return fallbackFeaturedCompanies.slice(0, limit);
    } catch (err) {
      console.warn('Backend API /companies unavailable, using Stitch fallback companies:', err.message);
      return fallbackFeaturedCompanies.slice(0, limit);
    }
  },

  // Get all companies with search/filters and pagination
  getCompanies: async (filters = {}) => {
    try {
      const response = await api.get('/companies', { params: filters });
      if (response.data && response.data.success && Array.isArray(response.data.companies)) {
        return {
          companies: response.data.companies.map(c => ({
            ...c,
            code: c.name.slice(0, 3).toUpperCase(),
            location: c.location || 'Headquarters',
            category: c.industry || 'technology'
          })),
          total: response.data.companies.length,
          page: 1,
          totalPages: 1
        };
      }
      throw new Error('Invalid response format');
    } catch (err) {
      console.warn('Backend API /companies unavailable, using fallback list:', err.message);

      let list = [...directoryCompanies];

      // Filter by search keyword (name, industry, location, tech stack)
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.industry.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            (c.techStack && c.techStack.some((t) => t.toLowerCase().includes(q)))
        );
      }

      // Filter by sector/category
      if (filters.category && filters.category !== 'all') {
        list = list.filter((c) => c.category === filters.category);
      }

      const page = parseInt(filters.page, 10) || 1;
      const limit = parseInt(filters.limit, 10) || 8;
      const total = list.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginated = list.slice(startIndex, startIndex + limit);

      return {
        companies: paginated,
        total,
        page,
        totalPages,
      };
    }
  },

  // Get company by ID (returns null if company does not exist)
  getCompanyById: async (id) => {
    try {
      const response = await api.get(`/companies/${id}`);
      if (response.data && response.data.success && response.data.company) {
        const c = response.data.company;
        const dossier = generateCompanyDossier({
          id: c.id,
          name: c.name,
          industry: c.industry,
          website: c.website,
          location: c.location || 'Headquarters',
          openJobsNum: c.openJobsNum
        });
        
        // Override featuredRoles with real jobs
        if (c.jobs && Array.isArray(c.jobs)) {
          dossier.featuredRoles = c.jobs.map(j => ({
            id: j.id,
            title: j.title,
            department: j.department || 'General',
            badge: 'Active Role',
            badgeColor: 'text-[#00288e] bg-blue-50',
            team: c.name,
            salary: (j.min_salary && j.max_salary) ? `₹${j.min_salary/100000}L - ₹${j.max_salary/100000}L` : 'Competitive',
            experience: 'Experience Required',
            location: j.location || dossier.location,
            tag: j.employment_type || 'Full Time',
            posted: 'Recently',
            applicants: 'Open'
          }));
        } else {
          dossier.featuredRoles = [];
        }
        
        return dossier;
      }
    } catch (err) {
      // Backend not available or route 404, check local catalog
    }

    if (!id) return null;
    const lookupKey = String(id).toLowerCase().trim();

    // Check pre-configured rich dossiers first
    if (companyDossiers[lookupKey]) {
      return companyDossiers[lookupKey];
    }

    // Check directory catalogue
    const base = directoryCompanies.find((c) => c.id.toLowerCase() === lookupKey);
    if (!base) {
      return null; // Return null so caller renders EmptyState for non-existent IDs
    }

    return generateCompanyDossier(base);
  },

  // Get primary spotlight dossier company (PhonePe from Stitch Screen ID: ecc9262975f24a68a6069c9bb2b33fce)
  getSpotlightCompany: async () => {
    return phonepeSpotlightData;
  },
};

// Rich company directory dataset aligned with Google Stitch "Vakancy.in - Company Profile"
export const directoryCompanies = [
  {
    id: 'phonepe',
    code: 'PP',
    name: 'PhonePe',
    industry: 'FinTech & Digital Payments',
    category: 'fintech',
    location: 'Bengaluru, Karnataka',
    openingsCount: '38 Open Jobs',
    openJobsNum: 38,
    rating: 4.3,
    reviewsCount: '1.4k',
    employees: '5,000+',
    founded: 2015,
    website: 'https://www.phonepe.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: "India's leading fintech platform powering payments, merchant services, mutual funds, and digital commerce.",
    techStack: ['HBase', 'Aerospike', 'Kafka', 'Distributed Systems'],
    colorScheme: 'primary',
  },
  {
    id: 'razorpay',
    code: 'RZ',
    name: 'Razorpay',
    industry: 'FinTech & Payments Suite',
    category: 'fintech',
    location: 'Bengaluru, Karnataka',
    openingsCount: '42 Open Jobs',
    openJobsNum: 42,
    rating: 4.2,
    reviewsCount: '950',
    employees: '3,200+',
    founded: 2014,
    website: 'https://razorpay.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Full-stack financial solutions and payment gateway powering Indian enterprises and modern businesses.',
    techStack: ['Go', 'PHP', 'AWS', 'Kafka', 'React'],
    colorScheme: 'primary',
  },
  {
    id: 'cred',
    code: 'CR',
    name: 'CRED',
    industry: 'FinTech & Credit Products',
    category: 'fintech',
    location: 'Bengaluru, Karnataka',
    openingsCount: '18 Open Jobs',
    openJobsNum: 18,
    rating: 4.4,
    reviewsCount: '620',
    employees: '1,000+',
    founded: 2018,
    website: 'https://cred.club',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Members-only financial services platform rewarding high-trust individuals and premier digital commerce.',
    techStack: ['Kotlin', 'Node.js', 'Microservices', 'iOS/Swift'],
    colorScheme: 'dark',
  },
  {
    id: 'paytm',
    code: 'PY',
    name: 'Paytm',
    industry: 'FinTech & Digital Commerce',
    category: 'fintech',
    location: 'Noida / Bengaluru',
    openingsCount: '56 Open Jobs',
    openJobsNum: 56,
    rating: 3.9,
    reviewsCount: '2.1k',
    employees: '10,000+',
    founded: 2010,
    website: 'https://paytm.com',
    isVerified: true,
    tier: 'Verified Enterprise',
    tagline: 'Pioneering Indian mobile payments ecosystem, consumer commerce, and financial merchant services.',
    techStack: ['Java', 'Spring Boot', 'Kafka', 'MySQL'],
    colorScheme: 'blue',
  },
  {
    id: 'slice',
    code: 'SL',
    name: 'Slice',
    industry: 'FinTech & Consumer Banking',
    category: 'fintech',
    location: 'Bengaluru, Karnataka',
    openingsCount: '15 Open Jobs',
    openJobsNum: 15,
    rating: 4.1,
    reviewsCount: '450',
    employees: '800+',
    founded: 2016,
    website: 'https://sliceit.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: "Next-generation consumer banking and credit card app engineered for India's youth and digital natives.",
    techStack: ['Golang', 'Python', 'GCP', 'Flutter'],
    colorScheme: 'teal',
  },
  {
    id: 'swiggy',
    code: 'SWG',
    name: 'Swiggy',
    industry: 'Consumer Tech & Hyperlocal',
    category: 'consumer-tech',
    location: 'Bengaluru, Karnataka',
    openingsCount: '64 Open Jobs',
    openJobsNum: 64,
    rating: 4.1,
    reviewsCount: '3.4k',
    employees: '6,000+',
    founded: 2014,
    website: 'https://swiggy.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Leading on-demand convenience platform powering food delivery, Instamart quick commerce, and dining.',
    techStack: ['Go', 'Java', 'Kubernetes', 'Data Science'],
    colorScheme: 'primary',
  },
  {
    id: 'flipkart',
    code: 'FLP',
    name: 'Flipkart',
    industry: 'E-Commerce & Supply Chain',
    category: 'ecommerce',
    location: 'Bengaluru, Karnataka',
    openingsCount: '85 Open Jobs',
    openJobsNum: 85,
    rating: 4.2,
    reviewsCount: '5.1k',
    employees: '15,000+',
    founded: 2007,
    website: 'https://flipkart.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Indias homegrown e-commerce marketplace democratizing digital retail, logistics, and supply chain.',
    techStack: ['Java', 'Hadoop', 'Flink', 'Distributed Storage'],
    colorScheme: 'blue',
  },
  {
    id: 'postman',
    code: 'PST',
    name: 'Postman',
    industry: 'Enterprise SaaS & DevTools',
    category: 'saas',
    location: 'Bengaluru / San Francisco',
    openingsCount: '24 Open Jobs',
    openJobsNum: 24,
    rating: 4.5,
    reviewsCount: '380',
    employees: '1,200+',
    founded: 2014,
    website: 'https://postman.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: "The world's leading API platform used by over 30 million developers and 500,000 organizations globally.",
    techStack: ['Node.js', 'Electron', 'React', 'TypeScript'],
    colorScheme: 'primary',
  },
  {
    id: 'freshworks',
    code: 'FRSH',
    name: 'Freshworks',
    industry: 'Enterprise SaaS & CRM',
    category: 'saas',
    location: 'Chennai / Hybrid',
    openingsCount: '31 Open Jobs',
    openJobsNum: 31,
    rating: 4.2,
    reviewsCount: '1.2k',
    employees: '5,000+',
    founded: 2010,
    website: 'https://freshworks.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Cloud-based customer engagement, IT service management, and CRM software empowering businesses worldwide.',
    techStack: ['Ruby on Rails', 'Java', 'Python', 'AWS'],
    colorScheme: 'primary',
  },
  {
    id: 'inmobi',
    code: 'INM',
    name: 'InMobi',
    industry: 'Enterprise Tech & AI',
    category: 'saas',
    location: 'Bengaluru, Karnataka',
    openingsCount: '19 Open Jobs',
    openJobsNum: 19,
    rating: 4.0,
    reviewsCount: '890',
    employees: '2,500+',
    founded: 2007,
    website: 'https://inmobi.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Global provider of content discovery, mobile marketing, and enterprise advertising technologies.',
    techStack: ['Big Data', 'Spark', 'Kafka', 'Machine Learning'],
    colorScheme: 'teal',
  },
  {
    id: 'infosys',
    code: 'INF',
    name: 'Infosys',
    industry: 'IT Consulting & Services',
    category: 'it-services',
    location: 'Bengaluru, Karnataka',
    openingsCount: '1,240 Openings',
    openJobsNum: 1240,
    rating: 3.8,
    reviewsCount: '18k',
    employees: '300,000+',
    founded: 1981,
    website: 'https://infosys.com',
    isVerified: true,
    tier: 'Verified Enterprise',
    tagline: 'Global leader in next-generation digital services, enterprise consulting, and cloud transformation.',
    techStack: ['Cloud', 'AI', 'SAP', 'Java', 'Full Stack'],
    colorScheme: 'blue',
  },
  {
    id: 'tcs',
    code: 'TCS',
    name: 'TCS',
    industry: 'IT Services & Outsourcing',
    category: 'it-services',
    location: 'Mumbai, Maharashtra',
    openingsCount: '2,850 Openings',
    openJobsNum: 2850,
    rating: 3.9,
    reviewsCount: '25k',
    employees: '600,000+',
    founded: 1968,
    website: 'https://tcs.com',
    isVerified: true,
    tier: 'Verified Enterprise',
    tagline: "Premier IT services, consulting, and business solutions organization partnering with the world's largest businesses.",
    techStack: ['Enterprise Cloud', 'Cybersecurity', 'Data Analytics'],
    colorScheme: 'primary',
  },
  {
    id: 'google-india',
    code: 'GOOG',
    name: 'Google India',
    industry: 'Internet & Cloud Technology',
    category: 'consumer-tech',
    location: 'Bengaluru / Hyderabad',
    openingsCount: '430 Openings',
    openJobsNum: 430,
    rating: 4.6,
    reviewsCount: '4.8k',
    employees: '10,000+',
    founded: 1998,
    website: 'https://google.co.in',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: "Organizing the world's information and making it universally accessible and useful across search and AI.",
    techStack: ['C++', 'Go', 'Python', 'TensorFlow', 'Kubernetes'],
    colorScheme: 'primary',
  },
  {
    id: 'hdfc-bank',
    code: 'HDFC',
    name: 'HDFC Bank',
    industry: 'Banking & Financial Services',
    category: 'banking',
    location: 'Mumbai, Maharashtra',
    openingsCount: '890 Openings',
    openJobsNum: 890,
    rating: 3.9,
    reviewsCount: '12k',
    employees: '150,000+',
    founded: 1994,
    website: 'https://hdfcbank.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Leading private sector bank delivering advanced digital banking, credit facilities, and financial services.',
    techStack: ['Fintech', 'Core Banking', 'Security', 'Oracle'],
    colorScheme: 'primary',
  },
  {
    id: 'zomato',
    code: 'ZOM',
    name: 'Zomato',
    industry: 'Food Delivery & Hyperlocal',
    category: 'consumer-tech',
    location: 'Gurugram, Haryana',
    openingsCount: '280 Openings',
    openJobsNum: 280,
    rating: 4.0,
    reviewsCount: '2.8k',
    employees: '4,500+',
    founded: 2008,
    website: 'https://zomato.com',
    isVerified: true,
    tier: 'Tier-1 Employer',
    tagline: 'Better food for more people with hyperlocal delivery, dining tech, and instant commerce via Blinkit.',
    techStack: ['Node.js', 'React', 'Python', 'Swift', 'Kotlin'],
    colorScheme: 'primary',
  },
];

// Preserved for landing page compatibility
export const fallbackFeaturedCompanies = directoryCompanies.slice(0, 7);

// Complete Spotlight dataset for PhonePe as specified in Stitch Screen ecc9262975f24a68a6069c9bb2b33fce
export const phonepeSpotlightData = {
  id: 'phonepe',
  name: 'PhonePe',
  code: 'PP',
  isVerified: true,
  tier: 'Tier-1 Employer',
  statusBadge: 'Verified Enterprise Partner',
  tagline: "India's leading fintech platform powering payments, merchant services, mutual funds, and digital commerce.",
  industry: 'FinTech / Digital Payments',
  location: 'Bengaluru, Karnataka',
  employees: '5,000+ Employees',
  founded: 'Founded 2015',
  website: 'https://www.phonepe.com',
  websiteDisplay: 'phonepe.com',
  followersCount: '84.2k',
  openJobsCount: 38,

  fastFacts: [
    {
      label: 'Registered Users',
      value: '500M+',
      subtext: '1 in 4 Indians active',
      icon: 'person',
      trend: true,
    },
    {
      label: 'Merchant Outlets',
      value: '38M+',
      subtext: 'Across 99% pin codes',
      icon: 'storefront',
      trend: false,
    },
    {
      label: 'Daily Transactions',
      value: '250M+',
      subtext: '45%+ UPI share',
      icon: 'sync_alt',
      trend: true,
    },
  ],

  about: {
    title: 'About PhonePe',
    subtitle: 'Profile synced via Vakancy.in ATS API',
    paragraphs: [
      'PhonePe was founded in December 2015 by Sameer Nigam, Rahul Chari, and Burzin Engineer with a clear, audacious mission: to make digital financial services universal, frictionless, and accessible to every citizen and merchant in India.',
      "Processing over 45% of India's total Unified Payments Interface (UPI) transaction volume, PhonePe has evolved far beyond basic P2P payments into a comprehensive consumer fintech ecosystem spanning Gold investments, mutual funds, insurance distribution, lending marketplaces, and Pincode—a hyper-local ONDC shopping app.",
    ],
    upiDominance: {
      title: 'UPI Market Share Dominance',
      stat: '47.8% Overall UPI Volume',
      breakdown: [
        { label: 'PhonePe (47.8%)', pct: 48, color: '#1e40af' },
        { label: 'Nearest Competitor (32.1%)', pct: 32, color: '#3755c3' },
        { label: 'Others (20.1%)', pct: 20, color: '#c4c5d5' },
      ],
    },
  },

  techCulture: {
    title: 'Tech & Engineering Culture',
    subtitle: 'Architected for extreme throughput, zero downtime, and distributed autonomy.',
    badge: 'HBase • Aerospike • Kafka',
    pillars: [
      {
        title: 'Extreme Concurrency',
        description: 'Handling 12,000+ peak transactions per second (TPS) with multi-datacenter active-active redundancy and sub-200ms latency SLAs.',
        icon: 'speed',
        bg: 'bg-[#1e40af] text-white',
      },
      {
        title: 'Decoupled Microservices',
        description: 'Over 2,500 independent microservices communicating via idempotent, low-overhead event streaming and distributed RPC protocols.',
        icon: 'hub',
        bg: 'bg-[#006a61] text-white',
      },
      {
        title: 'Radical Ownership',
        description: 'Engineers own code from conceptual RFC to zero-touch automated canary deployment and end-to-end production monitoring.',
        icon: 'psychology',
        bg: 'bg-[#3e4c60] text-white',
      },
      {
        title: 'Real-Time Risk Engine',
        description: 'In-house AI-driven fraud anomaly detection analyzing behavioral vectors in under 15 milliseconds without checkout friction.',
        icon: 'shield',
        bg: 'bg-[#3755c3] text-white',
      },
    ],
  },

  featuredRoles: [
    {
      id: 'job-phonepe-1',
      title: 'Principal Platform Architect',
      department: 'Engineering',
      badge: 'Urgent Requisition',
      badgeColor: 'text-[#006a61] bg-teal-50',
      team: 'Core Banking & High-Throughput Settlement Pipeline',
      salary: '₹55 - ₹75 LPA + ESOPs',
      experience: '12-16 Yrs Exp',
      location: 'Bengaluru (Bellandur)',
      tag: 'Distributed Systems',
      posted: 'Posted 3 hours ago',
      applicants: '24 Applicants',
    },
    {
      id: 'job-phonepe-2',
      title: 'Staff SRE - Payments Core',
      department: 'Engineering',
      badge: 'Priority Hiring',
      badgeColor: 'text-[#00288e] bg-blue-50',
      team: 'Infra Reliability, Chaos Engineering & Observability',
      salary: '₹48 - ₹65 LPA',
      experience: '9-13 Yrs Exp',
      location: 'Bengaluru (Hybrid)',
      tag: 'Kubernetes / eBPF',
      posted: 'Posted 1 day ago',
      applicants: '41 Applicants',
    },
    {
      id: 'job-phonepe-3',
      title: 'Senior Product Manager - Merchant Growth',
      department: 'Product',
      badge: 'Growth Pod',
      badgeColor: 'text-[#006a61] bg-teal-50',
      team: 'QR Soundbox Monetization & Working Capital Solutions',
      salary: '₹35 - ₹50 LPA',
      experience: '6-9 Yrs Exp',
      location: 'Mumbai / Hybrid',
      tag: 'Merchant FinTech',
      posted: 'Posted 2 days ago',
      applicants: '68 Applicants',
    },
    {
      id: 'job-phonepe-4',
      title: 'Lead iOS Developer',
      department: 'Engineering',
      badge: 'App Architecture',
      badgeColor: 'text-[#00288e] bg-blue-50',
      team: 'Consumer App Super-Core & Modular Frameworks',
      salary: '₹32 - ₹45 LPA',
      experience: '7-10 Yrs Exp',
      location: 'Pune / Bengaluru',
      tag: 'Swift / SwiftUI / SPM',
      posted: 'Posted 3 days ago',
      applicants: '53 Applicants',
    },
  ],

  benefits: [
    {
      title: 'Comprehensive Health & Term Cover',
      description: 'Zero-deductible ₹10 Lakh corporate medical coverage including parents/in-laws and OPD consultations.',
      icon: 'health_and_safety',
    },
    {
      title: 'Vested ESOP Pool with Liquidity',
      description: 'Consistent wealth generation with 25% annual vesting and transparent secondary buyback programs.',
      icon: 'token',
    },
    {
      title: 'Executive Wellness & Fitness',
      description: 'Gym/Cult.fit stipends, mental wellness hotlines, ergonomics work-from-home budget of ₹30,000.',
      icon: 'spa',
    },
    {
      title: 'Flexible Work Arrangements',
      description: 'Hybrid flexibility, 26 weeks paid parental leave, and unlimited recharge emergency time off.',
      icon: 'schedule',
    },
  ],

  snapshot: {
    legalEntity: 'PhonePe Pvt. Ltd.',
    headquarters: 'Bengaluru, KA, India',
    stage: 'Pre-IPO / Profitable',
    keyInvestors: 'Walmart, General Atlantic',
    hiringPace: 'Very High (>40 hires/mo)',
    turnaround: '14 Days',
  },

  scorecard: {
    overall: 4.3,
    reviewsCount: '1.4k',
    categories: [
      { label: 'Compensation & ESOPs', score: 4.6, pct: 92, color: 'bg-[#1e40af]' },
      { label: 'Engineering Culture', score: 4.5, pct: 90, color: 'bg-[#1e40af]' },
      { label: 'Work-Life Equilibrium', score: 3.8, pct: 76, color: 'bg-[#006a61]' },
    ],
  },

  locations: {
    mainName: 'Bellandur Tech Park (HQ)',
    mainAddress: 'Outer Ring Road, Bengaluru',
    mainImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    otherOffices: [
      { name: 'Mumbai Office', address: 'BKC, Bandra' },
      { name: 'Pune Development Center', address: 'Kalyani Nagar' },
    ],
  },

  similarCompanies: [
    { id: 'razorpay', code: 'RZ', name: 'Razorpay', industry: 'Payments & Banking Suite', openJobs: '42 Jobs', rating: '4.2 ★' },
    { id: 'cred', code: 'CR', name: 'CRED', industry: 'Rewards & High-Trust FinTech', openJobs: '18 Jobs', rating: '4.4 ★' },
    { id: 'paytm', code: 'PY', name: 'Paytm', industry: 'Digital Wallet & Commerce', openJobs: '56 Jobs', rating: '3.9 ★' },
    { id: 'slice', code: 'SL', name: 'Slice', industry: 'Consumer Credit & Banking', openJobs: '15 Jobs', rating: '4.1 ★' },
  ],
};

// Rich customized dossiers for primary tier-1 employers
export const companyDossiers = {
  phonepe: phonepeSpotlightData,

  razorpay: {
    id: 'razorpay',
    name: 'Razorpay',
    code: 'RZ',
    isVerified: true,
    tier: 'Tier-1 Employer',
    statusBadge: 'Verified Enterprise Partner',
    tagline: 'Full-stack financial solutions and payment gateway powering Indian enterprises and modern businesses.',
    industry: 'FinTech & Payments Suite',
    location: 'Bengaluru, Karnataka',
    employees: '3,200+ Employees',
    founded: 'Founded 2014',
    website: 'https://razorpay.com',
    websiteDisplay: 'razorpay.com',
    followersCount: '62.4k',
    openJobsCount: 42,

    fastFacts: [
      {
        label: 'Active Businesses',
        value: '10M+',
        subtext: 'From startups to Fortune 500',
        icon: 'storefront',
        trend: true,
      },
      {
        label: 'Annual TPV',
        value: '$150B+',
        subtext: 'High-throughput payment flow',
        icon: 'payments',
        trend: true,
      },
      {
        label: 'Payment Success Rate',
        value: '99.9%',
        subtext: 'Enterprise-grade reliability',
        icon: 'sync_alt',
        trend: false,
      },
    ],

    about: {
      title: 'About Razorpay',
      subtitle: 'Profile synced via Vakancy.in ATS API',
      paragraphs: [
        'Razorpay was founded in 2014 by Harshil Mathur and Shashank Kumar with the vision of simplifying digital payments for Indian businesses of every scale.',
        'Today, Razorpay is India’s first full-stack financial solutions company, empowering millions of merchants with automated payment routing, current accounts, corporate credit cards, payroll orchestration (Opfin), and global business collection accounts.',
      ],
      upiDominance: {
        title: 'Payment Gateway Merchant Processing Share',
        stat: '38.5% Core Merchant Volume',
        breakdown: [
          { label: 'Razorpay (38.5%)', pct: 39, color: '#1e40af' },
          { label: 'Nearest Competitor (28.0%)', pct: 28, color: '#3755c3' },
          { label: 'Others (33.5%)', pct: 33, color: '#c4c5d5' },
        ],
      },
    },

    techCulture: {
      title: 'Tech & Engineering Culture',
      subtitle: 'Built for zero-failure financial routing, automated resilience, and developer velocity.',
      badge: 'Go • PHP • AWS • Kafka',
      pillars: [
        {
          title: 'Mission-Critical Reliability',
          description: 'Payment pipelines processing billions of API calls monthly with multi-cloud redundancy and sub-second fallback logic.',
          icon: 'speed',
          bg: 'bg-[#1e40af] text-white',
        },
        {
          title: 'Developer-First APIs',
          description: 'SDKs engineered in 10+ languages with strict backward compatibility, idempotency keys, and automated mock testing suites.',
          icon: 'hub',
          bg: 'bg-[#006a61] text-white',
        },
        {
          title: 'Autonomous Pod Architecture',
          description: 'Cross-functional engineering pods with full ownership over payment rails, reconciliation, and ledger immutability.',
          icon: 'psychology',
          bg: 'bg-[#3e4c60] text-white',
        },
        {
          title: 'Automated Fraud Defense',
          description: 'Thirdwatch AI engine scrutinizing transaction anomalies in real-time, drastically reducing chargeback ratios.',
          icon: 'shield',
          bg: 'bg-[#3755c3] text-white',
        },
      ],
    },

    featuredRoles: [
      {
        id: 'job-rz-1',
        title: 'Staff Software Engineer - Payment Rails',
        department: 'Engineering',
        badge: 'Priority Requisition',
        badgeColor: 'text-[#00288e] bg-blue-50',
        team: 'Banking Integrations & Smart Routing',
        salary: '₹50 - ₹68 LPA + ESOPs',
        experience: '8-12 Yrs Exp',
        location: 'Bengaluru (Koramangala)',
        tag: 'Go / Distributed Systems',
        posted: 'Posted 5 hours ago',
        applicants: '32 Applicants',
      },
      {
        id: 'job-rz-2',
        title: 'Engineering Manager - Core Checkout',
        department: 'Engineering',
        badge: 'Leadership Requisition',
        badgeColor: 'text-[#006a61] bg-teal-50',
        team: 'Standard Checkout & Instant Payment SDKs',
        salary: '₹60 - ₹80 LPA',
        experience: '10-14 Yrs Exp',
        location: 'Bengaluru (Hybrid)',
        tag: 'Microservices / React',
        posted: 'Posted 1 day ago',
        applicants: '19 Applicants',
      },
      {
        id: 'job-rz-3',
        title: 'Lead Product Manager - Neobanking (RazorpayX)',
        department: 'Product',
        badge: 'Growth Pod',
        badgeColor: 'text-[#006a61] bg-teal-50',
        team: 'Corporate Cards & Working Capital',
        salary: '₹40 - ₹55 LPA',
        experience: '7-10 Yrs Exp',
        location: 'Bengaluru (Hybrid)',
        tag: 'Fintech / Banking APIs',
        posted: 'Posted 2 days ago',
        applicants: '45 Applicants',
      },
      {
        id: 'job-rz-4',
        title: 'Senior DevOps / SRE Specialist',
        department: 'Engineering',
        badge: 'Infrastructure',
        badgeColor: 'text-[#00288e] bg-blue-50',
        team: 'Cloud Platform & Chaos Engineering',
        salary: '₹34 - ₹48 LPA',
        experience: '6-9 Yrs Exp',
        location: 'Bengaluru / Remote',
        tag: 'Kubernetes / Terraform / AWS',
        posted: 'Posted 3 days ago',
        applicants: '38 Applicants',
      },
    ],

    benefits: [
      {
        title: 'Comprehensive Family Health Insurance',
        description: '₹12 Lakh health cover including parents, dependents, and extensive outpatient consultations.',
        icon: 'health_and_safety',
      },
      {
        title: 'Razorpay ESOP Buyback Program',
        description: 'Consistent annual liquidity events rewarding long-term engineers and architects.',
        icon: 'token',
      },
      {
        title: 'Continuous Learning & Upskilling',
        description: 'Annual ₹50,000 professional education and certification allowance plus conference budgets.',
        icon: 'spa',
      },
      {
        title: 'Flexible & Ergonomic Workspaces',
        description: 'Hybrid work model, ergonomic home office stipend, and comprehensive parental leaves.',
        icon: 'schedule',
      },
    ],

    snapshot: {
      legalEntity: 'Razorpay Software Pvt. Ltd.',
      headquarters: 'Bengaluru, KA, India',
      stage: 'Series F / Unicorn ($7.5B)',
      keyInvestors: 'Sequoia Capital, Tiger Global, Y Combinator',
      hiringPace: 'High (>30 hires/mo)',
      turnaround: '12 Days',
    },

    scorecard: {
      overall: 4.2,
      reviewsCount: '950',
      categories: [
        { label: 'Compensation & ESOPs', score: 4.5, pct: 90, color: 'bg-[#1e40af]' },
        { label: 'Engineering Culture', score: 4.4, pct: 88, color: 'bg-[#1e40af]' },
        { label: 'Work-Life Equilibrium', score: 3.7, pct: 74, color: 'bg-[#006a61]' },
      ],
    },

    locations: {
      mainName: 'SJR Cyber, Koramangala (HQ)',
      mainAddress: 'Hosur Road, Bengaluru',
      mainImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      otherOffices: [
        { name: 'Mumbai Hub', address: 'Bandra Kurla Complex' },
        { name: 'Delhi NCR Office', address: 'Cyber City, Gurugram' },
      ],
    },

    similarCompanies: [
      { id: 'phonepe', code: 'PP', name: 'PhonePe', industry: 'FinTech / Digital Payments', openJobs: '38 Jobs', rating: '4.3 ★' },
      { id: 'cred', code: 'CR', name: 'CRED', industry: 'Rewards & High-Trust FinTech', openJobs: '18 Jobs', rating: '4.4 ★' },
      { id: 'paytm', code: 'PY', name: 'Paytm', industry: 'Digital Wallet & Commerce', openJobs: '56 Jobs', rating: '3.9 ★' },
      { id: 'slice', code: 'SL', name: 'Slice', industry: 'Consumer Credit & Banking', openJobs: '15 Jobs', rating: '4.1 ★' },
    ],
  },

  cred: {
    id: 'cred',
    name: 'CRED',
    code: 'CR',
    isVerified: true,
    tier: 'Tier-1 Employer',
    statusBadge: 'Verified Enterprise Partner',
    tagline: 'Members-only financial services platform rewarding high-trust individuals and premier digital commerce.',
    industry: 'FinTech & Credit Products',
    location: 'Bengaluru, Karnataka',
    employees: '1,000+ Employees',
    founded: 'Founded 2018',
    website: 'https://cred.club',
    websiteDisplay: 'cred.club',
    followersCount: '45.8k',
    openJobsCount: 18,

    fastFacts: [
      {
        label: 'Creditworthy Members',
        value: '13M+',
        subtext: 'High-trust Indian consumers',
        icon: 'person',
        trend: true,
      },
      {
        label: 'Credit Card Bill Volume',
        value: '₹35,000 Cr+',
        subtext: 'Monthly payment throughput',
        icon: 'payments',
        trend: true,
      },
      {
        label: 'Average Credit Score',
        value: '750+',
        subtext: 'Premium verified demographic',
        icon: 'verified',
        trend: false,
      },
    ],

    about: {
      title: 'About CRED',
      subtitle: 'Profile synced via Vakancy.in ATS API',
      paragraphs: [
        'CRED was launched in 2018 by Kunal Shah with a mission to celebrate and reward the most creditworthy individuals in India.',
        'With products spanning CRED Pay, CRED Cash, CRED Garage, and curated D2C storefronts, the platform has cultivated unprecedented engagement among India’s top credit card users.',
      ],
      upiDominance: {
        title: 'Credit Card Bill Payment Market Share',
        stat: '32% Premium Card Volume',
        breakdown: [
          { label: 'CRED (32.0%)', pct: 32, color: '#1e40af' },
          { label: 'Banking Portals (48.0%)', pct: 48, color: '#3755c3' },
          { label: 'Others (20.0%)', pct: 20, color: '#c4c5d5' },
        ],
      },
    },

    techCulture: {
      title: 'Tech & Engineering Culture',
      subtitle: 'Craftsmanship, fluid micro-interactions, and resilient reactive microservices.',
      badge: 'Kotlin • Node.js • Swift • Kafka',
      pillars: [
        {
          title: 'Design-Driven Engineering',
          description: 'Engineers collaborate directly with product designers to ship state-of-the-art UI with 60 FPS fluidity.',
          icon: 'speed',
          bg: 'bg-[#1e40af] text-white',
        },
        {
          title: 'Event-Driven Microservices',
          description: 'Zero-downtime event streaming architecture managing high-stakes financial ledger reconciliation.',
          icon: 'hub',
          bg: 'bg-[#006a61] text-white',
        },
        {
          title: 'Uncompromising Code Bar',
          description: 'Rigorous RFC processes, automated mutation testing, and small, high-leverage product teams.',
          icon: 'psychology',
          bg: 'bg-[#3e4c60] text-white',
        },
        {
          title: 'Intelligent Risk Modeling',
          description: 'Proprietary credit and underwriting models assessing repayment propensity with sub-second decisioning.',
          icon: 'shield',
          bg: 'bg-[#3755c3] text-white',
        },
      ],
    },

    featuredRoles: [
      {
        id: 'job-cr-1',
        title: 'Senior Backend Engineer - Ledger & Payments',
        department: 'Engineering',
        badge: 'High Impact',
        badgeColor: 'text-[#00288e] bg-blue-50',
        team: 'Financial Engineering & Bill Payments',
        salary: '₹45 - ₹65 LPA + ESOPs',
        experience: '5-9 Yrs Exp',
        location: 'Bengaluru (Indiranagar)',
        tag: 'Kotlin / Spring / Kafka',
        posted: 'Posted 1 day ago',
        applicants: '28 Applicants',
      },
      {
        id: 'job-cr-2',
        title: 'Lead iOS Engineer (SwiftUI & Core Animation)',
        department: 'Engineering',
        badge: 'Priority Requisition',
        badgeColor: 'text-[#006a61] bg-teal-50',
        team: 'CRED App Experience & Motion Architecture',
        salary: '₹40 - ₹55 LPA',
        experience: '6-10 Yrs Exp',
        location: 'Bengaluru (Indiranagar)',
        tag: 'Swift / Metal / Combine',
        posted: 'Posted 2 days ago',
        applicants: '34 Applicants',
      },
      {
        id: 'job-cr-3',
        title: 'Product Manager - CRED Garage & Auto Tech',
        department: 'Product',
        badge: 'Growth Pod',
        badgeColor: 'text-[#006a61] bg-teal-50',
        team: 'Vehicle Management & FASTag Ecosystem',
        salary: '₹35 - ₹48 LPA',
        experience: '5-8 Yrs Exp',
        location: 'Bengaluru (Hybrid)',
        tag: 'Consumer Tech',
        posted: 'Posted 3 days ago',
        applicants: '51 Applicants',
      },
    ],

    benefits: [
      {
        title: 'Top-Tier Medical & Wellness Package',
        description: 'Comprehensive health cover of ₹15 Lakh including mental health counseling and fitness allowances.',
        icon: 'health_and_safety',
      },
      {
        title: 'Accelerated ESOP Allocation',
        description: 'Substantial equity participation with flexible vesting schedules and secondary liquidity programs.',
        icon: 'token',
      },
      {
        title: 'Culinary & Workspace Amenities',
        description: 'Gourmet in-house cafeteria, barista station, and custom Apple developer equipment setup.',
        icon: 'spa',
      },
      {
        title: 'Focus on Rest & Recharge',
        description: 'Flexible leave policies, mandatory team disconnect days, and family support provisions.',
        icon: 'schedule',
      },
    ],

    snapshot: {
      legalEntity: 'Dreamplug Technologies Pvt. Ltd.',
      headquarters: 'Bengaluru, KA, India',
      stage: 'Series F ($6.4B)',
      keyInvestors: 'GIC, Tiger Global, Falcon Edge, Sequoia',
      hiringPace: 'Moderate (High Selectivity)',
      turnaround: '10 Days',
    },

    scorecard: {
      overall: 4.4,
      reviewsCount: '620',
      categories: [
        { label: 'Compensation & ESOPs', score: 4.8, pct: 96, color: 'bg-[#1e40af]' },
        { label: 'Engineering Culture', score: 4.6, pct: 92, color: 'bg-[#1e40af]' },
        { label: 'Work-Life Equilibrium', score: 3.9, pct: 78, color: 'bg-[#006a61]' },
      ],
    },

    locations: {
      mainName: 'CRED Campus, Indiranagar (HQ)',
      mainAddress: '100 Feet Road, HAL 2nd Stage, Bengaluru',
      mainImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
      otherOffices: [
        { name: 'Mumbai Creative Studio', address: 'Lower Parel' },
      ],
    },

    similarCompanies: [
      { id: 'phonepe', code: 'PP', name: 'PhonePe', industry: 'FinTech / Digital Payments', openJobs: '38 Jobs', rating: '4.3 ★' },
      { id: 'razorpay', code: 'RZ', name: 'Razorpay', industry: 'Payments & Banking Suite', openJobs: '42 Jobs', rating: '4.2 ★' },
      { id: 'slice', code: 'SL', name: 'Slice', industry: 'Consumer Credit & Banking', openJobs: '15 Jobs', rating: '4.1 ★' },
      { id: 'paytm', code: 'PY', name: 'Paytm', industry: 'Digital Wallet & Commerce', openJobs: '56 Jobs', rating: '3.9 ★' },
    ],
  },
};

// Generates a fully-normalized Stitch-compliant dossier for any directory company
function generateCompanyDossier(c) {
  const code = c.code || c.name.slice(0, 3).toUpperCase();
  const jobsCount = c.openJobsNum || 15;

  return {
    id: c.id,
    name: c.name,
    code: code,
    isVerified: c.isVerified ?? true,
    tier: c.tier || 'Verified Enterprise',
    statusBadge: 'Verified Enterprise Partner',
    tagline: c.tagline || `Leading corporate enterprise hiring technology and product talent across India.`,
    industry: c.industry,
    location: c.location,
    employees: c.employees || '1,000+ Employees',
    founded: c.founded ? `Founded ${c.founded}` : 'Established Partner',
    website: c.website || 'https://vakancy.in',
    websiteDisplay: c.website ? c.website.replace(/^https?:\/\//, '') : 'company.com',
    followersCount: `${Math.floor(jobsCount * 1.8 + 12)}k`,
    openJobsCount: jobsCount,

    fastFacts: [
      {
        label: 'Active Workforce',
        value: c.employees || '1,000+',
        subtext: 'Verified employee headcount',
        icon: 'person',
        trend: false,
      },
      {
        label: 'Operational Reach',
        value: c.location.split(',')[0] || 'National',
        subtext: 'Multiple technical facilities',
        icon: 'storefront',
        trend: false,
      },
      {
        label: 'Institutional Rating',
        value: `${c.rating || 4.0} ★`,
        subtext: `${c.reviewsCount || '500+'} employee reviews`,
        icon: 'verified',
        trend: true,
      },
    ],

    about: {
      title: `About ${c.name}`,
      subtitle: 'Profile synced via Vakancy.in ATS API',
      paragraphs: [
        `${c.name} is a leading enterprise within the ${c.industry} sector, recognized for its commitment to high-impact technology delivery, career progression, and institutional stability.`,
        c.tagline,
      ],
      upiDominance: {
        title: 'Sector Market Positioning',
        stat: 'High Tier Institutional Category',
        breakdown: [
          { label: `${c.name} (40%)`, pct: 40, color: '#1e40af' },
          { label: 'Category Peers (35%)', pct: 35, color: '#3755c3' },
          { label: 'Other Market (25%)', pct: 25, color: '#c4c5d5' },
        ],
      },
    },

    techCulture: {
      title: 'Tech & Engineering Culture',
      subtitle: `Modern engineering standards, automated CI/CD pipelines, and high software craft.`,
      badge: (c.techStack || ['Cloud', 'Distributed Systems', 'CI/CD']).slice(0, 3).join(' • '),
      pillars: [
        {
          title: 'Architectural Excellence',
          description: 'High-availability microservices designed for continuous uptime, resilience, and horizontal scaling.',
          icon: 'speed',
          bg: 'bg-[#1e40af] text-white',
        },
        {
          title: 'Distributed Autonomy',
          description: 'Engineers own features from conceptual design documents through production deployment.',
          icon: 'hub',
          bg: 'bg-[#006a61] text-white',
        },
        {
          title: 'Modern Tooling Stack',
          description: `Built on modern foundations utilizing ${(c.techStack || ['modern cloud technologies']).join(', ')}.`,
          icon: 'psychology',
          bg: 'bg-[#3e4c60] text-white',
        },
        {
          title: 'Continuous Quality & Security',
          description: 'Automated test coverage, proactive vulnerability management, and rapid release cycles.',
          icon: 'shield',
          bg: 'bg-[#3755c3] text-white',
        },
      ],
    },

    featuredRoles: [
      {
        id: `job-${c.id}-1`,
        title: `Senior Software Engineer - Core Platform`,
        department: 'Engineering',
        badge: 'Immediate Requisition',
        badgeColor: 'text-[#00288e] bg-blue-50',
        team: `${c.name} Technical Infrastructure`,
        salary: '₹28 - ₹42 LPA',
        experience: '4-8 Yrs Exp',
        location: c.location,
        tag: (c.techStack && c.techStack[0]) || 'Backend Systems',
        posted: 'Posted 2 days ago',
        applicants: '29 Applicants',
      },
      {
        id: `job-${c.id}-2`,
        title: `Product Specialist - Digital Solutions`,
        department: 'Product',
        badge: 'Priority Role',
        badgeColor: 'text-[#006a61] bg-teal-50',
        team: 'Product & Customer Experience',
        salary: '₹24 - ₹36 LPA',
        experience: '4-7 Yrs Exp',
        location: c.location,
        tag: 'Product Management',
        posted: 'Posted 3 days ago',
        applicants: '41 Applicants',
      },
      {
        id: `job-${c.id}-3`,
        title: `Lead Quality & Automation Engineer`,
        department: 'Engineering',
        badge: 'Core Team',
        badgeColor: 'text-[#00288e] bg-blue-50',
        team: 'Quality Engineering & CI/CD',
        salary: '₹22 - ₹32 LPA',
        experience: '5-9 Yrs Exp',
        location: c.location,
        tag: 'Automation Testing',
        posted: 'Posted 4 days ago',
        applicants: '18 Applicants',
      },
    ],

    benefits: [
      {
        title: 'Comprehensive Health Insurance',
        description: 'Comprehensive medical coverage including family dependents and consultation benefits.',
        icon: 'health_and_safety',
      },
      {
        title: 'Performance & Equity Incentives',
        description: 'Competitive annual bonuses, incentive programs, and equity participation.',
        icon: 'token',
      },
      {
        title: 'Professional Learning Allowance',
        description: 'Dedicated stipends for technical certifications, conferences, and career development.',
        icon: 'spa',
      },
      {
        title: 'Balanced Work Environment',
        description: 'Hybrid work opportunities, wellness holidays, and generous paid time off.',
        icon: 'schedule',
      },
    ],

    snapshot: {
      legalEntity: `${c.name} India Private Limited`,
      headquarters: c.location,
      stage: 'Established Corporate Enterprise',
      keyInvestors: 'Institutional Shareholders',
      hiringPace: 'Active Hiring Cycle',
      turnaround: '14 Days',
    },

    scorecard: {
      overall: c.rating || 4.1,
      reviewsCount: c.reviewsCount || '500+',
      categories: [
        { label: 'Compensation & Benefits', score: 4.2, pct: 84, color: 'bg-[#1e40af]' },
        { label: 'Engineering & Product Craft', score: 4.1, pct: 82, color: 'bg-[#1e40af]' },
        { label: 'Work-Life Equilibrium', score: 3.9, pct: 78, color: 'bg-[#006a61]' },
      ],
    },

    locations: {
      mainName: `${c.name} Headquarters`,
      mainAddress: c.location,
      mainImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      otherOffices: [
        { name: 'Regional Innovation Center', address: 'Bengaluru / Mumbai' },
      ],
    },

    similarCompanies: directoryCompanies
      .filter((other) => other.id !== c.id)
      .slice(0, 4)
      .map((other) => ({
        id: other.id,
        code: other.code,
        name: other.name,
        industry: other.industry,
        openJobs: other.openingsCount || `${other.openJobsNum} Jobs`,
        rating: `${other.rating} ★`,
      })),
  };
}

export default companyService;
