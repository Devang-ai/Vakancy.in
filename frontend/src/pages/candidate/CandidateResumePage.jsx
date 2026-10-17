import axios from 'axios';
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import Toast from '../../components/common/Toast';
/**
 * CandidateResumePage
 * Stitch Screen ID: f4ba9d689ad04539bbf42020b0f84f77
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 * Route: /candidate/resume
 *
 * Screen: Candidate My Resume & Dossier Hub
 * Features:
 * - Candidate Shell (Sidebar with Resume navigation active, Header with user profile)
 * - Context Breadcrumb (Workspace > Resume Management > Active Dossiers) & Header Action Bar
 * - Active Resume Primary Dossier Unit (PDF badge, Target Alignment, 94% ATS Caliber Score dial, preview/download/replace actions)
 * - Tailored Domain Profiles (Active/Inactive variant cards with ATS scores, Set Active, Duplicate, Delete, Edit)
 * - Dedicated Upload & Neural Intake Engine Dropzone (Drag-and-drop, browse files, LinkedIn import, 3 SLA cards)
 * - Real-Time ATS Scoring Telemetry (Composite score, Layout parsability, Keyword density, Business impact, Section completeness)
 * - Algorithmic Lift optimization module linking to AI Resume Builder (/candidate/ai-builder)
 * - Enterprise Compliance Vault (DPDP Act 2023 compliance ledger)
 * - Interactive Modals: Full Resume Dossier Preview, Create/Edit Variant, Version Log Drawer, Privacy & Consent Ledger
 * - Responsive layout matching Stitch proportions exactly
 */

/* ─────────────────────────────────────────────
   CANDIDATE SIDEBAR COMPONENT
───────────────────────────────────────────── */
const CandidateSidebar = ({ onLogout }) => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
    <div className="flex flex-col">
      <div className="h-16 px-6 flex items-center gap-2 bg-white">
        <Link to="/candidate/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-[#0b1c30] tracking-tight">Vakancy.in</span>
            <span className="text-[10px] font-semibold text-[#444653] uppercase tracking-wider">Candidate Portal</span>
          </div>
        </Link>
      </div>

      <div className="px-3 pt-4">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#444653]">Workspace</p>
        <nav className="flex flex-col gap-0.5">
          <Link
            to="/candidate/dashboard"
            id="nav-dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </Link>
          <Link
            to="/candidate/jobs"
            id="nav-find-jobs"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span className="text-sm font-medium">Find Jobs</span>
            </div>
          </Link>
          <Link
            to="/candidate/applications"
            id="nav-applications"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span className="text-sm font-medium">Applications</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#444653] font-semibold">12</span>
          </Link>
          <Link
            to="/candidate/saved"
            id="nav-saved-jobs"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              <span className="text-sm font-medium">Saved Jobs</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#444653] font-semibold">12</span>
          </Link>
          <Link
            to="/candidate/profile"
            id="nav-profile"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-sm font-medium">My Profile</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#00288e] font-bold">92%</span>
          </Link>
          <Link
            to="/candidate/resume"
            id="nav-my-resume"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1e40af] text-white font-semibold shadow-sm"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-medium">My Resume</span>
            </div>
          </Link>
        </nav>
      </div>

      <div className="px-3 pt-4">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#444653]">Career Tools</p>
        <nav className="flex flex-col gap-0.5">
          <Link
            to="/candidate/ai-builder"
            id="nav-ai-builder"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
              </svg>
              <span className="text-sm font-medium">AI Resume Builder</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#dce9ff] text-[#00288e]">AI</span>
          </Link>
        </nav>
      </div>
    </div>

    <div className="p-4 bg-white">
      <div className="bg-[#eff4ff] p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#006a61]" />
          <span className="text-xs font-medium text-[#0b1c30]">System Live</span>
        </div>
        <span className="text-xs text-[#444653]">v2.4</span>
      </div>
    </div>
  </aside>
);

