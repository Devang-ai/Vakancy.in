import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Trash2, Edit2, CheckCircle2, X } from 'lucide-react';
import API from '../../services/api';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Briefcase', description: '', is_active: true });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/categories');
      if (res.success) setCategories(res.categories || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', icon: 'Briefcase', description: '', is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, icon: cat.icon || 'Briefcase', description: cat.description || '', is_active: Boolean(cat.is_active) });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editingId) {
        await API.put(`/admin/categories/${editingId}`, formData);
        setMsg({ type: 'success', text: 'Category updated.' });
      } else {
        await API.post('/admin/categories', formData);
        setMsg({ type: 'success', text: 'Category created.' });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job category?')) return;
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Job Categories Curation</h1>
          <p className="text-xs text-slate-400">Manage standardized job categories used across homepage, search filters, and postings</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add New Category
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-white text-sm">{cat.name}</h3>
              </div>
              <p className="text-xs text-slate-400">{cat.description || 'No description provided.'}</p>
              <span className="text-[10px] text-slate-500 font-mono block">slug: {cat.slug}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEdit(cat)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">
              {editingId ? 'Edit Job Category' : 'Add Job Category'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cloud Infrastructure"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category scope summary..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
              >
                {editingId ? 'Save Changes' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
