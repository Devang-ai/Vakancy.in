import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import API from '../../services/api';

const AIResumeBuilderPage = () => {
  const [inputInfo, setInputInfo] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleEnhance = async (e) => {
    e.preventDefault();
    if (!inputInfo) return;
    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await API.post('/ai/resume-builder', { input_info: inputInfo });
      if (res.success) {
        setResult(res.result);
      }
    } catch (err) {
      setError(err.message || 'AI Enhancement failed.');
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">AI Resume Builder & Enhancer</h1>
          <p className="text-xs text-slate-400">Powered by Google Gemini 1.5 Flash Model</p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleEnhance} className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Enter Your Current Resume / Experience Draft / Target Role
          </label>
          <textarea
            rows={5}
            required
            value={inputInfo}
            onChange={(e) => setInputInfo(e.target.value)}
            placeholder="Paste your existing resume summary, experience bullets, or target job role description here..."
            className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Enhance Resume with Gemini AI
        </button>
      </form>

      {result && (
        <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI Enhanced Output</h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Result'}
            </button>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono bg-black/40 p-4 rounded-xl border border-white/5">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIResumeBuilderPage;
