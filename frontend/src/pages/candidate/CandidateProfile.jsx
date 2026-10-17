import React, { useState, useEffect, useRef } from 'react';
import { User, Briefcase, GraduationCap, Code, ShieldCheck, FileText, Upload, Plus, Trash2, CheckCircle, CheckCircle2, Eye, Loader2, Calendar, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import DependentLocationSelector from '../../components/common/DependentLocationSelector';
import CustomDropdown from '../../components/common/CustomDropdown';
import RequiredSkillsSelector from '../../components/common/RequiredSkillsSelector';

const CandidateProfile = ({ isOnboarding = false, onComplete, rightCard }) => {
  const { user, profile, fetchUserContext } = useAuth();
  const [candData, setCandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const hasInitializedRef = useRef(false);

  // Form states
  const [personal, setPersonal] = useState({ name: '', dob: '', current_location: '', profile_type: 'experienced' });
  const [profInfo, setProfInfo] = useState({
    professional_headline: '',
    current_organization: '',
    current_designation: '',
    total_experience: '',
    professional_summary: '',
    preferred_location: '',
    preferred_salary: ''
  });
  const [newExp, setNewExp] = useState({ organization: '', designation: '', from_date: '', to_date: '', reason_for_leaving: '' });
  const [editingExpId, setEditingExpId] = useState(null);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', cgpa: '' });
  const [editingEduId, setEditingEduId] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [newProject, setNewProject] = useState({ project_name: '', role: '', description: '', technologies: '', start_date: '', end_date: '', project_url: '', github_url: '' });
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState({ portfolio_url: '', linkedin_url: '', facebook_url: '', instagram_url: '', twitter_url: '', github_url: '' });
  const [masterLanguages, setMasterLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [langProfs, setLangProfs] = useState({ can_read: false, can_write: false, can_speak: false });
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const uploadAbortController = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    if (parseInt(onboardingStep) > 1) {
      const prev = parseInt(onboardingStep) - 1;
      setOnboardingStep(prev);
      const stepMap = { 1: 'personal', 2: 'professional', 3: 'education', 4: 'projects', 5: 'experience', 6: 'skills', 7: 'additional' };
      setActiveTab(stepMap[prev] || 'personal');
      window.scrollTo(0, 0);
    } else {
      const q = new URLSearchParams(window.location.search); navigate(q.get('returnUrl') || '/candidate/dashboard', { replace: true });
    }
  };


  useEffect(() => {
    fetchMasterLanguages();
    if (profile?.id) loadFullProfile(profile.id);
  }, [profile]);

  
  const parseLocationStr = (locStr) => {
    if (!locStr) return { locCountry: 'India', locState: '', locCity: '' };
    const parts = locStr.split(',').map(s => s.trim());
    if (parts.length >= 3) return { locCity: parts[0], locState: parts[1], locCountry: parts[parts.length - 1] };
    if (parts.length === 2) return { locCity: '', locState: parts[0], locCountry: parts[1] };
    if (parts.length === 1) return { locCity: '', locState: '', locCountry: parts[0] };
    return { locCountry: 'India', locState: '', locCity: '' };
  };

  const loadFullProfile = async (id) => {
    try {
      if (!candData) {
        setLoading(true);
      }
      const res = await API.get('/candidates/me');
      if (res.success && res.candidate) {
        setCandData(res.candidate);
        setPersonal({
          name: res.candidate.name || '',
          dob: res.candidate.dob ? res.candidate.dob.slice(0, 10) : '',
          current_location: res.candidate.current_location || '',
          profile_type: res.candidate.profile_type || 'experienced'
        });
        setProfInfo({
          professional_headline: res.candidate.professional_headline || '',
          current_organization: res.candidate.current_organization || '',
          current_designation: res.candidate.current_designation || '',
          total_experience: res.candidate.total_experience || '',
          professional_summary: res.candidate.professional_summary || '',
          preferred_location: res.candidate.preferred_location || '',
          preferred_salary: res.candidate.preferred_salary || ''
        });
        if (res.candidate.exec_details) {
          
        if (isOnboarding && res.candidate.onboarding_step && !hasInitializedRef.current) {
          setOnboardingStep(res.candidate.onboarding_step);
          const stepMap = { 1: 'personal', 2: 'professional', 3: 'education', 4: 'projects', 5: 'experience', 6: 'skills', 7: 'additional' };
          setActiveTab(stepMap[res.candidate.onboarding_step] || 'personal');
          hasInitializedRef.current = true;
        }
        setExec({
            team_size: res.candidate.exec_details.team_size || 0,
            reporting_to: res.candidate.exec_details.reporting_to || '',
            passport_number: res.candidate.exec_details.passport_number || '',
            passport_expiry: res.candidate.exec_details.passport_expiry ? res.candidate.exec_details.passport_expiry.slice(0, 10) : '',
            notice_period: res.candidate.exec_details.notice_period || '',
            current_ctc: res.candidate.exec_details.current_ctc || '',
            expected_ctc: res.candidate.exec_details.expected_ctc || '',
            portfolio_url: res.candidate.portfolio_url || '',
            linkedin_url: res.candidate.linkedin_url || '',
            facebook_url: res.candidate.facebook_url || '',
            instagram_url: res.candidate.instagram_url || '',
            twitter_url: res.candidate.twitter_url || ''
          });
        }
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  
  
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.project_name) {
      setMsg({ type: 'error', text: 'Project name is required' });
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (editingProjectId) {
        res = await API.put(`/candidates/me/projects/${editingProjectId}`, newProject);
      } else {
        res = await API.post('/candidates/me/projects', newProject);
      }
      if (res.success) {
        setMsg({ type: 'success', text: editingProjectId ? 'Project updated successfully' : 'Project added successfully' });
        setNewProject({ project_name: '', role: '', description: '', technologies: '', start_date: '', end_date: '', project_url: '', github_url: '' });
        setEditingProjectId(null);
        loadFullProfile(profile.id);
      } else {
        setMsg({ type: 'error', text: res.message });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save project' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProject = (proj) => {
    setEditingProjectId(proj.id);
    let parsedTech = [];
    try { parsedTech = JSON.parse(proj.technologies); } catch { parsedTech = typeof proj.technologies === 'string' ? proj.technologies.split(',') : (proj.technologies || []); }
    setNewProject({
      project_name: proj.project_name,
      role: proj.role || '',
      description: proj.description || '',
      technologies: parsedTech,
      start_date: proj.start_date ? proj.start_date.slice(0,10) : '',
      end_date: proj.end_date ? proj.end_date.slice(0,10) : '',
      project_url: proj.project_url || '',
      github_url: proj.github_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setNewProject({ project_name: '', role: '', description: '', technologies: '', start_date: '', end_date: '', project_url: '', github_url: '' });
  };
  const handleDeleteProject = async (id) => {
    if(!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await API.delete(`/candidates/me/projects/${id}`);
      if (res.success) {
        setMsg({ type: 'success', text: 'Project deleted' });
        loadFullProfile();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to delete project' });
    }
  };

  const handleNextStep = async () => {
    try {
      setSubmitting(true);
      const currentStep = parseInt(onboardingStep, 10) || 1;
      const next = currentStep + 1;
      const isComplete = next > 7;
      
      await API.put('/candidates/me/onboarding', { 
        onboarding_step: isComplete ? 7 : next, 
        is_onboarding_completed: isComplete 
      });
      
      if (isComplete) {
        if (onComplete) onComplete();
      } else {
        setOnboardingStep(next);
        const stepMap = { 1: 'personal', 2: 'professional', 3: 'education', 4: 'projects', 5: 'experience', 6: 'skills', 7: 'additional' };
        setActiveTab(stepMap[next] || 'personal');
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to proceed to next step' });
    } finally {
      setSubmitting(false);
    }
  };

  
  const renderOnboardingControls = () => {
    if (!isOnboarding) return null;
    return (
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm shadow-sm"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNextStep}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm shadow-sm"
        >
          {submitting ? 'Saving...' : (onboardingStep === 7 ? 'Complete Onboarding' : 'Save & Continue →')}
        </button>
      </div>
    );
  };

  const handleUpdatePersonal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await API.put('/candidates/me', personal);
      if (res.success) {
        setMsg({ type: 'success', text: 'Personal information updated successfully.' });
        if (isOnboarding) await handleNextStep();
        fetchUserContext();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

    const handleAddEdu = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newEdu.degree) return;
    setSubmitting(true);
    try {
      let res;
      if (editingEduId) {
        res = await API.put(`/candidates/me/education/${editingEduId}`, newEdu);
      } else {
        res = await API.post('/candidates/me/education', newEdu);
      }
      if (res.success) {
        setNewEdu({ degree: '', institution: '', year: '', cgpa: '' });
        setEditingEduId(null);
        loadFullProfile(profile.id);
        setMsg({ type: 'success', text: editingEduId ? 'Education updated' : 'Education added' });
      } else {
        setMsg({ type: 'error', text: res.message });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to save education' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEdu = (edu) => {
    setEditingEduId(edu.id);
    setNewEdu({
      degree: edu.degree || '',
      institution: edu.institution || '',
      year: edu.year || '',
      cgpa: edu.cgpa || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEditEdu = () => {
    setEditingEduId(null);
    setNewEdu({ degree: '', institution: '', year: '', cgpa: '' });
  };

  const handleDeleteEdu = async (id) => {
    if(!window.confirm('Are you sure you want to delete this education?')) return;
    try {
      await API.delete(`/candidates/me/education/${id}`);
      loadFullProfile(profile.id);
      setMsg({ type: 'success', text: 'Education deleted' });
    } catch(err) {
      console.warn(err);
    }
  };

  const handleAddExp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newExp.organization) return;
    setSubmitting(true);
    try {
      let res;
      if (editingExpId) {
        res = await API.put(`/candidates/me/experiences/${editingExpId}`, newExp);
      } else {
        res = await API.post('/candidates/me/experiences', newExp);
      }
      if (res.success) {
        setNewExp({ organization: '', designation: '', from_date: '', to_date: '', reason_for_leaving: '' });
        setEditingExpId(null);
        loadFullProfile(profile.id);
        setMsg({ type: 'success', text: editingExpId ? 'Experience updated' : 'Experience added' });
      } else {
        setMsg({ type: 'error', text: res.message });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to save experience' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExp = (exp) => {
    setEditingExpId(exp.id);
    setNewExp({
      organization: exp.organization || '',
      designation: exp.designation || '',
      from_date: exp.from_date ? exp.from_date.slice(0, 10) : '',
      to_date: exp.to_date ? exp.to_date.slice(0, 10) : '',
      reason_for_leaving: exp.reason_for_leaving || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditExp = () => {
    setEditingExpId(null);
    setNewExp({ organization: '', designation: '', from_date: '', to_date: '', reason_for_leaving: '' });
  };

  const handleDeleteExp = async (id) => {
    if(!window.confirm('Are you sure you want to delete this experience?')) return;
    try {
      await API.delete(`/candidates/me/experiences/${id}`);
      loadFullProfile(profile.id);
      setMsg({ type: 'success', text: 'Experience deleted' });
    } catch(err) {
      console.warn(err);
    }
  };

  const handleSkillsChange = async (newSkillsArray) => {
    try {
      const res = await API.put('/candidates/me/skills', { skills: newSkillsArray });
      if (res.success) {
        loadFullProfile(profile.id);
        setMsg({ type: 'success', text: 'Skills updated successfully' });
      } else {
        setMsg({ type: 'error', text: res.message || 'Failed to update skills' });
      }
    } catch (err) {
      console.warn(err);
      const errorMsg = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Failed to update skills';
      setMsg({ type: 'error', text: errorMsg });
      // Reload profile to restore selected skills back to valid state
      loadFullProfile(profile?.id);
    }
  };

  const handleUpdateProfessional = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await API.put('/candidates/me/professional', profInfo);
      if (res.success) {
        setMsg({ type: 'success', text: 'Professional info updated successfully.' });
        if (isOnboarding) await handleNextStep();
        fetchUserContext();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };


  const fetchMasterLanguages = async () => {
    try {
      const res = await API.get('/master/languages');
      if (res.success) setMasterLanguages(res.languages || []);
    } catch (error) {
      console.error("Failed to fetch languages:", error);
    }
  };

  const handleSaveAdditionalInfo = async () => {
    setSubmitting(true);
    try {
      const res = await API.put('/candidates/me/additional', additionalInfo);
      if (res.success) {
        setMsg({ type: 'success', text: 'Additional details saved.' });
        if (isOnboarding) await handleNextStep();
        fetchUserContext();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLanguage = async () => {
    if (!selectedLanguage) return;

    const langExists = candData?.languages?.some(l => l.name.toLowerCase() === selectedLanguage.toLowerCase());
    if (langExists) {
      setMsg({ type: 'error', text: 'This language has already been added.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        language_name: selectedLanguage,
        can_read: langProfs.can_read,
        can_write: langProfs.can_write,
        can_speak: langProfs.can_speak,
        can_understand: true // Default to true as it's implied by reading/writing/speaking
      };
      const res = await API.post('/candidates/me/languages', payload);
      if (res.success) {
        setSelectedLanguage('');
        setLangProfs({ can_read: false, can_write: false, can_speak: false });
        loadFullProfile(profile.id);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLanguage = async (id) => {
    try {
      const res = await API.delete(`/candidates/me/languages/${id}`);
      if (res.success) loadFullProfile(profile.id);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleUploadResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setResumeError('');

    if (candData?.resumes?.length >= 3) {
      setResumeError('You can upload up to 3 resumes. Delete an existing resume to upload a new one.');
      e.target.value = null;
      return;
    }

    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setResumeError('Only PDF files are allowed for resumes.');
      e.target.value = null;
      return;
    }

    const MAX_RESUME_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_RESUME_SIZE) {
      setResumeError('Resume file must be 2 MB or smaller.');
      e.target.value = null;
      return;
    }

    setUploadingResume(true);
    uploadAbortController.current = new AbortController();
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await API.post('/candidates/me/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: uploadAbortController.current.signal
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Resume uploaded successfully.' });
        loadFullProfile(profile.id);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        setResumeError('Upload cancelled.');
      } else {
        setResumeError(err.message || 'Error uploading resume');
      }
    } finally {
      setUploadingResume(false);
      uploadAbortController.current = null;
      e.target.value = null;
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }
  };

  const handleSetPrimaryResume = async (id) => {
    try {
      const res = await API.put(`/candidates/me/resumes/${id}/set-primary`);
      if (res.success) loadFullProfile(profile.id);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteResume = async (id) => {
    try {
      const res = await API.delete(`/candidates/me/resumes/${id}`);
      if (res.success) loadFullProfile(profile.id);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setResumeToDelete(null);
    }
  };

  const handleViewResume = async (id) => {
    try {
      const res = await API.get(`/candidates/me/resumes/${id}/view`);
      if (res.success && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setMsg({ type: 'error', text: 'Error viewing resume' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error viewing resume' });
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-600 text-sm flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#00288e]" /> Loading Candidate Profile...</div>;
  }

  return (
    <div className="space-y-6">
      {!isOnboarding && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Candidate Profile</h1>
            <p className="text-xs text-slate-600">Manage your resume, experience, education, skills, and additional details</p>
          </div>
          {candData?.is_premium && <StatusBadge status="PREMIUM MEMBER" />}
        </div>
      )}

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700'}`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs Header */}
      {!isOnboarding && (
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'personal', label: 'Personal Info', icon: User },
          { id: 'professional', label: 'Professional Info', icon: Briefcase },
          { id: 'education', label: 'Education', icon: GraduationCap },
            { id: 'projects', label: 'Projects', icon: FileText },
          { id: 'experience', label: 'Experience', icon: Briefcase },
          { id: 'skills', label: 'Skills', icon: Code },
          { id: 'resumes', label: 'Resumes', icon: FileText },
          { id: 'additional', label: 'Languages & Additional Info', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00288e] hover:bg-[#1e40af] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      )}

      {isOnboarding && (
        <div className="flex items-center w-full mb-8">
          {[
            { step: 1, label: 'Personal Info' },
            { step: 2, label: 'Professional Info' },
            { step: 3, label: 'Education' },
            { step: 4, label: 'Projects' },
            { step: 5, label: 'Experience' },
            { step: 6, label: 'Skills' },
            { step: 7, label: 'Additional Info' }
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div className="flex flex-col items-center">
                <div className={`flex items-center gap-2 pb-2 px-1 border-b-[3px] transition-colors ${
                  onboardingStep === s.step ? 'border-[#00288e]' : 'border-transparent'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    onboardingStep >= s.step ? 'bg-[#00288e] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {s.step}
                  </div>
                  <span className={`hidden sm:block text-[13px] font-bold ${onboardingStep >= s.step ? 'text-[#0b1c30]' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                </div>
              </div>
              {idx < 6 && (
                <div className="flex-1 h-[1px] bg-slate-200 mx-2 sm:mx-4 -mt-2"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      
      
      <div className={isOnboarding && rightCard ? "grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full" : "w-full"}>
        <div className={isOnboarding && rightCard ? "lg:col-span-8 flex flex-col" : "w-full"}>
{/* Tab 1: Personal Info */}
      {activeTab === 'personal' && ( <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
              <p className="text-xs text-slate-600">Tell us about yourself. This information helps employers learn more about you.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleUpdatePersonal} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={personal.name}
                onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
              <div className="relative w-full">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={personal.dob || ''}
                  onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs text-slate-700"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Current Location</label>
              <DependentLocationSelector
                country={personal.locCountry || 'India'}
                state={personal.locState || ''}
                city={personal.locCity || ''}
                showLocality={false}
                onChangeLocation={({ country, state, city }) => {
                  setPersonal({ 
                    ...personal, 
                    locCountry: country, 
                    locState: state, 
                    locCity: city,
                    current_location: [city, state, country].filter(Boolean).join(', ')
                  });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Profile Category</label>
              <CustomDropdown
                name="profile_type"
                value={personal.profile_type || 'fresher'}
                onChange={(e) => setPersonal({ ...personal, profile_type: e.target.value })}
                options={[
                  { value: 'fresher', label: 'Fresher' },
                  { value: 'experienced', label: 'Experienced' },
                  { value: 'additional', label: 'Additional Info' }
                ]}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            {isOnboarding && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm shadow-sm"
              >
                ← Back
              </button>
            )}
            {!isOnboarding && <div />}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm shadow-sm"
            >
              {submitting ? 'Saving...' : (isOnboarding ? 'Save & Continue →' : 'Save Personal Details')}
            </button>
          </div>
        </form>
      </>)}

      {/* Tab 2: Professional Info */}
      {activeTab === 'professional' && ( <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Professional Info</h2>
              <p className="text-xs text-slate-600">Provide an overview of your professional profile.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleUpdateProfessional} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Professional Headline *</label>
              <input
                type="text"
                required
                value={profInfo.professional_headline}
                onChange={(e) => setProfInfo({ ...profInfo, professional_headline: e.target.value })}
                placeholder="e.g. Full Stack Developer"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Current Organization</label>
              <input
                type="text"
                value={profInfo.current_organization}
                onChange={(e) => setProfInfo({ ...profInfo, current_organization: e.target.value })}
                placeholder="e.g. ABC Technologies"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Current Designation</label>
              <input
                type="text"
                value={profInfo.current_designation}
                onChange={(e) => setProfInfo({ ...profInfo, current_designation: e.target.value })}
                placeholder="e.g. Software Engineer"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Total Experience (Years)</label>
              <input
                type="text"
                value={profInfo.total_experience}
                onChange={(e) => setProfInfo({ ...profInfo, total_experience: e.target.value })}
                placeholder="e.g. 5"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Professional Summary *</label>
              <textarea
                required
                rows={3}
                value={profInfo.professional_summary}
                onChange={(e) => setProfInfo({ ...profInfo, professional_summary: e.target.value })}
                placeholder="Briefly describe your professional experience and expertise"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs resize-none"
              ></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Preferred Location</label>
              <DependentLocationSelector
                country={profInfo.locCountry || 'India'}
                state={profInfo.locState || ''}
                city={profInfo.locCity || ''}
                showLocality={false}
                onChangeLocation={({ country, state, city }) => {
                  setProfInfo({ 
                    ...profInfo, 
                    locCountry: country, 
                    locState: state, 
                    locCity: city,
                    preferred_location: [city, state, country].filter(Boolean).join(', ')
                  });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Expected Salary</label>
              <input
                type="text"
                value={profInfo.preferred_salary}
                onChange={(e) => setProfInfo({ ...profInfo, preferred_salary: e.target.value })}
                placeholder="e.g. 8,00,000 per year"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            {isOnboarding && onboardingStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  const prev = onboardingStep - 1;
                  setOnboardingStep(prev);
                  const stepMap = { 1: 'personal', 2: 'professional', 3: 'education', 4: 'projects', 5: 'experience', 6: 'skills', 7: 'additional' };
                  setActiveTab(stepMap[prev] || 'personal');
                  window.scrollTo(0, 0);
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm shadow-sm"
              >
                Back
              </button>
            ) : <div />}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm shadow-sm"
            >
              {submitting ? 'Saving...' : (isOnboarding ? 'Save & Continue \u2192' : 'Save Professional Info')}
            </button>
          </div>
        </form>
      </>)}

      
        {/* Tab 4: Projects */}
        {activeTab === 'projects' && ( <>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Projects</h2>
            </div>
            <p className="text-sm text-slate-500">Add any academic, personal, or professional projects.</p>
          </div>

          <div className="space-y-4 mb-8">
            {candData?.projects?.map(proj => (
              <div key={proj.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-start justify-between group">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{proj.project_name}</h4>
                  {proj.role && <p className="text-[11px] text-[#00288e] font-medium mb-1">{proj.role}</p>}
                  {proj.technologies && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 mt-1">
                    <span className="text-xs text-slate-500 font-medium">Tech:</span>
                    {(() => {
                      let t = [];
                      try { t = JSON.parse(proj.technologies); } catch { t = typeof proj.technologies === 'string' ? proj.technologies.split(',') : proj.technologies; }
                      if (!Array.isArray(t)) t = [t];
                      return t.filter(Boolean).map((tech, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600">{tech}</span>
                      ));
                    })()}
                  </div>
                )}
                  {proj.description && <p className="text-xs text-slate-600 mb-2">{proj.description}</p>}
                  <div className="flex gap-4">
                    {proj.project_url && <a href={proj.project_url} target="_blank" rel="noreferrer" className="text-xs text-[#00288e] hover:underline">Project Link</a>}
                    {proj.github_url && <a href={proj.github_url} target="_blank" rel="noreferrer" className="text-xs text-[#00288e] hover:underline">GitHub</a>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleEditProject(proj)} className="text-[#00288e] p-2 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteProject(proj.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddProject} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 w-full">
            <h3 className="text-sm font-bold text-slate-900 mb-2">{editingProjectId ? "Edit Project" : "Add New Project"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Project Name *</label>
                <input type="text" value={newProject.project_name} onChange={e => setNewProject({...newProject, project_name: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role (Optional)</label>
                <input type="text" value={newProject.role} onChange={e => setNewProject({...newProject, role: e.target.value})} placeholder="e.g. Lead Developer" className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" rows="2"></textarea>
              </div>
              <div className="sm:col-span-2">
                <RequiredSkillsSelector
                  selectedSkills={(typeof newProject.technologies === 'string' ? (newProject.technologies.startsWith('[') ? JSON.parse(newProject.technologies) : newProject.technologies.split(',').map(s=>s.trim()).filter(Boolean)) : (Array.isArray(newProject.technologies) ? newProject.technologies : []))}
                  onChange={(skills) => setNewProject({ ...newProject, technologies: skills })}
                  allowCreate={false}
                  label="Technologies / Skills Used"
                  description="Select the technical skills used in this project from the master list."
                  placeholder="Search skills (e.g. React, Python)..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" value={newProject.end_date} onChange={e => setNewProject({...newProject, end_date: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Project Link</label>
                <input type="url" value={newProject.project_url} onChange={e => setNewProject({...newProject, project_url: e.target.value})} placeholder="https://" className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">GitHub Link</label>
                <input type="url" value={newProject.github_url} onChange={e => setNewProject({...newProject, github_url: e.target.value})} placeholder="https://github.com/..." className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#00288e] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#001f70]">
                {editingProjectId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingProjectId ? 'Update Project' : 'Add Project'}
              </button>
              {editingProjectId && (
                <button type="button" onClick={handleCancelEditProject} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {renderOnboardingControls()}
        </>)}

        {/* Tab 5: Experience */}

      {activeTab === 'experience' && ( <>
        <div className="space-y-6">
          <form onSubmit={handleAddExp} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 w-full">
            <h3 className="font-bold text-slate-800 text-sm mb-2">{editingExpId ? "Edit Experience" : "Add Work Experience"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Organization *</label>
                <input
                  type="text"
                  required
                  value={newExp.organization}
                  onChange={(e) => setNewExp({ ...newExp, organization: e.target.value })}
                  placeholder="e.g. TechCorp Ltd"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  value={newExp.designation}
                  onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">From Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={newExp.from_date}
                    onChange={(e) => setNewExp({ ...newExp, from_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs text-slate-700 [color-scheme:light] cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">To Date (blank if current)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={newExp.to_date}
                    onChange={(e) => setNewExp({ ...newExp, to_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs text-slate-700 [color-scheme:light] cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#00288e] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#001f70]">
                {editingExpId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingExpId ? 'Update Experience' : 'Add Experience'}
              </button>
              {editingExpId && (
                <button type="button" onClick={handleCancelEditExp} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* List Experience */}
          <div className="space-y-3 w-full">
            {candData?.experience?.map((exp) => (
              <div key={exp.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 rounded-xl border  flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{exp.designation}</h4>
                  <p className="text-xs text-[#00288e] font-medium">{exp.organization}</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {exp.from_date?.slice(0, 10)} to {exp.to_date ? exp.to_date.slice(0, 10) : 'Present'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleEditExp(exp)} className="text-[#00288e] p-2 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteExp(exp.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            ))}
          </div>
          {renderOnboardingControls()}
        </div>
      </>)}

      {/* Tab 3: Education */}
      {activeTab === 'education' && ( <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Education Details</h2>
              <p className="text-xs text-slate-600">List your academic qualifications.</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 w-full">
          <form onSubmit={handleAddEdu} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 w-full">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Add Education</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Degree *</label>
                <input
                  type="text"
                  required
                  value={newEdu.degree}
                  onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                  placeholder="e.g. B.Tech CS"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Institution *</label>
                <input
                  type="text"
                  required
                  value={newEdu.institution}
                  onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                  placeholder="e.g. IIT Bombay"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Passout Year *</label>
                <input
                  type="number"
                  required
                  value={newEdu.year}
                  onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                  placeholder="2022"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">CGPA / Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  value={newEdu.cgpa}
                  onChange={(e) => setNewEdu({ ...newEdu, cgpa: e.target.value })}
                  placeholder="e.g. 8.5 or 85"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Education
            </button>
          </form>

          <div className="space-y-3">
            {candData?.education?.map((edu) => (
              <div key={edu.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 rounded-xl border  flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{edu.degree}</h4>
                  <p className="text-xs text-indigo-600 font-medium">
                    {edu.institution} ({edu.year})
                    {edu.cgpa ? ` • CGPA/Percentage: ${edu.cgpa}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleEditEdu(edu)} className="text-[#00288e] p-2 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteEdu(edu.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            ))}
          </div>
          {renderOnboardingControls()}
        </div>
      </>)}

      {/* Tab 4: Skills */}
      {activeTab === 'skills' && ( <>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
                <Code className="w-5 h-5" />
              </div>
              <div>
              <h2 className="text-lg font-bold text-slate-900">Skills</h2>
              <p className="text-xs text-slate-600">Add relevant skills to help employers find you.</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5 w-full">
            <RequiredSkillsSelector
              selectedSkills={candData?.skills?.map(s => s.name) || []}
              onChange={handleSkillsChange}
              allowCreate={false}
              label="Professional Skills"
              description="Select skills that match your expertise from the master list."
              placeholder="Search skills..."
            />
          </div>
          {isOnboarding && renderOnboardingControls()}
        </>)}

      {/* Tab 5: Resumes */}
      {activeTab === 'resumes' && ( <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Resumes</h2>
              <p className="text-xs text-slate-600">Upload your resume document.</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 w-full">
          <form onSubmit={handleResumeUpload} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Upload New Resume Document</h3>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files[0])}
              className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#00288e] hover:file:bg-blue-100"
            />
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Upload Resume
            </button>
          </form>

          <div className="space-y-3">
            {candData?.resumes?.map((res) => (
              <div key={res.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 rounded-xl border  flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#00288e]" />
                  <div>
                    <a href={res.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-900 hover:underline block">
                      {res.file_url.split('/').pop()}
                    </a>
                    <span className="text-[10px] text-slate-600">Uploaded {new Date(res.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {res.is_primary ? <StatusBadge status="PRIMARY RESUME" /> : null}
              </div>
            ))}
          </div>
          {renderOnboardingControls()}
        </div>
      </>)}

      {/* Tab 6: Languages & Additional Info */}
        {activeTab === 'additional' && ( <>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Languages & Additional Info</h2>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              Add your language proficiency, professional links, and resumes.
            </p>
          </div>

          <div className="space-y-6 max-w-3xl">
            {/* Languages */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Languages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Select Language</label>
                  <select
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00288e] outline-none text-xs"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="">-- Select Language --</option>
                    {masterLanguages.filter(l => !candData?.languages?.some(cl => cl.name === l.name)).map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-4 items-center sm:h-10">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={langProfs.can_read} onChange={(e)=>setLangProfs({...langProfs, can_read: e.target.checked})} className="w-4 h-4 bg-slate-50 border-slate-300 rounded text-[#00288e] focus:ring-[#00288e] cursor-pointer" />
                    Read
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={langProfs.can_write} onChange={(e)=>setLangProfs({...langProfs, can_write: e.target.checked})} className="w-4 h-4 bg-slate-50 border-slate-300 rounded text-[#00288e] focus:ring-[#00288e] cursor-pointer" />
                    Write
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={langProfs.can_speak} onChange={(e)=>setLangProfs({...langProfs, can_speak: e.target.checked})} className="w-4 h-4 bg-slate-50 border-slate-300 rounded text-[#00288e] focus:ring-[#00288e] cursor-pointer" />
                    Speak
                  </label>
                  <button type="button" onClick={handleAddLanguage} disabled={submitting || !selectedLanguage} className="px-5 py-2 bg-[#00288e] text-white text-xs font-bold rounded-xl hover:bg-[#001f70] ml-auto disabled:opacity-50 transition-colors">
                    Add
                  </button>
                </div>
              </div>

              {candData?.languages?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {candData?.languages?.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{l.name}</p>
                        <p className="text-xs text-slate-500">
                          {[l.can_read ? 'Read' : '', l.can_write ? 'Write' : '', l.can_speak ? 'Speak' : ''].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <button type="button" onClick={() => handleDeleteLanguage(l.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Social & Professional Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
                  { key: 'github_url', label: 'GitHub', placeholder: 'https://github.com/...' },
                  { key: 'portfolio_url', label: 'Portfolio', placeholder: 'https://yourportfolio.com/...' },
                  { key: 'x_url', label: 'X (Twitter)', placeholder: 'https://x.com/...', stateKey: 'twitter_url' },
                  { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                  { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' }
                ].map(item => (
                  <div key={item.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{item.label}</label>
                    <input
                      type="url"
                      placeholder={item.placeholder}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 bg-slate-50/50"
                      value={additionalInfo[item.stateKey || item.key] || ''}
                      onChange={(e) => setAdditionalInfo({ ...additionalInfo, [item.stateKey || item.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Resumes */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Resumes</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">PDF only &middot; Max 2 MB</span>
                  <input type="file" id="resumeUpload" accept=".pdf,application/pdf" className="hidden" onChange={handleUploadResume} disabled={uploadingResume} />
                  <label htmlFor={uploadingResume ? "" : "resumeUpload"} className={`px-3 py-1.5 text-sm font-medium text-white rounded-lg flex items-center gap-2 ${uploadingResume ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#00288e] hover:bg-blue-800 cursor-pointer'}`}>
                    {uploadingResume ? <><Loader2 className="w-4 h-4 animate-spin"/> Uploading...</> : <><Upload className="w-4 h-4"/> Upload Resume</>}
                  </label>
                  {uploadingResume && (
                    <button onClick={handleCancelUpload} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {resumeError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resumeError}</span>
                </div>
              )}
              
              {candData?.resumes?.length > 0 ? (
                <div className="space-y-3">
                  {candData?.resumes?.map(r => (
                    <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${r.is_primary ? 'border-green-400 bg-green-50/30' : 'border-slate-200 bg-white'} shadow-sm`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-lg ${r.is_primary ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.resume_title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {r.is_primary === 1 ? <span className="font-medium text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded-full">Primary Resume</span> : null}
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                            <span>{(r.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewResume(r.id)} className="p-2 text-slate-400 hover:text-[#00288e] hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {r.is_primary !== 1 && (
                          <button onClick={() => handleSetPrimaryResume(r.id)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Set as Primary">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setResumeToDelete(r.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No resumes uploaded yet.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              {isOnboarding && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm shadow-sm"
                >
                  ← Back
                </button>
              )}
              {!isOnboarding && <div />}
              <button
                type="button"
                onClick={handleSaveAdditionalInfo}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm shadow-sm"
              >
                {submitting ? 'Saving...' : (isOnboarding ? 'Complete Setup →' : 'Save Additional Info')}
              </button>
            </div>
          </div>
        </>)}
      </div>
      {/* Right Column: Why Complete Profile */}
      {isOnboarding && rightCard && (
        <div className="lg:col-span-4 sticky top-6">
          {rightCard}
        </div>
      )}

      {/* Resume Delete Confirmation Modal */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Resume?</h3>
              <p className="text-sm text-slate-500 mt-1">This action cannot be undone. Are you sure you want to permanently delete this resume?</p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button 
                onClick={() => setResumeToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteResume(resumeToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
};

export default CandidateProfile;
