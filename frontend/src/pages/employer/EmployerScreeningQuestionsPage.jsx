import React, { useState, useEffect, useMemo, useRef } from 'react';
import {  useParams, useNavigate, Link , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import JobCreationStepGuard from '../../components/employer/JobCreationStepGuard';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

// Standard Pre-cleared Industry Question Banks
const INDUSTRY_QUESTION_BANKS = {
  'Finance & Accounting': [
    {
      question_text: 'Do you hold an active professional accounting credential (CA / CPA / ACCA / CMA)?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Essential certification requirement for statutory and general ledger compliance.'
    },
    {
      question_text: 'How many years of corporate accounting or financial reporting experience do you have?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '3',
      helper_text: 'Minimum 3 years preferred for senior ledger responsibilities.'
    },
    {
      question_text: 'Which Enterprise Resource Planning (ERP) accounting platforms have you worked with extensively?',
      question_type: 'multiple_choice',
      options: ['SAP ERP / S/4HANA', 'Oracle NetSuite', 'Tally Prime / ERP 9', 'Microsoft Dynamics 365', 'Other ERP / Cloud Tool'],
      is_required: false,
      is_knockout: false,
      ideal_answer: 'SAP ERP / S/4HANA',
      helper_text: 'Select the primary financial accounting systems you have hands-on experience with.'
    }
  ],
  'Sales & Business Development': [
    {
      question_text: 'Do you have verifiable track record carrying and meeting an annual revenue target / quota?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Required for individual contributor sales roles with target quotas.'
    },
    {
      question_text: 'How many years of B2B solution sales or enterprise deal closing experience do you possess?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '2',
      helper_text: 'Experience in pipeline generation and multi-stakeholder contract negotiations.'
    },
    {
      question_text: 'Which CRM platform have you utilized for pipeline tracking and deal forecasting?',
      question_type: 'multiple_choice',
      options: ['Salesforce', 'HubSpot CRM', 'Zoho CRM', 'LeadSquared', 'Other / Custom CRM'],
      is_required: false,
      is_knockout: false,
      ideal_answer: 'Salesforce',
      helper_text: 'Indicate your primary CRM workflow experience.'
    }
  ],
  'Healthcare & Medical': [
    {
      question_text: 'Do you possess an active Nursing Council registration or Medical Board license?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Mandatory statutory credential required for clinical patient care roles.'
    },
    {
      question_text: 'Are you available and willing to participate in rotating inpatient clinical shifts (including night shifts)?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Inpatient healthcare shifts follow standard hospital rotation rosters.'
    },
    {
      question_text: 'How many years of ICU, emergency, or acute bedside clinical nursing experience do you have?',
      question_type: 'numeric',
      options: [],
      is_required: false,
      is_knockout: false,
      ideal_answer: '2',
      helper_text: 'Direct patient care and critical care monitoring background.'
    }
  ],
  'Human Resources': [
    {
      question_text: 'How many years of end-to-end talent acquisition or corporate HR experience do you have?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '3',
      helper_text: 'Full lifecycle recruiting, onboarding, and talent partnering.'
    },
    {
      question_text: 'Are you experienced with statutory payroll compliance (PF, ESI, Gratuity, Professional Tax)?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: false,
      ideal_answer: 'Yes',
      helper_text: 'Hands-on familiarity with Indian labor regulations and employee benefits.'
    }
  ],
  'Education & Academics': [
    {
      question_text: 'Do you hold a recognized Bachelor of Education (B.Ed) degree or certified teaching credential?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Mandatory instructional certification for primary and secondary education.'
    },
    {
      question_text: 'How many years of classroom curriculum delivery or student assessment experience do you have?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '2',
      helper_text: 'Instructional planning, classroom engagement, and parent-teacher communication.'
    }
  ],
  'Technology': [
    {
      question_text: 'How many years of professional production experience do you have in this primary specialization?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '3',
      helper_text: 'Hands-on production architecture, maintenance, and debugging.'
    },
    {
      question_text: 'Are you experienced in designing and consuming RESTful APIs and relational databases?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: false,
      ideal_answer: 'Yes',
      helper_text: 'Standard backend and web system engineering requirements.'
    }
  ],
  'General & Availability': [
    {
      question_text: 'What is your official contractual notice period at your current organization?',
      question_type: 'multiple_choice',
      options: ['Immediate / Serving Notice', '15 – 30 Days', '45 – 60 Days', '90 Days (Buyout Negotiable)', '90 Days (Non-negotiable)'],
      is_required: true,
      is_knockout: false,
      ideal_answer: '15 – 30 Days',
      helper_text: 'Used to plan onboarding target timelines and handover schedules.'
    },
    {
      question_text: 'Are you comfortable working from the stated workplace location and schedule for this role?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Confirming alignment with stated on-site or hybrid arrangements.'
    }
  ]
};

export default function EmployerScreeningQuestionsPage() {
  const { id: paramJobId } = useParams();
  const navigate = useNavigate();
  const { user, profile, token } = useAuth();

  const [activeJobId, setActiveJobId] = useState(paramJobId || null);
  const [jobTitle, setJobTitle] = useState('Position');
  const [department, setDepartment] = useState('General');
  const [jobCategory, setJobCategory] = useState('Technology');
  const [location, setLocation] = useState('India');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [toast, setToast] = useState(null);
  const { setSidebarOpen } = useOutletContext();
  const [activeBankCategory, setActiveBankCategory] = useState('General & Availability');

  // Questions List State
  const [questions, setQuestions] = useState([
    {
      id: 'q_default_1',
      question_text: 'What is your official contractual notice period at your current employer?',
      question_type: 'multiple_choice',
      options: ['Immediate (Within 15 Days)', '15 – 30 Days', '45 – 60 Days', '90 Days'],
      is_required: true,
      is_knockout: false,
      ideal_answer: '15 – 30 Days',
      helper_text: 'Used to calculate onboarding timelines and project start dates.'
    },
    {
      question_text: 'Are you comfortable working from the designated job location on the specified work model?',
      question_type: 'yes_no',
      options: ['Yes', 'No'],
      is_required: true,
      is_knockout: true,
      ideal_answer: 'Yes',
      helper_text: 'Confirms candidate availability for on-site or hybrid collaboration.'
    },
    {
      question_text: 'How many years of relevant professional experience do you have in this role domain?',
      question_type: 'numeric',
      options: [],
      is_required: true,
      is_knockout: false,
      ideal_answer: '3',
      helper_text: 'Enter total completed years of professional domain experience.'
    }
  ]);

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

  // 1. Fetch Job and Existing Screening Questions on Mount
  useEffect(() => {
    const fetchJobData = async () => {
      if (!paramJobId || paramJobId === 'draft-job') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch job basic information
        const res = await fetch(`/api/employers/jobs/${paramJobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.job) {
          setActiveJobId(data.job.id);
          setJobTitle(data.job.title || 'Role');
          setDepartment(data.job.department || 'General');
          setJobCategory(data.job.job_domain || 'General');
          setLocation(data.job.location || 'India');

          // Check if category matches one of the question banks
          if (INDUSTRY_QUESTION_BANKS[data.job.job_domain]) {
            setActiveBankCategory(data.job.job_domain);
          }

          // Fetch screening questions specifically
          const qRes = await fetch(`/api/employers/jobs/${paramJobId}/questions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const qData = await qRes.json();

          if (qData.success && Array.isArray(qData.questions) && qData.questions.length > 0) {
            const formatted = qData.questions.map((q, idx) => {
              let parsedOptions = [];
              try {
                parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
              } catch (_) {
                parsedOptions = [];
              }
              return {
                id: q.id || `q_${idx}_${Date.now()}`,
                question_text: q.question_text || '',
                question_type: q.question_type || 'short_text',
                options: Array.isArray(parsedOptions) ? parsedOptions : [],
                is_required: q.is_required === 1 || q.is_required === true,
                is_knockout: q.is_knockout === 1 || q.is_knockout === true,
                ideal_answer: q.ideal_answer || '',
                helper_text: q.helper_text || ''
              };
            });
            setQuestions(formatted);
          } else if (data.job.screening_questions) {
            try {
              const sq = typeof data.job.screening_questions === 'string' 
                ? JSON.parse(data.job.screening_questions) 
                : data.job.screening_questions;
              if (Array.isArray(sq) && sq.length > 0) {
                setQuestions(sq);
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error('Error loading job questions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobData();
  }, [paramJobId, token]);

  // Question Management Helpers
  const addQuestion = (type = 'short_text') => {
    const newQ = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      question_text: '',
      question_type: type,
      options: type === 'multiple_choice' ? ['Option A', 'Option B', 'Option C'] : (type === 'yes_no' ? ['Yes', 'No'] : []),
      is_required: true,
      is_knockout: false,
      ideal_answer: type === 'yes_no' ? 'Yes' : '',
      helper_text: ''
    };
    setQuestions([...questions, newQ]);
    showToast('New screening question added.');
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    showToast('Question removed.');
  };

  const duplicateQuestion = (index) => {
    const target = questions[index];
    const dup = {
      ...target,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      question_text: `${target.question_text} (Copy)`
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, dup);
    setQuestions(updated);
    showToast('Question duplicated.');
  };

  const moveQuestion = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setQuestions(updated);
  };

  // Option modification for Multiple Choice
  const addOption = (qIdx) => {
    const updated = [...questions];
    const curOptions = updated[qIdx].options || [];
    updated[qIdx].options = [...curOptions, `Option ${String.fromCharCode(65 + curOptions.length)}`];
    setQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, val) => {
    const updated = [...questions];
    const curOptions = [...updated[qIdx].options];
    curOptions[optIdx] = val;
    updated[qIdx].options = curOptions;
    setQuestions(updated);
  };

  const removeOption = (qIdx, optIdx) => {
    const updated = [...questions];
    const curOptions = updated[qIdx].options.filter((_, i) => i !== optIdx);
    updated[qIdx].options = curOptions;
    setQuestions(updated);
  };

  // Add questions from standard pre-cleared industry bank
  const importIndustryQuestions = (bankKey) => {
    const bank = INDUSTRY_QUESTION_BANKS[bankKey] || [];
    if (bank.length === 0) return;

    const imported = bank.map((b, idx) => ({
      id: `q_bank_${Date.now()}_${idx}`,
      question_text: b.question_text,
      question_type: b.question_type,
      options: [...b.options],
      is_required: b.is_required,
      is_knockout: b.is_knockout,
      ideal_answer: b.ideal_answer,
      helper_text: b.helper_text
    }));

    setQuestions([...questions, ...imported]);
    showToast(`Added ${imported.length} standard questions from ${bankKey}.`);
  };

  // Save Questions to API
  const saveQuestions = async (isProceeding = false) => {
    // Only validate non-empty text if there are questions present
    if (questions.length > 0) {
      const emptyQ = questions.find(q => !q.question_text.trim());
      if (emptyQ) {
        showToast('Please provide text for all screening questions before continuing.');
        return false;
      }
    }

    if (!activeJobId || activeJobId === 'draft-job') {
      showToast('No active job ID found. Please create basic details first.');
      return false;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/employers/jobs/${activeJobId}/questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions })
      });

      const data = await res.json();

      if (data.success) {
        setLastSavedTime(new Date().toLocaleTimeString());
        if (isProceeding) {
          const msg = questions.length === 0
            ? 'Continuing without screening questions...'
            : 'Screening questions saved! Proceeding to Step 4...';
          showToast(msg);
          setTimeout(() => {
            navigate(`/recruiter/jobs/${activeJobId}/review`, {
              state: {
                message: questions.length === 0
                  ? `Job saved without screening questions.`
                  : `Screening questions saved for ${jobTitle}!`
              }
            });
          }, 800);
        } else {
          showToast(questions.length === 0 ? 'Draft saved (no screening questions).' : 'Screening questions draft saved successfully.');
        }
        return true;
      } else {
        showToast(data.message + (data.error ? ' - ' + data.error : '') || 'Error saving questions.');
        return false;
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Network error saving questions.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = questions.length;
    const mandatory = questions.filter(q => q.is_required).length;
    const keyCriteria = questions.filter(q => q.is_knockout).length;
    // Estimate friction: ~40s per question
    const estimatedMinutes = total === 0 ? 0 : Math.max(1, Math.round((total * 40) / 60));
    return { total, mandatory, keyCriteria, estimatedMinutes };
  }, [questions]);

  const companyName = user?.company_name || 'Enterprise Recruiter';

  return (
    <JobCreationStepGuard jobId={activeJobId} requiredStep={3}>
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

              {/* Step 3: Screening Questions (Active) */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#00288e] text-white shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white text-[#00288e] flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Active Step</span>
                  <span className="text-xs font-bold text-white truncate">Screening Questions</span>
                </div>
              </div>

              {/* Step 4: Review & Publish */}
              <Link
                to={activeJobId ? `/recruiter/jobs/${activeJobId}/review` : `/recruiter/jobs/create`}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-[#eff4ff] text-[#757684] hover:text-[#0b1c30] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                  4
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Next Step</span>
                  <span className="text-xs font-medium text-slate-600 truncate">Review & Publish</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. MAIN QUESTIONNAIRE CANVAS
        ───────────────────────────────────────────── */}
        <section className="flex-1 px-6 py-6 pb-24 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00288e]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Step 03 / 04 • Applicant Screening Criteria</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30]">
                Candidate Screening Questionnaire
              </h1>
              <p className="text-xs text-[#444653] leading-relaxed">
                Add simple, objective qualification questions to screen applicants. Candidates will answer these directly when applying, helping you review relevant experience efficiently.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => addQuestion('yes_no')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Yes/No</span>
              </button>
              <button
                type="button"
                onClick={() => addQuestion('multiple_choice')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors cursor-pointer border border-blue-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Choice</span>
              </button>
              <button
                type="button"
                onClick={() => addQuestion('short_text')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Custom Question</span>
              </button>
            </div>
          </div>

          {/* Two-Column Grid: 8 Cols Question Builder / 4 Cols Calibration & Bank */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Questions List (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Stack Controls Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0b1c30]">Screening Stack</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#dde1ff] text-[#001453] text-[10px] font-bold">
                    {questions.length} Active {questions.length === 1 ? 'Question' : 'Questions'}
                  </span>
                  <span className="text-[11px] text-[#757684] hidden sm:inline">
                    | Use arrows to arrange question order
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset questions to standard default set?')) {
                        setQuestions(INDUSTRY_QUESTION_BANKS['General & Availability'] || []);
                        showToast('Reset questions to standard set.');
                      }
                    }}
                    className="p-1.5 rounded-lg text-[#757684] hover:bg-slate-100 hover:text-[#0b1c30] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="Reset to default questions"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Questions Cards or Empty State */}
              {questions.length === 0 ? (
                <div className="p-8 mt-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
                  <div className="w-12 h-12 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b1c30] mb-2">No screening questions added yet.</h3>
                  <p className="text-xs text-[#444653] max-w-sm mx-auto">
                    Screening questions are optional. Add questions if you want to qualify applicants before reviewing applications.
                  </p>
                </div>
              ) : questions.map((q, idx) => (
                <StaggerItem
                  index={idx}
                  key={q.id || idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Card Header & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-[#eff4ff] text-[#00288e] text-xs font-bold flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-[#0b1c30]">
                        {q.question_type === 'yes_no' && 'Yes / No Choice'}
                        {q.question_type === 'multiple_choice' && 'Multiple Choice'}
                        {q.question_type === 'numeric' && 'Numeric / Years'}
                        {q.question_type === 'short_text' && 'Short Narrative'}
                      </span>

                      {/* Required Badge */}
                      {q.is_required ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#dde1ff] text-[#001453] text-[10px] font-bold">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                          Optional
                        </span>
                      )}

                      {/* Key Criteria Badge */}
                      {q.is_knockout && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Key Qualification Criterion
                        </span>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1 text-slate-500">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded-md hover:bg-slate-100 hover:text-[#0b1c30] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        className="p-1 rounded-md hover:bg-slate-100 hover:text-[#0b1c30] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(idx)}
                        className="p-1 rounded-md hover:bg-slate-100 hover:text-[#0b1c30] cursor-pointer"
                        title="Duplicate Question"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(idx)}
                        className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        title="Delete Question"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Question Stem Textarea */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase text-[#444653]">
                      Question Prompt
                    </label>
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                      placeholder="e.g. Do you hold an active professional license or certification?"
                      className="w-full px-3.5 py-2.5 bg-[#f8f9ff] text-[#0b1c30] text-sm font-semibold rounded-xl border border-slate-200 focus:bg-white focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] outline-none transition-all"
                    />

                    {/* Helper description */}
                    <input
                      type="text"
                      value={q.helper_text || ''}
                      onChange={(e) => updateQuestion(idx, 'helper_text', e.target.value)}
                      placeholder="Optional candidate instructions or additional context..."
                      className="w-full px-3 py-1.5 bg-[#f8f9ff] text-[#444653] text-xs rounded-lg border border-slate-200/60 focus:bg-white focus:border-[#00288e] outline-none transition-all"
                    />
                  </div>

                  {/* Question Type Configuration */}
                  <div className="p-3.5 rounded-xl bg-[#eff4ff] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#444653] uppercase">
                          Answer Format:
                        </span>
                        <select
                          value={q.question_type}
                          onChange={(e) => updateQuestion(idx, 'question_type', e.target.value)}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#0b1c30] outline-none focus:border-[#00288e]"
                        >
                          <option value="yes_no">Yes / No</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="numeric">Numeric / Years</option>
                          <option value="short_text">Short Text</option>
                        </select>
                      </div>

                      {/* Ideal / Preferred Answer selector */}
                      {q.question_type === 'yes_no' && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#444653] font-medium">Preferred Answer:</span>
                          <button
                            type="button"
                            onClick={() => updateQuestion(idx, 'ideal_answer', 'Yes')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                              q.ideal_answer === 'Yes'
                                ? 'bg-[#00288e] text-white'
                                : 'bg-white text-[#444653] hover:bg-slate-100'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQuestion(idx, 'ideal_answer', 'No')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                              q.ideal_answer === 'No'
                                ? 'bg-[#00288e] text-white'
                                : 'bg-white text-[#444653] hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      )}

                      {q.question_type === 'numeric' && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#444653] font-medium">Minimum Value:</span>
                          <input
                            type="number"
                            min="0"
                            value={q.ideal_answer || ''}
                            onChange={(e) => updateQuestion(idx, 'ideal_answer', e.target.value)}
                            placeholder="e.g. 3"
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#00288e] outline-none"
                          />
                          <span className="text-[#444653]">Years</span>
                        </div>
                      )}
                    </div>

                    {/* Multiple Choice Options Builder */}
                    {q.question_type === 'multiple_choice' && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-[#444653] uppercase block">
                          Options List
                        </span>
                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-white text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                className="flex-1 px-3 py-1 bg-white text-xs font-medium text-[#0b1c30] rounded-lg border border-slate-200 outline-none focus:border-[#00288e]"
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(idx, optIdx)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded"
                                title="Remove option"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="text-[11px] font-bold text-[#00288e] hover:underline inline-flex items-center gap-1 pt-1"
                        >
                          + Add another option
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Question Controls & Toggles Strip */}
                  <div className="p-3 rounded-xl bg-slate-50 flex flex-wrap items-center justify-between gap-3 border border-slate-200/60">
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0b1c30] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.is_required}
                          onChange={(e) => updateQuestion(idx, 'is_required', e.target.checked)}
                          className="w-4 h-4 rounded text-[#00288e] focus:ring-0 accent-[#00288e]"
                        />
                        <span>Mandatory Question</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0b1c30] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.is_knockout}
                          onChange={(e) => updateQuestion(idx, 'is_knockout', e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-0 accent-emerald-600"
                        />
                        <span>Key Qualification Criterion</span>
                      </label>
                    </div>

                    <span className="text-[10px] text-[#757684]">
                      {q.is_required ? 'Applicant must answer to submit' : 'Applicant may skip'}
                    </span>
                  </div>
                </StaggerItem>
              ))}

              {/* Add Question Component */}
              <div className="p-4 rounded-2xl bg-white border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#dde1ff] text-[#00288e] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0b1c30] block">
                      Add Another Screening Question
                    </span>
                    <span className="text-[11px] text-[#757684]">
                      Select an archetype to append to your candidate screening flow
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => addQuestion('yes_no')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Yes / No</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('multiple_choice')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Choice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('numeric')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Numeric</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('short_text')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Custom</span>
                  </button>
                </div>
              </div>
            </div>


            {/* RIGHT COLUMN: Calibration & Standard Banks (4 cols) */}
            <div className="lg:col-span-4 space-y-5 sticky top-24">
              {/* Card 1: Questionnaire Metrics */}
              <StaggerItem index={questions.length} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-bold text-[#0b1c30]">Questionnaire Health</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${questions.length > 0 ? 'text-[#006a61] bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {questions.length > 0 ? 'Optimal' : 'Not configured'}
                  </span>
                </div>

                {/* Bento Counts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[#eff4ff] space-y-0.5">
                    <span className="text-xl font-bold text-[#00288e] block leading-tight">
                      {metrics.total}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#444653]">Total</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#eff4ff] space-y-0.5">
                    <span className="text-xl font-bold text-[#0b1c30] block leading-tight">
                      {metrics.mandatory}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#444653]">Mandatory</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-0.5">
                    <span className="text-xl font-bold text-[#006a61] block leading-tight">
                      {metrics.keyCriteria}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Key Criteria</span>
                  </div>
                </div>

                {/* Friction Estimator */}
                <div className="p-3 rounded-xl bg-[#f8f9ff] border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0b1c30]">
                    <span>Estimated Completion:</span>
                    <span className="text-[#006a61] font-bold">~{metrics.estimatedMinutes} Minutes</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00288e] h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (metrics.total / 6) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-[#757684] leading-relaxed">
                    Keeping screening questions between 3 to 5 ensures high completion rates while delivering qualified candidate applications.
                  </p>
                </div>
              </StaggerItem>

              {/* Card 2: Pre-cleared Industry Question Banks */}
              <StaggerItem index={questions.length + 1} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-xs font-bold text-[#0b1c30]">Industry Question Banks</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#444653]">
                  Select an industry to insert vetted questions tailored for that domain:
                </p>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {Object.keys(INDUSTRY_QUESTION_BANKS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => importIndustryQuestions(key)}
                      className="w-full text-left p-2 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] border border-slate-200/60 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#00288e] truncate">
                          {key}
                        </span>
                        <span className="text-[10px] text-[#757684]">
                          {INDUSTRY_QUESTION_BANKS[key].length} vetted questions
                        </span>
                      </div>
                      <span className="text-xs text-[#00288e] font-bold group-hover:translate-x-0.5 transition-transform">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              </StaggerItem>

              {/* Card 3: Equal Opportunity & Non-Discrimination Policy */}
              <StaggerItem index={questions.length + 2} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-bold text-[#0b1c30]">Fair Hiring Standards</span>
                </div>
                <p className="text-[11px] text-[#757684] leading-relaxed">
                  All screening questions must adhere to equal employment opportunity standards. Avoid questions related to age, gender, marital status, or protected demographic traits.
                </p>
                <div className="pt-1 text-[10px] text-[#006a61] font-semibold flex items-center gap-1">
                  ✓ Aligned with standard hiring guidelines
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
                to={activeJobId ? `/recruiter/jobs/${activeJobId}/description` : `/recruiter/jobs/create`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#444653] hover:text-[#0b1c30] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back: Job Description</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-[#444653] hidden sm:inline">
                {lastSavedTime ? `Draft saved at ${lastSavedTime}` : 'Autosave active'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => saveQuestions(false)}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold transition-colors cursor-pointer border border-blue-100/60"
              >
                {isSaving ? 'Saving Draft...' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={() => saveQuestions(true)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold transition-all shadow-md hover:bg-[#1e40af] inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{isSaving ? 'Saving...' : (questions.length === 0 ? 'Continue Without Questions' : 'Save & Continue to Preview & Publish')}</span>
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
