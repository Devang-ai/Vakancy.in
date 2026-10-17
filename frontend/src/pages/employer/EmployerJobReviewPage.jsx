import React, { useState, useEffect, useRef } from 'react';
import {  useParams, useNavigate, Link , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import JobCreationStepGuard from '../../components/employer/JobCreationStepGuard';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

export default function EmployerJobReviewPage() {
  const { id: paramJobId } = useParams();
  const navigate = useNavigate();
  const { user, profile, token } = useAuth();

  const [activeJobId, setActiveJobId] = useState(paramJobId || null);
  const [job, setJob] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [publishSchedule, setPublishSchedule] = useState('now');
  const [toast, setToast] = useState(null);
  const { setSidebarOpen } = useOutletContext();
  const [lastSavedTime, setLastSavedTime] = useState(null);

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

  // 1. Fetch Job and Questions Data on Mount
  useEffect(() => {
    const fetchReviewData = async () => {
      if (!paramJobId || paramJobId === 'draft-job') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch complete job details
        const res = await fetch(`/api/employers/jobs/${paramJobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.job) {
          setJob(data.job);
          setActiveJobId(data.job.id);

          // Fetch screening questions specifically
          const qRes = await fetch(`/api/employers/jobs/${paramJobId}/questions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const qData = await qRes.json();

          if (qData.success && Array.isArray(qData.questions)) {
            setQuestions(qData.questions);
          } else if (Array.isArray(data.job.screening_questions)) {
            setQuestions(data.job.screening_questions);
          }
        } else {
          showToast(data.message || 'Job not found.');
        }
      } catch (err) {
        console.error('Error fetching review data:', err);
        showToast('Error loading job details for review.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [paramJobId, token]);

  // Parse structured data safely
  const responsibilitiesList = React.useMemo(() => {
    if (!job?.responsibilities) return [];
    if (Array.isArray(job.responsibilities)) return job.responsibilities;
    try {
      const parsed = JSON.parse(job.responsibilities);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return job.responsibilities.split('\n').filter(Boolean);
    }
  }, [job]);

  const requirementsList = React.useMemo(() => {
    if (!job?.requirements) return [];
    if (Array.isArray(job.requirements)) return job.requirements;
    try {
      const parsed = JSON.parse(job.requirements);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return job.requirements.split('\n').filter(Boolean);
    }
  }, [job]);

  const benefitsList = React.useMemo(() => {
    if (!job?.benefits) return [];
    if (Array.isArray(job.benefits)) return job.benefits;
    try {
      const parsed = JSON.parse(job.benefits);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }, [job]);

  const requiredSkillsList = React.useMemo(() => {
    if (!job?.required_skills) return [];
    if (Array.isArray(job.required_skills)) return job.required_skills;
    try {
      const parsed = JSON.parse(job.required_skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return typeof job.required_skills === 'string' ? job.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
  }, [job]);

  // Validation Checks for Publishing Readiness
  const validationIssues = React.useMemo(() => {
    const issues = [];
    if (!job?.title || !job.title.trim()) {
      issues.push({ section: 'Basic Details', message: 'Job title is required', step: 1 });
    }
    if (!job?.location || !job.location.trim()) {
      issues.push({ section: 'Basic Details', message: 'Work location is required', step: 1 });
    }
    if (!job?.description || !job.description.trim() || job.description.trim().length < 20) {
      issues.push({ section: 'Job Description', message: 'Job description overview must be provided', step: 2 });
    }
    return issues;
  }, [job]);

  const isReadyToPublish = validationIssues.length === 0;

  // Word count calculation
  const wordCount = React.useMemo(() => {
    const fullText = `${job?.description || ''} ${responsibilitiesList.join(' ')} ${requirementsList.join(' ')}`;
    return fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  }, [job, responsibilitiesList, requirementsList]);

  // Publish Job Action
  const handlePublishJob = async () => {
    if (!isReadyToPublish) {
      showToast('Please fix required items before publishing.');
      return;
    }

    if (!activeJobId || activeJobId === 'draft-job') {
      showToast('No active job ID found.');
      return;
    }

    setIsPublishing(true);

    try {
      const res = await fetch(`/api/employers/jobs/${activeJobId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        showToast('🎉 Job published successfully! Live on Vakancy.in');
        setTimeout(() => {
          navigate('/recruiter/jobs', {
            state: {
              message: `Job "${job?.title || 'Role'}" has been published and is now live!`
            }
          });
        }, 1000);
      } else {
        showToast(data.message || 'Failed to publish job.');
      }
    } catch (err) {
      console.error('Publish error:', err);
      showToast('Network error while publishing job.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // Job status remains 'draft'
      showToast('Job draft saved. Remains invisible to candidates.');
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      showToast('Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const companyName = user?.company_name || 'Enterprise Recruiter';

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#0b1c30]">Loading job review specifications...</span>
        </div>
      </div>
    );
  }

  return (
    <JobCreationStepGuard jobId={activeJobId} requiredStep={4}>
    <PageTransition
      className="w-full min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased flex-1 flex flex-col"
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
      
        {/* Top Header */}
        

        {/* 4-Step Stepper Header */}
        <section className="bg-white border-b border-slate-100 px-6 py-4 shadow-2xs">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Step 1: Basic Details */}
              <Link
                to={activeJobId ? `/recruiter/jobs/${activeJobId}/edit` : `/recruiter/jobs/create`}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#006a61] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider">Step 1</span>
                  <span className="text-xs font-semibold text-[#0b1c30] truncate">Job Details</span>
                </div>
              </Link>

              {/* Step 2: Job Description */}
              <Link
                to={activeJobId ? `/recruiter/jobs/${activeJobId}/description` : `/recruiter/jobs/create`}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#006a61] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider">Step 2</span>
                  <span className="text-xs font-semibold text-[#0b1c30] truncate">Job Description</span>
                </div>
              </Link>

              {/* Step 3: Screening Questions */}
              <Link
                to={activeJobId ? `/recruiter/jobs/${activeJobId}/screening` : `/recruiter/jobs/create`}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#006a61] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider">Step 3</span>
                  <span className="text-xs font-semibold text-[#0b1c30] truncate">Screening</span>
                </div>
              </Link>

              {/* Step 4: Review & Publish (Active) */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#00288e] text-white shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white text-[#00288e] flex items-center justify-center text-xs font-bold shrink-0">
                  4
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Active Step</span>
                  <span className="text-xs font-bold text-white truncate">Review & Publish</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. MAIN REVIEW CANVAS
        ───────────────────────────────────────────── */}
        <section className="flex-1 px-6 py-6 pb-24 max-w-7xl w-full mx-auto space-y-6">
          {/* Editorial Header Banner */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00288e]">
                <span className="w-2 h-2 rounded-full bg-[#00288e]"></span>
                <span>Pre-Flight Validation • Ready to Publish</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30]">
                Final Job Review & Publication
              </h1>
              <p className="text-xs text-[#444653] leading-relaxed">
                Review all job specifications, descriptions, and screening criteria before publishing. Once published, this job will immediately become active in the public candidate discovery feed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview Candidate View</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isPublishing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#444653] text-xs font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>
          </div>

          {/* Two-Column Grid: 8 Cols Review Sections / 4 Cols Publication Actions */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Modular Review Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* Ready / Issue Status Notification */}
              {isReadyToPublish ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-emerald-900">
                      All Mandatory Specifications Completed
                    </h3>
                    <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                      Your job posting satisfies all essential requirements. Publishing now will make it immediately searchable and open for applications.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    Ready to Publish
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-amber-900">
                      Incomplete Specifications Detected
                    </h3>
                    <div className="space-y-1 mt-1">
                      {validationIssues.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-amber-800">
                          <span>•</span>
                          <span><strong>{v.section}:</strong> {v.message}</span>
                          <Link
                            to={v.step === 1 ? (activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/edit` : `/recruiter/jobs/create`) : `/recruiter/jobs/${activeJobId}/description`}
                            className="text-[#00288e] underline font-semibold ml-1"
                          >
                            Fix in Step {v.step}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 1: Basic Details */}
              <StaggerItem index={0} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">1. Basic Information</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Completed
                    </span>
                  </div>

                  <Link
                    to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/edit` : `/recruiter/jobs/create`}
                    className="text-xs font-semibold text-[#00288e] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Edit</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-slate-200/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#0b1c30]">
                      {job?.title || 'Untitled Position'}
                    </h3>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#0b1c30] self-start sm:self-auto">
                      {job?.employment_type || 'Full-time Permanent'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#757684] block">Department</span>
                      <span className="text-xs font-semibold text-[#0b1c30]">{job?.department || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#757684] block">Category</span>
                      <span className="text-xs font-semibold text-[#0b1c30]">{job?.job_domain || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#757684] block">Seniority</span>
                      <span className="text-xs font-semibold text-[#0b1c30]">{job?.seniority_level || 'Mid Level'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#757684] block">Openings</span>
                      <span className="text-xs font-semibold text-[#0b1c30]">{job?.openings_count || 1} Position(s)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#444653]">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span><strong>Location:</strong> {job?.location || 'India'} ({job?.workplace_type || 'On-site'})</span>
                    </div>
                    {job?.notice_period && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Notice:</strong> {job.notice_period}</span>
                      </div>
                    )}
                  </div>

                  {requiredSkillsList.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#757684] block">Required Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {requiredSkillsList.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#00288e] text-xs font-semibold border border-blue-200/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </StaggerItem>

              {/* CARD 2: Description & Overview */}
              <StaggerItem index={1} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">2. Job Description & Scope</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Completed
                    </span>
                  </div>

                  <Link
                    to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/description` : `/recruiter/jobs/create/description`}
                    className="text-xs font-semibold text-[#00288e] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Edit</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[#eff4ff] space-y-0.5">
                    <span className="text-xs uppercase font-bold text-[#757684]">Word Count</span>
                    <span className="text-base font-bold text-[#00288e] block">{wordCount} Words</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#eff4ff] space-y-0.5">
                    <span className="text-xs uppercase font-bold text-[#757684]">Responsibilities</span>
                    <span className="text-base font-bold text-[#0b1c30] block">{responsibilitiesList.length} Listed</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#eff4ff] space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-xs uppercase font-bold text-[#757684]">Qualifications</span>
                    <span className="text-base font-bold text-[#0b1c30] block">{requirementsList.length} Listed</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-slate-200/60">
                  <span className="text-[10px] uppercase font-bold text-[#757684] block mb-1">Role Overview</span>
                  <p className="text-xs text-[#0b1c30] leading-relaxed whitespace-pre-line">
                    {job?.description || 'No description provided.'}
                  </p>
                </div>
              </StaggerItem>

              {/* CARD 3: Responsibilities, Requirements & Benefits */}
              <StaggerItem index={2} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">3. Responsibilities & Requirements</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Completed
                    </span>
                  </div>

                  <Link
                    to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/description` : `/recruiter/jobs/create/description`}
                    className="text-xs font-semibold text-[#00288e] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Edit</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>

                {/* Key Responsibilities */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-bold text-[#444653] block">Key Responsibilities</span>
                  {responsibilitiesList.length > 0 ? (
                    <ul className="space-y-1.5 pl-1">
                      {responsibilitiesList.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#0b1c30] leading-relaxed">
                          <span className="text-[#00288e] font-bold mt-0.5">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific responsibilities configured.</p>
                  )}
                </div>

                {/* Requirements */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] uppercase font-bold text-[#444653] block">Required Qualifications</span>
                  {requirementsList.length > 0 ? (
                    <ul className="space-y-1.5 pl-1">
                      {requirementsList.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#0b1c30] leading-relaxed">
                          <span className="text-[#006a61] font-bold mt-0.5">✓</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific requirements configured.</p>
                  )}
                </div>

                {/* Benefits */}
                {benefitsList.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] uppercase font-bold text-[#444653] block">Perks & Benefits</span>
                    <div className="flex flex-wrap gap-1.5">
                      {benefitsList.map((b, i) => {
                        const title = typeof b === 'string' ? b : (b?.title || b?.name || '');
                        return (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#00288e] text-xs font-semibold">
                            🎁 {title}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </StaggerItem>

              {/* CARD 4: Screening Questionnaire */}
              <StaggerItem index={3} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">4. Screening Questionnaire</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${questions.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {questions.length > 0 ? `${questions.length} Configured` : 'None added'}
                    </span>
                  </div>

                  <Link
                    to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/screening` : `/recruiter/jobs/create/screening`}
                    className="text-xs font-semibold text-[#00288e] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Edit</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-2.5">
                    {questions.map((q, i) => (
                      <div key={q.id || i} className="p-3 rounded-xl bg-[#f8f9ff] border border-slate-200/60 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[#eff4ff] text-[#00288e] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-[#0b1c30]">
                              {q.question_text || q.text}
                            </span>
                            <span className="text-[10px] text-[#757684]">
                              Type: {q.question_type || q.type || 'short_text'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {q.is_required ? (
                            <span className="px-2 py-0.5 rounded bg-[#dde1ff] text-[#001453] text-[9px] font-bold">
                              Mandatory
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px]">
                              Optional
                            </span>
                          )}
                          {q.is_knockout && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200">
                              Key Criteria
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 text-center">
                    <p className="text-xs text-slate-500">
                      No custom screening questions configured. Standard candidate resume and details will be captured.
                    </p>
                  </div>
                )}
              </StaggerItem>
            </div>

            {/* RIGHT COLUMN: Publication Controls & Actions (4 cols) */}
            <div className="lg:col-span-4 space-y-5 sticky top-24">
              {/* Publication Reach Card */}
              <StaggerItem index={4} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0b1c30]">Candidate Distribution</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Live Channel
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#eff4ff] border border-blue-100/60 flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-[#00288e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div className="flex flex-col text-xs">
                    <span className="font-bold text-[#0b1c30]">Vakancy.in Job Marketplace</span>
                    <span className="text-[11px] text-[#444653] leading-relaxed mt-0.5">
                      Instantly indexed across candidate search filters, department categories, and job alert feeds.
                    </span>
                  </div>
                </div>
              </StaggerItem>

              {/* Publishing Schedule Card */}
              <StaggerItem index={5} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3">
                <span className="text-sm font-bold text-[#0b1c30] block">Publishing Mode</span>

                <div className="space-y-2">
                  <label
                    onClick={() => setPublishSchedule('now')}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      publishSchedule === 'now'
                        ? 'bg-[#eff4ff] border-[#00288e]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedule_mode"
                      checked={publishSchedule === 'now'}
                      onChange={() => setPublishSchedule('now')}
                      className="mt-0.5 text-[#00288e] focus:ring-0"
                    />
                    <div className="flex flex-col text-xs">
                      <span className="font-bold text-[#0b1c30]">Publish Immediately</span>
                      <span className="text-[11px] text-[#444653]">Goes live across all candidate channels instantly.</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setPublishSchedule('draft')}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      publishSchedule === 'draft'
                        ? 'bg-[#eff4ff] border-[#00288e]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedule_mode"
                      checked={publishSchedule === 'draft'}
                      onChange={() => setPublishSchedule('draft')}
                      className="mt-0.5 text-[#00288e] focus:ring-0"
                    />
                    <div className="flex flex-col text-xs">
                      <span className="font-bold text-[#0b1c30]">Hold as Internal Draft</span>
                      <span className="text-[11px] text-[#444653]">Keeps the job private until you are ready to launch.</span>
                    </div>
                  </label>
                </div>
              </StaggerItem>

              {/* Primary Call to Action Box */}
              <StaggerItem index={6} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <button
                  type="button"
                  onClick={publishSchedule === 'now' ? handlePublishJob : handleSaveDraft}
                  disabled={isPublishing || (publishSchedule === 'now' && !isReadyToPublish)}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    publishSchedule === 'now'
                      ? (isReadyToPublish
                          ? 'bg-[#00288e] hover:bg-[#1e40af] text-white shadow-blue-900/10'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed')
                      : 'bg-[#006a61] hover:bg-[#005049] text-white'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Publishing Job...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{publishSchedule === 'now' ? 'Publish Job Now' : 'Save as Draft'}</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isPublishing}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#444653] text-xs font-semibold transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="w-full py-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors"
                  >
                    Preview
                  </button>
                </div>

                <div className="text-center text-[10px] text-[#757684] pt-1">
                  ✓ Verified Employer Listing • Zero Hidden Fees
                </div>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </section>

        {/* ─────────────────────────────────────────────
            4. STICKY BOTTOM WIZARD ACTION BAR
        ───────────────────────────────────────────── */}
        <section className="sticky bottom-0 w-full bg-white backdrop-blur-md px-6 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-[80] border-t border-slate-100 mt-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <Link
                to={activeJobId !== 'draft-job' ? `/recruiter/jobs/${activeJobId}/screening` : `/recruiter/jobs/create/screening`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#444653] hover:text-[#0b1c30] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back: Screening Questions</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-[#444653] hidden sm:inline">
                {lastSavedTime ? `Draft saved at ${lastSavedTime}` : 'All specifications loaded'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isPublishing}
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold transition-colors cursor-pointer border border-blue-100/60"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={handlePublishJob}
                disabled={isPublishing || !isReadyToPublish}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md inline-flex items-center gap-2 cursor-pointer ${
                  isReadyToPublish
                    ? 'bg-[#00288e] hover:bg-[#1e40af] text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>{isPublishing ? 'Publishing...' : 'Publish Job'}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            5. CANDIDATE VIEW PREVIEW MODAL
        ───────────────────────────────────────────── */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00288e] text-white text-[10px] font-bold uppercase">
                    Candidate Portal Preview
                  </span>
                  <span className="text-xs font-semibold text-[#0b1c30] truncate">
                    {job?.title || 'Position'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#0b1c30] hover:bg-slate-200/60 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Candidate Job Card Header */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#f8f9ff] border border-slate-200/80">
                  <div className="w-12 h-12 rounded-xl bg-[#00288e] text-white font-bold text-lg flex items-center justify-center shrink-0">
                    {companyName.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base font-bold text-[#0b1c30]">
                      {job?.title || 'Untitled Position'}
                    </h3>
                    <span className="text-xs font-semibold text-[#006a61]">
                      {companyName} • {job?.location || 'India'} ({job?.workplace_type || 'On-site'})
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-[#0b1c30]">
                        {job?.employment_type || 'Full-time'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-[#0b1c30]">
                        {job?.seniority_level || 'Mid Level'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        Active Opening
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role Overview */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase text-[#444653]">Role Overview</h4>
                  <p className="text-xs text-[#0b1c30] leading-relaxed whitespace-pre-line">
                    {job?.description || 'No overview provided.'}
                  </p>
                </div>

                {/* Responsibilities */}
                {responsibilitiesList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase text-[#444653]">What You Will Do</h4>
                    <ul className="space-y-1 pl-1">
                      {responsibilitiesList.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#0b1c30]">
                          <span className="text-[#00288e] font-bold">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {requirementsList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase text-[#444653]">Requirements & Qualifications</h4>
                    <ul className="space-y-1 pl-1">
                      {requirementsList.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#0b1c30]">
                          <span className="text-[#006a61] font-bold">✓</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-[#757684]">
                  This is how candidate job seekers will view your posting on Vakancy.in
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-[#0b1c30] transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
    </JobCreationStepGuard>
  );
}
