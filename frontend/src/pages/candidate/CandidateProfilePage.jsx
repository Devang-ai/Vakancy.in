import React, { useState, useEffect, useRef } from 'react';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';

import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Languages as LanguagesIcon,
  Globe,
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
  Download,
  Upload,
  AlertCircle,
  ExternalLink,
  Sparkles,
  BookmarkCheck,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import DependentLocationSelector from '../../components/common/DependentLocationSelector';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import RequiredSkillsSelector from '../../components/common/RequiredSkillsSelector';

const AccordionSection = ({ id, title, icon: Icon, isOpen, onToggle, children, badgeCount }) => (
  <div className="bg-white rounded-2xl border border-[#e5eeff] shadow-sm mb-6 overflow-hidden">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between p-6 bg-white hover:bg-[#f8f9ff] transition-colors"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-[#00288e]" />}
        <h2 className="text-base font-bold text-[#0b1c30]">{title}</h2>
        {badgeCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e5eeff] text-[#00288e]">{badgeCount}</span>
        )}
      </div>
      <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="p-6 pt-0 border-t border-slate-50 mt-2">
        {children}
      </div>
    )}
  </div>
);

export default function CandidateProfilePage() {
  const { user, profile, fetchUserContext } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [openSections, setOpenSections] = useState({
    personal: true,
    professional: true,
    education: false,
    experience: false,
    skills: false,
    projects: false,
    languages: false,
    social: false
  });
  const toggleSection = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Form states
  const [personalForm, setPersonalForm] = useState({ name: '', dob: '', current_location: '', profile_type: 'experienced' });
  const [profForm, setProfForm] = useState({
    professional_headline: '',
    current_organization: '',
    current_designation: '',
    total_experience: '',
    professional_summary: '',
    preferred_location: '',
    preferred_salary: ''
  });
  const [socialForm, setSocialForm] = useState({
    portfolio_url: '',
    linkedin_url: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    github_url: ''
  });

  // Modal / form states for sub-items
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);
  const [eduForm, setEduForm] = useState({ degree: '', institution: '', specialization: '', year: '', cgpa: '' });

  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expForm, setExpForm] = useState({
    organization: '',
    designation: '',
    from_date: '',
    to_date: '',
    is_currently_working: false,
    reason_for_leaving: '',
    key_achievements: ''
  });

  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj] = useState(null);
  const [projForm, setProjForm] = useState({
    project_name: '',
    role: '',
    description: '',
    technologies: [],
    start_date: '',
    end_date: '',
    project_url: '',
    github_url: ''
  });

  const [masterLanguages, setMasterLanguages] = useState([]);
  const [selectedLangId, setSelectedLangId] = useState('');
  const [langProfs, setLangProfs] = useState({ can_read: false, can_write: false, can_speak: false });

  // Resume state
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeLimitModal, setResumeLimitModal] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [resumeToDeleteId, setResumeToDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const res = await API.get('/master/languages');
      if (res?.success && Array.isArray(res.data)) {
        setMasterLanguages(res.data);
      }
    } catch {
      // master languages optional fallback
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/candidates/me');
      if (res?.success && res.candidate) {
        const c = res.candidate;
        setProfileData({
          ...c,
          completion: res.completion,
          counts: res.counts
        });

        setPersonalForm({
          name: c.name || '',
          dob: c.dob ? c.dob.slice(0, 10) : '',
          current_location: c.current_location || '',
          profile_type: c.profile_type || 'experienced'
        });

        setProfForm({
          professional_headline: c.professional_headline || '',
          current_organization: c.current_organization || '',
          current_designation: c.current_designation || '',
          total_experience: c.total_experience || '',
          professional_summary: c.professional_summary || '',
          preferred_location: c.preferred_location || '',
          preferred_salary: c.preferred_salary || ''
        });

        setSocialForm({
          portfolio_url: c.portfolio_url || '',
          linkedin_url: c.linkedin_url || '',
          facebook_url: c.facebook_url || '',
          instagram_url: c.instagram_url || '',
          twitter_url: c.twitter_url || '',
          github_url: c.github_url || ''
        });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to load profile. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  const notifyCountsUpdate = () => {
    window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
  };

  // 1. SAVE PERSONAL INFO
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setStatusMsg({ type: '', text: '' });
      const res = await API.put('/candidates/me', personalForm);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Personal information saved successfully.' });
        await loadProfile();
        notifyCountsUpdate();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to update personal information.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error updating personal info.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // 2. SAVE PROFESSIONAL INFO
  const handleSaveProfessional = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setStatusMsg({ type: '', text: '' });
      const res = await API.put('/candidates/me/professional', profForm);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Professional information saved successfully.' });
        await loadProfile();
        notifyCountsUpdate();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to update professional info.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error updating professional info.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // 3. EDUCATION
  const handleSaveEducation = async (e) => {
    e.preventDefault();
    if (!eduForm.degree || !eduForm.institution) {
      setStatusMsg({ type: 'error', text: 'Degree and Institution are required.' });
      return;
    }
    try {
      setSaveLoading(true);
      let res;
      if (editingEdu) {
        res = await API.put(`/candidates/me/education/${editingEdu.id}`, eduForm);
      } else {
        res = await API.post('/candidates/me/education', eduForm);
      }
      if (res.success) {
        setShowEduModal(false);
        setEditingEdu(null);
        setEduForm({ degree: '', institution: '', specialization: '', year: '', cgpa: '' });
        await loadProfile();
        notifyCountsUpdate();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Error saving education.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save education record.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this education record?')) return;
    try {
      const res = await API.delete(`/candidates/me/education/${id}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete education.' });
    }
  };

  // 4. EXPERIENCE
  const handleSaveExperience = async (e) => {
    e.preventDefault();
    if (!expForm.organization || !expForm.designation) {
      setStatusMsg({ type: 'error', text: 'Organization and Designation are required.' });
      return;
    }
    try {
      setSaveLoading(true);
      let res;
      if (editingExp) {
        res = await API.put(`/candidates/me/experiences/${editingExp.id}`, expForm);
      } else {
        res = await API.post('/candidates/me/experiences', expForm);
      }
      if (res.success) {
        setShowExpModal(false);
        setEditingExp(null);
        setExpForm({ organization: '', designation: '', from_date: '', to_date: '', is_currently_working: false, reason_for_leaving: '', key_achievements: '' });
        await loadProfile();
        notifyCountsUpdate();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Error saving experience.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save experience.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm('Are you sure you want to delete this experience record?')) return;
    try {
      const res = await API.delete(`/candidates/me/experiences/${id}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete experience.' });
    }
  };

  // 5. SKILLS
  const handleUpdateSkills = async (skillsArr) => {
    try {
      const res = await API.put('/candidates/me/skills', { skills: skillsArr });
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update skills.' });
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      const res = await API.delete(`/candidates/me/skills/${id}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete skill.' });
    }
  };

  // 6. PROJECTS
  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projForm.project_name) {
      setStatusMsg({ type: 'error', text: 'Project name is required.' });
      return;
    }
    try {
      setSaveLoading(true);
      let res;
      if (editingProj) {
        res = await API.put(`/candidates/me/projects/${editingProj.id}`, projForm);
      } else {
        res = await API.post('/candidates/me/projects', projForm);
      }
      if (res.success) {
        setShowProjModal(false);
        setEditingProj(null);
        setProjForm({ project_name: '', role: '', description: '', technologies: [], start_date: '', end_date: '', project_url: '', github_url: '' });
        await loadProfile();
        notifyCountsUpdate();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Error saving project.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save project.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await API.delete(`/candidates/me/projects/${id}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete project.' });
    }
  };

  // 7. LANGUAGES
  const handleAddLanguage = async (e) => {
    e.preventDefault();
    if (!selectedLangId) return;
    try {
      const res = await API.post('/candidates/me/languages', {
        language_id: selectedLangId,
        can_read: langProfs.can_read ? 1 : 0,
        can_write: langProfs.can_write ? 1 : 0,
        can_speak: langProfs.can_speak ? 1 : 0
      });
      if (res.success) {
        setSelectedLangId('');
        setLangProfs({ can_read: false, can_write: false, can_speak: false });
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to add language.' });
    }
  };

  const handleDeleteLanguage = async (id) => {
    try {
      const res = await API.delete(`/candidates/me/languages/${id}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete language.' });
    }
  };

  // 8. SOCIAL LINKS & ADDITIONAL
  const handleSaveSocial = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      const res = await API.put('/candidates/me/additional', socialForm);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Links and additional details saved.' });
        await loadProfile();
        notifyCountsUpdate();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save links.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // 9. RESUMES
  const handleResumeFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMsg({ type: 'error', text: 'Invalid file type. Only PDF files are allowed.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Resume file must be 2 MB or smaller.' });
      return;
    }

    // Check limit
    if (profileData?.resumes?.length >= 3) {
      setResumeLimitModal(true);
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploadingResume(true);
      const res = await API.post('/candidates/me/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Resume uploaded successfully.' });
        await loadProfile();
        notifyCountsUpdate();
      } else if (res.code === 'RESUME_LIMIT_REACHED') {
        setResumeLimitModal(true);
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to upload resume.' });
      }
    } catch (err) {
      if (err.response?.data?.code === 'RESUME_LIMIT_REACHED') {
        setResumeLimitModal(true);
      } else {
        setStatusMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Error uploading resume.' });
      }
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  const handleSetPrimaryResume = async (resumeId) => {
    try {
      const res = await API.put(`/candidates/me/resumes/${resumeId}/set-primary`);
      if (res.success) {
        await loadProfile();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to set primary resume.' });
    }
  };

  const handleViewResume = async (resumeId) => {
    try {
      const res = await API.get(`/candidates/me/resumes/${resumeId}/view`);
      if (res.success && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setStatusMsg({ type: 'error', text: 'Could not open resume preview.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to view resume.' });
    }
  };

  const handleDeleteResumeRequest = (resumeId) => {
    setResumeToDeleteId(resumeId);
    setShowDeleteConfirm(true);
  };

  const executeDeleteResume = async () => {
    if (!resumeToDeleteId) return;
    setIsDeletingResume(true);
    try {
      const res = await API.delete(`/candidates/me/resumes/${resumeToDeleteId}`);
      if (res.success) {
        await loadProfile();
        notifyCountsUpdate();
        setStatusMsg({ type: 'success', text: 'Resume removed successfully.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to remove resume.' });
    } finally {
      setIsDeletingResume(false);
      setShowDeleteConfirm(false);
      setResumeToDeleteId(null);
    }
  };

  if (loading) {
    return (
      <CandidatePortalShell>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[#0b1c30]">Loading your candidate profile...</p>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  const completionPercent = profileData?.completion?.percentage || 0;
  const missingItems = profileData?.completion?.missing || [];

  return (
    <CandidatePortalShell>
        {/* Top Profile Summary Header Card */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00288e] to-[#1e40af] text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-blue-900/20">
              {(profileData?.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#0b1c30]">
                {profileData?.name || 'Candidate Name'}
              </h1>
              <p className="text-sm font-medium text-[#444653]">
                {profileData?.professional_headline || profileData?.current_designation || 'No professional title set'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#555e6d]">
                {profileData?.current_location && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {profileData.current_location}
                  </span>
                )}
                {profileData?.user_info?.email && (
                  <span>• {profileData.user_info.email}</span>
                )}
                {profileData?.user_info?.phone && (
                  <span>• {profileData.user_info.phone}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/candidate/ai-builder"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              AI Resume Builder
            </Link>
          </div>
        </div>

        {/* Real Profile Completion Card */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-[#0b1c30]">Profile Completion</h2>
              <p className="text-xs text-[#444653]">
                {completionPercent === 100
                  ? 'Your profile is 100% complete! Employers can view your complete background.'
                  : `${completionPercent}% Complete. Add missing sections to reach 100%.`}
              </p>
            </div>
            <span className="text-base font-extrabold text-[#00288e]">{completionPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#eff4ff] rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionPercent === 100 ? 'bg-emerald-500' : 'bg-[#00288e]'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          {missingItems.length > 0 && completionPercent < 100 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[#444653] font-medium">To complete profile, add:</span>
              {missingItems.slice(0, 4).map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#00288e] font-semibold text-[11px]"
                >
                  + {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMsg.text && (
          <div
            className={`p-4 rounded-xl text-sm font-medium mb-6 flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg({ type: '', text: '' })}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
        )}

        {/* SECTION 1: PERSONAL INFORMATION */}
        <AccordionSection id="personal" title="Personal Information" icon={User} isOpen={openSections.personal} onToggle={toggleSection}>
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={personalForm.name}
                    onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={personalForm.dob}
                    onChange={(e) => setPersonalForm({ ...personalForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#444653] mb-1">Current Location *</label>
                <DependentLocationSelector
                  country={personalForm.current_location ? personalForm.current_location.split(',').reverse()[0]?.trim() || 'India' : 'India'}
                  state={personalForm.current_location ? personalForm.current_location.split(',').reverse()[1]?.trim() || '' : ''}
                  city={personalForm.current_location ? personalForm.current_location.split(',').reverse()[2]?.trim() || '' : ''}
                  locality={personalForm.current_location ? personalForm.current_location.split(',').reverse()[3]?.trim() || '' : ''}
                  showLocality={true}
                  onChangeLocation={({ country, state, city, locality }) => {
                    const locStr = [locality, city, state, country].filter(Boolean).join(', ');
                    setPersonalForm({ ...personalForm, current_location: locStr });
                  }}
                />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Profile Category</label>
                  <select
                    value={personalForm.profile_type}
                    onChange={(e) => setPersonalForm({ ...personalForm, profile_type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e] bg-white"
                  >
                    <option value="experienced">Experienced Professional</option>
                    <option value="fresher">Fresher / Graduate</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Personal Information'}
                </button>
              </div>
            </form>
        </AccordionSection>

        {/* SECTION 2: PROFESSIONAL INFORMATION */}
        <AccordionSection id="professional" title="Professional Information" icon={Briefcase} isOpen={openSections.professional} onToggle={toggleSection}>
            <form onSubmit={handleSaveProfessional} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#444653] mb-1">Professional Title / Headline *</label>
                  <input
                    type="text"
                    value={profForm.professional_headline}
                    onChange={(e) => setProfForm({ ...profForm, professional_headline: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Senior Backend Engineer | Distributed Systems"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Current Organization</label>
                  <input
                    type="text"
                    value={profForm.current_organization}
                    onChange={(e) => setProfForm({ ...profForm, current_organization: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Infosys Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Current Designation</label>
                  <input
                    type="text"
                    value={profForm.current_designation}
                    onChange={(e) => setProfForm({ ...profForm, current_designation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Total Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={profForm.total_experience}
                    onChange={(e) => setProfForm({ ...profForm, total_experience: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. 3.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Preferred Salary (Annual INR / USD)</label>
                  <input
                    type="text"
                    value={profForm.preferred_salary}
                    onChange={(e) => setProfForm({ ...profForm, preferred_salary: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. ₹18,00,000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#444653] mb-1">Preferred Location</label>
                  <DependentLocationSelector
                    country={profForm.preferred_location ? profForm.preferred_location.split(',').reverse()[0]?.trim() || 'India' : 'India'}
                    state={profForm.preferred_location ? profForm.preferred_location.split(',').reverse()[1]?.trim() || '' : ''}
                    city={profForm.preferred_location ? profForm.preferred_location.split(',').reverse()[2]?.trim() || '' : ''}
                    locality={profForm.preferred_location ? profForm.preferred_location.split(',').reverse()[3]?.trim() || '' : ''}
                    showLocality={true}
                    onChangeLocation={({ country, state, city, locality }) => {
                      const locStr = [locality, city, state, country].filter(Boolean).join(', ');
                      setProfForm({ ...profForm, preferred_location: locStr });
                    }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#444653] mb-1">Professional Summary</label>
                  <textarea
                    rows={4}
                    value={profForm.professional_summary}
                    onChange={(e) => setProfForm({ ...profForm, professional_summary: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="Provide a concise summary of your professional background, expertise, and career goals."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Professional Information'}
                </button>
              </div>
            </form>
        </AccordionSection>

        {/* SECTION 3: EDUCATION */}
        <AccordionSection id="education" title="Education History" icon={GraduationCap} isOpen={openSections.education} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#444653]">Your academic degrees and institutions</p>
              </div>
              <button
                onClick={() => {
                  setEditingEdu(null);
                  setEduForm({ degree: '', institution: '', specialization: '', year: '', cgpa: '' });
                  setShowEduModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education
              </button>
            </div>

            {(!profileData?.education || profileData.education.length === 0) ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No education records added yet</p>
                <p className="text-xs text-slate-500 mb-4">Add your degree, university, and academic details.</p>
                <button
                  onClick={() => setShowEduModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] text-xs font-bold hover:bg-[#dce9ff]"
                >
                  + Add First Education Record
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {profileData.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-xl border border-slate-100 bg-[#fcfdff] flex items-start justify-between hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[#0b1c30]">{edu.degree}</h4>
                      <p className="text-xs font-medium text-[#444653]">{edu.institution}</p>
                      <div className="flex items-center gap-3 text-xs text-[#717684] mt-1">
                        {edu.specialization && <span>Specialization: {edu.specialization}</span>}
                        {edu.year && <span>• Year: {edu.year}</span>}
                        {edu.cgpa && <span>• CGPA: {edu.cgpa}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEdu(edu);
                          setEduForm({
                            degree: edu.degree || '',
                            institution: edu.institution || '',
                            specialization: edu.specialization || '',
                            year: edu.year || '',
                            cgpa: edu.cgpa || ''
                          });
                          setShowEduModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEducation(edu.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* TAB 4: EXPERIENCE */}
        {/* SECTION: EXPERIENCE */}
        <AccordionSection id="experience" title="Work Experience" icon={Briefcase} isOpen={openSections.experience} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#444653]">Your professional employment history</p>
              </div>
              <button
                onClick={() => {
                  setEditingExp(null);
                  setExpForm({
                    organization: '',
                    designation: '',
                    from_date: '',
                    to_date: '',
                    is_currently_working: false,
                    reason_for_leaving: '',
                    key_achievements: ''
                  });
                  setShowExpModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Experience
              </button>
            </div>

            {(!profileData?.experience || profileData.experience.length === 0) ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No work experience added yet</p>
                <p className="text-xs text-slate-500 mb-4">Add your past or current companies, designations, and responsibilities.</p>
                <button
                  onClick={() => setShowExpModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] text-xs font-bold hover:bg-[#dce9ff]"
                >
                  + Add First Experience Record
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {profileData.experience.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border border-slate-100 bg-[#fcfdff] flex items-start justify-between hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[#0b1c30]">{exp.designation}</h4>
                      <p className="text-xs font-medium text-[#444653]">{exp.organization}</p>
                      <p className="text-xs text-[#717684] mt-0.5">
                        {exp.from_date ? exp.from_date.slice(0, 7) : ''} —{' '}
                        {exp.is_currently_working ? 'Present' : exp.to_date ? exp.to_date.slice(0, 7) : 'Not specified'}
                      </p>
                      {exp.key_achievements && (
                        <p className="text-xs text-[#222933] mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {exp.key_achievements}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingExp(exp);
                          setExpForm({
                            organization: exp.organization || '',
                            designation: exp.designation || '',
                            from_date: exp.from_date ? exp.from_date.slice(0, 10) : '',
                            to_date: exp.to_date ? exp.to_date.slice(0, 10) : '',
                            is_currently_working: Boolean(exp.is_currently_working),
                            reason_for_leaving: exp.reason_for_leaving || '',
                            key_achievements: exp.key_achievements || ''
                          });
                          setShowExpModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* TAB 5: SKILLS */}
        {/* SECTION: SKILLS */}
        <AccordionSection id="skills" title="Skills" icon={Code2} isOpen={openSections.skills} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#0b1c30]">Skills & Competencies</h3>
              <p className="text-xs text-[#444653]">Select skills from the master catalog</p>
            </div>

            <div className="p-4 bg-[#f8f9ff] rounded-2xl border border-blue-50">
              <label className="block text-xs font-bold text-[#0b1c30] mb-2">Add / Update Skills</label>
              <RequiredSkillsSelector
                selectedSkills={(profileData?.skills || []).map(s => s.name || s)}
                onChange={(newSkillList) => handleUpdateSkills(newSkillList)}
              />
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#444653] uppercase tracking-wider mb-3">Your Current Skills ({profileData?.skills?.length || 0})</h4>
              {(!profileData?.skills || profileData.skills.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No skills selected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill) => (
                    <span
                      key={skill.id || skill.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] border border-blue-100 text-xs font-semibold text-[#00288e]"
                    >
                      {skill.name || skill}
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
        </AccordionSection>

        {/* TAB 6: PROJECTS */}
        {/* SECTION: PROJECTS */}
        <AccordionSection id="projects" title="Projects" icon={FolderGit2} isOpen={openSections.projects} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setEditingProj(null);
                  setProjForm({
                    project_name: '',
                    role: '',
                    description: '',
                    technologies: [],
                    start_date: '',
                    end_date: '',
                    project_url: '',
                    github_url: ''
                  });
                  setShowProjModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            </div>

            {(!profileData?.projects || profileData.projects.length === 0) ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No projects added yet</p>
                <p className="text-xs text-slate-500 mb-4">Showcase real-world projects, systems built, or open-source work.</p>
                <button
                  onClick={() => setShowProjModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] text-xs font-bold hover:bg-[#dce9ff]"
                >
                  + Add First Project
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.projects.map((proj) => {
                  let techList = [];
                  try {
                    techList = JSON.parse(proj.technologies);
                  } catch {
                    techList = proj.technologies ? proj.technologies.split(',') : [];
                  }
                  if (!Array.isArray(techList)) techList = [];

                  return (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl border border-slate-100 bg-[#fcfdff] flex items-start justify-between hover:border-slate-200 transition-colors"
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#0b1c30]">{proj.project_name}</h4>
                          {proj.role && <span className="text-xs text-[#444653]">({proj.role})</span>}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-[#444653] mt-1.5 leading-relaxed">{proj.description}</p>
                        )}
                        {techList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {techList.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {(proj.project_url || proj.github_url) && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            {proj.project_url && (
                              <a href={proj.project_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#00288e] hover:underline">
                                <ExternalLink className="w-3 h-3" /> Live Demo
                              </a>
                            )}
                            {proj.github_url && (
                              <a href={proj.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-700 hover:underline">
                                <ExternalLink className="w-3 h-3" /> Code Repository
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingProj(proj);
                            setProjForm({
                              project_name: proj.project_name || '',
                              role: proj.role || '',
                              description: proj.description || '',
                              technologies: techList,
                              start_date: proj.start_date ? proj.start_date.slice(0, 10) : '',
                              end_date: proj.end_date ? proj.end_date.slice(0, 10) : '',
                              project_url: proj.project_url || '',
                              github_url: proj.github_url || ''
                            });
                            setShowProjModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* TAB 7: LANGUAGES */}
        {/* SECTION: LANGUAGES */}
        <AccordionSection id="languages" title="Languages" icon={LanguagesIcon} isOpen={openSections.languages} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#0b1c30]">Languages</h3>
              <p className="text-xs text-[#444653]">Languages you can read, write, or speak</p>
            </div>

            {/* Add Language Form */}
            <form onSubmit={handleAddLanguage} className="p-4 bg-[#f8f9ff] rounded-2xl border border-blue-50 flex flex-wrap items-end gap-4">
              <div className="w-64">
                <label className="block text-xs font-bold text-[#444653] mb-1">Select Language</label>
                <select
                  value={selectedLangId}
                  onChange={(e) => setSelectedLangId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#00288e]"
                >
                  <option value="">-- Choose Language --</option>
                  {masterLanguages.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 py-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-[#444653] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={langProfs.can_read}
                    onChange={(e) => setLangProfs({ ...langProfs, can_read: e.target.checked })}
                    className="rounded text-[#00288e]"
                  />
                  <span>Read</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-[#444653] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={langProfs.can_write}
                    onChange={(e) => setLangProfs({ ...langProfs, can_write: e.target.checked })}
                    className="rounded text-[#00288e]"
                  />
                  <span>Write</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-[#444653] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={langProfs.can_speak}
                    onChange={(e) => setLangProfs({ ...langProfs, can_speak: e.target.checked })}
                    className="rounded text-[#00288e]"
                  />
                  <span>Speak</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!selectedLangId}
                className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] disabled:opacity-50"
              >
                Add Language
              </button>
            </form>

            {/* List */}
            <div className="space-y-2">
              {(!profileData?.languages || profileData.languages.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No languages added yet.</p>
              ) : (
                profileData.languages.map((l) => (
                  <div
                    key={l.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-[#fcfdff] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-bold text-[#0b1c30]">{l.name}</span>
                      <div className="flex items-center gap-3 text-xs text-[#555e6d] mt-0.5">
                        {l.can_read ? <span className="text-emerald-700">✓ Read</span> : null}
                        {l.can_write ? <span className="text-emerald-700">✓ Write</span> : null}
                        {l.can_speak ? <span className="text-emerald-700">✓ Speak</span> : null}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteLanguage(l.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
        </AccordionSection>

        {/* SECTION 8: SOCIAL LINKS */}
        <AccordionSection id="social" title="Portfolio & Social Links" icon={Globe} isOpen={openSections.social} onToggle={toggleSection}>
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm">
            <form onSubmit={handleSaveSocial} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    value={socialForm.portfolio_url}
                    onChange={(e) => setSocialForm({ ...socialForm, portfolio_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="https://yourportfolio.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={socialForm.linkedin_url}
                    onChange={(e) => setSocialForm({ ...socialForm, linkedin_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={socialForm.github_url}
                    onChange={(e) => setSocialForm({ ...socialForm, github_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="https://github.com/username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">X (Twitter) URL</label>
                  <input
                    type="url"
                    value={socialForm.twitter_url}
                    onChange={(e) => setSocialForm({ ...socialForm, twitter_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#00288e]"
                    placeholder="https://x.com/username"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Links'}
                </button>
              </div>
            </form>

            {/* RESUMES (DEDICATED SECTION INSIDE LINKS & SOCIAL) */}
            <div className="mt-10 border-t border-slate-100 pt-8 space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0b1c30]">Manage Resumes</h3>
                <p className="text-xs text-[#444653]">
                  You can upload or generate up to 3 resumes. One resume is designated as Primary.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={resumeInputRef}
                  onChange={handleResumeFileSelect}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                <button
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] disabled:opacity-50 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingResume ? 'Uploading PDF...' : 'Upload Resume (PDF)'}
                </button>

                <Link
                  to="/candidate/ai-builder"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[#00288e] text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                  Build with AI
                </Link>
              </div>
            </div>

            {/* Resume Slot Counter */}
            <div className="flex items-center gap-2 text-xs font-medium text-[#444653]">
              <span>Active Slots:</span>
              <span className="font-bold text-[#0b1c30]">
                {profileData?.resumes?.length || 0} of 3 used
              </span>
            </div>

            {/* Resumes List */}
            {(!profileData?.resumes || profileData.resumes.length === 0) ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No resumes added yet</p>
                <p className="text-xs text-slate-500 mb-4">
                  Upload an existing ATS-compliant PDF (max 2 MB) or generate one instantly using our AI Resume Builder.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => resumeInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af]"
                  >
                    Upload PDF Resume
                  </button>
                  <Link
                    to="/candidate/ai-builder"
                    className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] text-xs font-bold hover:bg-[#dce9ff]"
                  >
                    Generate with AI
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.resumes.map((resm) => {
                  const isPrimary = Boolean(resm.is_primary);
                  return (
                    <div
                      key={resm.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isPrimary
                          ? 'border-[#00288e] bg-blue-50/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isPrimary ? 'bg-[#00288e] text-white' : 'bg-[#eff4ff] text-[#00288e]'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#0b1c30] line-clamp-1">
                              {resm.resume_title || 'Resume'}
                            </h4>
                            <p className="text-[11px] text-[#555e6d] truncate max-w-[200px]">
                              {resm.file_name}
                            </p>
                          </div>
                        </div>

                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00288e] text-white text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Primary
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimaryResume(resm.id)}
                            className="text-[11px] font-bold text-[#00288e] hover:underline"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-[#717684] mb-4">
                        Added {resm.created_at ? new Date(resm.created_at).toLocaleDateString() : 'Recently'}
                        {resm.file_size ? ` • ${(resm.file_size / 1024).toFixed(0)} KB` : ''}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleViewResume(resm.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00288e] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View PDF
                        </button>

                        <button
                          onClick={() => handleDeleteResumeRequest(resm.id)}
                          disabled={isDeletingResume}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

        {/* MODAL: ADD / EDIT EDUCATION */}
        {showEduModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {editingEdu ? 'Edit Education' : 'Add Education'}
                </h3>
                <button onClick={() => setShowEduModal(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveEducation} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Degree *</label>
                  <input
                    type="text"
                    required
                    value={eduForm.degree}
                    onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. B.Tech Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Institution / University *</label>
                  <input
                    type="text"
                    required
                    value={eduForm.institution}
                    onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. IIT Delhi"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">Year</label>
                    <input
                      type="number"
                      value={eduForm.year}
                      onChange={(e) => setEduForm({ ...eduForm, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                      placeholder="2022"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">CGPA / %</label>
                    <input
                      type="text"
                      value={eduForm.cgpa}
                      onChange={(e) => setEduForm({ ...eduForm, cgpa: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                      placeholder="8.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowEduModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
                  >
                    {saveLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
        </div>
        )}

        {/* MODAL: ADD / EDIT EXPERIENCE */}
        {showExpModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {editingExp ? 'Edit Experience' : 'Add Experience'}
                </h3>
                <button onClick={() => setShowExpModal(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveExperience} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Organization *</label>
                  <input
                    type="text"
                    required
                    value={expForm.organization}
                    onChange={(e) => setExpForm({ ...expForm, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Tata Consultancy Services"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={expForm.designation}
                    onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Frontend Developer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">From Date</label>
                    <input
                      type="date"
                      value={expForm.from_date}
                      onChange={(e) => setExpForm({ ...expForm, from_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">To Date</label>
                    <input
                      type="date"
                      disabled={expForm.is_currently_working}
                      value={expForm.to_date}
                      onChange={(e) => setExpForm({ ...expForm, to_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e] disabled:bg-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 text-xs text-[#444653] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expForm.is_currently_working}
                      onChange={(e) => setExpForm({ ...expForm, is_currently_working: e.target.checked })}
                      className="rounded text-[#00288e]"
                    />
                    <span>I currently work here</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Key Responsibilities / Achievements</label>
                  <textarea
                    rows={3}
                    value={expForm.key_achievements}
                    onChange={(e) => setExpForm({ ...expForm, key_achievements: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="Led development of user authentication and dashboard APIs..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowExpModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
                  >
                    {saveLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT PROJECT */}
        {showProjModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {editingProj ? 'Edit Project' : 'Add Project'}
                </h3>
                <button onClick={() => setShowProjModal(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projForm.project_name}
                    onChange={(e) => setProjForm({ ...projForm, project_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Distributed Task Scheduler"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Role in Project</label>
                  <input
                    type="text"
                    value={projForm.role}
                    onChange={(e) => setProjForm({ ...projForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="e.g. Lead Architect"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444653] mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={projForm.description}
                    onChange={(e) => setProjForm({ ...projForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    placeholder="Describe what the project does and its architectural highlights."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">Project URL</label>
                    <input
                      type="url"
                      value={projForm.project_url}
                      onChange={(e) => setProjForm({ ...projForm, project_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={projForm.github_url}
                      onChange={(e) => setProjForm({ ...projForm, github_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowProjModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
                  >
                    {saveLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESUME LIMIT (3 RESUMES REACHED) */}
        {resumeLimitModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
              <div className="flex items-center gap-3 text-amber-600 mb-2">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-base font-extrabold text-[#0b1c30]">You can have up to 3 resumes</h3>
              </div>
              <p className="text-xs text-[#444653] mb-4 leading-relaxed">
                You have reached the maximum allowed limit of 3 resumes. Please remove one resume below to free up a slot for your new resume.
              </p>

              <div className="space-y-3 mb-6">
                {(profileData?.resumes || []).map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-[#f8f9ff] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#00288e]" />
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">{r.resume_title}</p>
                        <p className="text-[10px] text-slate-500">{r.file_name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteResumeRequest(r.id);
                        setResumeLimitModal(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setResumeLimitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title="Remove Resume?"
          message="Are you sure you want to remove this resume? This action cannot be undone."
          confirmText={isDeletingResume ? 'Removing...' : 'Remove'}
          cancelText="Cancel"
          onConfirm={executeDeleteResume}
          onCancel={() => !isDeletingResume && setShowDeleteConfirm(false)}
          isDestructive={true}
        />

      </CandidatePortalShell>
  );
}
