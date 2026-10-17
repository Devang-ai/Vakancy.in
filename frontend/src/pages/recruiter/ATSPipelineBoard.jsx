import React, { useState, useEffect } from 'react';
import { Kanban, History, MessageSquare, ArrowRightLeft, Plus, X, Clock, User, CheckCircle2, Loader2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const ATSPipelineBoard = () => {
  const [board, setBoard] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);

  // Move Modal State
  const [moveModal, setMoveModal] = useState({ isOpen: false, item: null, targetStageId: '' });
  const [remarks, setRemarks] = useState('');
  const [moving, setMoving] = useState(false);

  // Audit Log History Modal State
  const [historyModal, setHistoryModal] = useState({ isOpen: false, pipelineId: null, history: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Notes Modal State
  const [notesModal, setNotesModal] = useState({ isOpen: false, candidateId: null, notes: [] });
  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [selectedJob, selectedClient]);

  const fetchInitialData = async () => {
    try {
      const [jobRes, cliRes] = await Promise.all([API.get('/jobs'), API.get('/clients')]);
      if (jobRes.success) setJobs(jobRes.jobs || []);
      if (cliRes.success) setClients(cliRes.clients || []);
    } catch (err) {
      console.warn(err.message);
    }
  };

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedJob) queryParams.append('job_id', selectedJob);
      if (selectedClient) queryParams.append('client_id', selectedClient);

      const res = await API.get(`/ats/pipeline/board?${queryParams.toString()}`);
      if (res.success) setBoard(res.board || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMoveModal = (candItem, currentStageId) => {
    setMoveModal({ isOpen: true, item: candItem, currentStageId, targetStageId: '' });
    setRemarks('');
  };

  const handleExecuteMove = async (e) => {
    e.preventDefault();
    if (!moveModal.targetStageId) return;
    setMoving(true);
    try {
      const res = await API.post('/ats/pipeline/move', {
        pipeline_id: moveModal.item.pipeline_id,
        to_stage_id: moveModal.targetStageId,
        remarks: remarks
      });
      if (res.success) {
        setMoveModal({ isOpen: false, item: null, targetStageId: '' });
        fetchBoard();
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setMoving(false);
    }
  };

  const handleViewHistory = async (pipelineId) => {
    setHistoryModal({ isOpen: true, pipelineId, history: [] });
    setLoadingHistory(true);
    try {
      const res = await API.get(`/ats/pipeline/history/${pipelineId}`);
      if (res.success) {
        setHistoryModal({ isOpen: true, pipelineId, history: res.history || [] });
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenNotes = async (candidateId) => {
    setNotesModal({ isOpen: true, candidateId, notes: [] });
    try {
      const res = await API.get(`/ats/notes/${candidateId}`);
      if (res.success) setNotesModal({ isOpen: true, candidateId, notes: res.notes || [] });
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText) return;
    try {
      const res = await API.post('/ats/notes', {
        candidate_id: notesModal.candidateId,
        note: newNoteText
      });
      if (res.success) {
        setNewNoteText('');
        handleOpenNotes(notesModal.candidateId);
      }
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">ATS Candidate Pipeline Board</h1>
          <p className="text-xs text-slate-400">Move candidates through recruitment stages with mandatory stage history audit logging</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="p-2 rounded-xl glass-input text-xs bg-slate-900"
          >
            <option value="">All Job Positions</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="p-2 rounded-xl glass-input text-xs bg-slate-900"
          >
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px] scrollbar-thin">
        {loading ? (
          <div className="w-full py-20 text-center text-slate-400 text-xs">Loading ATS Board columns...</div>
        ) : (
          board.map((col) => (
            <div key={col.stage.id} className="w-72 shrink-0 glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between space-y-3 bg-slate-950/60">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white font-heading">{col.stage.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                    {col.candidates?.length || 0}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                  {col.candidates?.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-500 rounded-xl border border-dashed border-white/5">
                      No candidates in {col.stage.name}
                    </div>
                  ) : (
                    col.candidates.map((cand) => (
                      <div key={cand.pipeline_id} className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-cyan-500/40 space-y-2 transition-all">
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-white">{cand.candidate?.name}</h4>
                          {cand.candidate?.is_premium && <StatusBadge status="PREMIUM" />}
                        </div>

                        <p className="text-[11px] text-slate-400">{cand.candidate?.current_location || 'Location N/A'}</p>

                        <div className="flex flex-wrap gap-1">
                          {cand.tags?.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300">
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenNotes(cand.candidate?.id)}
                              className="text-slate-400 hover:text-cyan-400 flex items-center gap-1"
                              title="Recruiter Notes"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> {cand.notes_count || 0}
                            </button>
                            <button
                              onClick={() => handleViewHistory(cand.pipeline_id)}
                              className="text-slate-400 hover:text-amber-400 flex items-center gap-1"
                              title="Audit Stage History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleOpenMoveModal(cand, col.stage.id)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Move Stage
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Move Stage Modal */}
      {moveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setMoveModal({ isOpen: false, item: null })} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-1">Move Candidate Stage</h3>
            <p className="text-xs text-slate-400 mb-4">Moving {moveModal.item?.candidate?.name}</p>

            <form onSubmit={handleExecuteMove} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Target ATS Stage *</label>
                <select
                  required
                  value={moveModal.targetStageId}
                  onChange={(e) => setMoveModal({ ...moveModal, targetStageId: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900"
                >
                  <option value="">-- Select Target Stage --</option>
                  {board.map(col => (
                    <option key={col.stage.id} value={col.stage.id} disabled={col.stage.id === moveModal.currentStageId}>
                      {col.stage.name} {col.stage.id === moveModal.currentStageId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Recruiter Remarks / Reason</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Candidate passed technical round, scheduled interview..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={moving}
                className="w-full py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Log Stage Movement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stage History Audit Log Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setHistoryModal({ isOpen: false, pipelineId: null, history: [] })} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-1 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" /> PIPELINE_STAGE_HISTORY Audit Trail
            </h3>
            <p className="text-xs text-slate-400 mb-4">Complete timestamped timeline of candidate movements</p>

            {loadingHistory ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading audit history...</div>
            ) : historyModal.history.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No stage history records logged yet.</div>
            ) : (
              <div className="space-y-3 divide-y divide-white/10">
                {historyModal.history.map((h) => (
                  <div key={h.id} className="pt-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-cyan-300">{h.from_stage_name} → <strong className="text-emerald-400">{h.to_stage_name}</strong></span>
                      <span className="text-[10px] text-slate-400">{new Date(h.moved_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Moved by: <span className="text-white">{h.moved_by_email}</span> ({h.moved_by_role})</p>
                    {h.remarks && <p className="text-[11px] text-slate-300 italic bg-black/30 p-2 rounded-lg mt-1 border border-white/5">{h.remarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recruiter Notes Modal */}
      {notesModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setNotesModal({ isOpen: false, candidateId: null, notes: [] })} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" /> Recruiter Candidate Notes
            </h3>

            <form onSubmit={handleAddNote} className="flex gap-2 mb-5">
              <input
                type="text"
                required
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write candidate evaluation remark..."
                className="flex-1 p-2.5 rounded-xl glass-input text-xs"
              />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs">
                Add Note
              </button>
            </form>

            <div className="space-y-2.5">
              {notesModal.notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{n.author_email}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSPipelineBoard;
