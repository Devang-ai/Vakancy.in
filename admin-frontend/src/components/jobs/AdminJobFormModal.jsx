import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Briefcase,
  Building2,
  DollarSign,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
  Shield,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Globe,
  Phone,
  Mail,
  User
} from 'lucide-react';
import API from '../../services/api';
import useModalA11y from '../../hooks/useModalA11y';
import JobCategoryAutocomplete from '../common/JobCategoryAutocomplete';
import RequiredSkillsSelector from '../common/RequiredSkillsSelector';
import DependentLocationSelector from '../common/DependentLocationSelector';
import CustomDropdown from '../common/CustomDropdown';
import PerksAndBenefitsSelector from '../common/PerksAndBenefitsSelector';

const SUGGESTED_LOCATIONS = [
  'Bengaluru, KA',
  'Mumbai, MH',
  'Delhi-NCR',
  'Hyderabad, TS',
  'Pune, MH',
  'Chennai, TN',
  'Remote (India)'
];

const EMPLOYMENT_TYPES = [
  { label: 'Full-Time', value: 'Full-Time' },
  { label: 'Part-Time', value: 'Part-Time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Internship', value: 'Internship' },
  { label: 'Freelance', value: 'Freelance' }
];

const WORKPLACE_TYPES = [
  { label: 'On-Site', value: 'On-Site' },
  { label: 'Hybrid', value: 'Hybrid' },
  { label: 'Remote', value: 'Remote' }
];

const SENIORITY_LEVELS = [
  { label: 'Entry Level', value: 'Entry Level' },
  { label: 'Junior', value: 'Junior' },
  { label: 'Mid Level', value: 'Mid Level' },
  { label: 'Senior', value: 'Senior' },
  { label: 'Lead / Manager', value: 'Lead / Manager' },
  { label: 'Director', value: 'Director' }
];

const QUALIFICATIONS = [
  { label: "Bachelor's Degree", value: "Bachelor's Degree" },
  { label: "Master's Degree", value: "Master's Degree" },
  { label: 'Doctorate / Ph.D.', value: 'Doctorate / Ph.D.' },
  { label: 'Diploma', value: 'Diploma' },
  { label: '12th Pass', value: '12th Pass' },
  { label: '10th Pass', value: '10th Pass' },
  { label: 'Any Graduate', value: 'Any Graduate' }
];

const NOTICE_PERIODS = [
  { label: 'Immediate', value: 'Immediate' },
  { label: '15 Days', value: '15 Days' },
  { label: '30 Days', value: '30 Days' },
  { label: '45 Days', value: '45 Days' },
  { label: '60 Days', value: '60 Days' },
  { label: '90 Days', value: '90 Days' }
];

const CURRENCIES = [
  { label: 'INR (₹)', value: 'INR' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'AED (د.إ)', value: 'AED' },
  { label: 'SGD (S$)', value: 'SGD' },
  { label: 'CAD (C$)', value: 'CAD' }
];

const SALARY_PERIODS = [
  { label: 'Per Year', value: 'Per Year' },
  { label: 'Per Month', value: 'Per Month' },
  { label: 'Per Week', value: 'Per Week' },
  { label: 'Per Day', value: 'Per Day' },
  { label: 'Per Hour', value: 'Per Hour' }
];

const SALARY_TYPES = [
  { label: 'CTC (Cost to Company)', value: 'CTC' },
  { label: 'In-Hand Salary', value: 'In-Hand' },
  { label: 'Gross Salary', value: 'Gross' },
  { label: 'Fixed + Variable Pay', value: 'Fixed + Variable' }
];

const AdminJobFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialJob = null,
  fromLead = null,
  fromEnquiry = null
}) => {
  useModalA11y(isOpen, onClose);
  const isEdit = Boolean(initialJob && initialJob.id);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [jdTab, setJdTab] = useState('editor'); // 'editor' | 'preview'

  // Dropdown reference data
  const [employers, setEmployers] = useState([]);
  const [recruiters, setRecruiters] = useState([]);

  // Tag inputs
  const [newKeyword, setNewKeyword] = useState('');

  // Form State — mirroring Employer Portal 7 sections + 2 Admin Controls
  const [formData, setFormData] = useState({
    // Section 1: Basic Job Identification
    title: '',
    category_id: null,
    job_domain: '',
    department: '',
    required_skills: [],

    // Section 2: Employment & Workplace
    employment_type: 'Full-Time',
    workplace_type: 'On-Site',
    seniority_level: 'Mid Level',
    openings_count: 1,

    // Section 3: Job Location
    country: 'India',
    country_id: 'ctr-india',
    state: '',
    state_region_id: '',
    city: '',
    city_id: '',
    locality: '',
    location: '',
    selected_locations: [],
    new_location_input: '',

    // Section 4: Experience & Qualifications
    min_experience: 1,
    max_experience: 5,
    fresher_allowed: false,
    min_qualification: "Bachelor's Degree",
    degree: '',
    specialization: '',
    notice_period: '30 Days',

    // Section 5: Compensation
    min_salary: '',
    max_salary: '',
    currency: 'INR',
    salary_period: 'Per Year',
    salary_type: 'CTC',

    // Section 6: Perks & Benefits
    benefits: ['Health Insurance', 'Performance Bonus'],

    // Section 7: Application Settings
    application_deadline: '',
    keywords: [],

    // Section 8: Job Description Parity Canvas
    description: '',
    responsibilities: [],
    requirements: [],

    // Section 9: Company Association (Admin only)
    company_mode: 'manual', // 'registered' | 'manual'
    employer_id: '',
    manual_company_name: '',
    manual_contact_person: '',
    manual_contact_phone: '',
    manual_contact_email: '',
    manual_company_website: '',

    // Section 10: Internal Governance Controls (Admin only)
    status: 'open',
    is_recommended: false,
    allow_candidate_access: true,
    assigned_recruiter_id: '',
    internal_notes: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      if (initialJob) {
        populateForm(initialJob);
      } else if (fromEnquiry) {
        resetForm();
        setFormData(prev => ({
          ...prev,
          title: fromEnquiry.subject || fromEnquiry.display_subject || fromEnquiry.job_title || '',
          openings_count: fromEnquiry.openings_count || 1,
          location: fromEnquiry.location || 'Remote',
          city: fromEnquiry.location || '',
          company_mode: fromEnquiry.employer_id ? 'registered' : 'manual',
          employer_id: fromEnquiry.employer_id || '',
          manual_company_name: fromEnquiry.company_name || '',
          manual_contact_person: fromEnquiry.contact_name || '',
          manual_contact_phone: fromEnquiry.contact_phone || '',
          manual_contact_email: fromEnquiry.contact_email || '',
          assigned_recruiter_id: fromEnquiry.assigned_to_user_id || '',
          description: fromEnquiry.message || '',
          internal_notes: fromEnquiry.notes ? `Executive Search Notes: ${fromEnquiry.notes}` : '',
          selected_locations: fromEnquiry.location ? [fromEnquiry.location] : [],
          new_location_input: '',
          required_skills: [],
          keywords: []
        }));
      } else if (fromLead) {
        resetForm();
        setFormData(prev => ({
          ...prev,
          title: fromLead.job_title || '',
          company_mode: fromLead.employer_id ? 'registered' : 'manual',
          employer_id: fromLead.employer_id || '',
          manual_company_name: fromLead.company_name || '',
          manual_contact_person: fromLead.contact_person_name || '',
          manual_contact_phone: fromLead.contact_phone || '',
          manual_contact_email: fromLead.contact_email || '',
          manual_company_website: fromLead.website || '',
          city: fromLead.city || '',
          location: fromLead.city || 'Remote',
          selected_locations: fromLead.city ? [fromLead.city] : [],
          new_location_input: '',
          assigned_recruiter_id: fromLead.claimed_by_recruiter_id || '',
          internal_notes: fromLead.notes ? `BD Lead Notes: ${fromLead.notes}` : '',
          required_skills: [],
          keywords: []
        }));
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialJob, fromLead, fromEnquiry]);

  const loadDropdowns = async () => {
    try {
      const [empRes, teamRes] = await Promise.allSettled([
        API.get('/admin/employers?limit=100'),
        API.get('/admin/team')
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.success) {
        setEmployers(empRes.value.employers || []);
      }
      if (teamRes.status === 'fulfilled' && teamRes.value.success) {
        const teamMembers = teamRes.value.team || [];
        const recList = teamMembers.filter((m) =>
          m.role === 'recruiter' && (m.is_active === 1 || m.is_active === true)
        );
        setRecruiters(recList);
      }
    } catch (e) {
      console.warn('Error loading form dropdowns:', e.message);
    }
  };

  const populateForm = (job) => {
    let parsedSkills = [];
    try {
      parsedSkills = typeof job.required_skills === 'string' ? JSON.parse(job.required_skills) : (job.required_skills || job.skills || []);
    } catch (_) {
      parsedSkills = job.required_skills ? String(job.required_skills).split(',').map(s => s.trim()) : [];
    }

    let parsedKeywords = [];
    try {
      parsedKeywords = typeof job.keywords === 'string' ? JSON.parse(job.keywords) : (job.keywords || []);
    } catch (_) {
      parsedKeywords = job.keywords ? String(job.keywords).split(',').map(k => k.trim()) : [];
    }

    let parsedBenefits = [];
    try {
      parsedBenefits = typeof job.benefits === 'string' ? JSON.parse(job.benefits) : (job.benefits || []);
    } catch (_) {
      parsedBenefits = job.benefits ? String(job.benefits).split(',').map(b => b.trim()) : [];
    }

    let parsedResp = [];
    if (Array.isArray(job.responsibilities)) {
      parsedResp = job.responsibilities;
    } else if (typeof job.responsibilities === 'string' && job.responsibilities.trim()) {
      try {
        const p = JSON.parse(job.responsibilities);
        parsedResp = Array.isArray(p) ? p : job.responsibilities.split('\n');
      } catch (_) {
        parsedResp = job.responsibilities.split('\n');
      }
    }
    parsedResp = parsedResp.map(s => String(s || '').trim()).filter(Boolean);

    let parsedReq = [];
    if (Array.isArray(job.requirements)) {
      parsedReq = job.requirements;
    } else if (typeof job.requirements === 'string' && job.requirements.trim()) {
      try {
        const p = JSON.parse(job.requirements);
        parsedReq = Array.isArray(p) ? p : job.requirements.split('\n');
      } catch (_) {
        parsedReq = job.requirements.split('\n');
      }
    }
    parsedReq = parsedReq.map(s => String(s || '').trim()).filter(Boolean);

    let parsedLocations = [];
    if (Array.isArray(job.locations) && job.locations.length > 0) {
      parsedLocations = job.locations;
    } else if (job.location) {
      parsedLocations = job.location.split(';').map((s) => s.trim()).filter(Boolean);
    }

    setFormData({
      title: job.title || '',
      category_id: job.category_id || null,
      job_domain: job.job_domain || job.category || '',
      department: job.department || '',
      required_skills: Array.isArray(parsedSkills) ? parsedSkills : [],

      employment_type: job.employment_type || 'Full-Time',
      workplace_type: job.workplace_type || 'On-Site',
      seniority_level: job.seniority_level || 'Mid Level',
      openings_count: job.openings_count || 1,

      country: job.country || 'India',
      country_id: job.country_id || 'ctr-india',
      state: job.state || '',
      state_region_id: job.state_region_id || '',
      city: job.city || '',
      city_id: job.city_id || '',
      locality: job.locality || '',
      location: job.location || '',
      selected_locations: parsedLocations,
      new_location_input: '',

      min_experience: job.min_experience !== null ? job.min_experience : 1,
      max_experience: job.max_experience !== null ? job.max_experience : 5,
      fresher_allowed: Boolean(job.fresher_allowed),
      min_qualification: job.min_qualification || "Bachelor's Degree",
      degree: job.degree || '',
      specialization: job.specialization || '',
      notice_period: job.notice_period || '30 Days',

      min_salary: job.min_salary || '',
      max_salary: job.max_salary || '',
      currency: job.currency || 'INR',
      salary_period: job.salary_period || 'Per Year',
      salary_type: job.salary_type || 'CTC',

      benefits: Array.isArray(parsedBenefits) ? parsedBenefits : [],
      application_deadline: job.application_deadline ? String(job.application_deadline).split('T')[0] : '',
      keywords: Array.isArray(parsedKeywords) ? parsedKeywords : [],

      description: job.description || '',
      responsibilities: parsedResp,
      requirements: parsedReq,

      company_mode: job.employer_id ? 'registered' : 'manual',
      employer_id: job.employer_id || '',
      manual_company_name: job.manual_company_name || job.company_name || '',
      manual_contact_person: job.manual_contact_person || job.contact_person || '',
      manual_contact_phone: job.manual_contact_phone || job.contact_phone || '',
      manual_contact_email: job.manual_contact_email || job.contact_email || '',
      manual_company_website: job.manual_company_website || job.company_website || '',

      status: job.status || 'open',
      is_recommended: Boolean(job.is_recommended || job.priority === 'recommended'),
      allow_candidate_access: job.allow_candidate_access !== undefined && job.allow_candidate_access !== null ? Boolean(job.allow_candidate_access) : true,
      assigned_recruiter_id: job.assigned_recruiter_id || '',
      internal_notes: job.internal_notes || ''
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: null,
      job_domain: '',
      department: '',
      required_skills: ['JavaScript', 'React'],

      employment_type: 'Full-Time',
      workplace_type: 'On-Site',
      seniority_level: 'Mid Level',
      openings_count: 1,

      country: 'India',
      country_id: 'ctr-india',
      state: '',
      state_region_id: '',
      city: '',
      city_id: '',
      locality: '',
      location: '',
      selected_locations: [],
      new_location_input: '',

      min_experience: 1,
      max_experience: 5,
      fresher_allowed: false,
      min_qualification: "Bachelor's Degree",
      degree: 'B.Tech / B.E.',
      specialization: 'Computer Science',
      notice_period: '30 Days',

      min_salary: '',
      max_salary: '',
      currency: 'INR',
      salary_period: 'Per Year',
      salary_type: 'CTC',

      benefits: ['Health Insurance', 'Performance Bonus'],
      application_deadline: '',
      keywords: ['fullstack', 'react', 'nodejs'],

      description: '',
      responsibilities: [],
      requirements: [],

      company_mode: 'manual',
      employer_id: '',
      manual_company_name: '',
      manual_contact_person: '',
      manual_contact_phone: '',
      manual_contact_email: '',
      manual_company_website: '',

      status: 'open',
      is_recommended: false,
      allow_candidate_access: true,
      assigned_recruiter_id: '',
      internal_notes: ''
    });
    setError('');
    setSuccessMsg('');
    setValidationErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleOpeningsChange = (delta) => {
    setFormData((prev) => {
      const nextVal = Math.max(1, Math.min(100, (parseInt(prev.openings_count, 10) || 1) + delta));
      return { ...prev, openings_count: nextVal };
    });
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim().toLowerCase()]
      }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== kw)
    }));
  };

  const handleAddLocation = (locToAdd) => {
    let loc = (locToAdd || formData.new_location_input || '').trim();
    if (!loc) {
      const { locality, city, state, country } = formData;
      if (locality && city && state) {
        loc = `${locality}, ${city}, ${state}`;
      } else if (city && state) {
        loc = `${city}, ${state}`;
      } else if (city) {
        loc = `${city}, ${country || 'India'}`;
      } else if (state) {
        loc = `${state}, ${country || 'India'}`;
      }
    }

    if (!loc) {
      setError('Please select a state and city above or type a location to add.');
      return;
    }

    const lowerLoc = loc.toLowerCase();
    if (formData.selected_locations.some((l) => l.toLowerCase() === lowerLoc)) {
      return;
    }

    const updated = [...formData.selected_locations, loc];
    setFormData((prev) => ({
      ...prev,
      selected_locations: updated,
      new_location_input: '',
      location: updated.join('; ')
    }));

    if (validationErrors.location) {
      setValidationErrors((prev) => ({ ...prev, location: null }));
    }
  };

  const handleRemoveLocation = (locToRemove) => {
    const updated = formData.selected_locations.filter((l) => l !== locToRemove);
    setFormData((prev) => ({
      ...prev,
      selected_locations: updated,
      location: updated.join('; ')
    }));
  };

  const handleQuickLocation = (loc) => {
    handleAddLocation(loc);
  };

  // JD Word Count Calculation for Canvas
  const jdWordCount = useMemo(() => {
    const combined = [
      formData.description || '',
      ...(Array.isArray(formData.responsibilities) ? formData.responsibilities : []),
      ...(Array.isArray(formData.requirements) ? formData.requirements : [])
    ].join(' ').trim();
    return combined ? combined.split(/\s+/).filter(Boolean).length : 0;
  }, [formData.description, formData.responsibilities, formData.requirements]);

  // Responsibility Handlers
  const handleAddResponsibility = () => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: [...(Array.isArray(prev.responsibilities) ? prev.responsibilities : []), '']
    }));
  };

  const handleRemoveResponsibility = (idx) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: (Array.isArray(prev.responsibilities) ? prev.responsibilities : []).filter((_, i) => i !== idx)
    }));
  };

  const handleResponsibilityChange = (idx, value) => {
    setFormData((prev) => {
      const list = [...(Array.isArray(prev.responsibilities) ? prev.responsibilities : [])];
      list[idx] = value;
      return { ...prev, responsibilities: list };
    });
  };

  const handleMoveResponsibility = (idx, direction) => {
    setFormData((prev) => {
      const list = [...(Array.isArray(prev.responsibilities) ? prev.responsibilities : [])];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, responsibilities: list };
    });
  };

  // Requirement Handlers
  const handleAddRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...(Array.isArray(prev.requirements) ? prev.requirements : []), '']
    }));
  };

  const handleRemoveRequirement = (idx) => {
    setFormData((prev) => ({
      ...prev,
      requirements: (Array.isArray(prev.requirements) ? prev.requirements : []).filter((_, i) => i !== idx)
    }));
  };

  const handleRequirementChange = (idx, value) => {
    setFormData((prev) => {
      const list = [...(Array.isArray(prev.requirements) ? prev.requirements : [])];
      list[idx] = value;
      return { ...prev, requirements: list };
    });
  };

  const handleMoveRequirement = (idx, direction) => {
    setFormData((prev) => {
      const list = [...(Array.isArray(prev.requirements) ? prev.requirements : [])];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, requirements: list };
    });
  };

  const handleGenerateAI = async () => {
    if (!formData.title.trim()) {
      setError('Please enter a Job Title first so the AI can generate a targeted job description.');
      return;
    }
    try {
      setAiGenerating(true);
      setError('');

      const effectiveCompany = formData.company_mode === 'registered'
        ? (employers.find((e) => e.id === formData.employer_id)?.company_name || 'Scan2Serve')
        : (formData.manual_company_name || 'Scan2Serve');

      const res = await API.post('/admin/jobs/generate-jd', {
        title: formData.title.trim(),
        company_name: effectiveCompany,
        department: formData.department,
        job_domain: formData.job_domain,
        skills: formData.required_skills,
        experience: `${formData.min_experience} - ${formData.max_experience} years`,
        locationText: formData.location || (formData.selected_locations?.length > 0 ? formData.selected_locations.join(', ') : `${formData.city}, ${formData.state}`),
        location: formData.location,
        workplace_type: formData.workplace_type,
        seniority_level: formData.seniority_level,
        employment_type: formData.employment_type,
        benefits: formData.benefits
      });

      if (res && res.success && res.data) {
        const jd = res.data;
        const structured = jd.structuredData || jd;
        const overview = structured.overview || structured.description || jd.overview || jd.description || '';
        const responsibilities = Array.isArray(structured.responsibilities)
          ? structured.responsibilities
          : (Array.isArray(jd.responsibilities) ? jd.responsibilities : []);
        const requirements = Array.isArray(structured.requirements)
          ? structured.requirements
          : (Array.isArray(jd.requirements) ? jd.requirements : []);
        const skills = Array.isArray(structured.skills)
          ? structured.skills
          : (Array.isArray(jd.skills) ? jd.skills : []);

        setFormData((prev) => ({
          ...prev,
          description: overview || prev.description,
          responsibilities: responsibilities.length > 0 ? responsibilities : prev.responsibilities,
          requirements: requirements.length > 0 ? requirements : prev.requirements,
          required_skills: skills.length > 0
            ? Array.from(new Set([...prev.required_skills, ...skills]))
            : prev.required_skills
        }));
        setSuccessMsg('Job description generated successfully with AI!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res?.message || 'AI generation failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate JD with AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Job title is required';
    if (!formData.department.trim()) errs.department = 'Department is required';
    if (parseFloat(formData.min_experience) > parseFloat(formData.max_experience)) {
      errs.experience = 'Maximum experience must be greater than or equal to minimum experience';
    }
    if (formData.min_salary && formData.max_salary) {
      if (parseFloat(formData.min_salary) > parseFloat(formData.max_salary)) {
        errs.salary = 'Maximum salary must be greater than or equal to minimum salary';
      }
    }
    if (formData.company_mode === 'registered' && !formData.employer_id) {
      errs.employer_id = 'Please select a registered employer';
    }
    if (formData.company_mode === 'manual' && !formData.manual_company_name.trim()) {
      errs.manual_company_name = 'Company name is required';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      setError('Please review the form for errors before saving.');
      return;
    }

    try {
      setLoading(true);

      const computedLocation = formData.selected_locations && formData.selected_locations.length > 0
        ? formData.selected_locations.join('; ')
        : (formData.location.trim()
          ? formData.location.trim()
          : [formData.locality, formData.city, formData.state, formData.country].filter(Boolean).join(', ') || 'Remote');

      const payload = {
        ...formData,
        location: computedLocation,
        locations: formData.selected_locations || [],
        selected_locations: formData.selected_locations || [],
        employer_id: formData.company_mode === 'registered' ? formData.employer_id : null,
        min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null,
        min_experience: parseFloat(formData.min_experience) || 0,
        max_experience: parseFloat(formData.max_experience) || 0,
        openings_count: parseInt(formData.openings_count, 10) || 1,
        responsibilities: Array.isArray(formData.responsibilities)
          ? formData.responsibilities.map((s) => String(s || '').trim()).filter(Boolean)
          : (typeof formData.responsibilities === 'string' ? formData.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean) : []),
        requirements: Array.isArray(formData.requirements)
          ? formData.requirements.map((s) => String(s || '').trim()).filter(Boolean)
          : (typeof formData.requirements === 'string' ? formData.requirements.split('\n').map((s) => s.trim()).filter(Boolean) : [])
      };

      let res;
      if (isEdit) {
        res = await API.put(`/admin/jobs/${initialJob.id}`, payload);
      } else if (fromEnquiry && fromEnquiry.id) {
        res = await API.post(`/admin/enquiries/${fromEnquiry.id}/create-job`, payload);
      } else if (fromLead && fromLead.id) {
        res = await API.post(`/admin/leads/${fromLead.id}/convert-job`, payload);
      } else {
        res = await API.post('/admin/jobs', payload);
      }

      if (res.success) {
        setSuccessMsg(
          isEdit
            ? 'Job updated successfully!'
            : fromEnquiry
            ? 'Executive Search mandate created successfully!'
            : fromLead
            ? 'BD Lead converted to job mandate successfully!'
            : 'Job posting published successfully!'
        );
        setTimeout(() => {
          onSuccess(res.job || res.lead || { job_id: res.job_id });
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Operation failed.');
      }
    } catch (err) {
      setError(err.message || 'Error saving job.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[96vh] max-h-[96dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEdit
                  ? 'Edit Recruitment Mandate'
                  : fromEnquiry
                  ? `Create Mandate: ${fromEnquiry.company_name || 'Executive Search'}`
                  : fromLead
                  ? `Convert Lead: ${fromLead.company_name}`
                  : 'Create Unified Job Posting'}
              </h2>
              <p className="text-xs text-slate-300">
                Employer Portal Form Parity + Internal Recruitment Controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. Basic Job Identification */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  Basic Job Identification
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="title">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Senior Full Stack Engineer, Financial Controller, Sales Manager"
                    className={`w-full px-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-700 ${
                      validationErrors.title ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{validationErrors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <JobCategoryAutocomplete
                    selectedCategoryId={formData.category_id}
                    selectedCategoryName={formData.job_domain}
                    onSelectCategory={(cat) => {
                      setFormData((prev) => ({
                        ...prev,
                        category_id: cat.id,
                        job_domain: cat.name
                      }));
                      if (validationErrors.category_id) {
                        setValidationErrors((prev) => ({ ...prev, category_id: null }));
                      }
                    }}
                    onClearCategory={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category_id: null,
                        job_domain: ''
                      }));
                    }}
                    error={validationErrors.category_id}
                  />

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="department">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="department"
                      name="department"
                      type="text"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. Product Engineering, Corporate Finance"
                      className={`w-full px-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-700 ${
                        validationErrors.department ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {validationErrors.department && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{validationErrors.department}</p>
                    )}
                  </div>
                </div>

                {/* Required Skills Master Catalog */}
                <div className="pt-2 border-t border-slate-200">
                  <RequiredSkillsSelector
                    selectedSkills={formData.required_skills}
                    onChange={(skills) => setFormData((prev) => ({ ...prev, required_skills: skills }))}
                    token={localStorage.getItem('token')}
                    error={validationErrors.required_skills}
                  />
                </div>
              </div>
            </div>

            {/* 2. Employment & Workplace */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  Employment & Workplace
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Employment Type</label>
                  <CustomDropdown
                    id="employment_type"
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleChange}
                    options={EMPLOYMENT_TYPES}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Workplace Type</label>
                  <CustomDropdown
                    id="workplace_type"
                    name="workplace_type"
                    value={formData.workplace_type}
                    onChange={handleChange}
                    options={WORKPLACE_TYPES}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Seniority Level</label>
                  <CustomDropdown
                    id="seniority_level"
                    name="seniority_level"
                    value={formData.seniority_level}
                    onChange={handleChange}
                    options={SENIORITY_LEVELS}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="openings_count">
                    Number of Openings
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpeningsChange(-1)}
                      className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-base border border-slate-300"
                    >
                      −
                    </button>
                    <input
                      id="openings_count"
                      name="openings_count"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.openings_count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFormData((prev) => ({ ...prev, openings_count: isNaN(val) ? 1 : val }));
                      }}
                      className="flex-1 text-center py-2 bg-white text-slate-900 rounded-xl text-xs font-bold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpeningsChange(1)}
                      className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-base border border-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Job Location */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  Job Location
                </h3>
              </div>

              <div className="space-y-4">
                <DependentLocationSelector
                  country={formData.country}
                  country_id={formData.country_id}
                  state={formData.state}
                  state_region_id={formData.state_region_id}
                  city={formData.city}
                  city_id={formData.city_id}
                  locality={formData.locality}
                  onChangeLocation={(locData) => {
                    setFormData((prev) => ({
                      ...prev,
                      country: locData.country || prev.country,
                      country_id: locData.country_id || prev.country_id,
                      state: locData.state || prev.state,
                      state_region_id: locData.state_region_id || prev.state_region_id,
                      city: locData.city || prev.city,
                      city_id: locData.city_id || prev.city_id,
                      locality: locData.locality !== undefined ? locData.locality : prev.locality
                    }));
                  }}
                  errors={validationErrors}
                />

                {/* Multiple Added Locations / Hubs */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-700" />
                      Added Job Locations / Hubs
                      {formData.selected_locations && formData.selected_locations.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {formData.selected_locations.length} {formData.selected_locations.length === 1 ? 'hub' : 'hubs'}
                        </span>
                      )}
                    </label>
                    <span className="text-[11px] text-slate-500">Candidates across these locations will discover this opening</span>
                  </div>

                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50/60 rounded-xl min-h-[48px] items-center border border-blue-100">
                    {formData.selected_locations && formData.selected_locations.length > 0 ? (
                      formData.selected_locations.map((loc) => (
                        <div
                          key={loc}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 rounded-lg shadow-2xs text-xs font-semibold border border-blue-200"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-700" />
                          <span>{loc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc)}
                            className="hover:text-red-600 transition-colors ml-1 cursor-pointer font-bold"
                            title="Remove location"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No locations added yet. Select state/city above and click "+ Add Location", or pick from popular hubs below.
                      </span>
                    )}
                  </div>

                  {/* Add Location Input & Action Button */}
                  <div className="flex gap-2 mt-1">
                    <input
                      id="input-new-location"
                      type="text"
                      placeholder="Add another location (e.g. Hyderabad, Remote, Gurugram)..."
                      value={formData.new_location_input || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, new_location_input: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLocation();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-white text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700 font-medium"
                    />
                    <button
                      id="btn-add-location"
                      type="button"
                      onClick={() => handleAddLocation()}
                      className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Location</span>
                    </button>
                  </div>
                </div>

                {/* Quick suggestions pills */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Popular Locations Quick Select:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_LOCATIONS.map((loc) => {
                      const isSelected = formData.selected_locations && formData.selected_locations.includes(loc);
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleQuickLocation(loc)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="location">
                    Location Display String (Optional override / summary)
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru, Karnataka; Pune, Maharashtra"
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* 4. Experience & Qualifications */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  Experience & Qualifications
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Min Experience ({formData.min_experience} yrs)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    name="min_experience"
                    value={formData.min_experience}
                    onChange={handleChange}
                    className="w-full accent-blue-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0 yrs</span>
                    <span>15 yrs</span>
                    <span>30 yrs</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Max Experience ({formData.max_experience} yrs)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    name="max_experience"
                    value={formData.max_experience}
                    onChange={handleChange}
                    className="w-full accent-blue-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0 yrs</span>
                    <span>15 yrs</span>
                    <span>30 yrs</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Minimum Qualification</label>
                  <CustomDropdown
                    id="min_qualification"
                    name="min_qualification"
                    value={formData.min_qualification}
                    onChange={handleChange}
                    options={QUALIFICATIONS}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Notice Period</label>
                  <CustomDropdown
                    id="notice_period"
                    name="notice_period"
                    value={formData.notice_period}
                    onChange={handleChange}
                    options={NOTICE_PERIODS}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="degree">
                    Degree / Course
                  </label>
                  <input
                    id="degree"
                    name="degree"
                    type="text"
                    value={formData.degree}
                    onChange={handleChange}
                    placeholder="e.g. B.Tech / B.E., MCA, MBA"
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="specialization">
                    Specialization
                  </label>
                  <input
                    id="specialization"
                    name="specialization"
                    type="text"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science, Finance"
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="fresher_allowed"
                    name="fresher_allowed"
                    checked={formData.fresher_allowed}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-blue-700 border-slate-300 focus:ring-blue-700"
                  />
                  <label htmlFor="fresher_allowed" className="font-semibold text-slate-800 cursor-pointer">
                    Freshers are welcome to apply for this position
                  </label>
                </div>
              </div>

              {validationErrors.experience && (
                <p className="text-[11px] text-red-600 font-medium">{validationErrors.experience}</p>
              )}
            </div>

            {/* 5. Compensation */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    5
                  </span>
                  Compensation
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="min_salary">
                    Minimum Salary
                  </label>
                  <input
                    id="min_salary"
                    name="min_salary"
                    type="number"
                    min="0"
                    value={formData.min_salary}
                    onChange={handleChange}
                    placeholder="e.g. 600000"
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="max_salary">
                    Maximum Salary
                  </label>
                  <input
                    id="max_salary"
                    name="max_salary"
                    type="number"
                    min="0"
                    value={formData.max_salary}
                    onChange={handleChange}
                    placeholder="e.g. 1200000"
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Currency</label>
                  <CustomDropdown
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    options={CURRENCIES}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Salary Period</label>
                  <CustomDropdown
                    id="salary_period"
                    name="salary_period"
                    value={formData.salary_period}
                    onChange={handleChange}
                    options={SALARY_PERIODS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-800 mb-1">Salary Type</label>
                  <CustomDropdown
                    id="salary_type"
                    name="salary_type"
                    value={formData.salary_type}
                    onChange={handleChange}
                    options={SALARY_TYPES}
                  />
                </div>
              </div>

              {validationErrors.salary && (
                <p className="text-[11px] text-red-600 font-medium">{validationErrors.salary}</p>
              )}
            </div>

            {/* 6. Perks & Benefits */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    6
                  </span>
                  Perks & Benefits
                </h3>
              </div>

              <PerksAndBenefitsSelector
                selectedBenefits={formData.benefits}
                onChange={(benefits) => setFormData((prev) => ({ ...prev, benefits }))}
                token={localStorage.getItem('token')}
                error={validationErrors.benefits}
              />
            </div>

            {/* 7. Application Settings & Tags */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    7
                  </span>
                  Application Settings & Discovery Keywords
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="application_deadline">
                    Application Deadline
                  </label>
                  <input
                    id="application_deadline"
                    name="application_deadline"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.application_deadline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Discovery Keywords (press Enter or Add)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                      placeholder="e.g. backend, mern, cloud"
                      className="flex-1 px-3 py-2 bg-white text-slate-900 rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.keywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-700 font-medium border border-slate-300 text-[11px]"
                      >
                        #{k}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(k)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Job Description & AI Generator */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      8
                    </span>
                    Structured Job Specification Canvas
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                    {jdWordCount} words
                  </span>
                  <div className="flex items-center bg-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setJdTab('editor')}
                      className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        jdTab === 'editor' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Specification Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setJdTab('preview')}
                      className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        jdTab === 'preview' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview JD
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={aiGenerating}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                  {aiGenerating ? 'Generating JD with AI...' : '⚡ Auto-Generate JD with AI'}
                </button>
              </div>

              {jdTab === 'editor' ? (
                <div className="space-y-5">
                  {/* Block 1: Role Overview */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                        <span>Job Description / Role Overview</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          REQUIRED
                        </span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {(formData.description || '').length} characters
                      </span>
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Provide a comprehensive role summary, team mission, and core objectives..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-900 rounded-xl text-xs font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition-all leading-relaxed"
                    />
                  </div>

                  {/* Block 2: Key Responsibilities Dynamic List */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                        <span>Key Responsibilities</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                          {formData.responsibilities?.length || 0}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddResponsibility}
                        className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Responsibility
                      </button>
                    </div>

                    <div className="space-y-2">
                      {Array.isArray(formData.responsibilities) && formData.responsibilities.map((resp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl group hover:bg-blue-50/40 transition-colors border border-slate-200/90"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveResponsibility(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[10px] text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer p-0.5"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveResponsibility(idx, 'down')}
                              disabled={idx === formData.responsibilities.length - 1}
                              className="text-[10px] text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer p-0.5"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          <input
                            type="text"
                            value={resp}
                            onChange={(e) => handleResponsibilityChange(idx, e.target.value)}
                            placeholder="Enter key responsibility deliverable..."
                            className="flex-1 bg-transparent text-slate-900 text-xs font-normal outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveResponsibility(idx)}
                            className="opacity-40 group-hover:opacity-100 p-1 hover:text-red-600 transition-all text-xs font-bold cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {(!formData.responsibilities || formData.responsibilities.length === 0) && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-500 italic">
                            No responsibilities added yet. Click <strong className="text-blue-700">+ Add Responsibility</strong> or use <strong className="text-blue-700">Auto-Generate JD with AI</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Block 3: Requirements & Qualifications Dynamic List */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                        <span>Requirements &amp; Qualifications</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                          {formData.requirements?.length || 0}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddRequirement}
                        className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Requirement
                      </button>
                    </div>

                    <div className="space-y-2">
                      {Array.isArray(formData.requirements) && formData.requirements.map((qual, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl group hover:bg-blue-50/40 transition-colors border border-slate-200/90"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveRequirement(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[10px] text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer p-0.5"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRequirement(idx, 'down')}
                              disabled={idx === formData.requirements.length - 1}
                              className="text-[10px] text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer p-0.5"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          <input
                            type="text"
                            value={qual}
                            onChange={(e) => handleRequirementChange(idx, e.target.value)}
                            placeholder="Enter qualification or experience requirement..."
                            className="flex-1 bg-transparent text-slate-900 text-xs font-normal outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(idx)}
                            className="opacity-40 group-hover:opacity-100 p-1 hover:text-red-600 transition-all text-xs font-bold cursor-pointer"
                            title="Remove requirement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {(!formData.requirements || formData.requirements.length === 0) && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-500 italic">
                            No qualifications added yet. Click <strong className="text-blue-700">+ Add Requirement</strong> or use <strong className="text-blue-700">Auto-Generate JD with AI</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview Tab */
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5 shadow-2xs">
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                        {formData.employment_type || 'Full-Time'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {formData.workplace_type || 'On-Site'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {formData.seniority_level || 'Mid Level'}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {formData.title || 'Job Title Preview'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>
                        {formData.company_mode === 'registered'
                          ? (employers.find((e) => e.id === formData.employer_id)?.company_name || 'Hiring Company')
                          : (formData.manual_company_name || 'Hiring Company')}
                      </strong>
                      {' • '}
                      {formData.job_domain || 'Domain'} • {formData.department || 'Department'}
                      {formData.selected_locations?.length > 0 && ` • ${formData.selected_locations.join(', ')}`}
                    </p>
                  </div>

                  {formData.description ? (
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-blue-900">
                        Role Overview
                      </h5>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {formData.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No role overview provided yet.</p>
                  )}

                  {Array.isArray(formData.responsibilities) && formData.responsibilities.filter(Boolean).length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-blue-900">
                        Key Responsibilities ({formData.responsibilities.filter(Boolean).length})
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {formData.responsibilities
                          .filter(Boolean)
                          .map((r, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(formData.requirements) && formData.requirements.filter(Boolean).length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-blue-900">
                        Requirements &amp; Qualifications ({formData.requirements.filter(Boolean).length})
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {formData.requirements
                          .filter(Boolean)
                          .map((q, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              <span>{q}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {formData.required_skills?.length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-blue-900">
                        Required Skills ({formData.required_skills.length})
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.required_skills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 9. Company Association (Admin only) */}
            <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                    9
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Company Association <span className="text-[10px] text-blue-700 font-bold ml-1 px-2 py-0.5 bg-blue-100 rounded-full">Admin Only</span>
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="company_mode"
                      value="registered"
                      checked={formData.company_mode === 'registered'}
                      onChange={handleChange}
                      className="text-blue-700 focus:ring-blue-700"
                    />
                    Registered Employer Profile
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="company_mode"
                      value="manual"
                      checked={formData.company_mode === 'manual'}
                      onChange={handleChange}
                      className="text-blue-700 focus:ring-blue-700"
                    />
                    Manual Company Entry
                  </label>
                </div>
              </div>

              {formData.company_mode === 'registered' ? (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="employer_id">
                    Select Registered Employer <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="employer_id"
                    name="employer_id"
                    value={formData.employer_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-700 ${
                      validationErrors.employer_id ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="">— Select Registered Employer —</option>
                    {employers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.company_name} ({emp.contact_person || emp.email})
                      </option>
                    ))}
                  </select>
                  {validationErrors.employer_id && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{validationErrors.employer_id}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="manual_company_name">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="manual_company_name"
                      name="manual_company_name"
                      type="text"
                      value={formData.manual_company_name}
                      onChange={handleChange}
                      placeholder="e.g. Acme Innovations Pvt Ltd"
                      className={`w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-700 ${
                        validationErrors.manual_company_name ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {validationErrors.manual_company_name && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{validationErrors.manual_company_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="manual_contact_person">
                      Contact Person
                    </label>
                    <input
                      id="manual_contact_person"
                      name="manual_contact_person"
                      type="text"
                      value={formData.manual_contact_person}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="manual_contact_phone">
                      Contact Phone
                    </label>
                    <input
                      id="manual_contact_phone"
                      name="manual_contact_phone"
                      type="text"
                      value={formData.manual_contact_phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="manual_contact_email">
                      Contact Email
                    </label>
                    <input
                      id="manual_contact_email"
                      name="manual_contact_email"
                      type="email"
                      value={formData.manual_contact_email}
                      onChange={handleChange}
                      placeholder="e.g. hr@acme.com"
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-800 mb-1" htmlFor="manual_company_website">
                      Company Website
                    </label>
                    <input
                      id="manual_company_website"
                      name="manual_company_website"
                      type="url"
                      value={formData.manual_company_website}
                      onChange={handleChange}
                      placeholder="e.g. https://acmeinnovations.com"
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 10. Internal Recruitment Controls (Admin only) */}
            <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                    10
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Internal Governance Controls <span className="text-[10px] text-blue-700 font-bold ml-1 px-2 py-0.5 bg-blue-100 rounded-full">Admin Only</span>
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="status">
                    Publishing Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="open">Open — Publicly Discoverable</option>
                    <option value="draft">Draft — Internal Mandate Only</option>
                    <option value="closed">Closed — Archive Applications</option>
                    <option value="paused">Paused — Temporarily Hidden</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="assigned_recruiter_id">
                    Assigned Recruiter
                  </label>
                  <select
                    id="assigned_recruiter_id"
                    name="assigned_recruiter_id"
                    value={formData.assigned_recruiter_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="">— Unassigned —</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="is_recommended"
                    name="is_recommended"
                    checked={formData.is_recommended}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded text-blue-700 border-slate-300 focus:ring-blue-700"
                  />
                  <div>
                    <label htmlFor="is_recommended" className="font-semibold text-slate-800 cursor-pointer">
                      Featured / Recommended Mandate
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Highlighted in candidate job search feeds
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="allow_candidate_access"
                    name="allow_candidate_access"
                    checked={formData.allow_candidate_access}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded text-blue-700 border-slate-300 focus:ring-blue-700"
                  />
                  <div>
                    <label htmlFor="allow_candidate_access" className="font-semibold text-slate-800 cursor-pointer">
                      Allow Direct Candidate Access
                    </label>
                    <p className="text-[11px] text-slate-500">
                      When OFF, candidates/employers must request a callback
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-800 mb-1" htmlFor="internal_notes">
                    Internal Notes & Strategy (Confidential)
                  </label>
                  <textarea
                    id="internal_notes"
                    name="internal_notes"
                    rows={3}
                    value={formData.internal_notes}
                    onChange={handleChange}
                    placeholder="Private notes for internal recruitment team (never visible to employers or candidates)..."
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 hidden sm:block">
              10 Sections • Complete Employer Portal Form Parity + Admin Controls
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-submit-job-form"
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? (
                  'Save Changes'
                ) : fromEnquiry ? (
                  'Create Mandate from Enquiry'
                ) : fromLead ? (
                  'Create Mandate from Lead'
                ) : (
                  'Publish Job Posting'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AdminJobFormModal;
