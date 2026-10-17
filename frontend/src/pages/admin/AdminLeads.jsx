import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  Calendar,
  UserCheck,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [targetCoordinatorId, setTargetCoordinatorId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: 'Technology',
    location: '',
    source: 'Outreach',
    notes: '',
    follow_up_date: ''
  });

  useEffect(() => {
    fetchLeads();
    fetchCoordinators();
  }, [search, statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/leads?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.success) {
        setLeads(res.leads || []);
      }
    } catch (err) {
      console.warn('Error fetching leads:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const res = await API.get('/admin/team');
      if (res.success) {
        setCoordinators(res.users?.filter(u => u.role === 'tl_coordinator' || u.role === 'director') || []);
      }
    } catch (_) {}
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.company_name.trim() || !formData.contact_person.trim() || !formData.email.trim()) {
      alert('Company, contact person, and email are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await API.post('/admin/leads', formData);
      if (res.success) {
        setCreateModalOpen(false);
        setFormData({
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          industry: 'Technology',
          location: '',
          source: 'Outreach',
          notes: '',
          follow_up_date: ''
        });
        fetchLeads();
      }
    } catch (err) {
      alert('Failed to create lead: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openHandoverModal = (lead) => {
    setSelectedLead(lead);
    setTargetCoordinatorId('');
    setHandoverNotes('');
    setHandoverModalOpen(true);
  };

  const handleHandover = async (e) => {
    e.preventDefault();
    if (!selectedLead || !targetCoordinatorId) return;

    try {
      setSubmitting(true);
      const res = await API.post(`/admin/leads/${selectedLead.id}/handover`, {
        handed_over_to_user_id: targetCoordinatorId,
        handover_notes: handoverNotes.trim()
      });
      if (res.success) {
        setHandoverModalOpen(false);
        fetchLeads();
      }
    } catch (err) {
      alert('Handover error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const res = await API.put(`/admin/leads/${leadId}`, { status: newStatus });
      if (res.success) fetchLeads();
    } catch (err) {
      alert('Error updating lead status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">BD Leads & Account Handovers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage business development pipeline, client engagement history, and smooth transition to TL / Coordinators.
          </p>
        </div>
        <div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New BD Lead</span>
          </button>
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
            placeholder="Search leads by company, contact person, or email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="all">All Lead Stages</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="HANDED_OVER">Handed Over</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Company & Contact</th>
                <th className="px-5 py-3.5">Industry / Location</th>
                <th className="px-5 py-3.5">Follow-Up Date</th>
                <th className="px-5 py-3.5">Assigned / Handover</th>
                <th className="px-5 py-3.5">Pipeline Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No BD leads found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "New BD Lead" to record prospective client outreach.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold block">{lead.company_name}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {lead.contact_person} • {lead.email}
                        </span>
                        {lead.phone && <span className="text-[10px] text-slate-400 block">{lead.phone}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span>{lead.industry || 'General'}</span>
                        <span className="text-[11px] text-slate-400 block">{lead.location || 'India'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {lead.follow_up_date ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                          <Calendar className="w-3 h-3 text-blue-700" />
                          {new Date(lead.follow_up_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None set</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        {lead.handed_over_to_email ? (
                          <span className="text-cyan-800 font-medium block">
                            Handed to: {lead.handed_over_to_email}
                          </span>
                        ) : lead.assigned_bd_email ? (
                          <span className="text-slate-700 block">Owner: {lead.assigned_bd_email}</span>
                        ) : (
                          <span className="text-slate-400 italic block">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      {lead.status !== 'HANDED_OVER' && lead.status !== 'CONVERTED' && (
                        <button
                          onClick={() => openHandoverModal(lead)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                        >
                          Handover to TL
                        </button>
                      )}
                      {lead.status === 'QUALIFIED' && (
                        <button
                          onClick={() => handleStatusChange(lead.id, 'PROPOSAL_SENT')}
                          className="px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors"
                        >
                          Proposal Sent
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Lead Modal */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New BD Lead"
        subtitle="Record corporate client prospect details and follow-up plan."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Acme Innovations Ltd."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. Ramesh Kumar (Director HR)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Work Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ramesh@acme.com"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Mumbai"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Follow-Up Date</label>
              <input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Outreach Notes / Mandate Discussion</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Record hiring requirements, team expansion plans, or discussion summary..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating Lead...' : 'Create BD Lead'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Handover to TL Modal */}
      <ModalDialog
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Handover Lead to TL / Client Coordinator"
        subtitle={`Client: ${selectedLead?.company_name} (${selectedLead?.contact_person})`}
      >
        <form onSubmit={handleHandover} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select TL / Client Coordinator *</label>
            <select
              required
              value={targetCoordinatorId}
              onChange={(e) => setTargetCoordinatorId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="">-- Choose Coordinator --</option>
              {coordinators.map((c) => (
                <option key={c.id} value={c.id}>{c.email} ({c.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Handover Brief & Requisition Requirements</label>
            <textarea
              rows={3}
              required
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="Outline mandate expectations, key client stakeholders, and target job profiles..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setHandoverModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetCoordinatorId}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Transferring...' : 'Complete Handover'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminLeads;
