import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2 } from 'lucide-react';
import API from '../services/api';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', image_url: '', link_url: '' });

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

  const handleAddBanner = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/banners', formData);
      setFormData({ title: '', image_url: '', link_url: '' });
      fetchBanners();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleDeleteBanner = async (id) => {
    try {
      await API.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Homepage Banners & Hero Promotion</h1>
        <p className="text-xs text-slate-500 mt-1">Configure promotional hero banners and announcement slides displayed on public portal</p>
      </div>

      {/* Add Banner Form */}
      <form onSubmit={handleAddBanner} className="ep-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 font-heading">Add New Promotional Banner</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Banner Title (e.g., Executive Gulf Hiring Fair)"
            className="p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
          <input
            type="text"
            required
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="Image URL (https://...)"
            className="p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
          <input
            type="text"
            value={formData.link_url}
            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
            placeholder="Target Link URL (/jobs or https://...)"
            className="p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Save Banner
        </button>
      </form>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div key={b.id} className="ep-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-blue-700 shrink-0">
                {b.image_url ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" /> : <Image className="w-6 h-6" />}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">{b.title}</span>
                <span className="text-[11px] text-slate-500 block truncate max-w-xs">{b.link_url || 'No redirect URL'}</span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteBanner(b.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0"
              title="Delete Banner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBanners;

