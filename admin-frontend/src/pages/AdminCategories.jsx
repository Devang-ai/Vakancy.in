import React, { useState, useEffect } from 'react';
import { FolderTree } from 'lucide-react';
import API from '../services/api';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/admin/categories');
      if (res.success) setCategories(res.categories || []);
    } catch (err) {
      setError(err.message || 'Unable to load job categories.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Job Categories Master Data</h1>
        <p className="text-xs text-slate-500 mt-1">Configure industry job taxonomy categories used across job posting and search filters</p>
      </div>

      <p className="ep-card p-4 text-xs text-slate-600">
        Category editing is unavailable because the backend currently exposes this catalog as read-only.
      </p>

      {error && <p className="ep-card p-4 text-sm text-rose-700" role="alert">{error}</p>}
      {loading && <p className="ep-card p-4 text-sm text-slate-600" role="status">Loading categories…</p>}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="ep-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">{c.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">ID #{c.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && !error && categories.length === 0 && (
        <p className="ep-card p-6 text-center text-sm text-slate-500">No job categories are available.</p>
      )}
    </div>
  );
};

export default AdminCategories;
