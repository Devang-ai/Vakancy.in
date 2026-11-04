import React, { useState, useEffect } from 'react';
import { Wrench, Plus } from 'lucide-react';
import API from '../services/api';

const AdminSkills = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/admin/skills');
      if (res.success) setSkills(res.skills || []);
    } catch (err) {
      setError(err.message || 'Unable to load the skills catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      await API.post('/master/skills', { name: newSkill.trim() });
      setNewSkill('');
      await fetchSkills();
    } catch (err) {
      setError(err.message || 'Unable to add this skill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Skills Catalog Master Data</h1>
        <p className="text-xs text-slate-500 mt-1">Manage technical and professional skill taxonomy for job matching & resume building</p>
      </div>

      {/* Add Skill Form */}
      <form onSubmit={handleAddSkill} className="ep-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          required
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="New Skill Name (e.g., React.js, Python, Financial Analysis)"
          className="w-full sm:flex-1 p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4" /> {submitting ? 'Adding…' : 'Add Skill'}
        </button>
      </form>
      {error && <p className="ep-card p-4 text-sm text-rose-700" role="alert">{error}</p>}
      {loading && <p className="ep-card p-4 text-sm text-slate-600" role="status">Loading skills…</p>}

      {/* Skills Badges Grid */}
      <div className="ep-card p-6 flex flex-wrap gap-2.5">
        {skills.map((s) => (
          <div key={s.id} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-2xs group">
            <Wrench className="w-3.5 h-3.5 text-blue-700" />
            <span>{s.name}</span>
          </div>
        ))}
      </div>
      {!loading && !error && skills.length === 0 && (
        <p className="ep-card p-6 text-center text-sm text-slate-500">No skills are available.</p>
      )}
    </div>
  );
};

export default AdminSkills;
