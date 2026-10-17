import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  Copy,
  Plus,
  AlertCircle,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  CheckCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import API from '../../services/api';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [dupEmail, setDupEmail] = useState('');
  const [dupPhone, setDupPhone] = useState('');
  const [dupResult, setDupResult] = useState(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [search]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/candidates?search=${encodeURIComponent(search)}`);
      if (res.success) {
        setCandidates(res.candidates || []);
      }
    } catch (err) {
      console.warn('Error fetching candidates:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCandidateDetails = async (id) => {
    try {
      const res = await API.get(`/admin/candidates/${id}`);
      if (res.success) {
        setSelectedCandidate(res.candidate);
        setDetailModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load candidate profile: ' + err.message);
    }
  };

  const handleDuplicateCheck = async (e) => {
    e.preventDefault();
    if (!dupEmail.trim() && !dupPhone.trim()) return;

    try {
      setDupLoading(true);
      const res = await API.post('/admin/candidates/duplicate-check', {
        email: dupEmail.trim(),
        phone: dupPhone.trim()
      });
      if (res.success) {
        setDupResult(res);
      }
    } catch (err) {
      alert('Error running duplicate check: ' + err.message);
    } finally {
      setDupLoading(false);
    }
  };

  const handleAddNote = async (candidateId) => {
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      const res = await API.post(`/admin/candidates/${candidateId}/notes`, { note: newNote.trim() });
      if (res.success) {
        setNewNote('');
        // Refresh details
        const refreshed = await API.get(`/admin/candidates/${candidateId}`);
        if (refreshed.success) setSelectedCandidate(refreshed.candidate);
      }
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Candidate Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse candidate profiles, detect duplicates, add recruitment evaluation notes, and manage talent pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDupResult(null);
              setDupEmail('');
              setDupPhone('');
              setDuplicateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-blue-700" />
            <span>Duplicate Check</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name, headline, current organization, email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Candidate Name</th>
                <th className="px-5 py-3.5">Headline & Experience</th>
                <th className="px-5 py-3.5">Current Organization</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">Loading candidates...</td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No candidate records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try refining your search terms or verify role assignments.</p>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold block">{cand.name}</span>
                        <span className="text-[11px] text-slate-400 block">{cand.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span className="block truncate max-w-xs">{cand.professional_headline || 'Experienced Professional'}</span>
                        <span className="text-[11px] text-blue-700 font-medium block">
                          {cand.total_experience ? `${cand.total_experience} Years Exp` : 'Fresher / Entry'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span>{cand.current_organization || '—'}</span>
                        {cand.current_designation && (
                          <span className="text-[11px] text-slate-400 block">{cand.current_designation}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span>{cand.current_location || 'Not Specified'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openCandidateDetails(cand.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Check Modal */}
      <ModalDialog
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Candidate Detection"
        subtitle="Search database by normalized email or contact number before registering new talent."
      >
        <form onSubmit={handleDuplicateCheck} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={dupEmail}
              onChange={(e) => setDupEmail(e.target.value)}
              placeholder="e.g. candidate@domain.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone / Mobile Number</label>
            <input
              type="text"
              value={dupPhone}
              onChange={(e) => setDupPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={dupLoading || (!dupEmail && !dupPhone)}
            className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {dupLoading ? 'Searching Database...' : 'Run Detection'}
          </button>
        </form>

        {dupResult && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            {dupResult.isDuplicate ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Found {dupResult.count} matching candidate record(s)</span>
                </div>
                <div className="space-y-2">
                  {dupResult.matches.map((m) => (
                    <div key={m.id} className="p-3 bg-rose-50/60 border border-rose-100 rounded-lg text-xs">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-slate-600">{m.email} • {m.phone || 'No phone'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4" />
                <span>No duplicate candidate found. Safe to proceed with recruitment record.</span>
              </div>
            )}
          </div>
        )}
      </ModalDialog>

      {/* Candidate Profile Details Drawer / Modal */}
      <ModalDialog
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedCandidate?.name || 'Candidate Profile'}
        subtitle={selectedCandidate?.professional_headline || 'Recruitment Dossier'}
        maxWidth="max-w-3xl"
      >
        {selectedCandidate && (
          <div className="space-y-6 text-xs">
            {/* Quick Contact & Info Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="truncate">{selectedCandidate.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{selectedCandidate.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{selectedCandidate.current_location || '—'}</span>
              </div>
            </div>

            {/* Summary */}
            {selectedCandidate.professional_summary && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Professional Summary</h4>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                  {selectedCandidate.professional_summary}
                </p>
              </div>
            )}

            {/* Experience */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-700" /> Experience History
              </h4>
              {selectedCandidate.experience?.length === 0 ? (
                <p className="text-slate-400 italic">No experience records entered.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCandidate.experience.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-800">{exp.designation} • {exp.organization}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {exp.from_date ? new Date(exp.from_date).toLocaleDateString() : ''} - {exp.is_currently_working ? 'Present' : (exp.to_date ? new Date(exp.to_date).toLocaleDateString() : '')}
                      </p>
                      {exp.key_achievements && <p className="text-slate-600 mt-1">{exp.key_achievements}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-purple-700" /> Education & Qualifications
              </h4>
              {selectedCandidate.education?.length === 0 ? (
                <p className="text-slate-400 italic">No education records entered.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCandidate.education.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-800">{edu.degree} - {edu.institution}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Specialization: {edu.specialization || 'General'} • Year: {edu.year}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-700" /> Verified Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidate.skills?.map((sk, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-[11px] border border-blue-100">
                    {sk.name}
                  </span>
                ))}
                {(!selectedCandidate.skills || selectedCandidate.skills.length === 0) && (
                  <span className="text-slate-400 italic">No tagged skills.</span>
                )}
              </div>
            </div>

            {/* Internal Recruiter Notes */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-slate-900 mb-2">Internal Recruiter Notes</h4>
              <div className="space-y-2 mb-3">
                {selectedCandidate.notes?.map((n) => (
                  <div key={n.id} className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-lg">
                    <p className="text-slate-800">{n.note}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      By {n.author_email} • {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add private evaluation notes..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
                />
                <button
                  onClick={() => handleAddNote(selectedCandidate.id)}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
};

export default AdminCandidates;
