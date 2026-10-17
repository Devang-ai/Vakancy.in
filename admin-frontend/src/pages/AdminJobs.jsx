import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, MapPin, CheckCircle2, XCircle, Search, Eye } from 'lucide-react';
import API from '../services/api';

const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/jobs');
      if (res.success) setJobs(res.jobs || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (id) => {
    try {
      await API.put(`/admin/jobs/${id}/approve`);
      fetchJobs();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleRejectJob = async (id) => {
    try {
      await API.put(`/admin/jobs/${id}/reject`);
      fetchJobs();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const matchesFilter = filter === 'all' || j.status === filter;
    const matchesSearch =
      !search ||
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.location?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Job Postings & Content Moderation</h1>
        <p className="text-xs text-slate-500 mt-1">Review employer submitted jobs, moderate content, approve for public discovery, or reject listing</p>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'open', 'draft', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, company, location..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Job Title & Employer</th>
                <th className="p-4">Location</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{j.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" /> {j.company_name || 'Employer'}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {j.location}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{j.employment_type || 'Full-time'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          j.status === 'open'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : j.status === 'closed'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedJob(j)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" /> View
                      </button>
                      {j.status !== 'open' && (
                        <button
                          onClick={() => handleApproveJob(j.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {j.status !== 'closed' && (
                        <button
                          onClick={() => handleRejectJob(j.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Close/Reject
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

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500">{selectedJob.company_name} — {selectedJob.location}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-800 font-bold text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px] mb-1">Description</span>
                <p className="whitespace-pre-line text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {selectedJob.description || 'No description provided.'}
                </p>
              </div>

              {selectedJob.requirements && (
                <div>
                  <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px] mb-1">Requirements</span>
                  <p className="whitespace-pre-line text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {selectedJob.requirements}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobs;

