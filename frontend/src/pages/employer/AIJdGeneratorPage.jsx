import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import API from '../../services/api';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

const AIJdGeneratorPage = () => {
  const [formData, setFormData] = useState({ title: '', location: '', skills: '', industry: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await API.post('/ai/jd-generator', formData);
      if (res.success) {
        setResult(res.result);
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
    <PageTransition
      className="w-full min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased p-6 sm:p-8"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <FadeInSection className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#00288e] text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">AI Job Description Generator</h1>
            <p className="text-xs text-[#444653] mt-1">Generate high-converting Job Descriptions using Gemini 1.5 Flash AI Model</p>
          </div>
        </FadeInSection>

        {error && (
          <FadeInSection className="p-3.5 rounded-xl bg-[#fff2f2] border border-[#ffdada] text-[#ba1a1a] text-xs font-semibold">
            {error}
          </FadeInSection>
        )}

        <StaggerContainer className="space-y-6">
          <StaggerItem index={0}>
            <form onSubmit={handleGenerate} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-slate-200/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">Location / Mode</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Bengaluru / Hybrid"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-slate-200/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">Industry Sector</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Fintech & Web Software"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-slate-200/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">Key Tech Stack / Skills</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g. React.js, Node.js, Express, MySQL"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-slate-200/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Job Description with Gemini
                </button>
              </div>
            </form>
          </StaggerItem>

          {result && (
            <StaggerItem index={1}>
              <div className="bg-white p-6 rounded-2xl border border-[#00288e]/20 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-[#00288e] uppercase tracking-wider">AI Generated Job Description</h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[#444653] hover:text-[#0b1c30] bg-[#eff4ff] hover:bg-[#dce9ff] px-3 py-1.5 rounded-xl transition-colors font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#006a61]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Result'}
                  </button>
                </div>
                <div className="text-xs text-[#0b1c30] whitespace-pre-wrap leading-relaxed font-mono bg-[#f8f9ff] p-5 rounded-xl border border-slate-200/60">
                  {result}
                </div>
              </div>
            </StaggerItem>
          )}
        </StaggerContainer>
      </PageTransition>
  );
};

export default AIJdGeneratorPage;
