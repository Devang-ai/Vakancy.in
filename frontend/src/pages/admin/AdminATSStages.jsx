import React, { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle2, X } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AdminATSStages = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', order: 1 });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const res = await API.get('/ats/stages');
      if (res.success) setStages(res.stages || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStage = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const res = await API.post('/ats/stages', formData);
      if (res.success) {
        setMsg({ type: 'success', text: 'ATS Stage created.' });
        setIsModalOpen(false);
        setFormData({ name: '', description: '', order: 1 });
        fetchStages();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Configurable ATS Stages (ATS_STAGE)</h1>
          <p className="text-xs text-slate-400">Configure dynamic pipeline stage orders, names, and active status</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Stage Column
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {stages.map((stg) => (
          <div key={stg.id} className="glass-card p-4 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-800 text-cyan-400 font-bold text-xs flex items-center justify-center border border-white/10">
                {stg.order}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">{stg.name}</h3>
                <p className="text-xs text-slate-400">{stg.description || 'No description provided'}</p>
              </div>
            </div>
            <StatusBadge status={stg.is_active ? 'ACTIVE' : 'INACTIVE'} />
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">Add Configurable ATS Stage</h3>

            <form onSubmit={handleCreateStage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Stage Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Technical Assessment"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Order Index *</label>
                <input
                  type="number"
                  required
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Stage evaluation criteria..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
              >
                Create Stage
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminATSStages;
