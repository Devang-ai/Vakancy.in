import React, { useState } from 'react';
import { Sparkles, Copy, Check, X, Loader2 } from 'lucide-react';
import API from '../services/api';

const AIModal = ({ isOpen, onClose, type = 'resume', initialData = {} }) => {
  const [formData, setFormData] = useState(initialData);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    try {
      if (type === 'resume') {
        const res = await API.post('/ai/resume-builder', { input_info: formData });
        if (res.success) setResult(res.result);
      } else {
        const res = await API.post('/ai/jd-generator', formData);
        if (res.success) setResult(res.result);
      }
    } catch (err) {
      setError(err.message || 'AI Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white font-heading">
              {type === 'resume' ? 'Gemini AI Resume Enhancement' : 'Gemini AI Job Description Generator'}
            </h3>
            <p className="text-xs text-slate-400">Powered by Google Gemini 1.5 Flash Model</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {type === 'resume' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Role / Key Achievements / Raw Notes
              </label>
              <textarea
                rows={4}
                value={formData.target_role || ''}
                onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                placeholder="e.g. Senior React Developer with 4 years experience in building fintech web apps..."
                className="w-full p-3 rounded-xl glass-input text-xs"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Location / Mode
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Bengaluru / Hybrid"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Key Skills & Tech Stack
                </label>
                <input
                  type="text"
                  value={formData.skills || ''}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g. React.js, Node.js, Express, MySQL, Docker"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating AI Output...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Content with Gemini AI
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">AI Generated Result</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono bg-black/30 p-3 rounded-lg border border-white/5">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIModal;
