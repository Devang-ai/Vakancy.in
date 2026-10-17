import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import API from '../services/api';

const AdminSkills = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/skills');
      if (res.success) setSkills(res.skills || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    try {
      await API.post('/admin/skills', { name: newSkill });
      setNewSkill('');
      fetchSkills();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await API.delete(`/admin/skills/${id}`);
      fetchSkills();
    } catch (err) {
      console.warn(err.message);
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
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Skill
        </button>
      </form>

      {/* Skills Badges Grid */}
      <div className="ep-card p-6 flex flex-wrap gap-2.5">
        {skills.map((s) => (
          <div key={s.id} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-2xs group">
            <Wrench className="w-3.5 h-3.5 text-blue-700" />
            <span>{s.name}</span>
            <button
              onClick={() => handleDeleteSkill(s.id)}
              className="text-slate-400 hover:text-rose-700 transition-colors ml-1"
              title="Remove Skill"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSkills;

