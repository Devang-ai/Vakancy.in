import React, { useState, useEffect } from 'react';
import {  Link , useOutletContext } from 'react-router-dom';
import { Plus, Briefcase, MapPin, Users, Edit3, Trash2, X, CheckCircle2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import useModalA11y from '../../hooks/useModalA11y';

const EmployerJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  useModalA11y(isModalOpen, () => setIsModalOpen(false));

  const [formData, setFormData] = useState({ title: '', location: '', description: '', status: 'open' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await API.get('/jobs');
      if (res.success) setJobs(res.jobs || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingJob(null);
    setFormData({ title: '', location: '', description: '', status: 'open' });
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setFormData({ title: job.title, location: job.location, description: job.description, status: job.status });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      if (editingJob) {
        const res = await API.put(`/jobs/${editingJob.id}`, formData);
        if (res.success) setMsg({ type: 'success', text: 'Job updated.' });
      } else {
        const res = await API.post('/jobs', formData);
        if (res.success) setMsg({ type: 'success', text: 'Job created.' });
      }
      setIsModalOpen(false);
      fetchJobs();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      fetchJobs();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Employer Job Management</h1>
          <p className="text-xs text-slate-400">Post free jobs, manage status, and review applicant resumes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading posted jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-xs">No jobs posted yet. Click "Post New Job" to begin.</div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{j.title}</h3>
                  <StatusBadge status={j.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {j.location}
                  </span>
                  <span className="flex items-center gap-1 text-cyan-300 font-medium">
                    <Users className="w-3.5 h-3.5" /> {j.applicant_count || 0} applicants
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/employer/jobs/${j.id}/applicants`}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-semibold"
                >
                  View Applicants ({j.applicant_count || 0})
                </Link>
                <button
                  onClick={() => openEditModal(j)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteJob(j.id)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-job-modal-title"
        >
          <div
            className="w-full max-w-lg glass-card rounded-2xl border border-white/15 shadow-2xl relative max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <h3 id="post-job-modal-title" className="text-lg font-bold text-white font-heading">
                {editingJob ? 'Edit Job Posting' : 'Post New Job Position'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior React Developer"
                    className="w-full p-2.5 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Mumbai (Hybrid) or Remote"
                    className="w-full p-2.5 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900"
                  >
                    <option value="open">Open</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Job Description & Requirements *</label>
                  <textarea
                    rows={6}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Paste complete job description, key responsibilities, and required qualifications..."
                    className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="shrink-0 p-4 border-t border-white/10 bg-slate-950/40">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingJob ? 'Update Job' : 'Publish Job Posting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerJobs;
