import React, { useState, useEffect } from 'react';
import { FileCheck, Building, MapPin, Calendar, Clock } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const MyApplications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await API.get('/applications/my-applications');
      if (res.success) setApps(res.applications || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">My Submitted Applications</h1>
        <p className="text-xs text-slate-400">Track real-time recruitment pipeline updates on your submitted applications</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading application history...</div>
        ) : apps.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-xs">
            No applications submitted yet. Browse jobs to apply!
          </div>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{app.job_title}</h3>
                  <StatusBadge status={app.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-300 font-medium">
                    <Building className="w-3.5 h-3.5" /> {app.company_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {app.job_location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Applied: {new Date(app.applied_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyApplications;
