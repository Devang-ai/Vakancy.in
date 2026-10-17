import React, { useState, useEffect } from 'react';
import { FileCheck, Search, Filter, Eye, User, Briefcase, MapPin, Mail, Phone, GraduationCap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminBadge from '../components/common/AdminBadge';
import { LoadingState } from '../components/common/AdminStateBanner';

const AdminApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const isViewer = user?.role === 'viewer';

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/applications');
      if (res.success) setApplications(res.applications || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    if (isViewer) {
      setMsg({ type: 'error', text: 'Viewer role is read-only. Status updates are restricted.' });
      return;
    }
    setMsg({ type: '', text: '' });
    try {
      const res = await API.put(`/applications/${appId}/status`, { status: newStatus });
      if (res.success) {
        setMsg({ type: 'success', text: `Candidate application status updated to '${newStatus.replace('_', ' ')}'.` });
        fetchApplications();
        if (selectedApp?.id === appId) {
          setSelectedApp(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const filteredApps = applications.filter((a) => {
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchesSearch =
      !search ||
      a.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate_email?.toLowerCase().includes(search.toLowerCase()) ||
      a.job_title?.toLowerCase().includes(search.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Internal Recruitment Processing Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review candidate submissions, inspect verified profiles, and manage internal recruitment lifecycle status
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref #, candidate, email, job..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          Showing {filteredApps.length} Application Records
        </span>
      </div>

      {/* Applications Table */}
      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Ref Code & Candidate</th>
                <th className="p-4">Target Job & Company</th>
                <th className="p-4">Location / Profile</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4 text-right">Recruitment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No candidate applications found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase block w-fit mb-1">
                        {a.reference_number || `APP-${a.id.substring(0,6).toUpperCase()}`}
                      </span>
                      <span className="font-bold text-slate-900 text-sm block">{a.candidate_name || 'Candidate'}</span>
                      <span className="text-[11px] text-slate-500">{a.candidate_email}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs">{a.job_title || 'Opening'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{a.company_name}</div>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-800 font-medium">{a.current_location || 'Remote/Flexible'}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">{a.profile_type || 'experienced'}</div>
                    </td>
                    <td className="p-4">
                      <AdminBadge status={a.status || 'applied'} />
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(a.applied_at || a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedApp(a)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
                        title="Inspect Candidate Detail"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" /> Inspect
                      </button>

                      {!isViewer ? (
                        <select
                          value={a.status || 'applied'}
                          onChange={(e) => handleUpdateStatus(a.id, e.target.value)}
                          className="p-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold uppercase text-slate-800 cursor-pointer focus:outline-none focus:border-blue-700"
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview">Interview</option>
                          <option value="selected">Selected</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Read-Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Candidate Application Detail Inspection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 font-bold text-sm"
            >
              ✕
            </button>

            <div className="pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                  {selectedApp.reference_number || 'APP-REF'}
                </span>
                <AdminBadge status={selectedApp.status || 'applied'} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">{selectedApp.candidate_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Applied for <span className="text-slate-900 font-semibold">{selectedApp.job_title}</span> at <span className="text-slate-700">{selectedApp.company_name}</span></p>
            </div>

            <div className="space-y-5 text-xs">
              {/* Contact & Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="truncate">{selectedApp.candidate_email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Phone className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{selectedApp.candidate_phone || 'Not Provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{selectedApp.current_location || 'Not Specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <User className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="capitalize">{selectedApp.profile_type || 'experienced'} Candidate</span>
                </div>
              </div>

              {/* Recent Experience & Education */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Most Recent Work Experience</span>
                  <span className="text-sm font-semibold text-slate-900 block">{selectedApp.recent_experience || 'No experience recorded'}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Highest Education Qualification</span>
                  <span className="text-sm font-semibold text-slate-900 block">{selectedApp.education_summary || 'No education recorded'}</span>
                </div>
              </div>

              {/* Status Update Action Bar inside Modal */}
              {!isViewer && (
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">Update Lifecycle Status:</span>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {['under_review', 'shortlisted', 'interview', 'selected', 'rejected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedApp.id, st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                          selectedApp.status === st
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;

