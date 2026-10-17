import React, { useState, useEffect, useRef } from 'react';
import {  Link, useNavigate, useLocation , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import DependentLocationSelector from '../../components/common/DependentLocationSelector';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';
import {
  Building2,
  MapPin,
  Phone,
  Share2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Edit3,
  Globe,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function EmployerOnboardingPage() {
  const { user, token, fetchUserContext } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();

  // Active onboarding step: 1 (Company Info), 2 (Location), 3 (Contact), 4 (Social), 5 (Review)
  const [currentStep, setCurrentStep] = useState(1);

  // Loading & notification state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(() => {
    const routeMsg = routeLocation.state?.message;
    return routeMsg ? { message: routeMsg, type: 'info' } : null;
  });
  const toastTimer = useRef(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Master Catalogs State
  const [masterIndustries, setMasterIndustries] = useState([]);
  const [masterCompanyTypes, setMasterCompanyTypes] = useState([]);
  const [masterCompanySizes, setMasterCompanySizes] = useState([]);
  const [locationsHierarchy, setLocationsHierarchy] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    company_type: 'Private Limited Company (Pvt Ltd)',
    industry: 'Information Technology',
    website: '',
    company_size: '501–1,000',
    about: '',
    founded_year: '',
    logo_url: '',

    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: '',
    pincode: '',

    contact_person_name: user?.name || '',
    contact_person_designation: 'Recruitment Lead',
    official_email: user?.email || '',
    official_phone: user?.phone || '',
    alt_phone: '',

    linkedin_url: '',
    instagram_url: '',
    facebook_url: '',
    twitter_url: ''
  });

  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  const showToast = (message, type = 'info', options = {}) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    let finalType = type;
    if (typeof message === 'string' && type === 'info') {
      const lower = message.toLowerCase();
      if (lower.includes('error') || lower.includes('fail') || lower.includes('unable') || lower.includes('invalid')) {
        finalType = 'error';
      } else if (lower.includes('success') || lower.includes('completed') || lower.includes('uploaded')) {
        finalType = 'success';
      } else if (lower.includes('warning') || lower.includes('attention') || lower.includes('fix')) {
        finalType = 'warning';
      }
    }

    const toastObj = typeof message === 'object'
      ? message
      : { message, type: finalType, ...options };

    setToast(toastObj);

    const duration = toastObj.type === 'error' ? 6000 : 4000;
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Fetch Master Catalogs on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [indRes, typeRes, sizeRes, locRes] = await Promise.all([
          fetch('/api/master/industries'),
          fetch('/api/master/company-types'),
          fetch('/api/master/company-sizes'),
          fetch('/api/master/locations-hierarchy')
        ]);
        const [indData, typeData, sizeData, locData] = await Promise.all([
          indRes.json(),
          typeRes.json(),
          sizeRes.json(),
          locRes.json()
        ]);

        if (indData.success && Array.isArray(indData.industries)) setMasterIndustries(indData.industries);
        if (typeData.success && Array.isArray(typeData.company_types)) setMasterCompanyTypes(typeData.company_types);
        if (sizeData.success && Array.isArray(sizeData.company_sizes)) setMasterCompanySizes(sizeData.company_sizes);
        if (locData.success && locData.regions) setLocationsHierarchy(locData);
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };

    fetchMasterData();
  }, []);

  // Fetch existing employer profile to resume onboarding
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/employers/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.employer) {
          const emp = data.employer;

          // If onboarding is already complete, redirect to dashboard
          if (emp.is_onboarding_completed) {
            navigate('/recruiter');
            return;
          }

          setFormData({
            company_name: emp.company_name && emp.company_name !== 'Pending Company Profile' ? emp.company_name : '',
            company_type: emp.company_type || 'Private Limited Company (Pvt Ltd)',
            industry: emp.industry || 'Information Technology',
            website: emp.website || '',
            company_size: emp.company_size || '501–1,000',
            about: emp.about || '',
            founded_year: emp.founded_year || '',
            logo_url: emp.logo_url || '',

            country: emp.country || 'India',
            state: emp.state || 'Karnataka',
            city: emp.city || 'Bengaluru',
            address: emp.address || '',
            pincode: emp.pincode || '',

            contact_person_name: emp.contact_person_name || user?.name || '',
            contact_person_designation: emp.contact_person_designation || 'Recruitment Lead',
            official_email: emp.official_email || emp.contact_email || user?.email || '',
            official_phone: emp.official_phone || emp.contact_phone || user?.phone || '',
            alt_phone: emp.alt_phone || '',

            linkedin_url: emp.linkedin_url || '',
            instagram_url: emp.instagram_url || '',
            facebook_url: emp.facebook_url || '',
            twitter_url: emp.twitter_url || ''
          });

          if (emp.onboarding_step && emp.onboarding_step >= 1 && emp.onboarding_step <= 5) {
            setCurrentStep(emp.onboarding_step);
          }
        }
      } catch (err) {
        console.error('Error restoring onboarding session:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProfile();
  }, [token]);

  // Handle Logo Upload File Selection
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo file size must be less than 5MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToast('Only JPG, PNG, WEBP, GIF, and SVG images are allowed.');
      return;
    }

    const fileData = new FormData();
    fileData.append('logo', file);

    setIsUploadingLogo(true);
    try {
      const res = await fetch('/api/employers/profile/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fileData
      });
      const data = await res.json();
      if (data.success && data.logo_url) {
        setFormData((prev) => ({ ...prev, logo_url: data.logo_url }));
        showToast('Company logo uploaded successfully!');
      } else {
        showToast(data.message || 'Error uploading logo.');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast('Network error uploading logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Step Validation
  const validateStep = (stepNumber) => {
    const errors = {};

    if (stepNumber === 1) {
      if (!formData.company_name || !formData.company_name.trim()) {
        errors.company_name = 'Company Name / Legal Name is required.';
      }
      if (!formData.industry || !formData.industry.trim()) {
        errors.industry = 'Industry selection is required.';
      }
      if (!formData.company_type || !formData.company_type.trim()) {
        errors.company_type = 'Company Type selection is required.';
      }
      if (formData.website && formData.website.trim()) {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
        if (!urlPattern.test(formData.website.trim())) {
          errors.website = 'Please enter a valid website URL (e.g. https://company.com).';
        }
      }
    }

    if (stepNumber === 2) {
      if (!formData.country || !formData.country.trim()) errors.country = 'Country selection is required.';
      if (!formData.state || !formData.state.trim()) errors.state = 'State / Region is required.';
      if (!formData.city || !formData.city.trim()) errors.city = 'City is required.';
    }

    if (stepNumber === 3) {
      if (!formData.contact_person_name || !formData.contact_person_name.trim()) {
        errors.contact_person_name = 'Contact Person Name is required.';
      }
      if (!formData.contact_person_designation || !formData.contact_person_designation.trim()) {
        errors.contact_person_designation = 'Contact Person Designation is required.';
      }
      if (!formData.official_email || !formData.official_email.trim()) {
        errors.official_email = 'Official Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.official_email.trim())) {
        errors.official_email = 'Please enter a valid official email address.';
      }
      if (!formData.official_phone || !formData.official_phone.trim()) {
        errors.official_phone = 'Official Phone is required.';
      }
    }

    if (stepNumber === 4) {
      const validateSocialUrl = (val, platformKey, key, label) => {
        if (!val || !val.trim()) return;
        const str = val.trim();
        const lower = str.toLowerCase();
        if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
          errors[key] = `${label} contains an invalid protocol.`;
          return;
        }

        let parsed;
        try {
          const urlToParse = (lower.startsWith('http://') || lower.startsWith('https://')) ? str : `https://${str}`;
          parsed = new URL(urlToParse);
        } catch (_) {
          errors[key] = `Please enter a valid ${label}.`;
          return;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors[key] = `${label} must use HTTP or HTTPS protocol.`;
          return;
        }

        const hostname = parsed.hostname.toLowerCase();
        const allowedDomains = {
          linkedin: ['linkedin.com', 'www.linkedin.com'],
          instagram: ['instagram.com', 'www.instagram.com'],
          facebook: ['facebook.com', 'www.facebook.com'],
          twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']
        };

        const validDomains = allowedDomains[platformKey] || [];
        const isValidHost = validDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

        if (!isValidHost) {
          errors[key] = `Please enter a valid ${label} from ${platformKey}.com.`;
        }
      };

      validateSocialUrl(formData.linkedin_url, 'linkedin', 'linkedin_url', 'LinkedIn URL');
      validateSocialUrl(formData.instagram_url, 'instagram', 'instagram_url', 'Instagram URL');
      validateSocialUrl(formData.facebook_url, 'facebook', 'facebook_url', 'Facebook URL');
      validateSocialUrl(formData.twitter_url, 'twitter', 'twitter_url', 'X/Twitter URL');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Onboarding Step Incrementally
  const saveStepData = async (targetStep, isFinalComplete = false) => {
    setSaving(true);
    try {
      const res = await fetch('/api/employers/onboarding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          step: targetStep,
          is_complete: isFinalComplete,
          ...formData
        })
      });

      const data = await res.json();
      if (data.success) {
        if (isFinalComplete) {
          await fetchUserContext();
          showToast('Company profile onboarding completed successfully!');
          setTimeout(() => navigate('/recruiter'), 1200);
        } else {
          setCurrentStep(targetStep);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        showToast(data.message || 'Unable to save progress. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error saving onboarding step:', err);
      showToast('Unable to save progress. Please try again.', 'error', {
        onRetry: () => saveStepData(targetStep, isFinalComplete)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    saveStepData(currentStep + 1, false);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      saveStepData(prevStep, false);
    }
  };

  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      showToast('Please fix validation errors before finalizing profile.', 'warning');
      return;
    }
    saveStepData(5, true);
  };

  const stepsList = [
    { num: 1, label: 'Company Info', icon: Building2 },
    { num: 2, label: 'Location', icon: MapPin },
    { num: 3, label: 'Contact', icon: Phone },
    { num: 4, label: 'Social Links', icon: Share2 },
    { num: 5, label: 'Review & Complete', icon: CheckCircle2 }
  ];

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-semibold">Loading Employer Onboarding...</span>
        </div>
      </div>
    );
  }

  return (
    <PageTransition
      className="w-full min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
          <Toast
            type={toast.type || 'info'}
            title={toast.title}
            message={toast.message}
            onRetry={toast.onRetry}
            onClose={dismissToast}
          />
        </div>
      )}

      {/* Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00288e] text-white font-bold text-lg flex items-center justify-center shadow-xs">
              V
            </div>
            <div>
              <span className="font-bold text-base text-[#0b1c30] leading-tight block">Vakancy.in</span>
              <span className="text-[11px] text-[#00288e] font-bold uppercase tracking-wider">Company Profile Setup</span>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-500 font-medium block">Logged in as</span>
            <span className="text-xs font-bold text-[#0b1c30]">{user?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        
        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-[#00288e] -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%` }}
            />

            {stepsList.map((st) => {
              const IconComp = st.icon;
              const isDone = st.num < currentStep;
              const isCurrent = st.num === currentStep;

              return (
                <div key={st.num} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (st.num < currentStep) setCurrentStep(st.num);
                    }}
                    disabled={st.num > currentStep}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[#00288e] text-white cursor-pointer'
                        : isCurrent
                        ? 'bg-[#00288e] text-white ring-4 ring-blue-100 shadow-sm'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : st.num}
                  </button>
                  <span className={`text-[11px] font-semibold mt-2 hidden sm:block ${isCurrent ? 'text-[#00288e]' : 'text-slate-500'}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card Container */}
        <FadeInSection className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          
          {/* STEP 1: COMPANY INFORMATION */}
          {currentStep === 1 && (
            <StaggerContainer className="space-y-6">
              <StaggerItem index={0}>
                <h2 className="text-xl font-bold text-[#0b1c30]">Step 1: Company Information</h2>
                <p className="text-xs text-slate-500 mt-1">Provide your legal business name, industry domain, company size, and brand overview.</p>
              </StaggerItem>

              {/* Logo Upload Box */}
              <StaggerItem index={1} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Company Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#0b1c30]">Company Logo</span>
                  <span className="text-[11px] text-slate-500">JPG, PNG, WEBP, GIF, SVG up to 5MB</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-[#00288e] cursor-pointer hover:bg-slate-100 transition-colors w-fit mt-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </StaggerItem>

              <StaggerItem index={2} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Company Name / Legal Business Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="e.g. Acme TechCorp Solutions Pvt Ltd"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.company_name ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.company_name && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.company_name}</p>
                  )}
                </div>

                {/* Industry Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Industry Sector <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                  >
                    {masterIndustries.length > 0 ? (
                      masterIndustries.map((ind) => <option key={ind} value={ind}>{ind}</option>)
                    ) : (
                      <>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Banking & Financial Services">Banking &amp; Financial Services</option>
                        <option value="Healthcare & Pharmaceuticals">Healthcare &amp; Pharmaceuticals</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Company Type Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Company Structure <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <select
                    value={formData.company_type}
                    onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                  >
                    {masterCompanyTypes.length > 0 ? (
                      masterCompanyTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)
                    ) : (
                      <>
                        <option value="Private Limited Company (Pvt Ltd)">Private Limited Company (Pvt Ltd)</option>
                        <option value="Public Limited Company (PLC)">Public Limited Company (PLC)</option>
                        <option value="Startup / Early Stage">Startup / Early Stage</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Company Size Range */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Company Size Range</label>
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                  >
                    {masterCompanySizes.length > 0 ? (
                      masterCompanySizes.map((sz) => <option key={sz} value={sz}>{sz}</option>)
                    ) : (
                      <>
                        <option value="11–50">11–50</option>
                        <option value="501–1,000">501–1,000</option>
                        <option value="1,001–5,000">1,001–5,000</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Founded Year */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Year Founded</label>
                  <input
                    type="number"
                    value={formData.founded_year}
                    onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                    placeholder="e.g. 2016"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>

                {/* Company Website */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Company Website URL</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.com"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.website ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.website && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.website}</p>
                  )}
                </div>

                {/* About / Overview */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">About Company / Description</label>
                  <textarea
                    rows={4}
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    placeholder="Describe your company's mission, products, scale, and operational culture..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all resize-y"
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* STEP 2: COMPANY LOCATION */}
          {currentStep === 2 && (
            <StaggerContainer className="space-y-6">
              <StaggerItem index={0} className="relative z-50">
                <h2 className="text-xl font-bold text-[#0b1c30]">Step 2: Company Location</h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">Specify headquarters and operating region for institutional location verification.</p>
                <DependentLocationSelector
                  country={formData.country}
                  state={formData.state}
                  city={formData.city}
                  onChangeLocation={({ country, state, city }) => {
                    setFormData(prev => ({
                      ...prev,
                      country,
                      state,
                      city
                    }));
                  }}
                  errors={{
                    country: validationErrors.country,
                    state: validationErrors.state,
                    city: validationErrors.city
                  }}
                  showLocality={false}
                  layout="grid"
                />
              </StaggerItem>

              <StaggerItem index={1} className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-40">
                {/* Full Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Street Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Plot 42, Tech Corridor, Indiranagar 100ft Road"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all resize-none"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Pincode / Postal Code</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 560038"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* STEP 3: CONTACT INFORMATION */}
          {currentStep === 3 && (
            <StaggerContainer className="space-y-6">
              <StaggerItem index={0}>
                <h2 className="text-xl font-bold text-[#0b1c30]">Step 3: Contact Information</h2>
                <p className="text-xs text-slate-500 mt-1">Official communications and primary recruiter representative contact.</p>
              </StaggerItem>

              <StaggerItem index={1} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Person Name */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Contact Person Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_name}
                    onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.contact_person_name ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.contact_person_name && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.contact_person_name}</p>
                  )}
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Designation <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_designation}
                    onChange={(e) => setFormData({ ...formData, contact_person_designation: e.target.value })}
                    placeholder="e.g. Head of Talent Acquisition"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.contact_person_designation ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.contact_person_designation && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.contact_person_designation}</p>
                  )}
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Official Email <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.official_email}
                    onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                    placeholder="priya.sharma@company.com"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.official_email ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.official_email && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.official_email}</p>
                  )}
                </div>

                {/* Official Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Official Phone Number <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.official_phone}
                    onChange={(e) => setFormData({ ...formData, official_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.official_phone ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.official_phone && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.official_phone}</p>
                  )}
                </div>

                {/* Alternate Phone */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Alternate Contact Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.alt_phone}
                    onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
                    placeholder="+91 80 4000 5000"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-slate-200 text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* STEP 4: SOCIAL LINKS */}
          {currentStep === 4 && (
            <StaggerContainer className="space-y-6">
              <StaggerItem index={0}>
                <h2 className="text-xl font-bold text-[#0b1c30]">Step 4: Social Links</h2>
                <p className="text-xs text-slate-500 mt-1">Add official corporate social profiles for candidate transparency and branding.</p>
              </StaggerItem>

              <StaggerItem index={1} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* LinkedIn */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/company/acme"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.linkedin_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.linkedin_url && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.linkedin_url}</p>
                  )}
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Instagram Profile URL</label>
                  <input
                    type="text"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/acme_careers"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.instagram_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.instagram_url && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.instagram_url}</p>
                  )}
                </div>

                {/* Facebook */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">Facebook Page URL</label>
                  <input
                    type="text"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/acme"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.facebook_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.facebook_url && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.facebook_url}</p>
                  )}
                </div>

                {/* X / Twitter */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">X / Twitter URL</label>
                  <input
                    type="text"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://x.com/acme"
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                      validationErrors.twitter_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                    } text-xs text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                  />
                  {validationErrors.twitter_url && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{validationErrors.twitter_url}</p>
                  )}
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* STEP 5: REVIEW & COMPLETE */}
          {currentStep === 5 && (
            <StaggerContainer className="space-y-6">
              <StaggerItem index={0}>
                <h2 className="text-xl font-bold text-[#0b1c30]">Step 5: Review &amp; Complete Profile</h2>
                <p className="text-xs text-slate-500 mt-1">Review your company onboarding summary before completing your institutional profile.</p>
              </StaggerItem>

              {/* Summary Section 1: Company Info */}
              <StaggerItem index={1} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#00288e]" />
                    Company Information
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Company Name</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.company_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Industry</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.industry || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Structure</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.company_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Size</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.company_size || 'N/A'}</span>
                  </div>
                </div>
              </StaggerItem>

              {/* Summary Section 2: Location */}
              <StaggerItem index={2} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#00288e]" />
                    Operating Location
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Country</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.country || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">State / Region</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.state || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">City</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.city || 'N/A'}</span>
                  </div>
                </div>
              </StaggerItem>

              {/* Summary Section 3: Contact */}
              <StaggerItem index={3} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-[#00288e]" />
                    Contact Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contact Person</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.contact_person_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Designation</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.contact_person_designation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Official Email</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.official_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Official Phone</span>
                    <span className="font-semibold text-[#0b1c30]">{formData.official_phone || 'N/A'}</span>
                  </div>
                </div>
              </StaggerItem>

              {/* Summary Section 4: Social Links */}
              <StaggerItem index={4} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-[#00288e]" />
                    Social Profiles
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">LinkedIn</span>
                    <span className="font-semibold text-[#0b1c30] truncate block">{formData.linkedin_url || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Instagram</span>
                    <span className="font-semibold text-[#0b1c30] truncate block">{formData.instagram_url || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Facebook</span>
                    <span className="font-semibold text-[#0b1c30] truncate block">{formData.facebook_url || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">X / Twitter</span>
                    <span className="font-semibold text-[#0b1c30] truncate block">{formData.twitter_url || 'Not Provided'}</span>
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* Stepper Footer Controls */}
          <div className="pt-6 mt-8 border-t border-slate-200 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Next Section</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Finalizing Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Company Profile</span>
                  </>
                )}
              </button>
            )}
          </div>
        </FadeInSection>
      </main>
    </PageTransition>
  );
}
