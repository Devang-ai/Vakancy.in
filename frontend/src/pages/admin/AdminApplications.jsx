import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Users,
  Briefcase,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [targetStage, setTargetStage] = useState('applied');
  const [stageNotes, setStageNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [stageFilter, search]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/applications?stage=${stageFilter}&search=${encodeURIComponent(search)}`);
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err) {
      console.warn('Error fetching applications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openStageModal = (app) => {
    setSelectedApp(app);
    setTargetStage(app.status || 'applied');
    setStageNotes('');
    setStageModalOpen(true);
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setSubmitting(true);
      const res = await API.put(`/admin/applications/${selectedApp.id}/stage`, {
        stage: targetStage,
        notes: stageNotes.trim()
      });
      if (res.success) {
        setStageModalOpen(false);
        fetchApplications();
      }
    } catch (err) {
      alert('Failed to update stage: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Applications & Screening Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track candidate progression across 6 standardized recruitment stages from application to selection.
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
            placeholder="Search by candidate name, job requisition, or email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="all">All Pipeline Stages</option>
            <option value="applied">Applied (New)</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Candidate Details</th>
                <th className="px-5 py-3.5">Job Requisition</th>
                <th className="px-5 py-3.5">Client Organization</th>
                <th className="px-5 py-3.5">Applied Date</th>
                <th className="px-5 py-3.5">Current Stage</th>
                <th className="px-5 py-3.5 text-right">Update Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">Loading applications...</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No applications match this view</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Candidates who apply to jobs will appear in this pipeline.</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold block">{app.candidate_name}</span>
                        <span className="text-[11px] text-slate-400 block">{app.candidate_email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div>
                        <span className="font-medium block">{app.job_title}</span>
                        <span className="text-[11px] text-slate-400 block">{app.job_location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span>{app.company_name || 'Vakancy Recruitment'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openStageModal(app)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-100 transition-colors"
                      >
                        Change Stage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage Transition Modal */}
      <ModalDialog
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Update Recruitment Stage"
        subtitle={`Candidate: ${selectedApp?.candidate_name} • Job: ${selectedApp?.job_title}`}
      >
        <form onSubmit={handleUpdateStage} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Stage *</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="applied">Applied (Initial Intake)</option>
              <option value="under_review">Under Review (Screening)</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview Scheduled</option>
              <option value="selected">Selected (Hired)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Recruiter Stage Notes / Remarks</label>
            <textarea
              rows={3}
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              placeholder="Record feedback, interview notes, or reason for stage move..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStageModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Save Stage Change'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminApplications;
