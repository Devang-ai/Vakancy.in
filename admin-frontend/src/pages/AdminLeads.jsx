import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  UserCheck,
  Shield,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  PhoneCall,
  FileText,
  AlertTriangle,
  ArrowRightCircle,
  UserPlus,
  History,
  Tag
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminJobFormModal from '../components/jobs/AdminJobFormModal';
import useModalA11y from '../hooks/useModalA11y';

// Status badge helper
const STATUS_CONFIG = {
  UNCLAIMED: {
    label: 'Unclaimed',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  CLAIMED: {
    label: 'Claimed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-600'
  },
  CONTACTED: {
    label: 'Contacted',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-600'
  },
  REQUIREMENTS_GATHERED: {
    label: 'Reqs Gathered',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-600'
  },
  CONVERTED_TO_JOB: {
    label: 'Converted to Job',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600'
  },
  DROPPED: {
    label: 'Dropped',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
  }
};

const StatusBadge = ({ status }) => {
  const conf = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return dateString;
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return '';
  }
};

const AdminLeads = () => {
  const { user, permissions } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const isDirector = Boolean(
    user?.is_main_admin === 1 ||
    userRole === 'director' ||
    userRole === 'main_admin'
  );
  const isBD = userRole === 'bd' || userRole === 'bd_lead';
  const isRecruiter = !isBD && !isDirector; // Recruiter or staff

  // Tabs
  // For Director: all, unclaimed, claimed, converted, dropped
  // For Recruiter: unclaimed (Shared Queue), my (My Claimed Leads)
  // For BD: my_submitted (My Submitted Leads)
  const [activeTab, setActiveTab] = useState(
    isBD ? 'my_submitted' : isRecruiter ? 'unclaimed' : 'all'
  );

  // Leads list state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBd, setSelectedBd] = useState('');
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  // Dropdown reference data
  const [teamMembers, setTeamMembers] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [claimLeadTarget, setClaimLeadTarget] = useState(null);
  const [statusModalLead, setStatusModalLead] = useState(null);
  const [reassignLeadTarget, setReassignLeadTarget] = useState(null);
  const [detailsLeadId, setDetailsLeadId] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (isAddModalOpen || claimLeadTarget || statusModalLead || reassignLeadTarget || detailsLeadId || convertingLead) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddModalOpen, claimLeadTarget, statusModalLead, reassignLeadTarget, detailsLeadId, convertingLead]);

  // Fetch Team Members for Filters & Reassignment
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await API.get('/admin/team');
        if (res.success) {
          setTeamMembers(res.team || []);
        }
      } catch (err) {
        console.warn('Could not load team members:', err.message);
      }
    };
    if (isDirector) {
      fetchTeam();
    }
  }, [isDirector]);

  // Fetch Leads based on Active Tab and Filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (isBD) {
        // BD sees only own submitted leads
        // Backend enforces WHERE bd_user_id = req.user.id
      } else if (isRecruiter) {
        if (activeTab === 'unclaimed') {
          params.append('queue', 'unclaimed');
        } else {
          params.append('queue', 'my');
        }
      } else if (isDirector) {
        if (activeTab === 'unclaimed') {
          params.append('queue', 'unclaimed');
        } else if (activeTab === 'claimed') {
          params.append('queue', 'claimed');
        } else if (activeTab === 'converted') {
          params.append('status', 'CONVERTED_TO_JOB');
        } else if (activeTab === 'dropped') {
          params.append('status', 'DROPPED');
        }

        if (selectedBd) {
          params.append('bd_user_id', selectedBd);
        }
        if (selectedRecruiter) {
          params.append('recruiter_id', selectedRecruiter);
        }
      }

      if (statusFilter !== 'all' && activeTab === 'all') {
        params.append('status', statusFilter);
      }

      const res = await API.get(`/admin/leads?${params.toString()}`);
      if (res.success) {
        setLeads(res.leads || []);
      } else {
        setError(res.message || 'Failed to load leads.');
      }
    } catch (err) {
      console.error('fetchLeads error:', err);
      setError(err.message || 'Error loading leads.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, statusFilter, selectedBd, selectedRecruiter, isBD, isRecruiter, isDirector]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // BD & Recruiter filters list
  const bdMembers = teamMembers.filter(
    (m) => ['bd', 'bd_lead'].includes(m.role) && (m.is_active === 1 || m.is_active === true)
  );
  const recruiterMembers = teamMembers.filter(
    (m) => m.role === 'recruiter' && (m.is_active === 1 || m.is_active === true)
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2.5 transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                {isBD
                  ? 'BD Leads Workspace'
                  : isRecruiter
                  ? 'Recruiter Leads Queue'
                  : 'Company Leads & Intake Oversight'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBD
                  ? 'Submit verified company hiring mandates and track assignment status.'
                  : isRecruiter
                  ? 'Claim incoming company leads, gather requirements, and create job postings.'
                  : 'Platform-wide visibility into BD submissions, recruiter assignments, and job conversions.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Add Lead (Allowed for BD and Director) */}
        {(isBD || isDirector) && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Company Lead
          </button>
        )}
      </div>

      {/* Workspace Tabs & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role-Specific Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {isDirector && (
            <>
              {[
                { id: 'all', label: 'All Leads' },
                { id: 'unclaimed', label: 'Shared Queue (Unclaimed)' },
                { id: 'claimed', label: 'Claimed Leads' },
                { id: 'converted', label: 'Converted to Job' },
                { id: 'dropped', label: 'Dropped' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}

          {isRecruiter && (
            <>
              <button
                onClick={() => setActiveTab('unclaimed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'unclaimed'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Shared Queue (Unclaimed)
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'my'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                My Claimed Leads
              </button>
            </>
          )}

          {isBD && (
            <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              My Submitted Leads
            </div>
          )}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, contact, city..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 shadow-2xs"
            />
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* Director Advanced Filters */}
      {isDirector && activeTab === 'all' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-2xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by BD Agent
            </label>
            <select
              value={selectedBd}
              onChange={(e) => setSelectedBd(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="">All BD Agents</option>
              {bdMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Recruiter
            </label>
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="">All Recruiters</option>
              {recruiterMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="UNCLAIMED">Unclaimed</option>
              <option value="CLAIMED">Claimed</option>
              <option value="CONTACTED">Contacted</option>
              <option value="REQUIREMENTS_GATHERED">Requirements Gathered</option>
              <option value="CONVERTED_TO_JOB">Converted to Job</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Table / Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-700 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading company leads...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">Unable to Load Leads</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={fetchLeads}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Company Leads Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {activeTab === 'unclaimed'
                ? 'The shared queue is currently clear. New company leads submitted by BD will appear here.'
                : activeTab === 'my'
                ? 'You have not claimed any leads yet. Explore the Shared Queue to claim prospective clients.'
                : isBD
                ? 'You have not submitted any company leads yet. Click "Add Company Lead" to submit verified hiring leads.'
                : 'No leads match the selected filters or search criteria.'}
            </p>
            {isBD && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add First Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Submitted By / Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Recruiter</th>
                  <th className="py-3 px-4 text-center">Jobs</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Company Name & City */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>{lead.company_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {lead.city && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {lead.city}
                          </span>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <Globe className="w-3 h-3" />
                            Web
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{lead.contact_person_name}</div>
                      {lead.contact_email && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {lead.contact_email}
                        </div>
                      )}
                    </td>

                    {/* Phone with Click-to-Call */}
                    <td className="py-3.5 px-4">
                      {lead.contact_phone ? (
                        <a
                          href={`tel:${lead.contact_phone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/60 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                          title="Click to Call"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{lead.contact_phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* BD Submitter & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {lead.bd_user_name || lead.bd_user_email || 'BD Agent'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDate(lead.created_at)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Assigned Recruiter */}
                    <td className="py-3.5 px-4">
                      {lead.claimed_recruiter_name ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>{lead.claimed_recruiter_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unclaimed</span>
                      )}
                    </td>

                    {/* Linked Jobs Count */}
                    <td className="py-3.5 px-4 text-center">
                      {Number(lead.jobs_count || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          {lead.jobs_count} job{lead.jobs_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Recruiter "Take Lead" button in Unclaimed Queue */}
                        {(isRecruiter || isDirector) && lead.status === 'UNCLAIMED' && (
                          <button
                            onClick={() => setClaimLeadTarget(lead)}
                            className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Claim this lead"
                          >
                            <UserPlus className="w-3 h-3" />
                            Take Lead
                          </button>
                        )}

                        {/* 2. Recruiter Follow-up Update (Only if claimed by current user or Director) */}
                        {(isDirector || (isRecruiter && lead.claimed_by_recruiter_id === user?.id)) &&
                          lead.status !== 'UNCLAIMED' && (
                            <button
                              onClick={() => setStatusModalLead(lead)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                              title="Update Follow-up Status"
                            >
                              Update Status
                            </button>
                          )}

                        {/* 3. Convert to Job Button (Recruiter or Director) */}
                        {(isDirector || (isRecruiter && lead.claimed_by_recruiter_id === user?.id)) &&
                          lead.status !== 'UNCLAIMED' &&
                          lead.status !== 'DROPPED' && (
                            <button
                              onClick={() => setConvertingLead(lead)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Convert to Job Mandate"
                            >
                              <Briefcase className="w-3 h-3" />
                              Convert to Job
                            </button>
                          )}

                        {/* 4. Director Reassign Button */}
                        {isDirector && (
                          <button
                            onClick={() => setReassignLeadTarget(lead)}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs border border-purple-200 transition-colors cursor-pointer"
                            title="Reassign Recruiter"
                          >
                            Reassign
                          </button>
                        )}

                        {/* 5. View Details & Audit Activity */}
                        <button
                          onClick={() => setDetailsLeadId(lead.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Lead Details & Activity"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Company Lead (BD & Director) */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          showToast('Company lead submitted successfully!');
          fetchLeads();
        }}
      />

      {/* MODAL 2: Claim Lead Confirmation ("Take Lead") */}
      <ClaimConfirmModal
        lead={claimLeadTarget}
        onClose={() => setClaimLeadTarget(null)}
        onSuccess={() => {
          showToast('Lead claimed successfully! You are now the assigned recruiter.');
          fetchLeads();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* MODAL 3: Update Follow-up Status */}
      <UpdateStatusModal
        lead={statusModalLead}
        onClose={() => setStatusModalLead(null)}
        onSuccess={() => {
          showToast('Lead status updated successfully.');
          fetchLeads();
        }}
      />

      {/* MODAL 4: Director Reassign Recruiter */}
      <ReassignModal
        lead={reassignLeadTarget}
        recruiters={recruiterMembers}
        onClose={() => setReassignLeadTarget(null)}
        onSuccess={() => {
          showToast('Lead recruiter reassigned successfully.');
          fetchLeads();
        }}
      />

      {/* MODAL 5: Lead Details & Activity Trail */}
      <LeadDetailsModal
        leadId={detailsLeadId}
        onClose={() => setDetailsLeadId(null)}
        onConvertToJob={(lead) => {
          setDetailsLeadId(null);
          setConvertingLead(lead);
        }}
        canConvert={isDirector || (isRecruiter && !isBD)}
      />

      {/* MODAL 6: Canonical Job Form Modal (Reused for Lead Conversion) */}
      {convertingLead && (
        <AdminJobFormModal
          isOpen={Boolean(convertingLead)}
          onClose={() => setConvertingLead(null)}
          onSuccess={() => {
            showToast('Job created and linked to BD company lead successfully!');
            fetchLeads();
          }}
          fromLead={convertingLead}
        />
      )}
    </div>
  );
};

// ==========================================
// MODAL COMPONENTS
// ==========================================

/**
 * 1. Add Company Lead Modal with Real-time Duplicate Pre-Check
 */
const AddLeadModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    website: '',
    notes: '',
    confirmed_hiring_interest: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Duplicate pre-check state
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const debounceTimerRef = useRef(null);

  useModalA11y(isOpen, onClose);

  // Debounced duplicate check
  useEffect(() => {
    if (!isOpen) {
      setDuplicates([]);
      return;
    }

    if (formData.company_name.trim().length >= 3 || formData.website.trim() || formData.contact_email.trim()) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setCheckingDuplicates(true);
          const params = new URLSearchParams();
          if (formData.company_name.trim()) params.append('name', formData.company_name.trim());
          if (formData.website.trim()) params.append('website', formData.website.trim());
          if (formData.contact_email.trim()) params.append('email', formData.contact_email.trim());

          const res = await API.get(`/admin/leads/check-duplicate?${params.toString()}`);
          if (res.success && res.matches) {
            setDuplicates(res.matches);
          } else {
            setDuplicates([]);
          }
        } catch (_) {
          setDuplicates([]);
        } finally {
          setCheckingDuplicates(false);
        }
      }, 400);
    } else {
      setDuplicates([]);
    }

    return () => clearTimeout(debounceTimerRef.current);
  }, [formData.company_name, formData.website, formData.contact_email, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.company_name.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!formData.contact_person_name.trim()) {
      setError('Contact person name is required.');
      return;
    }
    if (!formData.contact_phone.trim()) {
      setError('Contact phone is required.');
      return;
    }
    if (!formData.confirmed_hiring_interest) {
      setError('Confirmed hiring interest must be verified before submitting this lead.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        company_name: formData.company_name.trim(),
        contact_person_name: formData.contact_person_name.trim(),
        contact_person: formData.contact_person_name.trim(),
        contact_phone: formData.contact_phone.trim(),
        phone: formData.contact_phone.trim(),
        contact_email: formData.contact_email?.trim() || null,
        email: formData.contact_email?.trim() || null,
        city: formData.city?.trim() || null,
        website: formData.website?.trim() || null,
        notes: formData.notes?.trim() || null,
        confirmed_hiring_interest: Boolean(formData.confirmed_hiring_interest)
      };

      const res = await API.post('/admin/leads', payload);
      if (res.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          company_name: '',
          contact_person_name: '',
          contact_phone: '',
          contact_email: '',
          city: '',
          website: '',
          notes: '',
          confirmed_hiring_interest: true
        });
      } else {
        setError(res.message || 'Error submitting lead.');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Server error submitting lead.';
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Add Prospective Company Lead</h2>
              <p className="text-xs text-slate-300">
                Submit basic company details for the recruiter shared queue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-time Duplicate Warning Box */}
          {duplicates.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Potential Duplicate Companies Detected ({duplicates.length})</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                The company you are entering matches existing records in the platform. Please verify you are not submitting a duplicate mandate:
              </p>
              <div className="divide-y divide-amber-200 border border-amber-200 rounded-lg bg-white/80 overflow-hidden">
                {duplicates.map((dup, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">{dup.name}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                        {dup.source}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium text-right">{dup.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
                />
                {checkingDuplicates && (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-3 top-2.5" />
                )}
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contact_person_name}
                onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="hr@company.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location (Optional)
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Bengaluru, Mumbai, Pune"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {/* Website */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Website (Optional)
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://company.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Notes / Hiring Discussion Summary
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Specify preliminary hiring requirements, urgency, domains discussed, or best time to reach out..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white resize-none"
              />
            </div>

            {/* Mandatory Confirmed Hiring Interest Checkbox */}
            <div className="sm:col-span-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.confirmed_hiring_interest}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmed_hiring_interest: e.target.checked })
                  }
                  className="mt-0.5 rounded text-blue-700 focus:ring-blue-700 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-blue-950 block">
                    Confirmed Hiring Interest Verified <span className="text-rose-600">*</span>
                  </span>
                  <span className="text-[11px] text-blue-800 leading-tight block">
                    I confirm this company expressed immediate hiring requirements and agreed to be contacted by our recruitment team.
                  </span>
                </div>
              </label>
            </div>
          </div>

          </div>

          {/* Modal Footer */}
          <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.confirmed_hiring_interest}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Submitting Lead...
                </>
              ) : (
                'Submit Lead to Queue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/**
 * 2. Recruiter Claim Confirmation Modal ("Take Lead")
 */
const ClaimConfirmModal = ({ lead, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  useModalA11y(Boolean(lead), onClose);

  if (!lead) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const res = await API.post(`/admin/leads/${lead.id}/claim`);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        onError(res.message || 'Error claiming lead.');
        onClose();
      }
    } catch (err) {
      // 409 Conflict handling
      if (err.statusCode === 409 || err.message?.includes('already been claimed')) {
        onError('Conflict: This lead was just claimed by another recruiter.');
      } else {
        onError(err.message || 'Failed to claim lead.');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto">
          <UserPlus className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Claim Lead: {lead.company_name}
          </h3>
          <p className="text-xs text-slate-500">
            You will become the assigned recruiter responsible for contacting{' '}
            <strong className="text-slate-800">{lead.contact_person_name}</strong> and gathering hiring requirements.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Contact Person:</span>
            <span className="font-semibold">{lead.contact_person_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Contact Phone:</span>
            <span className="font-semibold">{lead.contact_phone}</span>
          </div>
          {lead.city && (
            <div className="flex justify-between">
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold">{lead.city}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Submitted by:</span>
            <span className="font-semibold">{lead.bd_user_name || 'BD Agent'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Claiming...
              </>
            ) : (
              'Confirm & Take Lead'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * 3. Update Follow-up Status Modal
 */
const UpdateStatusModal = ({ lead, onClose, onSuccess }) => {
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useModalA11y(Boolean(lead), onClose);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || 'CLAIMED');
      setNotes(lead.notes || '');
      setDropReason(lead.drop_reason || '');
      setError('');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (status === 'DROPPED' && !dropReason.trim()) {
      setError('A drop reason is required when marking a lead as Dropped.');
      return;
    }

    try {
      setLoading(true);
      const res = await API.put(`/admin/leads/${lead.id}/status`, {
        status,
        notes,
        drop_reason: status === 'DROPPED' ? dropReason : null
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Error updating status.');
      }
    } catch (err) {
      setError(err.message || 'Server error updating status.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold font-heading">Update Follow-up Status</h2>
            <p className="text-xs text-slate-300">{lead.company_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Follow-up Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="CLAIMED">Claimed (Initial Ownership)</option>
              <option value="CONTACTED">Contacted (Spoke with client)</option>
              <option value="REQUIREMENTS_GATHERED">Requirements Gathered (Ready for Job Posting)</option>
              <option value="DROPPED">Dropped (Client unviable / rejected)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Note: Marking as "Converted to Job" is performed automatically upon creating a job mandate.
            </p>
          </div>

          {/* Conditional Drop Reason */}
          {status === 'DROPPED' && (
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1">
                Drop Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="e.g. Budget mismatch, hiring frozen, unresponsive"
                className="w-full px-3 py-2 rounded-xl bg-rose-50/50 border border-rose-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-up Notes / Progress Updates
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record notes on hiring discussions, salary budgets, required tech stack..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white resize-none"
            />
          </div>
          </div>

          <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Follow-up'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/**
 * 4. Director Reassign Recruiter Modal
 */
const ReassignModal = ({ lead, recruiters, onClose, onSuccess }) => {
  const [selectedRecruiterId, setSelectedRecruiterId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useModalA11y(Boolean(lead), onClose);

  useEffect(() => {
    if (lead) {
      setSelectedRecruiterId(lead.claimed_by_recruiter_id || '');
      setNotes('');
      setError('');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedRecruiterId) {
      setError('Please select a target recruiter.');
      return;
    }

    try {
      setLoading(true);
      const res = await API.post(`/admin/leads/${lead.id}/reassign`, {
        new_recruiter_id: selectedRecruiterId,
        notes
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Error reassigning lead.');
      }
    } catch (err) {
      setError(err.message || 'Server error reassigning lead.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold font-heading">Reassign Lead Ownership</h2>
            <p className="text-xs text-slate-300">Director Administrative Authority</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-slate-900">{lead.company_name}</div>
            <div className="text-slate-500">
              Current Recruiter:{' '}
              <strong className="text-slate-800">
                {lead.claimed_recruiter_name || 'Unclaimed'}
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Target Recruiter <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRecruiterId}
              onChange={(e) => setSelectedRecruiterId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="">Select an active recruiter...</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.email} ({r.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reassignment Reason / Direction
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Workload balancing, specialized domain knowledge required..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 bg-white resize-none"
            />
          </div>
          </div>

          <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Reassigning...
                </>
              ) : (
                'Confirm Reassignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/**
 * 5. Full Lead Details & Persisted Activity History Modal
 */
const LeadDetailsModal = ({ leadId, onClose, onConvertToJob, canConvert }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'jobs' | 'activity'

  useModalA11y(Boolean(leadId), onClose);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await API.get(`/admin/leads/${leadId}`);
        if (res.success && res.lead) {
          setLead(res.lead);
        } else {
          setError(res.message || 'Failed to load lead details.');
        }
      } catch (err) {
        setError(err.message || 'Error fetching lead details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [leadId]);

  if (!leadId) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading">
                  {lead?.company_name || 'Loading Company Lead...'}
                </h2>
                {lead && <StatusBadge status={lead.status} />}
              </div>
              <p className="text-xs text-slate-300">
                BD Lead Details, Linked Job Mandates & Persisted Activity Trail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Company & Contact
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'jobs'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Linked Jobs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {lead?.jobs?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'activity'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Activity Trail</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {lead?.activity_history?.length || 0}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-7 h-7 text-blue-700 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading details...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {error}
            </div>
          ) : lead ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Contact Information Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Contact Person</span>
                      <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                        {lead.contact_person_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Phone Number</span>
                      {lead.contact_phone ? (
                        <a
                          href={`tel:${lead.contact_phone}`}
                          className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:underline mt-0.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {lead.contact_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Email</span>
                      <span className="font-medium text-slate-800 mt-0.5 block">
                        {lead.contact_email || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Location / City</span>
                      <span className="font-medium text-slate-800 mt-0.5 block">
                        {lead.city || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Website</span>
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {lead.website}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Client Entity</span>
                      <span className="font-medium text-slate-800 mt-0.5 block">
                        {lead.client_name ? `${lead.client_name} (Linked)` : 'Not yet converted to Client'}
                      </span>
                    </div>
                  </div>

                  {/* Assignment & Intake Lifecycle Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Submitted By (BD)</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {lead.bd_user_name || 'BD Agent'} ({formatDate(lead.created_at)})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Assigned Recruiter</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {lead.claimed_recruiter_name
                          ? `${lead.claimed_recruiter_name} (Claimed: ${formatDate(lead.claimed_at)})`
                          : 'Unclaimed'}
                      </span>
                    </div>

                    {lead.reassigned_director_name && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px] font-semibold">Reassigned By</span>
                        <span className="font-semibold text-purple-800 mt-0.5 block">
                          Director {lead.reassigned_director_name} ({formatDate(lead.reassigned_at)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes & Drop Reason */}
                  {lead.notes && (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/60 text-xs">
                      <span className="font-bold text-blue-900 block mb-1">Hiring Notes / Instructions</span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">{lead.notes}</p>
                    </div>
                  )}

                  {lead.status === 'DROPPED' && lead.drop_reason && (
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                      <span className="font-bold text-rose-900 block mb-1">Reason for Dropping</span>
                      <p className="text-rose-800 leading-relaxed">{lead.drop_reason}</p>
                    </div>
                  )}

                  {/* Convert Action Prompt */}
                  {canConvert && lead.status !== 'UNCLAIMED' && lead.status !== 'DROPPED' && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">
                          Ready to Create Job Posting?
                        </span>
                        <span className="text-[11px] text-emerald-700 block">
                          Convert this company lead into a job mandate. You can create multiple jobs for this lead.
                        </span>
                      </div>
                      <button
                        onClick={() => onConvertToJob(lead)}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Convert to Job
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LINKED JOBS */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {lead.jobs && lead.jobs.length > 0 ? (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                      {lead.jobs.map((job) => (
                        <div key={job.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{job.title}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                {job.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                              <span>Openings: {job.openings_count || 1}</span>
                              <span>•</span>
                              <span>Location: {job.location || 'Remote'}</span>
                              <span>•</span>
                              <span>Created: {formatDate(job.created_at)}</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-slate-400">#{job.id.substring(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-xl">
                      <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">No job mandates created yet.</p>
                      {canConvert && lead.status !== 'UNCLAIMED' && lead.status !== 'DROPPED' && (
                        <button
                          onClick={() => onConvertToJob(lead)}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create Job from Lead
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {lead.activity_history && lead.activity_history.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {lead.activity_history.map((act) => (
                        <div key={act.id} className="relative">
                          {/* Dot indicator */}
                          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600" />
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">
                                {act.action_type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDate(act.created_at)} {formatTime(act.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-700">{act.description}</p>
                            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-2">
                              <span>By: <strong className="text-slate-700">{act.actor_name || act.actor_email}</strong></span>
                              <span>({act.actor_role})</span>
                              {act.previous_value && act.new_value && (
                                <span className="text-slate-500">
                                  [{act.previous_value} → {act.new_value}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-xl">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">No recorded activity events.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminLeads;
