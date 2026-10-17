import React, { useState, useEffect, useRef } from 'react';
import {  Link, useNavigate, useParams , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import JobCategoryAutocomplete from '../../components/common/JobCategoryAutocomplete';
import RequiredSkillsSelector from '../../components/common/RequiredSkillsSelector';
import DependentLocationSelector from '../../components/common/DependentLocationSelector';
import CustomDropdown from '../../components/common/CustomDropdown';
import PerksAndBenefitsSelector from '../../components/common/PerksAndBenefitsSelector';
import Toast from '../../components/ui/Toast';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

/**
 * EmployerCreateJobPage — Employer Job Creation Step 1
 * Strictly adhering to Vakancy.in business scope.
 */

const DEFAULT_LOCATIONS = [];

const SUGGESTED_LOCATIONS = [
  'Bengaluru, KA',
  'Mumbai, MH',
  'Delhi-NCR',
  'Hyderabad, TS',
  'Pune, MH',
  'Chennai, TN',
  'Remote (India)'
];

export default function EmployerCreateJobPage() {
  const { user, profile, token } = useAuth();
  const navigate = useNavigate();
  const { id: paramJobId } = useParams();

  // Navigation & edit mode state
  const { setSidebarOpen } = useOutletContext();
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingJob, setIsLoadingJob] = useState(Boolean(paramJobId));
  const [createdJobId, setCreatedJobId] = useState(paramJobId || null);
  const [originalStatus, setOriginalStatus] = useState('draft');
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const isEditMode = Boolean(paramJobId || createdJobId);

  // Form State — Final Vakancy.in Business Scope Field List
  const [formData, setFormData] = useState({
    title: '',
    category_id: null,
    job_domain: '',
    department: '',
    keywords: [],
    keyword_input: '',
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
    selected_locations: [],
    new_location_input: '',
    min_experience: 0,
    max_experience: 5,
    fresher_allowed: false,
    min_qualification: "Bachelor's Degree",
    degree: '',
    specialization: '',
    required_skills: [],
    notice_period: '30 Days',
    min_salary: '',
    max_salary: '',
    currency: 'INR',
    salary_period: 'Per Year',
    salary_type: 'CTC',
    benefits: [],
    application_deadline: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const toastTimer = useRef(null);

  const showToast = (message, type = 'info', title = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const toastObj = typeof message === 'object' && message !== null ? message : { message, type, title };
    setToast(toastObj);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Load existing job details in edit mode
  useEffect(() => {
    if (!paramJobId) return;

    const fetchJobDetails = async () => {
      setIsLoadingJob(true);
      try {
        const res = await fetch(`/api/employers/jobs/${paramJobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.job) {
          const j = data.job;
          setOriginalStatus(j.status || 'draft');
          setCreatedJobId(j.id);

          // Parse locations from relational locations array or semicolon string
          let locs = [];
          if (Array.isArray(j.locations) && j.locations.length > 0) {
            locs = j.locations;
          } else if (j.location) {
            locs = j.location.split(';').map((s) => s.trim()).filter(Boolean);
            if (locs.length === 0 && j.location.trim()) locs = [j.location.trim()];
          }

          // Parse keywords
          let parsedKeywords = [];
          if (Array.isArray(j.keywords)) {
            parsedKeywords = j.keywords;
          } else if (typeof j.keywords === 'string' && j.keywords.trim()) {
            try {
              const kJson = JSON.parse(j.keywords);
              if (Array.isArray(kJson)) parsedKeywords = kJson;
              else parsedKeywords = j.keywords.split(',').map((s) => s.trim()).filter(Boolean);
            } catch (_) {
              parsedKeywords = j.keywords.split(',').map((s) => s.trim()).filter(Boolean);
            }
          }

          // Format deadline for date input
          let deadlineStr = '';
          if (j.application_deadline) {
            deadlineStr = new Date(j.application_deadline).toISOString().split('T')[0];
          }

          let parsedSkills = [];
          if (Array.isArray(j.required_skills)) {
            parsedSkills = j.required_skills;
          } else if (typeof j.required_skills === 'string') {
            try { parsedSkills = JSON.parse(j.required_skills); } catch (_) { parsedSkills = j.required_skills.split(',').map(s => s.trim()).filter(Boolean); }
          }

          let parsedBenefits = [];
          if (Array.isArray(j.benefits)) {
            parsedBenefits = j.benefits;
          } else if (typeof j.benefits === 'string' && j.benefits.trim()) {
            try {
              const parsed = JSON.parse(j.benefits);
              if (Array.isArray(parsed)) parsedBenefits = parsed;
              else parsedBenefits = j.benefits.split(',').map(s => s.trim()).filter(Boolean);
            } catch (_) {
              parsedBenefits = j.benefits.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          parsedBenefits = parsedBenefits
            .map((b) => (typeof b === 'string' ? b : (b?.title || b?.name || b?.id || '')).toString().trim())
            .filter(Boolean);


          setFormData({
            title: j.title || '',
            department: j.department || '',
            job_domain: j.job_domain || '',
            category_id: j.category_id || null,
            keywords: parsedKeywords,
            keyword_input: '',
            employment_type: j.employment_type || 'Full-Time',
            workplace_type: j.workplace_type || 'On-Site',
            seniority_level: j.seniority_level || 'Mid Level',
            openings_count: j.openings_count || 1,
            country: j.country || 'India',
            state: j.state || '',
            city: j.city || '',
            locality: j.locality || '',
            selected_locations: locs,
            new_location_input: '',
            min_experience: j.min_experience != null ? j.min_experience : 0,
            max_experience: j.max_experience != null ? j.max_experience : 5,
            fresher_allowed: Boolean(j.fresher_allowed),
            min_qualification: j.min_qualification || "Bachelor's Degree",
            degree: j.degree || '',
            specialization: j.specialization || '',
            required_skills: parsedSkills,
            skill_input: '',
            notice_period: j.notice_period || '30 Days',
            min_salary: j.min_salary != null ? String(j.min_salary) : '',
            max_salary: j.max_salary != null ? String(j.max_salary) : '',
            currency: j.currency || 'INR',
            salary_period: j.salary_period || 'Per Year',
            salary_type: j.salary_type || 'CTC',
            benefits: parsedBenefits,
            application_deadline: deadlineStr
          });
        } else {
          showToast(data.message || 'Error loading job details.');
        }
      } catch (err) {
        console.error('Error loading job details:', err);
        showToast('Network error loading job details.');
      } finally {
        setIsLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [paramJobId, token]);

  // Form input handler
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

  // Stepper openings counter
  const handleOpeningsChange = (delta) => {
    setFormData((prev) => ({
      ...prev,
      openings_count: Math.max(1, Math.min(100, prev.openings_count + delta))
    }));
  };

  // Add keyword tag chip (case-insensitive duplicate prevention)
  const handleAddKeyword = (kwToAdd) => {
    const raw = (kwToAdd !== undefined ? kwToAdd : formData.keyword_input) || '';
    const kw = raw.trim().replace(/^#+/, '');
    if (!kw) return;

    const lower = kw.toLowerCase();
    const isDuplicate = (formData.keywords || []).some(
      (k) => typeof k === 'string' && k.toLowerCase() === lower
    );

    if (isDuplicate) {
      showToast(`Tag "${kw}" has already been added.`, 'warning');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      keywords: [...(prev.keywords || []), kw],
      keyword_input: ''
    }));
  };

  // Remove keyword tag chip
  const handleRemoveKeyword = (kwToRemove) => {
    setFormData((prev) => ({
      ...prev,
      keywords: (prev.keywords || []).filter((k) => k !== kwToRemove)
    }));
  };

  // Add location chip
  const handleAddLocation = (locToAdd) => {
    let loc = (locToAdd || formData.new_location_input).trim();
    if (!loc) {
      const { locality, city, state, country } = formData;
      if (city && state) {
        loc = locality ? `${locality}, ${city}, ${state}` : `${city}, ${state}`;
      } else if (city) {
        loc = locality ? `${locality}, ${city}` : city;
      } else if (state) {
        loc = `${state}, ${country}`;
      }
    }

    if (!loc) {
      showToast('Please select a state and city or enter a location name.');
      return;
    }

    const lowerLoc = loc.toLowerCase();
    if (formData.selected_locations.some((l) => l.toLowerCase() === lowerLoc)) {
      showToast('Location is already added.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      selected_locations: [...prev.selected_locations, loc],
      new_location_input: ''
    }));

    if (validationErrors.location) {
      setValidationErrors((prev) => ({ ...prev, location: null }));
    }
  };

  // Remove location chip
  const handleRemoveLocation = (locToRemove) => {
    setFormData((prev) => ({
      ...prev,
      selected_locations: prev.selected_locations.filter((l) => l !== locToRemove)
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Job title is required.';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title should be at least 3 characters.';
    }

    if (!formData.category_id && !formData.job_domain) {
      errors.category_id = 'Please search and select a valid Job Category from the master list.';
    }

    if (formData.selected_locations.length === 0 && !formData.city.trim()) {
      errors.location = 'At least one work location or city is required.';
    }

    if (!formData.department) {
      errors.department = 'Department is required.';
    }

    if (!formData.openings_count || formData.openings_count < 1) {
      errors.openings_count = 'At least 1 opening is required.';
    }

    setValidationErrors(errors);

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.border-\\[\\#ba1a1a\\], [class*="border-red"]');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }
      }, 50);
    }

    return !hasErrors;
  };

  // Save Job Data
  const saveJobData = async (isProceeding = false) => {
    if (!validateForm()) {
      showToast('Please complete the required fields highlighted above.', 'warning', 'Required Fields Missing');
      return null;
    }

    if (isProceeding) {
      setIsSubmitting(true);
    } else {
      setIsSavingDraft(true);
    }

    const primaryLocation = formData.selected_locations.join('; ') || [formData.city, formData.state, formData.country].filter(Boolean).join(', ');

    const payload = {
      title: formData.title.trim(),
      category_id: formData.category_id || null,
      job_domain: formData.job_domain,
      department: formData.department,
      keywords: formData.keywords || [],
      employment_type: formData.employment_type,
      workplace_type: formData.workplace_type,
      seniority_level: formData.seniority_level,
      openings_count: formData.openings_count,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      locality: formData.locality,
      location: primaryLocation,
      selected_locations: formData.selected_locations,
      min_experience: formData.min_experience ? parseInt(formData.min_experience, 10) : 0,
      max_experience: formData.max_experience ? parseInt(formData.max_experience, 10) : 0,
      fresher_allowed: formData.fresher_allowed,
      min_qualification: formData.min_qualification,
      degree: formData.degree,
      specialization: formData.specialization,
      required_skills: formData.required_skills,
      application_deadline: formData.application_deadline || null,
      notice_period: formData.notice_period,
      min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
      max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null,
      currency: formData.currency,
      salary_period: formData.salary_period,
      salary_type: formData.salary_type,
      benefits: formData.benefits || [],
      status: originalStatus || 'draft'
    };

    try {
      let endpoint = '/api/employers/jobs';
      let method = 'POST';

      if (createdJobId) {
        endpoint = `/api/employers/jobs/${createdJobId}`;
        method = 'PUT';
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        const activeId = data.job_id || createdJobId;
        setCreatedJobId(activeId);
        setLastSavedTime(new Date().toLocaleTimeString());

        if (isProceeding) {
          showToast(isEditMode ? 'Basic details updated! Proceeding to Job Description...' : 'Basic information saved! Proceeding to Job Description...', 'success');
          setTimeout(() => {
            navigate(`/recruiter/jobs/${activeId}/description`, {
              state: {
                jobId: activeId,
                jobTitle: formData.title,
                department: formData.department,
                step: 2
              }
            });
          }, 600);
        } else {
          showToast(isEditMode ? 'Job updates saved successfully.' : 'Job draft saved successfully.', 'success');
        }
        return activeId;
      } else {
        showToast(data.message || 'Error saving job details.', 'error');
        return null;
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Network error while saving job details.', 'error');
      return null;
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  const companyName = user?.company_name || 'Employer Account';
  const companyInitials = companyName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'EMP';

  const userDisplayName =
    user?.name ||
    user?.email?.split('@')[0]?.replace('.', ' ') ||
    'Employer';

  if (isLoadingJob) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#0b1c30]">Loading job posting details...</span>
        </div>
      </div>
    );
  }

  return (
    <PageTransition
      className="w-full min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased flex-1 flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[1050] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Toast
            type={toast.type || 'info'}
            title={toast.title}
            message={toast.message}
            onClose={() => {
              if (toastTimer.current) clearTimeout(toastTimer.current);
              setToast(null);
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────
          1. STANDARDIZED SIDEBAR NAVIGATION
      ───────────────────────────────────────────── */}
      

      {/* ─────────────────────────────────────────────
          2. MAIN CONTENT AREA
      ───────────────────────────────────────────── */}
      
        

        {/* Top Breadcrumb & Action Bar */}
        <section className="w-full bg-white px-6 py-3 border-b border-slate-100 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#444653]">
              <Link to="/recruiter" className="hover:text-[#00288e] transition-colors flex items-center gap-1">
                <span>Employer</span>
              </Link>
              <span className="text-slate-300">/</span>
              <Link to="/recruiter/jobs" className="hover:text-[#00288e] transition-colors">
                Jobs
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-[#0b1c30] font-bold">
                {isEditMode ? 'Edit Job' : 'Post a Job'}
              </span>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveJobData(false)}
                disabled={isSavingDraft}
                className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>{isSavingDraft ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Discard changes and return to Jobs list?')) {
                    navigate('/recruiter/jobs');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#fff2f2] hover:bg-[#ffdada] text-[#ba1a1a] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Discard</span>
              </button>
            </div>
          </div>
        </section>

        {/* Title Section */}
        <section className="w-full px-6 pt-6 pb-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight leading-tight">
              {isEditMode ? 'Edit Job Posting' : 'Create New Job Posting'}
            </h1>
            <p className="text-xs sm:text-sm text-[#444653] mt-1 leading-relaxed">
              Fill in the job specifications to publish your open position on Vakancy.in.
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. MAIN FORM
        ───────────────────────────────────────────── */}
        <FadeInSection className="w-full px-6 py-4 pb-24 flex-1">
          <StaggerContainer className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT CONTAINER: Main Form Fields */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* SECTION 1: BASIC JOB IDENTIFICATION */}
              <StaggerItem index={0} className="relative z-[70] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      1. Basic Job Identification
                    </h2>
                  </div>
                </div>

                {/* Job Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#0b1c30]" htmlFor="title">
                    Job Title <span className="text-[#ba1a1a] font-bold">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Senior Full Stack Engineer, Financial Controller, Sales Manager"
                    className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none transition-all ${
                      validationErrors.title ? 'border border-[#ba1a1a]' : 'border border-transparent'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="text-[11px] text-[#ba1a1a] font-semibold">{validationErrors.title}</p>
                  )}
                </div>

                {/* Job Category Autocomplete & Department */}
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

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="department">
                      Department <span className="text-[#ba1a1a] font-bold">*</span>
                    </label>
                    <input
                      id="department"
                      name="department"
                      type="text"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. Product Engineering, Corporate Finance"
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>
                </div>

                {/* Required Skills (Master-Driven Catalog) */}
                <div className="pt-2 border-t border-slate-100">
                  <RequiredSkillsSelector
                    selectedSkills={formData.required_skills}
                    onChange={(skills) => setFormData((prev) => ({ ...prev, required_skills: skills }))}
                    token={token}
                    error={validationErrors.required_skills}
                  />
                </div>
              </StaggerItem>

              {/* SECTION 2: EMPLOYMENT & WORKPLACE */}
              <StaggerItem index={1} className="relative z-[60] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      2. Employment &amp; Workplace
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employment Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="employment_type">
                      Employment Type <span className="text-[#ba1a1a] font-bold">*</span>
                    </label>
                    <CustomDropdown id="employment_type" name="employment_type" value={formData.employment_type} onChange={handleChange} options={[
    { label: 'Full-Time', value: 'Full-Time' },
    { label: 'Part-Time', value: 'Part-Time' },
    { label: 'Contract', value: 'Contract' },
    { label: 'Internship', value: 'Internship' },
    { label: 'Freelance', value: 'Freelance' }
  ]} />
                  </div>

                  {/* Workplace Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="workplace_type">
                      Workplace Type <span className="text-[#ba1a1a] font-bold">*</span>
                    </label>
                    <CustomDropdown id="workplace_type" name="workplace_type" value={formData.workplace_type} onChange={handleChange} options={[
    { label: 'On-Site', value: 'On-Site' },
    { label: 'Hybrid', value: 'Hybrid' },
    { label: 'Remote', value: 'Remote' }
  ]} />
                  </div>

                  {/* Seniority Level */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="seniority_level">
                      Seniority Level <span className="text-[#ba1a1a] font-bold">*</span>
                    </label>
                    <CustomDropdown id="seniority_level" name="seniority_level" value={formData.seniority_level} onChange={handleChange} options={[
    { label: 'Entry Level', value: 'Entry Level' },
    { label: 'Junior', value: 'Junior' },
    { label: 'Mid Level', value: 'Mid Level' },
    { label: 'Senior', value: 'Senior' },
    { label: 'Lead / Manager', value: 'Lead / Manager' },
    { label: 'Director', value: 'Director' }
  ]} />
                  </div>

                  {/* Number of Openings */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="openings_count">
                      Number of Openings <span className="text-[#ba1a1a] font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpeningsChange(-1)}
                        className="w-10 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] flex items-center justify-center font-bold text-lg cursor-pointer border border-slate-200/50"
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
                        className="flex-1 text-center py-2 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-base font-bold focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpeningsChange(1)}
                        className="w-10 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] flex items-center justify-center font-bold text-lg cursor-pointer border border-slate-200/50"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[11px] text-[#444653]">Total candidates to hire for this job</span>
                  </div>
                </div>
              </StaggerItem>

              {/* SECTION 3: JOB LOCATION */}
              <StaggerItem index={2} className="relative z-[50] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      3. Job Location
                    </h2>
                  </div>
                </div>

                <DependentLocationSelector
                  country={formData.country}
                  country_id={formData.country_id}
                  state={formData.state}
                  state_region_id={formData.state_region_id}
                  city={formData.city}
                  city_id={formData.city_id}
                  locality={formData.locality}
                  onChangeLocation={({ country, country_id, state, state_region_id, city, city_id, locality }) => {
                    setFormData((prev) => ({
                      ...prev,
                      country,
                      country_id,
                      state,
                      state_region_id,
                      city,
                      city_id,
                      locality
                    }));
                  }}
                  errors={validationErrors}
                  showLocality={true}
                  layout="grid"
                />

                {/* Location Tags */}
                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-xs font-bold text-[#0b1c30]">Added Job Locations / Hubs</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#eff4ff] rounded-xl min-h-[48px] items-center border border-slate-100">
                    {formData.selected_locations.length > 0 ? (
                      formData.selected_locations.map((loc) => (
                        <div
                          key={loc}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#0b1c30] rounded-lg shadow-xs text-xs font-semibold border border-slate-200/50"
                        >
                          <span>{loc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc)}
                            className="hover:text-[#ba1a1a] transition-colors ml-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No locations added yet. Select a location above and click "+ Add Location".</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Add another location (e.g. Hyderabad, Remote)..."
                      value={formData.new_location_input}
                      onChange={(e) => setFormData((prev) => ({ ...prev, new_location_input: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLocation();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[#eff4ff] text-xs text-[#0b1c30] rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLocation()}
                      className="px-3 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors cursor-pointer"
                    >
                      + Add Location
                    </button>
                  </div>
                </div>
              </StaggerItem>

              {/* SECTION 4: EXPERIENCE & QUALIFICATION */}
              <StaggerItem index={3} className="relative z-[40] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      4. Experience &amp; Qualification
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="min_experience">Minimum Experience (Years)</label>
                    <input
                      id="min_experience"
                      name="min_experience"
                      type="number"
                      min="0"
                      value={formData.min_experience}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="max_experience">Maximum Experience (Years)</label>
                    <input
                      id="max_experience"
                      name="max_experience"
                      type="number"
                      min="0"
                      value={formData.max_experience}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="fresher_allowed"
                    name="fresher_allowed"
                    type="checkbox"
                    checked={formData.fresher_allowed}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#00288e] rounded focus:ring-[#00288e] cursor-pointer"
                  />
                  <label className="text-xs font-bold text-[#0b1c30] cursor-pointer" htmlFor="fresher_allowed">
                    Fresher Allowed (0 years experience candidates can apply)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="min_qualification">Minimum Qualification / Degree</label>
                    <input
                      id="min_qualification"
                      name="min_qualification"
                      type="text"
                      value={formData.min_qualification}
                      onChange={handleChange}
                      placeholder="e.g. B.Tech / B.E., B.Com, MBA, Any Graduate"
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="specialization">
                      Field of Study / Specialization (Optional)
                    </label>
                    <input
                      id="specialization"
                      name="specialization"
                      type="text"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science, Finance, Mechanical Engineering"
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                    <p className="text-[11px] text-[#757684]">
                      Specify the candidate's preferred academic field, if relevant.
                    </p>
                  </div>
                </div>

                {/* Notice Period Constraint */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#0b1c30]" htmlFor="notice_period">
                    Notice Period Constraint
                  </label>
                  <CustomDropdown id="notice_period" name="notice_period" value={formData.notice_period} onChange={handleChange} options={[
    { label: 'Immediate', value: 'Immediate' },
    { label: '15 Days', value: '15 Days' },
    { label: '30 Days', value: '30 Days' },
    { label: '45 Days', value: '45 Days' },
    { label: '60 Days', value: '60 Days' },
    { label: '90 Days', value: '90 Days' }
  ]} />
                  <span className="text-[11px] text-[#444653]">Employer candidate notice period requirement</span>
                </div>
              </StaggerItem>

              {/* SECTION 5: COMPENSATION */}
              <StaggerItem index={4} className="relative z-[30] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      5. Compensation
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Currency */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="currency">Currency</label>
                    <CustomDropdown id="currency" name="currency" value={formData.currency} onChange={handleChange} options={[
    { label: 'INR', value: 'INR' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'GBP', value: 'GBP' }
  ]} />
                  </div>

                  {/* Salary Period */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="salary_period">Salary Period</label>
                    <CustomDropdown id="salary_period" name="salary_period" value={formData.salary_period} onChange={handleChange} options={[
    { label: 'Yearly', value: 'Yearly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Hourly', value: 'Hourly' }
  ]} />
                  </div>

                  {/* Salary Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="salary_type">Salary Type</label>
                    <CustomDropdown id="salary_type" name="salary_type" value={formData.salary_type} onChange={handleChange} options={[
    { label: 'Fixed', value: 'Fixed' },
    { label: 'Range', value: 'Range' }
  ]} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="min_salary">Minimum Salary</label>
                    <input
                      id="min_salary"
                      name="min_salary"
                      type="number"
                      placeholder="e.g. 600000"
                      value={formData.min_salary}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#0b1c30]" htmlFor="max_salary">Maximum Salary</label>
                    <input
                      id="max_salary"
                      name="max_salary"
                      type="number"
                      placeholder="e.g. 1200000"
                      value={formData.max_salary}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
                    />
                  </div>
                </div>
              </StaggerItem>

              {/* SECTION 6: PERKS & BENEFITS */}
              <StaggerItem index={5} className="relative z-[20] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      6. Perks &amp; Benefits
                    </h2>
                  </div>
                </div>

                <PerksAndBenefitsSelector
                  selectedBenefits={formData.benefits}
                  onChange={(benefits) => setFormData((prev) => ({ ...prev, benefits }))}
                  token={token}
                />
              </StaggerItem>

              {/* SECTION 7: APPLICATION SETTINGS */}
              <StaggerItem index={6} className="relative z-[10] bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      7. Application Settings
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#0b1c30]" htmlFor="application_deadline">
                    Application Deadline
                  </label>
                  <input
                    id="application_deadline"
                    name="application_deadline"
                    type="date"
                    value={formData.application_deadline}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none cursor-pointer border border-transparent"
                  />
                  <span className="text-[11px] text-[#444653]">Date until which candidate applications will be accepted</span>
                </div>
              </StaggerItem>

            </div>

            {/* RIGHT CONTAINER: Guidance & Summary */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              <StaggerItem index={2} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-bold text-[#0b1c30]">
                    Posting Checklist
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-[#444653]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                    <span>Basic Job Identification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                    <span>Employment &amp; Workplace Type</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                    <span>Location &amp; Experience Details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                    <span>Salary &amp; Compensation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                    <span>Job Description &amp; Screening</span>
                  </div>
                </div>
              </StaggerItem>
            </aside>
          </StaggerContainer>
        </FadeInSection>

        {/* STICKY BOTTOM WIZARD ACTION BAR */}
        <section className="sticky bottom-0 w-full bg-white backdrop-blur-md px-6 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-[80] border-t border-slate-100">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <Link
                to="/recruiter/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#444653] hover:text-[#0b1c30] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Jobs</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-[#444653] hidden sm:inline">
                {lastSavedTime ? `Draft saved at ${lastSavedTime}` : 'Draft ready'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => saveJobData(false)}
                disabled={isSavingDraft || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold transition-colors shadow-2xs cursor-pointer border border-blue-100/60"
              >
                {isSavingDraft ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={() => saveJobData(true)}
                disabled={isSubmitting || isSavingDraft}
                className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold transition-all shadow-md hover:bg-[#1e40af] inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Saving Job...' : isEditMode ? 'Update & Continue to Job Description' : 'Save & Continue to Job Description'}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </PageTransition>
  );
}
