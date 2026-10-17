import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2, Edit2, CheckCircle2, X, ExternalLink } from 'lucide-react';
import API from '../../services/api';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', subtitle: '', image_url: '', link_url: '/jobs', position: 1, is_active: true });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/banners');
      if (res.success) setBanners(res.banners || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: '', subtitle: '', image_url: '', link_url: '/jobs', position: banners.length + 1, is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ban) => {
    setEditingId(ban.id);
    setFormData({
      title: ban.title,
      subtitle: ban.subtitle || '',
      image_url: ban.image_url || '',
      link_url: ban.link_url || '/jobs',
      position: ban.position || 1,
      is_active: Boolean(ban.is_active)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editingId) {
        await API.put(`/admin/banners/${editingId}`, formData);
        setMsg({ type: 'success', text: 'Banner updated.' });
      } else {
        await API.post('/admin/banners', formData);
        setMsg({ type: 'success', text: 'Banner created.' });
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await API.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Homepage Banners & Announcements</h1>
          <p className="text-xs text-slate-400">Configure promotional banners, hiring drives, and featured callouts displayed on the homepage</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {banners.map((ban) => (
          <div key={ban.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-800 text-rose-400 font-bold text-xs flex items-center justify-center border border-white/10">
                #{ban.position}
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">{ban.title}</h3>
                <p className="text-xs text-slate-400">{ban.subtitle || 'No subtitle'}</p>
                {ban.link_url && (
                  <span className="text-[11px] text-cyan-400 flex items-center gap-1 mt-0.5 font-mono">
                    <ExternalLink className="w-3 h-3" /> {ban.link_url}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${ban.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {ban.is_active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => handleOpenEdit(ban)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(ban.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">
              {editingId ? 'Edit Banner' : 'Add Banner'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Pan-India Mega Tech Hiring Drive 2026"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Over 500+ open roles across Mumbai & Bengaluru"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Target Action Link</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="/jobs or /executive-search"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
              >
                {editingId ? 'Save Changes' : 'Create Banner'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
