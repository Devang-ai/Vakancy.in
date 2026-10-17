import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Briefcase,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock
} from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/admin/StatusBadge';

export const AdminEmployers = () => {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchEmployers();
  }, [search, statusFilter]);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/employers?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.success) {
        setEmployers(res.employers || []);
      }
    } catch (err) {
      console.warn('Error fetching employers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await API.put(`/admin/employers/${id}/approve`);
      if (res.success) fetchEmployers();
    } catch (err) {
      alert('Error approving employer: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this employer account?')) return;
    try {
      const res = await API.put(`/admin/employers/${id}/reject`);
      if (res.success) fetchEmployers();
    } catch (err) {
      alert('Error rejecting employer: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Employers & Corporate Clients</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review partner organizations, manage account approvals, and track active client job requisitions.
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
            placeholder="Search by company name, industry, or contact email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Employers Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Industry & Location</th>
                <th className="px-5 py-3.5">Key Contact Person</th>
                <th className="px-5 py-3.5">Active Jobs</th>
                <th className="px-5 py-3.5">Approval Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">Loading employers...</td>
                </tr>
              ) : employers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No employer records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Adjust your filters to see accounts.</p>
                  </td>
                </tr>
              ) : (
                employers.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold block">{emp.company_name}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.official_email || emp.user_email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span className="font-medium block">{emp.industry || 'Corporate'}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.location || emp.city || 'India'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span>{emp.contact_person_name || 'HR Desk'}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.contact_person_phone || emp.contact_phone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Briefcase className="w-3.5 h-3.5 text-blue-700" />
                        {emp.active_jobs_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={emp.approval_status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      {emp.approval_status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(emp.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {emp.approval_status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(emp.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                        >
                          Reject
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
    </div>
  );
};

export default AdminEmployers;