/* ─────────────────────────────────────────────
   CANDIDATE HEADER COMPONENT
───────────────────────────────────────────── */
const CandidateHeader = ({ user, onLogout }) => {
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const headline = user?.headline || '';
  const avatarUrl = user?.avatar || 'https://lh3.googleusercontent.com/aida/AEtjO1Wo-uvm5-g2HKkMkVKP6YrU3UwlyEZsTA0z0qyPp5vT_K8U_MGK8YrTB1oWJlXofykMoUerAPra0g1pbXUclHHzalIdKqJeG8q8y_pSyEpT6qssVJ39rkqoa6TDQTzH2_n75PROmNnHWqCB-EGRY29UHv8PTRw73kmNsZ1ZvZY4srlzitqDNBmk-VoiS9hFehW8jMvm2v6NVw0eQ66Y0qXAI4pEyiZqeGSkTWKhQfdlb4SFnd0oyS6KYK9e';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 flex items-center justify-between">
      <div className="w-96">
        <div className="relative flex items-center bg-[#eff4ff] rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all">
          <svg className="w-4 h-4 text-[#444653] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="w-full bg-transparent border-none outline-none text-xs text-[#0b1c30] placeholder:text-[#444653]/70"
            placeholder="Quick search jobs, companies, skills (Press '/' to jump)..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          title="Notifications"
          className="relative p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
            3
          </span>
        </button>

        <Link
          to="/candidate/settings"
          title="Settings"
          className="p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>

        <div className="h-6 w-[1px] bg-[#c4c5d5]/30" />

        <Link
          to="/candidate/profile"
          className="flex items-center gap-2 pl-1 cursor-pointer group"
          title="View profile"
        >
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-[#c4c5d5]/40"
          />
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#00288e] transition-colors leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-[#444653] leading-tight">{headline}</span>
          </div>
          <svg className="w-4 h-4 text-[#444653] group-hover:text-[#0b1c30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Link>
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────
   MAIN PAGE COMPONENT: CandidateResumePage
───────────────────────────────────────────── */
const CandidateResumePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:5000/api/candidates/me/resumes', { withCredentials: true });
      if (res.data.success) {
        setResumes(res.data.data || []);
      } else {
        setError(res.data.message || 'Failed to load resumes');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('We couldn\'t load your resumes right now.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed for resumes.');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Resume file must be 2 MB or smaller.');
      return;
    }
    
    if (resumes.length >= 3) {
      showToast('You can upload up to 3 resumes. Delete an existing resume to upload a new one.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('resume', file);
      
      const res = await axios.post('http://localhost:5000/api/candidates/me/resumes', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        showToast('Resume uploaded successfully.');
        fetchResumes();
      } else {
        showToast(res.data.message || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error uploading resume.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await axios.delete(`http://localhost:5000/api/candidates/me/resumes/${id}`, { withCredentials: true });
      if (res.data.success) {
        showToast('Resume deleted.');
        fetchResumes();
      } else {
        showToast(res.data.message || 'Failed to delete resume.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting resume.');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/candidates/me/resumes/${id}/set-primary`, {}, { withCredentials: true });
      if (res.data.success) {
        showToast('Primary resume updated.');
        fetchResumes();
      } else {
        showToast(res.data.message || 'Failed to set primary.');
      }
    } catch (err) {
      console.error('Set primary error:', err);
      showToast('Error setting primary resume.');
    }
  };
  
  const handleView = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/candidates/me/resumes/${id}/view`, { withCredentials: true });
      if (res.data.success && res.data.file_url) {
        window.open(res.data.file_url, '_blank');
      } else {
        showToast(res.data.message || 'Failed to view resume.');
      }
    } catch (err) {
      console.error('View error:', err);
      showToast('Error viewing resume.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <CandidateSidebar onLogout={logout} />
      <CandidateHeader user={user} onLogout={logout} />

      <main className="ml-64 pt-16 p-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-2xl font-bold text-[#0b1c30]">My Resume</h1>
            <p className="text-sm text-[#444653]">Manage your resumes and choose your primary resume for applications.</p>
          </div>

          {toastMessage && (
        <Toast 
          type="info"
          title="Notification"
          description={toastMessage} 
          onClose={() => setToastMessage(null)} 
        />
      )}

          <div className="bg-white rounded-xl shadow-sm border border-[#c4c5d5]/40 overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-lg font-bold text-[#0b1c30] mb-4">Uploaded Resumes</h2>
              
              {isLoading ? (
                <div className="text-sm text-[#444653] py-4">Loading resumes...</div>
              ) : error ? (
                <div className="text-sm text-red-600 py-4">{error}</div>
              ) : resumes.length === 0 ? (
                <div className="text-sm text-[#444653] py-8 text-center bg-[#f8fafc] rounded-lg border border-dashed border-[#c4c5d5]">
                  No resumes uploaded yet.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {resumes.map(r => (
                    <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#c4c5d5]/40 rounded-lg hover:border-[#00288e]/40 transition-colors bg-[#f8fafc]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded bg-[#e5eeff] flex items-center justify-center text-[#00288e]">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-2v-3h2c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zm5 2h-1.5V11h1.5c.55 0 1 .45 1 1s-.45 1-1 1zm3.5-3.5h-2.5v5H14v-2h1.5v-1H14V8.5h4v1.5z" /></svg>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0b1c30]">{r.file_name || `Resume_${r.id}`}</span>
                            {r.is_primary === 1 && (
                              <span className="text-[10px] font-bold bg-[#86f2e4]/30 text-[#006a61] px-2 py-0.5 rounded-full border border-[#006a61]/20">PRIMARY</span>
                            )}
                          </div>
                          <div className="text-xs text-[#444653]">
                            Uploaded {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <button onClick={() => handleView(r.id)} className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#c4c5d5] rounded text-[#444653] hover:bg-[#f1f5f9]">View</button>
                        {r.is_primary !== 1 && (
                          <button onClick={() => handleSetPrimary(r.id)} className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#c4c5d5] rounded text-[#0b1c30] hover:bg-[#e5eeff]">Set Primary</button>
                        )}
                        <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 rounded text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-[#f8fafc] border-t border-[#c4c5d5]/40">
              <h3 className="text-sm font-bold text-[#0b1c30] mb-2">Upload New Resume</h3>
              <p className="text-xs text-[#444653] mb-4">PDF only · Maximum file size: 2 MB · Maximum 3 resumes</p>
              
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  disabled={isUploading || resumes.length >= 3}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || resumes.length >= 3}
                  className="px-4 py-2 bg-[#1e40af] text-white text-sm font-semibold rounded hover:bg-[#00288e] disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Upload Resume'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CandidateResumePage;
