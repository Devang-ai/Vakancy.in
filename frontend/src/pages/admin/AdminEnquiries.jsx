import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  AlertCircle,
  Briefcase,
  Calendar,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminEnquiries = () => {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modals & Drawers
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Form states
  const [assigneeId, setAssigneeId] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [editStatus, setEditStatus] = useState('NEW');
  const [submitting, setSubmitting] = useState(false);

  // Conversion form state
  const [convertData, setConvertData] = useState({
    title: '',
    location: '',
    openings_count: 1,
    description: '',
    assigned_recruiter_id: '',
    internal_notes: ''
  });

  const userRole = (user?.role || '').toLowerCase();
  const canAssign = userRole === 'director' || userRole === 'main_admin' || userRole === 'admin';

  useEffect(() => {
    fetchEnquiries();
    if (canAssign) fetchTeam();
  }, [statusFilter]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/enquiries');
      if (res.success) {
        setEnquiries(res.enquiries || []);
      }
    } catch (err) {
      console.warn('Error fetching enquiries:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await API.get('/admin/team');
      if (res.success) {
        setTeamMembers(res.users?.filter(u => u.role === 'tl_coordinator' || u.role === 'recruiter') || []);
      }
    } catch (_) {}
  };

  const openDetailDrawer = (enq) => {
    setSelectedEnquiry(enq);
    setEditStatus((enq.status || 'NEW').toUpperCase());
    setFollowUpNotes(enq.notes || '');
    setFollowUpDate(enq.follow_up_date ? enq.follow_up_date.slice(0, 10) : '');
    setAssigneeId(enq.assigned_to_user_id || '');
    setDetailModalOpen(true);
  };

  const openAssignModal = (enq) => {
    setSelectedEnquiry(enq);
    setAssigneeId(enq.assigned_to_user_id || '');
    setAssignModalOpen(true);
  };

  const openConvertModal = (enq) => {
    setSelectedEnquiry(enq);
    setConvertData({
      title: enq.subject || enq.display_subject || 'Executive Mandate',
      location: enq.location || 'Remote / Flexible',
      openings_count: enq.openings_count || 1,
      description: enq.message || '',
      assigned_recruiter_id: '',
      internal_notes: `Converted from ${enq.source === 'EXECUTIVE_SERVICE' ? 'Executive Search Mandate' : 'Contact Us Enquiry'} #${enq.id}. Contact: ${enq.contact_name || ''} (${enq.company_name || ''})`
    });
    setConvertModalOpen(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry || !assigneeId) return;

    try {
      setSubmitting(true);
      const res = await API.put(`/admin/enquiries/${selectedEnquiry.id}/assign`, {
        assigned_to_user_id: assigneeId
      });
      if (res.success) {
        setAssignModalOpen(false);
        fetchEnquiries();
      }
    } catch (err) {
      alert('Failed to assign enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    try {
      setSubmitting(true);
      const res = await API.put(`/admin/enquiries/${selectedEnquiry.id}/details`, {
        status: editStatus,
        notes: followUpNotes,
        follow_up_date: followUpDate || null,
        assigned_to_user_id: assigneeId || null
      });
      if (res.success) {
        alert('Enquiry details and notes updated successfully.');
        setDetailModalOpen(false);
        fetchEnquiries();
      }
    } catch (err) {
      alert('Failed to update enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    try {
      setSubmitting(true);
      const res = await API.post(`/admin/enquiries/${selectedEnquiry.id}/convert-to-requirement`, convertData);
      if (res.success) {
        alert('Enquiry successfully converted into a private Executive Search Recruitment Requirement!');
        setConvertModalOpen(false);
        setDetailModalOpen(false);
        fetchEnquiries();
      }
    } catch (err) {
      alert('Failed to convert enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEnquiries = enquiries.filter(enq => {
    const matchesStatus = statusFilter === 'all' || (enq.status || '').toUpperCase() === statusFilter.toUpperCase();
    const matchesSource = sourceFilter === 'all' || (enq.source || '').toUpperCase() === sourceFilter.toUpperCase();
    const matchesSearch = !search.trim() ||
      (enq.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (enq.message || '').toLowerCase().includes(search.toLowerCase()) ||
      (enq.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (enq.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (enq.enquiry_type || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Recruitment & Inbound Enquiries</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage public Contact Us requests, Employer hiring discussions, and qualified Executive Service mandates.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, candidate, role, or message..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="all">All Sources</option>
            <option value="EXECUTIVE_SERVICE">Executive Service</option>
            <option value="CONTACT_US">Contact Us</option>
            <option value="EMPLOYER_PORTAL">Employer Portal</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Enquiry / Source</th>
                <th className="px-5 py-3.5">Company & Contact</th>
                <th className="px-5 py-3.5">Hiring Mandate / Location</th>
                <th className="px-5 py-3.5">Assigned Lead</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">Loading enquiries...</td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No recruitment enquiries found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Inbound contact and executive search submissions will display here.</p>
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => {
                  const isExec = enq.source === 'EXECUTIVE_SERVICE';
                  return (
                    <tr key={enq.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              isExec
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {isExec ? 'EXECUTIVE SERVICE' : 'CONTACT US'}
                            </span>
                            {enq.job_id && (
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                Mandate Created
                              </span>
                            )}
                          </div>
                          <span className="font-semibold block text-slate-900">
                            {enq.display_subject || enq.subject || enq.enquiry_type || 'General Inquiry'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {enq.company_name || 'Direct Visitor'}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {enq.contact_name || enq.candidate_name || 'Anonymous'}
                          </span>
                          {(enq.contact_email || enq.contact_phone) && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {enq.contact_email || enq.contact_phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 max-w-xs">
                        <div>
                          {enq.openings_count ? (
                            <span className="font-semibold text-slate-700 block">
                              {enq.openings_count} Openings • {enq.location || 'Flexible'}
                            </span>
                          ) : null}
                          <p className="line-clamp-2 text-[11px] text-slate-500">
                            {enq.message || '—'}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {enq.assigned_to_email ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                            {enq.assigned_to_email}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={enq.status || 'NEW'} />
                        {enq.follow_up_date && (
                          <span className="block text-[10px] text-amber-600 mt-0.5 font-medium">
                            Follow-up: {enq.follow_up_date.slice(0, 10)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {enq.created_at ? new Date(enq.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetailDrawer(enq)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
                        >
                          Review
                        </button>
                        {canAssign && !enq.assigned_to_user_id && (
                          <button
                            onClick={() => openAssignModal(enq)}
                            className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Follow-up Drawer / Modal */}
      <ModalDialog
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Review Recruitment Enquiry"
        subtitle={`Enquiry #${selectedEnquiry?.id?.slice(0, 8)} • Source: ${selectedEnquiry?.source || 'Inbound'}`}
      >
        <div className="space-y-4 text-xs">
          {/* Quick Header Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedEnquiry?.subject || selectedEnquiry?.display_subject || 'Enquiry Details'}
                </span>
                <span className="text-slate-500 text-xs">
                  {selectedEnquiry?.company_name || 'Individual Inquiry'} • From: {selectedEnquiry?.contact_name || 'N/A'}
                </span>
              </div>
              <StatusBadge status={selectedEnquiry?.status || 'NEW'} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                <span className="font-mono">{selectedEnquiry?.contact_email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
                <span className="font-mono">{selectedEnquiry?.contact_phone || '—'}</span>
              </div>
              {selectedEnquiry?.openings_count && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Openings</span>
                  <span>{selectedEnquiry.openings_count} position(s)</span>
                </div>
              )}
              {selectedEnquiry?.location && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Target Location</span>
                  <span>{selectedEnquiry.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Full Inbound Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Inbound Message / Mandate Description</label>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
              {selectedEnquiry?.message || 'No additional message text provided.'}
            </div>
          </div>

          {/* Executive Mandate Conversion Callout */}
          {selectedEnquiry?.source === 'EXECUTIVE_SERVICE' && !selectedEnquiry?.job_id && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-indigo-950 text-xs">Convert to Executive Search Requisition</p>
                <p className="text-[11px] text-indigo-800">
                  Instantly initialize a private, client-scoped recruitment requirement for recruiters to source talent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openConvertModal(selectedEnquiry)}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Requirement</span>
              </button>
            </div>
          )}

          {/* Status & Follow-up Notes Editor Form */}
          <form onSubmit={handleSaveDetails} className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Workflow Status *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="NEW">NEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {canAssign && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Coordinator</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.email} ({m.role_display_name || m.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Call / Follow-up Notes</label>
              <textarea
                rows="3"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Record recruiter call notes, client budget discussions, next steps, or qualification notes..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Notes & Status'}
              </button>
            </div>
          </form>
        </div>
      </ModalDialog>

      {/* Convert to Requirement Modal */}
      <ModalDialog
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="Initialize Recruitment Requirement"
        subtitle={`From Mandate: ${selectedEnquiry?.subject || selectedEnquiry?.display_subject}`}
      >
        <form onSubmit={handleConvert} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-900">
            <p className="font-semibold text-blue-950">Private Executive Search Requirement</p>
            <p className="text-[11px] text-blue-800 mt-0.5">
              This mandate will be recorded privately for Vakancy.in recruitment operations with provenance "Vakancy Recruitment". It will not be publicly visible on the job board until explicitly published.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Requirement Title *</label>
              <input
                type="text"
                required
                value={convertData.title}
                onChange={(e) => setConvertData({ ...convertData, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Location *</label>
              <input
                type="text"
                required
                value={convertData.location}
                onChange={(e) => setConvertData({ ...convertData, location: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Number of Openings</label>
              <input
                type="number"
                min="1"
                value={convertData.openings_count}
                onChange={(e) => setConvertData({ ...convertData, openings_count: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assign Recruiter</label>
              <select
                value={convertData.assigned_recruiter_id}
                onChange={(e) => setConvertData({ ...convertData, assigned_recruiter_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
              >
                <option value="">-- Assign Later --</option>
                {teamMembers.filter(m => m.role === 'recruiter').map((m) => (
                  <option key={m.id} value={m.id}>{m.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mandate Requirements / Scope</label>
            <textarea
              rows="3"
              value={convertData.description}
              onChange={(e) => setConvertData({ ...convertData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConvertModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Converting...' : 'Create Recruitment Mandate'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Assignment Modal (Quick Director Assign) */}
      <ModalDialog
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Recruitment Enquiry"
        subtitle={`Enquiry: ${selectedEnquiry?.subject || selectedEnquiry?.display_subject}`}
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assign to Coordinator / TL *</label>
            <select
              required
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="">-- Choose Team Member --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.email} ({m.role_display_name || m.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !assigneeId}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign Coordinator'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminEnquiries;
