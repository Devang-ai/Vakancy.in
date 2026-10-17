import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit3, Trash2, X, CheckCircle2 } from 'lucide-react';
import API from '../../services/api';

const RecruiterClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ name: '', industry: '', contact_info: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await API.get('/clients');
      if (res.success) setClients(res.clients || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: '', industry: '', contact_info: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({ name: client.name, industry: client.industry || '', contact_info: client.contact_info || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      if (editingClient) {
        await API.put(`/clients/${editingClient.id}`, formData);
        setMsg({ type: 'success', text: 'Client updated.' });
      } else {
        await API.post('/clients', formData);
        setMsg({ type: 'success', text: 'Client created.' });
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await API.delete(`/clients/${clientId}`);
      fetchClients();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Executive Search Clients Directory</h1>
          <p className="text-xs text-slate-400">Manage client organizations and assign candidates to client executive roles</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-xs">No clients added yet.</div>
        ) : (
          clients.map((cli) => (
            <div key={cli.id} className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{cli.name}</h3>
                <p className="text-xs text-blue-400 font-medium">{cli.industry || 'Industry N/A'}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{cli.contact_info}</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => openEditModal(cli)} className="p-2 text-slate-300 hover:text-white rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteClient(cli.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/15 p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-heading mb-4">
              {editingClient ? 'Edit Client Details' : 'Add Executive Search Client'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Global Ventures"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Industry Sector</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g. Investment Banking"
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Contact Info / Email</label>
                <textarea
                  rows={3}
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  placeholder="Contact details..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 transition-colors"
              >
                {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterClients;
