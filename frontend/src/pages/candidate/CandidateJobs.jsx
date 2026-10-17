import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building, Briefcase, ArrowRight, Filter } from 'lucide-react';
import API from '../../services/api';

const CandidateJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (location) queryParams.append('location', location);
      queryParams.append('status', 'open');

      const res = await API.get(`/jobs?${queryParams.toString()}`);
      if (res.success) {
        setJobs(res.jobs || []);
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Browse Engineering Jobs</h1>
        <p className="text-xs text-slate-400">Filter and apply to active positions posted by leading companies</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, skills, keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>
        <div className="flex-1 relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. Mumbai, Bengaluru, Remote)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5"
        >
          <Filter className="w-4 h-4" /> Filter Jobs
        </button>
      </form>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">Loading available positions...</div>
        ) : jobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">No matching jobs found. Try adjusting filters.</div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-extrabold text-white font-heading">{j.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1 font-medium text-cyan-300">
                    <Building className="w-3.5 h-3.5" /> {j.company_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {j.location}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                  {j.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{j.applicant_count || 0} applicants</span>
                <Link
                  to={`/candidate/jobs/${j.id}`}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  Job Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CandidateJobs;
