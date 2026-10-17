import React, { useState, useEffect, useRef } from 'react';
import {  Link, useNavigate , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import DependentLocationSelector from '../../components/common/DependentLocationSelector';
import Toast from '../../components/ui/Toast';
import EmployerFooter from '../../components/employer/EmployerFooter';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

export default function EmployerCompanyProfilePage() {
  const { user, token, logout, fetchUserContext } = useAuth();
  const navigate = useNavigate();

  // State
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setSidebarOpen } = useOutletContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [profileLogoError, setProfileLogoError] = useState(false);
  const [formLogoError, setFormLogoError] = useState(false);

  // Edit Mode Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Master Catalogs State
  const [masterIndustries, setMasterIndustries] = useState([]);
  const [masterCompanyTypes, setMasterCompanyTypes] = useState([]);
  const [masterCompanySizes, setMasterCompanySizes] = useState([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    company_type: 'Private Limited Company (Pvt Ltd)',
    industry: 'Information Technology',
    website: '',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: '',
    pincode: '',
    location: '',
    company_size: '501–1,000',
    about: '',
    tagline: '',
    founded_year: '',
    logo_url: '',
    official_email: '',
    official_phone: '',
    alt_phone: '',
    contact_person_name: '',
    contact_person_designation: '',
    contact_person_email: '',
    contact_person_phone: '',
    contact_email: '',
    contact_phone: '',
    linkedin_url: '',
    instagram_url: '',
    facebook_url: '',
    twitter_url: ''
  });

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

  // Fetch Master Catalogs on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [indRes, typeRes, sizeRes] = await Promise.all([
          fetch('/api/master/industries'),
          fetch('/api/master/company-types'),
          fetch('/api/master/company-sizes')
        ]);
        const [indData, typeData, sizeData] = await Promise.all([
          indRes.json(),
          typeRes.json(),
          sizeRes.json()
        ]);

        if (indData.success && Array.isArray(indData.industries)) setMasterIndustries(indData.industries);
        if (typeData.success && Array.isArray(typeData.company_types)) setMasterCompanyTypes(typeData.company_types);
        if (sizeData.success && Array.isArray(sizeData.company_sizes)) setMasterCompanySizes(sizeData.company_sizes);
      } catch (err) {
        console.error('Error fetching master catalogs:', err);
      }
    };

    fetchMasterData();
  }, []);

  // Fetch profile on mount
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.get('/employers/profile');
      if (data.success && data.employer) {
        const emp = data.employer;
        setProfile(emp);

        setFormData({
          company_name: emp.company_name || '',
          company_type: emp.company_type || 'Private Limited Company (Pvt Ltd)',
          industry: emp.industry || 'Information Technology',
          website: emp.website || '',
          country: emp.country || 'India',
          state: emp.state || 'Karnataka',
          city: emp.city || 'Bengaluru',
          address: emp.address || '',
          pincode: emp.pincode || '',
          location: emp.location || [emp.city, emp.state, emp.country].filter(Boolean).join(', '),
          company_size: emp.company_size || '501–1,000',
          about: emp.about || '',
          tagline: emp.tagline || '',
          founded_year: emp.founded_year || '',
          logo_url: emp.logo_url || '',
          official_email: emp.official_email || emp.contact_email || user?.email || '',
          official_phone: emp.official_phone || emp.contact_phone || user?.phone || '',
          alt_phone: emp.alt_phone || '',
          contact_person_name: emp.contact_person_name || user?.name || '',
          contact_person_designation: emp.contact_person_designation || 'Primary Recruiter',
          contact_person_email: emp.contact_person_email || user?.email || '',
          contact_person_phone: emp.contact_person_phone || user?.phone || '',
          contact_email: emp.contact_email || user?.email || '',
          contact_phone: emp.contact_phone || user?.phone || '',
          linkedin_url: emp.linkedin_url || '',
          instagram_url: emp.instagram_url || '',
          facebook_url: emp.facebook_url || '',
          twitter_url: emp.twitter_url || ''
        });
      } else {
        setError(data.message || 'Failed to load company profile.');
      }
    } catch (err) {
      console.error('Error loading company profile:', err);
      setError(err.message || 'Network error while loading company profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
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
        setProfile((prev) => ({ ...prev, logo_url: data.logo_url }));
        setFormLogoError(false);
        setProfileLogoError(false);
        if (typeof fetchUserContext === 'function') fetchUserContext();
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

  // Open Edit Modal and sync form data
  const handleOpenEditModal = () => {
    if (profile) {
      setFormData({
        company_name: profile.company_name || '',
        company_type: profile.company_type || 'Private Limited Company (Pvt Ltd)',
        industry: profile.industry || 'Information Technology',
        website: profile.website || '',
        country: profile.country || 'India',
        state: profile.state || 'Karnataka',
        city: profile.city || 'Bengaluru',
        address: profile.address || '',
        pincode: profile.pincode || '',
        location: profile.location || [profile.city, profile.state, profile.country].filter(Boolean).join(', '),
        company_size: profile.company_size || '501–1,000',
        about: profile.about || '',
        tagline: profile.tagline || '',
        founded_year: profile.founded_year || '',
        logo_url: profile.logo_url || '',
        official_email: profile.official_email || profile.contact_email || user?.email || '',
        official_phone: profile.official_phone || profile.contact_phone || user?.phone || '',
        alt_phone: profile.alt_phone || '',
        contact_person_name: profile.contact_person_name || user?.name || '',
        contact_person_designation: profile.contact_person_designation || 'Primary Recruiter',
        contact_person_email: profile.contact_person_email || user?.email || '',
        contact_person_phone: profile.contact_person_phone || user?.phone || '',
        contact_email: profile.contact_email || user?.email || '',
        contact_phone: profile.contact_phone || user?.phone || '',
        linkedin_url: profile.linkedin_url || '',
        instagram_url: profile.instagram_url || '',
        facebook_url: profile.facebook_url || '',
        twitter_url: profile.twitter_url || ''
      });
    }
    setValidationErrors({});
    setIsEditModalOpen(true);
  };

  // Validation using native URL parser for social platforms
  const validateForm = () => {
    const errors = {};
    if (!formData.company_name || !formData.company_name.trim()) {
      errors.company_name = 'Company name is required.';
    }
    if (!formData.company_type || !formData.company_type.trim()) {
      errors.company_type = 'Company type is required.';
    }
    if (!formData.industry || !formData.industry.trim()) {
      errors.industry = 'Industry selection is required.';
    }
    if (!formData.country || !formData.country.trim()) {
      errors.country = 'Country is required.';
    }
    if (!formData.state || !formData.state.trim()) {
      errors.state = 'State / Region is required.';
    }
    if (!formData.city || !formData.city.trim()) {
      errors.city = 'City is required.';
    }

    const validateSocialPlatformUrl = (val, platformKey, key, label) => {
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

      if (platformKey !== 'generic') {
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
      }
    };

    validateSocialPlatformUrl(formData.website, 'generic', 'website', 'Company Website');
    validateSocialPlatformUrl(formData.linkedin_url, 'linkedin', 'linkedin_url', 'LinkedIn URL');
    validateSocialPlatformUrl(formData.instagram_url, 'instagram', 'instagram_url', 'Instagram URL');
    validateSocialPlatformUrl(formData.facebook_url, 'facebook', 'facebook_url', 'Facebook URL');
    validateSocialPlatformUrl(formData.twitter_url, 'twitter', 'twitter_url', 'X/Twitter URL');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.official_email && formData.official_email.trim() && !emailPattern.test(formData.official_email.trim())) {
      errors.official_email = 'Please enter a valid official email address.';
    }
    if (formData.contact_person_email && formData.contact_person_email.trim() && !emailPattern.test(formData.contact_person_email.trim())) {
      errors.contact_person_email = 'Please enter a valid contact person email.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes via API
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const data = await API.put('/employers/profile', formData);
      if (data.success && data.employer) {
        setProfile(data.employer);
        if (typeof fetchUserContext === 'function') fetchUserContext();
        setIsEditModalOpen(false);
        showToast('Company profile updated successfully!');
      } else {
        showToast(data.message || 'Error updating company profile.');
      }
    } catch (err) {
      console.error('Error updating company profile:', err);
      showToast(err.message || 'Error updating company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derived display variables strictly from MySQL
  const companyName = profile?.company_name || 'My Company';
  const companyInitials = companyName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'CO';

  const industry = profile?.industry || 'Not provided';
  const companyType = profile?.company_type || 'Not provided';
  const website = profile?.website || '';
  const location = profile?.location || [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Not provided';
  const companySize = profile?.company_size || 'Not provided';
  const foundedYear = profile?.founded_year || 'Not provided';
  const tagline = profile?.tagline || '';
  const about = profile?.about || 'No company description provided yet.';
  const activeJobsCount = profile?.active_jobs_count || 0;
  const jobsList = profile?.jobs || [];

  const userName = user?.name || user?.email?.split('@')[0] || 'Recruiter';
  const userDisplayName = userName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <PageTransition
      className="w-full min-h-screen bg-[#f8fafc] font-sans text-[#0f172a] antialiased flex-1 flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
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
      
        {/* Top Header Bar */}
        

        {/* Loading State */}
        {loading ? (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
            <div className="h-44 bg-slate-200 rounded-2xl w-full" />
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-red-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#0b1c30]">Profile Load Error</h2>
            <p className="text-xs text-[#444653]">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          /* Main Page View */
          <main className="flex-1 w-full pb-12">
            <div className="px-4 sm:px-6 py-4 bg-white shadow-xs border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[#444653] text-[11px] font-semibold">
                  <Link to="/recruiter" className="hover:text-[#00288e] transition-colors">
                    Employer Workspace
                  </Link>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[#00288e]">Company Profile</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30] tracking-tight">
                  Company Profile &amp; Organization Details
                </h1>
                <p className="text-xs sm:text-sm text-[#444653] max-w-3xl">
                  Manage your official company information, headquarters address, contact representatives, and social media presence.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00288e] text-white hover:bg-[#1e40af] shadow-xs transition-colors text-xs font-semibold cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Company Profile</span>
                </button>
              </div>
            </div>

            <StaggerContainer className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
              {/* Profile Card Header */}
              <StaggerItem index={0} className="rounded-2xl bg-white shadow-sm border border-slate-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm overflow-hidden">
                    {profile?.logo_url && !profileLogoError ? (
                      <img
                        src={profile.logo_url}
                        alt={companyName}
                        className="w-full h-full object-cover"
                        onError={() => setProfileLogoError(true)}
                      />
                    ) : (
                      companyInitials
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-[#0b1c30]">{companyName}</h2>
                    {tagline && <p className="text-xs text-[#444653] mt-0.5">{tagline}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#444653] flex-wrap">
                      <span className="font-semibold text-[#00288e]">{industry}</span>
                      <span>•</span>
                      <span>{companyType}</span>
                      <span>•</span>
                      <span>{location}</span>
                    </div>
                  </div>
                </div>

                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] transition-colors text-xs font-semibold border border-blue-100"
                  >
                    <span>{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    <svg className="w-3.5 h-3.5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </StaggerItem>

              {/* Data-First Profile Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Company Information */}
                <StaggerItem index={1} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-base text-[#0b1c30]">Company Information</h3>
                    <button
                      onClick={handleOpenEditModal}
                      className="text-xs font-semibold text-[#00288e] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#444653] font-medium block">Company Legal Name</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{companyName}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Industry</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{industry}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Company Structure</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{companyType}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Company Size</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{companySize}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Year Founded</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{foundedYear}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Official Website</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block truncate">
                        {website || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[#444653] text-xs font-medium block mb-1">About Company</span>
                    <p className="text-xs text-[#0b1c30] leading-relaxed whitespace-pre-line">
                      {about}
                    </p>
                  </div>
                </StaggerItem>

                {/* 2. Operating Location */}
                <StaggerItem index={2} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-base text-[#0b1c30]">Operating Location</h3>
                    <button
                      onClick={handleOpenEditModal}
                      className="text-xs font-semibold text-[#00288e] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#444653] font-medium block">Country</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.country || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">State / Region</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.state || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">City</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.city || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Pincode / Postal Code</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.pincode || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[#444653] text-xs font-medium block mb-1">Full Street Address</span>
                    <p className="text-xs text-[#0b1c30] leading-relaxed">
                      {profile?.address || 'Not provided'}
                    </p>
                  </div>
                </StaggerItem>

                {/* 3. Contact Details */}
                <StaggerItem index={3} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-base text-[#0b1c30]">Contact Representative</h3>
                    <button
                      onClick={handleOpenEditModal}
                      className="text-xs font-semibold text-[#00288e] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#444653] font-medium block">Contact Person Name</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.contact_person_name || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Designation</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">{profile?.contact_person_designation || 'Not provided'}</span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[#444653] font-medium block">Official Email</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block break-all">
                        {profile?.official_email || profile?.contact_email || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Official Phone</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">
                        {profile?.official_phone || profile?.contact_phone || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#444653] font-medium block">Alternate Phone</span>
                      <span className="font-semibold text-[#0b1c30] mt-0.5 block">
                        {profile?.alt_phone || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </StaggerItem>

                {/* 4. Social Media Profiles */}
                <StaggerItem index={4} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-base text-[#0b1c30]">Social Media Profiles</h3>
                    <button
                      onClick={handleOpenEditModal}
                      className="text-xs font-semibold text-[#00288e] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff]">
                      <span className="font-medium text-[#444653]">LinkedIn</span>
                      {profile?.linkedin_url ? (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#00288e] hover:underline truncate max-w-xs">
                          {profile.linkedin_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">Not provided</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff]">
                      <span className="font-medium text-[#444653]">Instagram</span>
                      {profile?.instagram_url ? (
                        <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#00288e] hover:underline truncate max-w-xs">
                          {profile.instagram_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">Not provided</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff]">
                      <span className="font-medium text-[#444653]">Facebook</span>
                      {profile?.facebook_url ? (
                        <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#00288e] hover:underline truncate max-w-xs">
                          {profile.facebook_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">Not provided</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff]">
                      <span className="font-medium text-[#444653]">X / Twitter</span>
                      {profile?.twitter_url ? (
                        <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#00288e] hover:underline truncate max-w-xs">
                          {profile.twitter_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">Not provided</span>
                      )}
                    </div>
                  </div>
                </StaggerItem>

              </div>

              {/* Active Jobs Card */}
              <StaggerItem index={5} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-[#0b1c30]">Active Job Requisitions ({jobsList.length})</h3>
                  <Link to="/recruiter/jobs/create" className="text-xs font-semibold text-[#00288e] hover:underline">
                    + Post New Job
                  </Link>
                </div>

                {jobsList.length === 0 ? (
                  <p className="text-xs text-[#444653]">No active jobs posted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {jobsList.map((j) => (
                      <div key={j.id} className="p-3 rounded-xl bg-[#eff4ff] flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-[#0b1c30] block">{j.title}</span>
                          <span className="text-[#444653] text-[11px]">{j.location} • {j.employment_type}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase">
                          {j.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </StaggerItem>

            </StaggerContainer>
          </main>
        )}

        {/* Footer */}
        <EmployerFooter />

      {/* ─────────────────────────────────────────────
          3. EDIT COMPANY PROFILE MODAL
      ───────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#eff4ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00288e] text-white flex items-center justify-center font-bold text-xs">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">
                    Edit Company Profile
                  </h3>
                  <p className="text-xs text-[#444653]">
                    Update company information, headquarters location, contact details, and social links
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#444653] hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold overflow-x-auto">
              {[
                { id: 'basic', label: 'Part A: Basic Info' },
                { id: 'location', label: 'Part B: HQ Location' },
                { id: 'contact', label: 'Part C: Contact Representative' },
                { id: 'social', label: 'Part D: Social Profiles' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalActiveTab(tab.id)}
                  className={`py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    modalActiveTab === tab.id
                      ? 'border-[#00288e] text-[#00288e] font-bold'
                      : 'border-transparent text-[#444653] hover:text-[#0b1c30]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* TAB 1: BASIC INFO */}
              {modalActiveTab === 'basic' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#eff4ff] border border-blue-50 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 shadow-sm relative">
                      {formData.logo_url && !formLogoError ? (
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          onError={() => setFormLogoError(true)}
                        />
                      ) : (
                        companyInitials
                      )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <label className="text-xs font-bold text-[#0b1c30]">Company Logo Upload</label>
                      <span className="text-[11px] text-[#444653]">JPG, PNG, WEBP, GIF, SVG up to 5MB</span>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="px-3 py-1.5 rounded-lg bg-[#00288e] text-white text-xs font-semibold cursor-pointer hover:bg-[#1e40af] transition-colors inline-flex items-center gap-1.5">
                          {isUploadingLogo ? 'Uploading...' : 'Choose Logo File'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logo_url: '' })}
                            className="text-[11px] text-[#ba1a1a] hover:underline cursor-pointer"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Company Name <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.company_name ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="e.g. TechCorp Solutions"
                      />
                      {validationErrors.company_name && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.company_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                        placeholder="e.g. Building next-gen software platforms"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Industry <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                      >
                        {masterIndustries.length > 0 ? (
                          masterIndustries.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))
                        ) : (
                          <>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Financial Technology (FinTech)">Financial Technology (FinTech)</option>
                            <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Company Type <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <select
                        value={formData.company_type}
                        onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                      >
                        {masterCompanyTypes.length > 0 ? (
                          masterCompanyTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))
                        ) : (
                          <option value="Private Limited Company (Pvt Ltd)">Private Limited Company (Pvt Ltd)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Company Size
                      </label>
                      <select
                        value={formData.company_size}
                        onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all cursor-pointer"
                      >
                        {masterCompanySizes.length > 0 ? (
                          masterCompanySizes.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))
                        ) : (
                          <>
                            <option value="1–10">1–10</option>
                            <option value="501–1,000">501–1,000</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Year Founded
                      </label>
                      <input
                        type="number"
                        value={formData.founded_year}
                        onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                        placeholder="e.g. 2018"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Company Website
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.website ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="https://company.com"
                      />
                      {validationErrors.website && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.website}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                      Company Description / About Story
                    </label>
                    <textarea
                      rows={4}
                      value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all resize-y"
                      placeholder="Describe your company's mission, products, and tech focus..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: LOCATION */}
              {modalActiveTab === 'location' && (
                <div className="space-y-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Full Address
                      </label>
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all resize-none"
                        placeholder="e.g. 100ft Road, Indiranagar"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                        placeholder="e.g. 560038"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACT PERSON */}
              {modalActiveTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        value={formData.official_email}
                        onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.official_email ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="official@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Official Phone
                      </label>
                      <input
                        type="text"
                        value={formData.official_phone}
                        onChange={(e) => setFormData({ ...formData, official_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                        placeholder="+91 80 4000 5000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Alternate Phone
                      </label>
                      <input
                        type="text"
                        value={formData.alt_phone}
                        onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-[#0b1c30] mb-3">Contact Representative</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                          Contact Person Name
                        </label>
                        <input
                          type="text"
                          value={formData.contact_person_name}
                          onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                          placeholder="e.g. Priya Sharma"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={formData.contact_person_designation}
                          onChange={(e) => setFormData({ ...formData, contact_person_designation: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#eff4ff] border border-slate-200 text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                          placeholder="e.g. Lead Recruiter"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SOCIAL PROFILES */}
              {modalActiveTab === 'social' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        LinkedIn URL
                      </label>
                      <input
                        type="text"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.linkedin_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="https://linkedin.com/company/techcorp"
                      />
                      {validationErrors.linkedin_url && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.linkedin_url}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Instagram URL
                      </label>
                      <input
                        type="text"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.instagram_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="https://www.instagram.com/username?igsh=abc123"
                      />
                      {validationErrors.instagram_url && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.instagram_url}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        Facebook URL
                      </label>
                      <input
                        type="text"
                        value={formData.facebook_url}
                        onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.facebook_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="https://facebook.com/techcorp"
                      />
                      {validationErrors.facebook_url && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.facebook_url}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                        X / Twitter URL
                      </label>
                      <input
                        type="text"
                        value={formData.twitter_url}
                        onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-[#eff4ff] border ${
                          validationErrors.twitter_url ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-[#0b1c30] outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                        placeholder="https://x.com/techcorp"
                      />
                      {validationErrors.twitter_url && (
                        <p className="text-[11px] text-[#ba1a1a] mt-1">{validationErrors.twitter_url}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {modalActiveTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalActiveTab === 'location') setModalActiveTab('basic');
                      if (modalActiveTab === 'contact') setModalActiveTab('location');
                      if (modalActiveTab === 'social') setModalActiveTab('contact');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#00288e] border border-slate-200 hover:bg-slate-50 text-xs font-semibold"
                  >
                    ← Previous Section
                  </button>
                )}
                {modalActiveTab !== 'social' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalActiveTab === 'basic') setModalActiveTab('location');
                      if (modalActiveTab === 'location') setModalActiveTab('contact');
                      if (modalActiveTab === 'contact') setModalActiveTab('social');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] text-xs font-bold"
                  >
                    Next Section →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-[#444653] hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#00288e] text-white hover:bg-[#1e40af] transition-colors text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
