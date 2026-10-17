import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Download,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Languages,
  Eye,
  ArrowRight,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import API from '../../services/api';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
export default function CandidateAIResumeBuilderPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  // generatedResult has { structuredData, pdfBase64 }

  // Save Modal state
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('');
  const [savingResume, setSavingResume] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // 3-resume limit state in-flow
  const [resumeLimitReached, setResumeLimitReached] = useState(false);
  const [currentResumes, setCurrentResumes] = useState([]);

  useEffect(() => {
    loadCandidateProfile();
  }, []);

  const loadCandidateProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/candidates/me');
      if (res?.success && res.candidate) {
        setProfileData({
          ...res.candidate,
          completion: res.completion,
          counts: res.counts
        });
        setCurrentResumes(res.candidate.resumes || []);
      }
    } catch {
      setGenError('Failed to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIResume = async () => {
    try {
      setGenerating(true);
      setGenError(null);
      setGeneratedResult(null);
      setSaveSuccess(false);

      const res = await API.post('/candidates/me/generate-ai-resume');
      if (res?.success && res.structuredData && res.pdfBase64) {
        setGeneratedResult({
          structuredData: res.structuredData,
          pdfBase64: res.pdfBase64
        });
        // Default suggested title
        const defaultTitle = profileData?.professional_headline
          ? `${profileData.professional_headline} Resume`
          : 'Professional Resume';
        setResumeTitle(defaultTitle);
      } else {
        setGenError(res?.message || 'AI Resume Builder is temporarily unavailable. Please try again later.');
      }
    } catch (err) {
      setGenError(err.message || 'AI Resume Builder is temporarily unavailable. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedResult?.pdfBase64) return;
    const link = document.createElement('a');
    link.href = generatedResult.pdfBase64;
    link.download = `${(resumeTitle || 'resume').toLowerCase().replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToProfile = async (e) => {
    if (e) e.preventDefault();
    if (!resumeTitle.trim()) {
      setSaveError('Please enter a Resume Title.');
      return;
    }
    if (!generatedResult?.pdfBase64) return;

    try {
      setSavingResume(true);
      setSaveError('');
      const res = await API.post('/candidates/me/save-ai-resume', {
        resume_title: resumeTitle.trim(),
        pdf_base64: generatedResult.pdfBase64
      });

      if (res.success) {
        setSaveSuccess(true);
        setShowTitleModal(false);
        window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        loadCandidateProfile();
      } else if (res.code === 'RESUME_LIMIT_REACHED') {
        setResumeLimitReached(true);
        if (Array.isArray(res.resumes)) setCurrentResumes(res.resumes);
      } else {
        setSaveError(res.message || 'Failed to save resume.');
      }
    } catch (err) {
      if (err.code === 'RESUME_LIMIT_REACHED') {
        setResumeLimitReached(true);
        if (Array.isArray(err.resumes)) {
          setCurrentResumes(err.resumes);
        }
      } else {
        setSaveError(err.message || 'Failed to save resume.');
      }
    } finally {
      setSavingResume(false);
    }
  };

  const handleRemoveExistingResume = async (resumeId) => {
    try {
      const res = await API.delete(`/candidates/me/resumes/${resumeId}`);
      if (res.success) {
        setCurrentResumes(prev => prev.filter(r => r.id !== resumeId));
        setResumeLimitReached(false);
        window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
      }
    } catch {
      setSaveError('Failed to remove resume.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#0b1c30]">Loading candidate information...</p>
        </div>
      </div>
    );
  }

  const structured = generatedResult?.structuredData;

  return (
    <CandidatePortalShell>
        {/* Top Overview Banner */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Resume Builder</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#0b1c30]">
              Generate Your ATS-Friendly Professional Resume
            </h1>
            <p className="text-xs text-[#444653] mt-1 max-w-2xl">
              Generates an executive, ATS-parsed single-column PDF resume using your real candidate profile data.
              Gemini refines phrasing and action verbs without inventing false facts or metrics.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateAIResume}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-all shadow-sm shadow-blue-900/10 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Resume with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Resume with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {genError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{genError}</span>
            </div>
            <button onClick={() => setGenError(null)}>
              <X className="w-4 h-4 text-amber-700" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Resume has been saved to your profile! You can now view it under My Profile → Resumes.</span>
            </div>
            <Link
              to="/candidate/profile"
              className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800"
            >
              View in My Profile
            </Link>
          </div>
        )}

        {/* 2-Column Layout: Left = Candidate Data Review, Right = Live Generated Resume / Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Source of Truth Candidate Profile (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#444653]">
                  Candidate Profile Source of Truth
                </h2>
              </div>

              {/* Personal */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-[#0b1c30] text-sm block">
                    {profileData?.name || 'No Name Provided'}
                  </span>
                  <span className="text-[#444653]">
                    {profileData?.professional_headline || 'No Headline Provided'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {profileData?.current_location || 'India'}
                  </p>
                </div>

                {profileData?.professional_summary && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-[#444653] block mb-1">Summary</span>
                    <p className="text-slate-600 line-clamp-3 leading-relaxed">
                      {profileData.professional_summary}
                    </p>
                  </div>
                )}

                {/* Experience */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#444653]">Experience ({profileData?.experience?.length || 0})</span>
                  </div>
                  {(!profileData?.experience || profileData.experience.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No experience records added.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileData.experience.slice(0, 3).map((exp, idx) => (
                        <div key={idx} className="bg-[#f8f9ff] p-2 rounded-lg">
                          <p className="font-bold text-[#0b1c30]">{exp.designation}</p>
                          <p className="text-[#555e6d] text-[11px]">{exp.organization}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Education */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-[#444653] block mb-1">Education ({profileData?.education?.length || 0})</span>
                  {(!profileData?.education || profileData.education.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No education records added.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileData.education.slice(0, 2).map((edu, idx) => (
                        <div key={idx} className="bg-[#f8f9ff] p-2 rounded-lg">
                          <p className="font-bold text-[#0b1c30]">{edu.degree}</p>
                          <p className="text-[#555e6d] text-[11px]">{edu.institution} {edu.year ? `(${edu.year})` : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                {/* Projects */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-[#444653] block mb-1">Projects ({profileData?.projects?.length || 0})</span>
                  {(!profileData?.projects || profileData.projects.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No projects added.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileData.projects.slice(0, 2).map((p, idx) => (
                        <div key={idx} className="bg-[#f8f9ff] p-2 rounded-lg">
                          <p className="font-bold text-[#0b1c30]">{p.project_name}</p>
                          {p.role && <p className="text-[#555e6d] text-[11px]">{p.role}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-[#444653] block mb-1.5">Skills ({profileData?.skills?.length || 0})</span>
                  {(!profileData?.skills || profileData.skills.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No skills added.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {profileData.skills.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-[#00288e] text-[10px] font-semibold">
                          {s.name || s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live ATS Resume Output Canvas (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {generatedResult ? (
              <div className="bg-white rounded-2xl border border-[#e5eeff] p-6 shadow-sm">
                {/* Action Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-sm font-bold text-[#0b1c30]">ATS Resume Document Canvas</h2>
                    <p className="text-xs text-slate-500">Structurally optimized for ATS parsers (single-column format)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowTitleModal(true);
                        setSaveError('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold shadow-xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Save to Profile
                    </button>
                  </div>
                </div>

                {/* ATS Resume Preview Paper */}
                <div className="bg-white border border-slate-300 rounded-xl p-8 shadow-xs max-w-2xl mx-auto font-sans text-[#222933]">
                  {/* Name & Headline */}
                  <div className="text-center pb-3 border-b border-slate-300 mb-4">
                    <h3 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">
                      {structured?.name || profileData?.name}
                    </h3>
                    {structured?.headline && (
                      <p className="text-sm font-semibold text-[#00288e] mt-0.5">
                        {structured.headline}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center text-[11px] text-slate-600 mt-2">
                      {structured?.contact?.location && <span className="mr-2">{structured.contact.location}</span>}
                      {structured?.contact?.location && (structured?.contact?.phone || structured?.contact?.email) && <span className="mx-1 text-slate-400">|</span>}
                      {structured?.contact?.phone && <span className="mx-2">{structured.contact.phone}</span>}
                      {structured?.contact?.phone && structured?.contact?.email && <span className="mx-1 text-slate-400">|</span>}
                      {structured?.contact?.email && (
                        <a href={`mailto:${structured.contact.email}`} className="mx-2 hover:text-[#00288e]">{structured.contact.email}</a>
                      )}
                      
                      {(() => {
                        const links = structured?.contact?.links || [];
                        const li = links.find(l => String(l).toLowerCase().includes('linkedin'));
                        const po = links.find(l => String(l).toLowerCase().includes('portfolio') || String(l).toLowerCase().includes('devang'));
                        const gh = links.find(l => String(l).toLowerCase().includes('github'));
                        
                        return (
                          <>
                            {li && <><span className="mx-1 text-slate-400">|</span><a href={li} target="_blank" rel="noreferrer" className="mx-2 hover:text-[#00288e]">LinkedIn</a></>}
                            {po && <><span className="mx-1 text-slate-400">|</span><a href={po} target="_blank" rel="noreferrer" className="mx-2 hover:text-[#00288e]">Portfolio</a></>}
                            {gh && <><span className="mx-1 text-slate-400">|</span><a href={gh} target="_blank" rel="noreferrer" className="mx-2 hover:text-[#00288e]">GitHub</a></>}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Summary */}
                  {structured?.summary && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        Professional Summary
                      </h4>
                      <p className="text-xs leading-relaxed text-justify text-slate-700">
                        {structured.summary}
                      </p>
                    </div>
                  )}

                  {/* Experience */}
                  {Array.isArray(structured?.experience) && structured.experience.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        Work Experience
                      </h4>
                      <div className="space-y-3">
                        {structured.experience.map((exp, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0b1c30]">
                                {exp.title} — <span className="text-slate-600 font-normal">{exp.company}</span>
                              </span>
                              {exp.period && <span className="text-slate-500 font-medium text-[11px]">{exp.period}</span>}
                            </div>
                            {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                              <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-1">
                                {exp.bullets.map((b, bIdx) => (
                                  <li key={bIdx} className="leading-relaxed">{b}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {Array.isArray(structured?.projects) && structured.projects.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        Projects
                      </h4>
                      <div className="space-y-2">
                        {structured.projects.map((proj, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-bold text-[#0b1c30]">{proj.name}</span>
                            {proj.role && <span className="text-slate-500"> | {proj.role}</span>}
                            {Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                              <span className="italic text-slate-600"> [Tech: {proj.technologies.join(', ')}]</span>
                            )}
                            {Array.isArray(proj.bullets) && proj.bullets.length > 0 ? (
                              <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-0.5">
                                {proj.bullets.map((b, bIdx) => (
                                  <li key={bIdx} className="leading-relaxed">{b}</li>
                                ))}
                              </ul>
                            ) : proj.description ? (
                              <p className="text-slate-700 mt-0.5 leading-relaxed">{proj.description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {Array.isArray(structured?.education) && structured.education.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        Education
                      </h4>
                      <div className="space-y-1.5">
                        {structured.education.map((edu, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-[#0b1c30]">{edu.degree}</span>
                              <span className="text-slate-600"> — {edu.institution}</span>
                              {edu.details && <span className="text-slate-500 text-[11px]"> ({edu.details})</span>}
                            </div>
                            {edu.year && <span className="text-slate-500 text-[11px]">{edu.year}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {Array.isArray(structured?.languages) && structured.languages.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        Languages
                      </h4>
                      <p className="text-xs text-slate-700">
                        {structured.languages.join('  •  ')}
                      </p>
                    </div>
                  )}
                
                  {/* Skills */}
                  {Array.isArray(structured?.skills) && structured.skills.length > 0 && (
                    <div className="mt-6 mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#00288e] border-b border-slate-200 pb-1 mb-2">
                        SKILLS
                      </h4>

                        <ul className="list-disc list-outside ml-4 text-xs text-slate-700 leading-relaxed space-y-1">
                          {structured.skills.map((skill, idx) => (
                            <li key={idx}>{skill}</li>
                          ))}
                        </ul>

                    </div>
                  )}

              </div>
              </div>
            ) : (
              /* Empty / Pre-Generation State */
              <div className="bg-white rounded-2xl border border-[#e5eeff] p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px]">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0b1c30] mb-1">
                  Ready to Generate Your Resume
                </h3>
                <p className="text-xs text-[#444653] max-w-md mb-6 leading-relaxed">
                  Click the button below to have Gemini compile your authenticated candidate profile data into an ATS-friendly, professional PDF resume.
                </p>
                <button
                  onClick={handleGenerateAIResume}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-all shadow-sm shadow-blue-900/10 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Resume with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Resume with AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODAL: ENTER RESUME TITLE BEFORE SAVING */}
        {showTitleModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0b1c30]">Name Your Resume</h3>
                <button onClick={() => setShowTitleModal(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {resumeLimitReached ? (
                /* In-flow 3-resumes limit management state */
                <div>
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-bold">You can have up to 3 resumes</span>
                  </div>
                  <p className="text-xs text-[#444653] mb-4">
                    Please remove one of your existing resumes below to free up a slot for this new resume.
                  </p>
                  <div className="space-y-2 mb-4">
                    {currentResumes.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-[#f8f9ff] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#0b1c30]">{r.resume_title}</p>
                          <p className="text-[10px] text-slate-500">{r.file_name}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveExistingResume(r.id)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowTitleModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Resume Title Input Form */
                <form onSubmit={handleSaveToProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#444653] mb-1">
                      Resume Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={resumeTitle}
                      onChange={(e) => setResumeTitle(e.target.value)}
                      placeholder="e.g. Full Stack Developer Resume"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00288e]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      This will be saved to your profile and stored securely in Cloudinary.
                    </p>
                  </div>

                  {saveError && (
                    <p className="text-xs text-red-600 font-medium">{saveError}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowTitleModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingResume}
                      className="px-5 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingResume ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Resume'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </CandidatePortalShell>
  );
}
