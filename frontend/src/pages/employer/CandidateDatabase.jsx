import React, { useState, useEffect } from 'react';
import { Search, MapPin, Lock, Unlock, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const CandidateDatabase = () => {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [profileType, setProfileType] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [unlockedContacts, setUnlockedContacts] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    fetchCandidateDb();
  }, []);

  const fetchCandidateDb = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (location) queryParams.append('location', location);
      if (profileType) queryParams.append('profile_type', profileType);

      const res = await API.get(`/candidates/search?${queryParams.toString()}`);
      if (res.success) setCandidates(res.candidates || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCandidateDb();
  };

  const handleUnlockCandidate = async (candidateId) => {
    setUnlocking(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await API.post('/subscriptions/unlock-candidate', { candidate_id: candidateId });
      if (res.success) {
        setMsg({ type: 'success', text: 'Candidate contact details unlocked!' });
        if (res.contact) {
          setUnlockedContacts(prev => ({ ...prev, [candidateId]: res.contact }));
        }
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Unlock failed. Check subscription balance.' });
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Candidate Talent Database</h1>
        <p className="text-xs text-slate-400">Search profiles and unlock candidate contact info using your active subscription</p>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter Form */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, skills..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>
        <div className="flex-1 relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>
        <select
          value={profileType}
          onChange={(e) => setProfileType(e.target.value)}
          className="p-2.5 rounded-xl glass-input text-xs bg-slate-900"
        >
          <option value="">All Categories</option>
          <option value="fresher">Fresher</option>
          <option value="experienced">Experienced</option>
          <option value="executive">Executive</option>
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20"
        >
          Search DB
        </button>
      </form>

      {/* Candidates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">Searching candidate database...</div>
        ) : candidates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">No candidate profiles found.</div>
        ) : (
          candidates.map((c) => {
            const unlocked = unlockedContacts[c.id];
            return (
              <div key={c.id} className="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{c.name}</h3>
                        {c.is_premium && <StatusBadge status="PREMIUM" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.current_location || 'Location Not Specified'}</p>
                    </div>
                    <StatusBadge status={c.profile_type} />
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.skills?.map((sk, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-cyan-300 text-[10px] font-medium">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact Section */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  {unlocked ? (
                    <div className="text-xs text-emerald-300 font-mono">
                      <p>📧 {unlocked.email}</p>
                      <p>📞 {unlocked.phone || 'N/A'}</p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">
                      <p>📧 contact@locked.xxx</p>
                      <p>📞 +91 ********</p>
                    </div>
                  )}

                  {!unlocked && (
                    <button
                      onClick={() => handleUnlockCandidate(c.id)}
                      disabled={unlocking}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {unlocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />} Unlock Contact
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateDatabase;
