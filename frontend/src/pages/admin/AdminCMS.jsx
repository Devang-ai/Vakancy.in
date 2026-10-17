import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit2, CheckCircle2, X } from 'lucide-react';
import API from '../../services/api';

const AdminCMS = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', content: '', meta_title: '', meta_description: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/cms');
      if (res.success) setPages(res.pages || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', content: '', meta_title: '', meta_description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pg) => {
    setEditingId(pg.id);
    setFormData({
      title: pg.title,
      slug: pg.slug,
      content: pg.content || '',
      meta_title: pg.meta_title || '',
      meta_description: pg.meta_description || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editingId) {
        await API.put(`/admin/cms/${editingId}`, formData);
        setMsg({ type: 'success', text: 'CMS page updated.' });
      } else {
        await API.post('/admin/cms', formData);
        setMsg({ type: 'success', text: 'CMS page created.' });
      }
      setIsModalOpen(false);
      fetchPages();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this CMS page?')) return;
    try {
      await API.delete(`/admin/cms/${id}`);
      fetchPages();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">CMS Pages & Policy Content</h1>
          <p className="text-xs text-slate-400">Manage static informational pages (About Us, Terms of Service, Privacy Policy, Trust & Safety)</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add CMS Page
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((pg) => (
          <div key={pg.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" /> {pg.title}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">slug: /{pg.slug}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(pg)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(pg.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950 p-2.5 rounded-xl border border-white/5">
              {pg.content || 'No body content.'}
            </p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">
              {editingId ? 'Edit CMS Page' : 'Add CMS Page'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Candidate Terms & Conditions"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. candidate-terms"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Page Content *</label>
                <textarea
                  rows={6}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Body content markdown or HTML..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
              >
                {editingId ? 'Save Changes' : 'Create Page'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCMS;
