import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Trash2 } from 'lucide-react';
import API from '../services/api';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Briefcase' });

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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    try {
      await API.post('/admin/categories', newCategory);
      setNewCategory({ name: '', icon: 'Briefcase' });
      fetchCategories();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Job Categories Master Data</h1>
        <p className="text-xs text-slate-500 mt-1">Configure industry job taxonomy categories used across job posting and search filters</p>
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="ep-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          required
          value={newCategory.name}
          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          placeholder="New Category Name (e.g., Information Technology)"
          className="w-full sm:flex-1 p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
        />
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </form>

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
            <button
              onClick={() => handleDeleteCategory(c.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;

