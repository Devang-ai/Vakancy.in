import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {  Link, useNavigate, useParams, useLocation , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import JobCreationStepGuard from '../../components/employer/JobCreationStepGuard';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

/**
 * EmployerJobDescriptionPage — Task 33: Employer Job Description Builder + AI JD Generator
 * Visual Source of Truth: Google Stitch Screen ea2ed8e2dfb548669406353545b2efe1
 * 
 * Authentic End-to-End Implementation:
 * MySQL Job Data → JD Builder → Backend AI API → Gemini API → Structured JD Preview → Edit → Save to MySQL
 */

export default function EmployerJobDescriptionPage() {
  const { user, profile, token } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Resolve active Job ID — must be a real UUID from URL params
  const activeJobId = params.id || location.state?.jobId || null;

  // Navigation & UI state
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setSidebarOpen } = useOutletContext();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [jobStatus, setJobStatus] = useState('draft');

  // Core Job Metadata from DB
  const [jobMeta, setJobMeta] = useState({
    id: activeJobId,
    title: location.state?.jobTitle || '',
    category: location.state?.category || location.state?.job_domain || '',
    department: location.state?.department || '',
    location: location.state?.location || ''
  });

  // Main Editor Form State
  const [editorData, setEditorData] = useState({
    title: location.state?.jobTitle || '',
    department: location.state?.department || '',
    category: '',
    overview: '',
    responsibilities: [],
    qualifications: [],
    skills: []
  });

  // Skill Input State
  const [newSkillInput, setNewSkillInput] = useState('');

  // AI Generated Preview State (Modal / Drawer)
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState(null);

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

  // Body scroll-lock and Escape key listener when AI Preview modal is active
  useEffect(() => {
    if (!aiPreviewOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAiPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [aiPreviewOpen]);

  // Fetch job details strictly from MySQL
  useEffect(() => {
    if (activeJobId && activeJobId !== 'draft-job') {
      fetchJobDetails(activeJobId);
    }
  }, [activeJobId]);

  const fetchJobDetails = async (jobId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/employers/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.job) {
        const j = data.job;
        if (j.status) setJobStatus(j.status);
        const jobCategory = j.job_domain || j.category || 'General';

        // Parse responsibilities
        let respList = [];
        if (Array.isArray(j.responsibilities)) {
          respList = j.responsibilities;
        } else if (typeof j.responsibilities === 'string' && j.responsibilities.trim()) {
          try {
            respList = JSON.parse(j.responsibilities);
          } catch (_) {
            respList = j.responsibilities.split('\n').filter(Boolean);
          }
        }

        // Parse requirements / qualifications
        let qualList = [];
        if (Array.isArray(j.requirements)) {
          qualList = j.requirements;
        } else if (typeof j.requirements === 'string' && j.requirements.trim()) {
          try {
            qualList = JSON.parse(j.requirements);
          } catch (_) {
            qualList = j.requirements.split('\n').filter(Boolean);
          }
        }

        // Parse required skills
        let skillList = [];
        if (Array.isArray(j.required_skills)) {
          skillList = j.required_skills;
        } else if (typeof j.required_skills === 'string' && j.required_skills.trim()) {
          try {
            skillList = JSON.parse(j.required_skills);
          } catch (_) {
            skillList = j.required_skills.split(',').map((s) => s.trim()).filter(Boolean);
          }
        }

        const isDefaultPlaceholder = !j.description || j.description.includes('to be configured in Step 2');
        const loadedCompName = j.company_name || location.state?.company_name || profile?.company_name || user?.company_name || 'Scan2Serve';

        setJobMeta({
          id: j.id,
          title: j.title || '',
          category: jobCategory,
          department: j.department || '',
          company_name: loadedCompName,
          location: j.city ? `${j.city}, ${j.state || ''}` : (j.location || '')
        });

        let sanitizedOverview = isDefaultPlaceholder ? '' : (j.description || '');
        if (sanitizedOverview) {
          sanitizedOverview = sanitizedOverview
            .replace(/\bVacancy\.in\s+is\s+seeking\b/gi, `${loadedCompName} is seeking`)
            .replace(/\bVakancy\.in\s+is\s+seeking\b/gi, `${loadedCompName} is seeking`)
            .replace(/\bVacancy\.in\s+is\s+looking\b/gi, `${loadedCompName} is looking`)
            .replace(/\bVakancy\.in\s+is\s+looking\b/gi, `${loadedCompName} is looking`)
            .replace(/\bVacancy\.in\s+is\s+hiring\b/gi, `${loadedCompName} is hiring`)
            .replace(/\bVakancy\.in\s+is\s+hiring\b/gi, `${loadedCompName} is hiring`)
            .replace(/\bVacancy\s+is\s+seeking\b/gi, `${loadedCompName} is seeking`)
            .replace(/\bVakancy\s+is\s+seeking\b/gi, `${loadedCompName} is seeking`)
            .replace(/\bVacancy\.in\b/gi, loadedCompName)
            .replace(/\bVakancy\.in\b/gi, loadedCompName);
        }

        setEditorData({
          title: j.title || '',
          department: j.department || 'General',
          category: jobCategory,
          overview: sanitizedOverview,
          responsibilities: respList.length > 0 ? respList : [],
          qualifications: qualList.length > 0 ? qualList : [],
          skills: skillList
        });
      } else if (res.status === 403) {
        showToast('Access Denied: You do not own this job posting.', 'error');
        setTimeout(() => navigate('/recruiter/jobs'), 1500);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      showToast('Error loading job details from database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Responsibilities Handlers
  const handleResponsibilityChange = (index, value) => {
    setEditorData((prev) => {
      const list = [...prev.responsibilities];
      list[index] = value;
      return { ...prev, responsibilities: list };
    });
  };

  const handleAddResponsibility = () => {
    setEditorData((prev) => ({
      ...prev,
      responsibilities: [...prev.responsibilities, '']
    }));
  };

  const handleRemoveResponsibility = (index) => {
    setEditorData((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }));
  };

  const handleMoveResponsibility = (index, direction) => {
    setEditorData((prev) => {
      const list = [...prev.responsibilities];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, responsibilities: list };
    });
  };

  // Qualifications / Requirements Handlers
  const handleQualificationChange = (index, value) => {
    setEditorData((prev) => {
      const list = [...prev.qualifications];
      list[index] = value;
      return { ...prev, qualifications: list };
    });
  };

  const handleAddQualification = () => {
    setEditorData((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, '']
    }));
  };

  const handleRemoveQualification = (index) => {
    setEditorData((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const handleMoveQualification = (index, direction) => {
    setEditorData((prev) => {
      const list = [...prev.qualifications];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, qualifications: list };
    });
  };

  // Skill Chip Handlers
  const handleAddSkill = () => {
    const s = newSkillInput.trim();
    if (!s) return;
    if (!editorData.skills.includes(s)) {
      setEditorData((prev) => ({
        ...prev,
        skills: [...prev.skills, s]
      }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditorData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  };

  // Trigger Backend AI JD Generation
  const handleGenerateAI = async () => {
    if (!editorData.title.trim()) {
      showToast('Job Title is required before generating AI description.', 'warning');
      return;
    }

    setIsGeneratingAI(true);
    const endpointsToTry = [
      activeJobId !== 'draft-job' ? `/api/employers/jobs/${activeJobId}/generate-jd` : '/api/employers/jobs/generate-jd',
      '/api/employers/jobs/generate-jd',
      '/api/ai/jd-generator'
    ];

    const effectiveCompName = jobMeta.company_name || profile?.company_name || user?.company_name || 'Scan2Serve';
    const payload = {
      job_id: activeJobId !== 'draft-job' ? activeJobId : undefined,
      title: editorData.title.trim(),
      company_name: effectiveCompName,
      category: editorData.category || jobMeta.category,
      department: editorData.department || jobMeta.department,
      skills: editorData.skills
    };

    let lastErrorMessage = 'Unable to generate the job description right now. Please try again.';
    let successData = null;

    for (const endpoint of endpointsToTry) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const resultData = await res.json();

        if (res.ok && resultData.success && (resultData.data || resultData.job_description || resultData.result)) {
          successData = resultData;
          break;
        } else if (resultData && resultData.message) {
          lastErrorMessage = resultData.message;
        }
      } catch (err) {
        console.warn(`AI endpoint call failed for ${endpoint}:`, err.message);
      }
    }

    if (successData) {
      let structured = successData.data;

      if (!structured) {
        const textOutput = successData.job_description || successData.result;
        if (textOutput) {
          try {
            const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
            structured = JSON.parse(cleaned);
          } catch (_) {
            structured = {
              overview: textOutput,
              responsibilities: [],
              requirements: [],
              skills: editorData.skills
            };
          }
        }
      }

      // Merge preserved skills
      const mergedSkills = [...new Set([...editorData.skills, ...(structured?.skills || [])])];
      let rawAiOverview = structured?.overview || '';
      if (rawAiOverview) {
        rawAiOverview = rawAiOverview
          .replace(/\bVacancy\.in\s+is\s+seeking\b/gi, `${effectiveCompName} is seeking`)
          .replace(/\bVakancy\.in\s+is\s+seeking\b/gi, `${effectiveCompName} is seeking`)
          .replace(/\bVacancy\.in\s+is\s+looking\b/gi, `${effectiveCompName} is looking`)
          .replace(/\bVakancy\.in\s+is\s+looking\b/gi, `${effectiveCompName} is looking`)
          .replace(/\bVacancy\.in\s+is\s+hiring\b/gi, `${effectiveCompName} is hiring`)
          .replace(/\bVakancy\.in\s+is\s+hiring\b/gi, `${effectiveCompName} is hiring`)
          .replace(/\bVacancy\s+is\s+seeking\b/gi, `${effectiveCompName} is seeking`)
          .replace(/\bVakancy\s+is\s+seeking\b/gi, `${effectiveCompName} is seeking`)
          .replace(/\bVacancy\.in\b/gi, effectiveCompName)
          .replace(/\bVakancy\.in\b/gi, effectiveCompName);
      }

      const finalAiOutput = {
        overview: rawAiOverview,
        responsibilities: Array.isArray(structured?.responsibilities) ? structured.responsibilities : [],
        requirements: Array.isArray(structured?.requirements) ? structured.requirements : [],
        skills: mergedSkills
      };

      setAiGeneratedData(finalAiOutput);
      setAiPreviewOpen(true);
      showToast('AI Job Description generated successfully!', 'success');
    } else {
      showToast(lastErrorMessage, 'error');
    }

    setIsGeneratingAI(false);
  };

  // Accept and apply AI preview into editor
  const handleApplyAiGenerated = () => {
    if (!aiGeneratedData) return;

    setEditorData((prev) => ({
      ...prev,
      overview: aiGeneratedData.overview || prev.overview,
      responsibilities: aiGeneratedData.responsibilities.length > 0 ? aiGeneratedData.responsibilities : prev.responsibilities,
      qualifications: aiGeneratedData.requirements.length > 0 ? aiGeneratedData.requirements : prev.qualifications,
      skills: Array.from(new Set([...prev.skills, ...aiGeneratedData.skills]))
    }));

    setAiPreviewOpen(false);
    showToast('Generated description applied to editor!', 'success');
  };

  // Save Job Description to MySQL Database
  const saveJobDescription = async (isProceeding = false) => {
    if (!editorData.overview.trim()) {
      showToast('Please provide a role overview/description.', 'warning');
      return false;
    }

    if (editorData.responsibilities.length === 0 || !editorData.responsibilities.some((r) => r.trim())) {
      showToast('Please specify at least one key responsibility.', 'warning');
      return false;
    }

    if (isProceeding) {
      setIsSubmitting(true);
    } else {
      setIsSavingDraft(true);
    }

    const payload = {
      title: editorData.title.trim() || undefined,
      description: editorData.overview.trim(),
      responsibilities: editorData.responsibilities.filter((r) => r.trim()),
      requirements: editorData.qualifications.filter((q) => q.trim()),
      required_skills: editorData.skills,
      status: jobStatus || 'draft'
    };

    try {
      const res = await fetch(`/api/employers/jobs/${activeJobId}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setLastSavedTime(new Date().toLocaleTimeString());
        if (isProceeding) {
          showToast('Job description saved! Proceeding to Step 3...', 'success');
          setTimeout(() => {
            navigate(`/recruiter/jobs/${activeJobId}/screening`, {
              state: {
                message: `Job description saved for ${editorData.title || 'Role'}!`
              }
            });
          }, 800);
        } else {
          showToast('Job description saved to database successfully.', 'success');
        }
        return true;
      } else {
        showToast(data.message || 'Error saving job description.', 'error');
        return false;
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Network error while saving description.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Calculate dynamic word count
  const allText = `${editorData.overview} ${editorData.responsibilities.join(' ')} ${editorData.qualifications.join(' ')}`;
  const wordCount = allText.trim() ? allText.trim().split(/\s+/).length : 0;

  const companyName = user?.company_name || 'Employer Portal';
  const userDisplayName = user?.name || user?.email?.split('@')[0] || 'Recruiter';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#0b1c30]">Loading Job Data from Database...</span>
        </div>
      </div>
    );
  }

  return (
    <JobCreationStepGuard jobId={activeJobId} requiredStep={2}>
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
      
        {/* Top Header Bar */}
        

        {/* Stepper Progress Bar */}
        <section className="w-full bg-white px-6 py-3 border-b border-slate-100 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#444653]">
              <span className="font-bold text-[#00288e]">JOB ID:</span>
              <span className="font-mono bg-[#eff4ff] px-2 py-0.5 rounded text-[#0b1c30] text-[11px] font-semibold">
                {activeJobId !== 'draft-job' ? activeJobId.slice(0, 13).toUpperCase() : 'DRAFT-SESSION'}
              </span>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
              <Link
                to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/edit` : `/recruiter/jobs/create`}
                className="flex items-center gap-1.5 text-[#006a61] font-bold hover:underline"
              >
                <div className="w-6 h-6 rounded-full bg-[#006a61] text-white flex items-center justify-center text-xs">
                  ✓
                </div>
                <span className="hidden sm:inline">1. Role Basics</span>
              </Link>
              <div className="w-4 h-0.5 bg-[#006a61]"></div>

              <div className="flex items-center gap-1.5 text-[#00288e] font-bold">
                <div className="w-6 h-6 rounded-full bg-[#00288e] text-white flex items-center justify-center text-xs">
                  2
                </div>
                <span>2. Job Description</span>
              </div>
              <div className="w-4 h-0.5 bg-slate-200"></div>

              <div className="flex items-center gap-1.5 text-[#757684] opacity-60">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-[#757684] flex items-center justify-center text-xs">
                  3
                </div>
                <span className="hidden lg:inline">3. Screening</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#444653]">
              <span>{lastSavedTime ? `Saved to DB at ${lastSavedTime}` : 'Database connected'}</span>
            </div>
          </div>
        </section>

        {/* Workspace Canvas Header */}
        <section className="w-full px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-[#dde1ff] text-[#00288e] text-[11px] font-bold uppercase tracking-wider">
                  Step 02 OF 06
                </span>
                {editorData.category && (
                  <span className="text-[#444653] text-[11px] font-medium">
                    • {editorData.category}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#0b1c30] tracking-tight">
                {editorData.title ? `Job Description: ${editorData.title}` : 'Craft Job Description'}
              </h1>
              <p className="text-xs text-[#444653] max-w-3xl mt-0.5 leading-relaxed">
                Define the overview, key responsibilities, requirements, and skills. Use our Gemini AI Assistant to synthesize structured JD proposals.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-center"
            >
              {isGeneratingAI ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Calling Gemini AI...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. MAIN WORKSPACE GRID: 8 COLS EDITOR | 4 COLS AI ASSISTANT & SKILLS
        ───────────────────────────────────────────── */}
        <section className="w-full px-6 py-2 pb-24 flex-1">
          <StaggerContainer className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ──────── LEFT 8 COLUMNS: JD EDITOR ──────── */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <StaggerItem index={0} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                {/* Editor Top Info Bar */}
                <div className="bg-[#eff4ff] px-5 py-2.5 flex items-center justify-between border-b border-blue-100/50 text-xs text-[#444653]">
                  <span className="font-semibold text-[#0b1c30]">Structured Specification Canvas</span>
                  <span>Word count: <strong className="text-[#0b1c30]">{wordCount} words</strong></span>
                </div>

                {/* Editor Body */}
                <div className="p-6 flex flex-col gap-6">
                  {/* Block 1: Role Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-[#444653] font-bold">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={editorData.title}
                      onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                      placeholder="e.g. iOS Developer, Sales Manager, Accountant"
                      className="w-full px-3.5 py-2.5 bg-[#f8f9ff] text-[#0b1c30] text-sm font-bold rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all border border-slate-100"
                    />
                  </div>

                  {/* Block 2: Overview */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase tracking-wider text-[#444653] font-bold flex items-center gap-1.5">
                        <span>Job Description / Overview</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#0b1c30] text-[9px] font-mono font-bold">
                          REQUIRED
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAI}
                        className="text-[11px] text-[#00288e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ Generate with AI
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={editorData.overview}
                      onChange={(e) => setEditorData({ ...editorData, overview: e.target.value })}
                      placeholder="Provide a comprehensive role summary, team mission, and core objectives..."
                      className="w-full p-3.5 bg-[#f8f9ff] text-[#0b1c30] text-xs rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all leading-relaxed border border-slate-100"
                    />
                  </div>

                  {/* Block 3: Key Responsibilities */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase tracking-wider text-[#444653] font-bold">
                        Key Responsibilities ({editorData.responsibilities.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddResponsibility}
                        className="text-[11px] text-[#00288e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Add Responsibility
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {editorData.responsibilities.map((resp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-[#f8f9ff] p-2.5 rounded-xl group hover:bg-[#eff4ff] transition-colors border border-slate-100"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveResponsibility(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[10px] text-[#444653] hover:text-[#00288e] disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveResponsibility(idx, 'down')}
                              disabled={idx === editorData.responsibilities.length - 1}
                              className="text-[10px] text-[#444653] hover:text-[#00288e] disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                          <input
                            type="text"
                            value={resp}
                            onChange={(e) => handleResponsibilityChange(idx, e.target.value)}
                            placeholder="Enter key responsibility deliverable..."
                            className="flex-1 bg-transparent text-[#0b1c30] text-xs outline-none font-normal"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveResponsibility(idx)}
                            className="opacity-40 group-hover:opacity-100 p-1 hover:text-[#ba1a1a] transition-all text-xs font-bold"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {editorData.responsibilities.length === 0 && (
                        <p className="text-xs text-[#757684] italic p-2 bg-[#f8f9ff] rounded-xl">
                          No responsibilities added yet. Click "+ Add Responsibility" or use AI generation.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Block 4: Qualifications & Requirements */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase tracking-wider text-[#444653] font-bold">
                        Requirements &amp; Qualifications ({editorData.qualifications.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddQualification}
                        className="text-[11px] text-[#00288e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Add Requirement
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {editorData.qualifications.map((qual, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-[#f8f9ff] p-2.5 rounded-xl group hover:bg-[#eff4ff] transition-colors border border-slate-100"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveQualification(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[10px] text-[#444653] hover:text-[#00288e] disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQualification(idx, 'down')}
                              disabled={idx === editorData.qualifications.length - 1}
                              className="text-[10px] text-[#444653] hover:text-[#00288e] disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qual}
                            onChange={(e) => handleQualificationChange(idx, e.target.value)}
                            placeholder="Enter qualification or experience requirement..."
                            className="flex-1 bg-transparent text-[#0b1c30] text-xs outline-none font-normal"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQualification(idx)}
                            className="opacity-40 group-hover:opacity-100 p-1 hover:text-[#ba1a1a] transition-all text-xs font-bold"
                            title="Remove requirement"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {editorData.qualifications.length === 0 && (
                        <p className="text-xs text-[#757684] italic p-2 bg-[#f8f9ff] rounded-xl">
                          No qualifications added yet. Click "+ Add Requirement" or use AI generation.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Block 5: Required Skills */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] uppercase tracking-wider text-[#444653] font-bold">
                      Required Skills ({editorData.skills.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#f8f9ff] rounded-xl border border-slate-100">
                      {editorData.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00288e] text-white text-xs font-medium"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-red-200 transition-colors font-bold text-xs"
                            title="Remove skill"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {editorData.skills.length === 0 && (
                        <span className="text-xs text-[#757684] italic">
                          No skills associated. Add skills below.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        placeholder="Add required skill..."
                        className="flex-1 px-3.5 py-2 bg-[#f8f9ff] text-[#0b1c30] text-xs rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#00288e] border border-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-3.5 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        + Add Skill
                      </button>
                  </div>
                </div>
              </div>
              </StaggerItem>
            </div>

            {/* ──────── RIGHT 4 COLUMNS: SIDEBAR AI CONTROLS ──────── */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <StaggerItem index={1} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4 border border-slate-200/60">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-sm">
                      AI
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-bold text-[#0b1c30] leading-tight">
                        Gemini AI Assistant
                      </h2>
                      <span className="text-[10px] text-[#444653]">
                        Server-Side Integration
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#444653] leading-relaxed">
                  Click <strong>Generate with AI</strong> to pass your actual job context to Gemini API. The AI will synthesize structured overview, responsibilities, requirements, and preserve selected skills.
                </p>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="w-full py-3 bg-[#00288e] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#1e40af] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Generating Structured JD...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Generate with AI</span>
                    </>
                  )}
                </button>

                <div className="bg-[#eff4ff] p-3 rounded-xl border border-blue-100/60 text-xs text-[#0b1c30]">
                  <span className="font-bold text-[#00288e] block mb-1">Preserved Skills</span>
                  <p className="text-[11px] text-[#444653]">
                    {editorData.skills.length > 0 ? editorData.skills.join(', ') : 'None selected yet'}
                  </p>
                </div>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </section>

        {/* ─────────────────────────────────────────────
            4. EDITABLE AI PREVIEW MODAL (PORTAL RENDERED)
        ───────────────────────────────────────────── */}
        {aiPreviewOpen && aiGeneratedData && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-preview-modal-title"
          >
            {/* Modal Backdrop: covers the entire visible application viewport, including sidebar & navbar */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setAiPreviewOpen(false)}
            />

            {/* Modal Dialog: z-[1001], above the backdrop and all layout elements */}
            <div
              className="relative z-[1001] bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-[#eff4ff] border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 id="ai-preview-modal-title" className="font-bold text-sm text-[#0b1c30]">Generated Structured AI Preview</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAiPreviewOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-lg hover:bg-blue-50 transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Overview preview */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#444653] block mb-1">
                    Role Overview
                  </label>
                  <textarea
                    rows={4}
                    value={aiGeneratedData.overview}
                    onChange={(e) => setAiGeneratedData({ ...aiGeneratedData, overview: e.target.value })}
                    className="w-full p-3 bg-[#f8f9ff] text-xs text-[#0b1c30] rounded-xl border border-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-[#00288e]"
                  />
                </div>

                {/* Responsibilities preview */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#444653] block mb-1">
                    Key Responsibilities ({aiGeneratedData.responsibilities?.length || 0})
                  </label>
                  <div className="space-y-1.5">
                    {(aiGeneratedData.responsibilities || []).map((r, i) => (
                      <input
                        key={i}
                        type="text"
                        value={r}
                        onChange={(e) => {
                          const list = [...aiGeneratedData.responsibilities];
                          list[i] = e.target.value;
                          setAiGeneratedData({ ...aiGeneratedData, responsibilities: list });
                        }}
                        className="w-full p-2 bg-[#f8f9ff] text-xs text-[#0b1c30] rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-[#00288e]"
                      />
                    ))}
                  </div>
                </div>

                {/* Requirements preview */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#444653] block mb-1">
                    Requirements &amp; Qualifications ({aiGeneratedData.requirements?.length || 0})
                  </label>
                  <div className="space-y-1.5">
                    {(aiGeneratedData.requirements || []).map((reqItem, i) => (
                      <input
                        key={i}
                        type="text"
                        value={reqItem}
                        onChange={(e) => {
                          const list = [...aiGeneratedData.requirements];
                          list[i] = e.target.value;
                          setAiGeneratedData({ ...aiGeneratedData, requirements: list });
                        }}
                        className="w-full p-2 bg-[#f8f9ff] text-xs text-[#0b1c30] rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-[#00288e]"
                      />
                    ))}
                  </div>
                </div>

                {/* Preserved Skills preview */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#444653] block mb-1">
                    Associated Required Skills
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#f8f9ff] rounded-xl border border-slate-200">
                    {(aiGeneratedData.skills || []).map((s) => (
                      <span key={s} className="px-2.5 py-1 bg-[#00288e] text-white text-xs rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  🔄 Regenerate
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAiPreviewOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#444653] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAiGenerated}
                    className="px-5 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    ✓ Apply to Editor
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ─────────────────────────────────────────────
            5. STICKY BOTTOM WIZARD ACTION BAR
        ───────────────────────────────────────────── */}
        <section className="sticky bottom-0 w-full bg-white backdrop-blur-md px-6 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-[80] border-t border-slate-100 mt-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <Link
                to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/edit` : `/recruiter/jobs/create`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#444653] hover:text-[#0b1c30] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back: Basic Info</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-[#444653] hidden sm:inline">
                {lastSavedTime ? `Saved to DB at ${lastSavedTime}` : 'Database connected'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => saveJobDescription(false)}
                disabled={isSavingDraft || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold transition-colors shadow-2xs cursor-pointer border border-blue-100/60"
              >
                {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={() => saveJobDescription(true)}
                disabled={isSubmitting || isSavingDraft}
                className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold transition-all shadow-md hover:bg-[#1e40af] inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Saving Job Description...' : 'Save & Continue to Screening Questions'}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
               </button>
            </div>
          </div>
        </section>
      </PageTransition>
    </JobCreationStepGuard>
  );
}
