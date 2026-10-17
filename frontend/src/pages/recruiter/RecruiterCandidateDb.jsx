import React, { useState, useEffect } from 'react';
import { Search, MapPin, Plus, UserPlus, Tag, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const RecruiterCandidateDb = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Assign Modal
  const [assignModal, setAssignModal] = useState({ isOpen: false, candidate: null });
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  // Manual Add Modal
  const [manualModal, setManualModal] = useState(false);
  const [manualData, setManualData] = useState({ name: '', email: '', phone: '', location: '', initial_notes: '' });

  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchDropdowns();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/candidates/search?search=${search}`);
      if (res.success) setCandidates(res.candidates || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [jRes, cRes] = await Promise.all([API.get('/jobs'), API.get('/clients')]);
      if (jRes.success) setJobs(jRes.jobs || []);
      if (cRes.success) setClients(cRes.clients || []);
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleAssignPipeline = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await API.post('/ats/pipeline/assign', {
        candidate_id: assignModal.candidate.id,
        job_id: selectedJob || null,
        client_id: selectedClient || null
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Candidate assigned to ATS Pipeline.' });
        setAssignModal({ isOpen: false, candidate: null });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await API.post('/ats/manual-candidate', manualData);
      if (res.success) {
        setMsg({ type: 'success', text: 'Candidate added manually to database.' });
        setManualModal(false);
        setManualData({ name: '', email: '', phone: '', location: '', initial_notes: '' });
        fetchCandidates();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Recruiter Candidate Search DB</h1>
          <p className="text-xs text-slate-400">Search profiles, manually add candidates, and assign to ATS pipelines</p>
        </div>
        <button
          onClick={() => setManualModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 flex items-center gap-1.5 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Manually Add Candidate
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name, skills..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>
        <button onClick={fetchCandidates} className="px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs">
          Search
        </button>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((c) => (
          <div key={c.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{c.name}</h3>
                  <p className="text-xs text-slate-400">{c.current_location}</p>
                </div>
                <StatusBadge status={c.profile_type} />
              </div>

              <div className="flex flex-wrap gap-1 pt-2">
                {c.skills?.map((sk, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 text-[10px] font-medium border border-white/5">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">{c.tags?.join(', ') || 'No tags'}</span>
              <button
                onClick={() => setAssignModal({ isOpen: true, candidate: c })}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold flex items-center gap-1"
              >
                Assign to Pipeline <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Pipeline Modal */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setAssignModal({ isOpen: false, candidate: null })} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-1">Assign Candidate to Pipeline</h3>
            <p className="text-xs text-slate-400 mb-4">Assigning {assignModal.candidate?.name}</p>

            <form onSubmit={handleAssignPipeline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Select Job</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900"
                >
                  <option value="">-- None --</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Select Client (Executive Search)</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900"
                >
                  <option value="">-- None --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 transition-colors"
              >
                {submitting ? 'Assigning...' : 'Assign Candidate'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Candidate Modal */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setManualModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">Manually Add Candidate</h3>

            <form onSubmit={handleManualAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={manualData.email}
                  onChange={(e) => setManualData({ ...manualData, email: e.target.value })}
                  placeholder="email@domain.com"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={manualData.phone}
                  onChange={(e) => setManualData({ ...manualData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Current Location</label>
                <input
                  type="text"
                  value={manualData.location}
                  onChange={(e) => setManualData({ ...manualData, location: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Initial Recruiter Notes</label>
                <textarea
                  rows={3}
                  value={manualData.initial_notes}
                  onChange={(e) => setManualData({ ...manualData, initial_notes: e.target.value })}
                  placeholder="Initial screening remarks..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Candidate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterCandidateDb;
