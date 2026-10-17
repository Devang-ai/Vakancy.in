import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle2 } from 'lucide-react';
import API from '../services/api';

const AdminCMS = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await API.get('/admin/cms');
      if (res.success) {
        setPages(res.pages || []);
        if (res.pages?.length > 0 && !selectedPage) {
          setSelectedPage(res.pages[0]);
          setTitle(res.pages[0].title);
          setContent(res.pages[0].content || '');
        }
      }
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    try {
      await API.put(`/admin/cms/${selectedPage.slug}`, { title, content });
      setMsg('CMS Page updated successfully.');
      setTimeout(() => setMsg(''), 3000);
      fetchPages();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">CMS & Static Pages Management</h1>
        <p className="text-xs text-slate-500 mt-1">Edit Terms of Service, Privacy Policy, About Us, Trust & Safety content</p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Pages Selector Sidebar */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">Available Pages</span>
          {pages.map((p) => (
            <button
              key={p.slug}
              onClick={() => {
                setSelectedPage(p);
                setTitle(p.title);
                setContent(p.content || '');
              }}
              className={`w-full text-left p-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                selectedPage?.slug === p.slug
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{p.title}</span>
            </button>
          ))}
        </div>

        {/* CMS Content Editor */}
        <div className="md:col-span-3 ep-card p-6 space-y-4">
          {selectedPage ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Page Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Markdown / HTML Body</label>
                <textarea
                  rows={15}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-700"
                />
              </div>

              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">Select a page from the sidebar to edit content.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCMS;

