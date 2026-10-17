import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Building,
  MapPin,
  Briefcase,
  IndianRupee,
  Clock,
  ExternalLink,
  Send,
  Trash2,
  Search,
  ArrowRight
} from 'lucide-react';
import API from '../../services/api';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
export default function CandidateSavedJobsPage() {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get('/candidates/me/saved-jobs');
      if (res?.success && Array.isArray(res.savedJobs)) {
        setSavedJobs(res.savedJobs);
      } else {
        setSavedJobs([]);
      }
    } catch (err) {
      setError('Failed to load your saved jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (jobId) => {
    try {
      // Optimistic UI update
      setSavedJobs(prev => prev.filter(j => j.id !== jobId && j.jobId !== jobId));
      const res = await API.delete(`/candidates/me/saved-jobs/${jobId}`);
      if (!res?.success) {
        // revert on failure
        fetchSavedJobs();
      } else {
        window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
      }
    } catch {
      fetchSavedJobs();
    }
  };

  const filteredJobs = savedJobs.filter(j => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.role && j.role.toLowerCase().includes(q)) ||
      (j.company && j.company.toLowerCase().includes(q)) ||
      (j.location && j.location.toLowerCase().includes(q))
    );
  });

  return (
    <CandidatePortalShell>
        {/* Top Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-[#0b1c30]">Saved Jobs</h1>
            <p className="text-xs text-[#444653]">
              {savedJobs.length === 1
                ? '1 job saved for later'
                : `${savedJobs.length} jobs saved for later`}
            </p>
          </div>

          {savedJobs.length > 0 && (
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved jobs..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#e5eeff] text-xs focus:outline-none focus:border-[#00288e] text-[#0b1c30]"
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-[#444653]">Loading your saved jobs...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchSavedJobs} className="underline font-bold">Try Again</button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && savedJobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#0b1c30] mb-1">No saved jobs yet</h2>
            <p className="text-xs text-[#444653] max-w-sm mx-auto mb-6">
              Save jobs you want to come back to later. Click the bookmark icon on any job posting to save it here.
            </p>
            <Link
              to="/candidate/jobs"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Browse Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Jobs List */}
        {!loading && !error && savedJobs.length > 0 && (
          <div className="space-y-3.5">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">No saved jobs match your search.</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id || job.jobId}
                  className="bg-white rounded-2xl border border-[#e5eeff] p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between sm:justify-start gap-3">
                      <div>
                        <Link
                          to={`/candidate/jobs/${job.jobId}`}
                          className="text-base font-bold text-[#0b1c30] hover:text-[#00288e] transition-colors"
                        >
                          {job.role}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-[#444653] flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {job.company}
                          </span>
                          {job.location && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              • <MapPin className="w-3 h-3 text-slate-400" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Job Details Row */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[#555e6d]">
                      {job.type && (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 capitalize">
                          {job.type}
                        </span>
                      )}
                      {job.workplaceMode && (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 font-medium text-[#00288e] capitalize">
                          {job.workplaceMode}
                        </span>
                      )}
                      {job.experience && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          {job.experience}
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          {job.salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-between sm:justify-end">
                    {/* Instagram-style active Bookmark toggle (click to remove) */}
                    <button
                      onClick={() => handleRemoveSaved(job.id || job.jobId)}
                      title="Remove from saved jobs"
                      className="p-2 rounded-xl text-[#00288e] bg-blue-50 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Bookmark className="w-4 h-4 fill-[#00288e] hover:fill-red-600" />
                    </button>

                    <Link
                      to={`/candidate/jobs/${job.jobId}`}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      View Details
                    </Link>

                    {job.applied ? (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                        Applied
                      </span>
                    ) : (
                      <Link
                        to={`/candidate/jobs/${job.jobId}/apply`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Apply
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CandidatePortalShell>
  );
}
