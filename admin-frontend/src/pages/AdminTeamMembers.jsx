import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, UserPlus, Shield, CheckCircle2, UserX, UserCheck, X, AlertCircle,
  Briefcase, GitBranch, Layers, Search, Filter, ArrowRightLeft, Building2,
  ChevronRight, Award, TrendingUp, RefreshCw, Phone, Mail, UserCheck2, UserMinus
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminBadge from '../components/common/AdminBadge';
import useModalA11y from '../hooks/useModalA11y';

const AdminTeamMembers = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'hierarchy' | 'teams'
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [reassigningUser, setReassigningUser] = useState(null);

  // Form states
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recruiter',
    phone: '',
    reporting_user_id: '',
    team_id: ''
  });

  const [teamFormData, setTeamFormData] = useState({
    name: '',
    lead_user_id: '',
    description: '',
    status: 'ACTIVE'
  });

  const [reassignFormData, setReassignFormData] = useState({
    reporting_user_id: '',
    team_id: '',
    reason: ''
  });

  const isMainAdmin = Boolean(user?.is_main_admin || user?.role === 'main_admin' || user?.role === 'director');
  const isTeamManager = Boolean(user?.role === 'team_manager' || user?.role === 'tl_coordinator');

  useModalA11y(isCreateModalOpen || isTeamModalOpen || isReassignModalOpen, () => {
    setIsCreateModalOpen(false);
    setIsTeamModalOpen(false);
    setIsReassignModalOpen(false);
  });

  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isTeamModalOpen || isReassignModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen, isTeamModalOpen, isReassignModalOpen]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [membersRes, teamsRes, perfRes] = await Promise.all([
        API.get('/admin/team'),
        API.get('/admin/teams').catch(() => ({ success: false, teams: [] })),
        API.get('/admin/teams/performance').catch(() => ({ success: false }))
      ]);

      if (membersRes.success) setTeamMembers(membersRes.users || []);
      if (teamsRes.success) setTeams(teamsRes.teams || []);
      if (perfRes.success) setPerformance(perfRes);
    } catch (err) {
      console.warn('Error loading team data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const managersList = useMemo(() => {
    return teamMembers.filter(m =>
      m.is_active && ['team_manager', 'tl_coordinator', 'director', 'main_admin'].includes(m.role)
    );
  }, [teamMembers]);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const matchSearch =
        !searchQuery ||
        (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.phone && m.phone.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'director' && ['director', 'main_admin'].includes(m.role)) ||
        (roleFilter === 'team_manager' && ['team_manager', 'tl_coordinator'].includes(m.role)) ||
        m.role === roleFilter;

      const matchTeam =
        teamFilter === 'ALL' ||
        String(m.team_id) === String(teamFilter);

      return matchSearch && matchRole && matchTeam;
    });
  }, [teamMembers, searchQuery, roleFilter, teamFilter]);

  const stats = useMemo(() => {
    const totalDirectors = teamMembers.filter(m => ['director', 'main_admin'].includes(m.role)).length;
    const totalManagers = teamMembers.filter(m => ['team_manager', 'tl_coordinator'].includes(m.role)).length;
    const totalRecruiters = teamMembers.filter(m => m.role === 'recruiter').length;
    const activeTeamsCount = teams.filter(t => (t.status || 'ACTIVE') === 'ACTIVE').length;
    return {
      directors: totalDirectors,
      managers: totalManagers,
      recruiters: totalRecruiters,
      teams: activeTeamsCount,
      total: teamMembers.length
    };
  }, [teamMembers, teams]);

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await API.put(`/admin/users/${userId}/status`, { is_active: !currentActive });
      setMsg({ type: 'success', text: `Account status successfully ${currentActive ? 'deactivated' : 'activated'}.` });
      loadAllData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      setMsg({ type: 'success', text: 'User role updated successfully.' });
      loadAllData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateTeamMember = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const payload = { ...createFormData };
      if (!isMainAdmin && isTeamManager) {
        payload.role = 'recruiter';
        payload.reporting_user_id = user.id;
      }
      const res = await API.post('/admin/team', payload);
      if (res.success) {
        setMsg({ type: 'success', text: res.message || 'Staff account created successfully.' });
        setIsCreateModalOpen(false);
        setCreateFormData({
          name: '',
          email: '',
          password: '',
          role: isMainAdmin ? 'recruiter' : 'recruiter',
          phone: '',
          reporting_user_id: '',
          team_id: ''
        });
        loadAllData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editingTeam) {
        await API.put(`/admin/teams/${editingTeam.id}`, teamFormData);
        setMsg({ type: 'success', text: 'Recruitment team updated successfully.' });
      } else {
        await API.post('/admin/teams', teamFormData);
        setMsg({ type: 'success', text: 'Recruitment team created successfully.' });
      }
      setIsTeamModalOpen(false);
      setEditingTeam(null);
      setTeamFormData({ name: '', lead_user_id: '', description: '', status: 'ACTIVE' });
      loadAllData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleOpenReassignModal = (member) => {
    setReassigningUser(member);
    setReassignFormData({
      reporting_user_id: member.reporting_user_id || '',
      team_id: member.team_id || '',
      reason: ''
    });
    setIsReassignModalOpen(true);
  };

  const handleReassignMember = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await API.put(`/admin/team-members/${reassigningUser.id}/reassign`, reassignFormData);
      setMsg({ type: 'success', text: `Successfully reassigned ${reassigningUser.name || reassigningUser.email}. Access permissions updated in real-time.` });
      setIsReassignModalOpen(false);
      setReassigningUser(null);
      loadAllData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Group members into hierarchy nodes
  const hierarchyData = useMemo(() => {
    const directors = teamMembers.filter(m => ['director', 'main_admin'].includes(m.role));
    const managers = teamMembers.filter(m => ['team_manager', 'tl_coordinator'].includes(m.role));
    const recruiters = teamMembers.filter(m => m.role === 'recruiter');

    return {
      directors,
      managers: managers.map(mgr => {
        const team = teams.find(t => String(t.lead_user_id) === String(mgr.id) || String(t.id) === String(mgr.team_id));
        const subRecruiters = recruiters.filter(r =>
          String(r.reporting_user_id) === String(mgr.id) ||
          (team && String(r.team_id) === String(team.id))
        );
        return {
          ...mgr,
          team,
          recruiters: subRecruiters
        };
      }),
      unassignedRecruiters: recruiters.filter(r =>
        !managers.some(mgr =>
          String(r.reporting_user_id) === String(mgr.id) ||
          (mgr.team_id && String(r.team_id) === String(mgr.team_id))
        )
      )
    };
  }, [teamMembers, teams]);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Recruitment Team & Hierarchy</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Multi-Tier RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Orchestrate Director → Team Manager → Recruiter delegation, team-scoped mandate routing, and real-time performance tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadAllData}
            title="Refresh Data"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {isMainAdmin && (
            <button
              id="btn-create-team"
              onClick={() => {
                setEditingTeam(null);
                setTeamFormData({ name: '', lead_user_id: '', description: '', status: 'ACTIVE' });
                setIsTeamModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" /> New Team
            </button>
          )}

          {(isMainAdmin || isTeamManager) && (
            <button
              id="btn-open-create-team-modal"
              onClick={() => {
                setCreateFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: isMainAdmin ? 'recruiter' : 'recruiter',
                  phone: '',
                  reporting_user_id: isTeamManager ? user.id : '',
                  team_id: ''
                });
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> {isMainAdmin ? 'Add Staff Account' : 'Add Team Recruiter'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs ${
          msg.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg({ type: '', text: '' })} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Teams</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading">{stats.teams}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Recruitment Squads</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Team Managers</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading">{stats.managers}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Delegation & Oversight</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Recruiters</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading">{stats.recruiters}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Scoped Candidate Sourcing</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Mandates</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading">
            {performance?.summary?.total_active_mandates || 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Jobs in Pipeline</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Team Directory ({teamMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'hierarchy'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GitBranch className="w-4 h-4" /> Hierarchy Tree
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Teams & Performance ({teams.length})
        </button>
      </div>

      {/* TAB 1: DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="director">Director</option>
                <option value="team_manager">Team Manager</option>
                <option value="recruiter">Recruiter</option>
                <option value="bd">Business Development</option>
              </select>

              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Teams</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="ep-card overflow-hidden bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Name / Contact</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Assigned Team</th>
                    <th className="p-4">Reports To (Manager)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No team members match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      const isDirectorRow = ['director', 'main_admin'].includes(u.role);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-xs uppercase shrink-0">
                                {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{u.name || 'Staff Member'}</span>
                                <span className="text-slate-500 text-[11px] block">{u.email}</span>
                                {u.phone && <span className="text-slate-400 text-[10px] block">{u.phone}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {isMainAdmin && !isCurrentUser ? (
                              <select
                                value={u.role === 'main_admin' ? 'director' : (u.role === 'tl_coordinator' ? 'team_manager' : u.role)}
                                onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                className="p-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-700"
                              >
                                <option value="director">Director</option>
                                <option value="team_manager">Team Manager</option>
                                <option value="recruiter">Recruiter</option>
                                <option value="bd">Business Development (BD)</option>
                              </select>
                            ) : (
                              <AdminBadge status={u.role} />
                            )}
                          </td>
                          <td className="p-4">
                            {u.team_name ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                {u.team_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4">
                            {isDirectorRow ? (
                              <span className="text-rose-800 font-bold text-[11px]">— Executive Head —</span>
                            ) : u.reporting_head_name || u.reporting_head_email ? (
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {u.reporting_head_name || u.reporting_head_email}
                                </span>
                                {u.reporting_head_name && (
                                  <span className="text-[10px] text-slate-400">{u.reporting_head_email}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium text-[11px]">Direct to Director</span>
                            )}
                          </td>
                          <td className="p-4">
                            <AdminBadge status={u.is_active ? 'active' : 'deactivated'} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isMainAdmin && !isCurrentUser && !isDirectorRow && (
                                <button
                                  onClick={() => handleOpenReassignModal(u)}
                                  title="Reassign Reporting Manager & Team"
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" /> Reassign
                                </button>
                              )}

                              {isMainAdmin && !isCurrentUser && (
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.is_active)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                    u.is_active
                                      ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              )}

                              {isCurrentUser && (
                                <span className="text-[11px] text-slate-400 italic">Current User</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HIERARCHY TREE VIEW */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Director Root Node */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg text-white shadow-md">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black font-heading">Director & Leadership</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      Tier 1 • Full Authority
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Oversees all recruitment squads, client commercials, and executive shortlist approvals
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-2xl font-black">{hierarchyData.directors.length}</span>
                <span className="text-[11px] text-slate-400 block">Executive Directors</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
              {hierarchyData.directors.map(dir => (
                <div key={dir.id} className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="font-bold text-slate-200">{dir.name || 'Director'}</span>
                  <span className="text-[11px] text-slate-400">({dir.email})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 2: Team Managers & Recruitment Teams */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" /> Tier 2: Recruitment Teams & Managers ({hierarchyData.managers.length})
              </h3>
            </div>

            {hierarchyData.managers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                No Team Managers assigned yet. Click "Add Staff Account" above to designate your first Team Manager.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hierarchyData.managers.map((mgr) => (
                  <div key={mgr.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                    {/* Manager Header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center font-black text-purple-800 text-sm">
                          {mgr.name ? mgr.name.charAt(0) : 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{mgr.name || 'Manager'}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              Manager
                            </span>
                          </div>
                          <span className="text-slate-500 text-xs block">{mgr.email}</span>
                        </div>
                      </div>

                      {mgr.team && (
                        <div className="text-right">
                          <span className="font-bold text-indigo-700 text-xs block">{mgr.team.name}</span>
                          <span className="text-[10px] text-slate-400">Assigned Team</span>
                        </div>
                      )}
                    </div>

                    {/* Subordinate Recruiters List */}
                    <div className="p-4 flex-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                        <span>Recruiters Reporting ({mgr.recruiters.length})</span>
                        {isMainAdmin && (
                          <button
                            onClick={() => {
                              setCreateFormData({
                                name: '',
                                email: '',
                                password: '',
                                role: 'recruiter',
                                phone: '',
                                reporting_user_id: mgr.id,
                                team_id: mgr.team?.id || ''
                              });
                              setIsCreateModalOpen(true);
                            }}
                            className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" /> Add Recruiter
                          </button>
                        )}
                      </div>

                      {mgr.recruiters.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No recruiters reporting to this manager yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {mgr.recruiters.map(rec => (
                            <div key={rec.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[11px]">
                                  {rec.name ? rec.name.charAt(0) : 'R'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 block">{rec.name || 'Recruiter'}</span>
                                  <span className="text-[10px] text-slate-500 block">{rec.email}</span>
                                </div>
                              </div>
                              <AdminBadge status={rec.is_active ? 'active' : 'deactivated'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS & PERFORMANCE METRICS */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                No recruitment teams configured yet. Click "New Team" above to create your first squad.
              </div>
            ) : (
              teams.map((t) => {
                const perfItem = performance?.performance?.find(p => String(p.team_id) === String(t.id));
                const metrics = perfItem?.metrics || {
                  jobs_assigned: 0,
                  active_mandates: t.active_jobs_count || 0,
                  candidates_sourced: 0,
                  candidates_shortlisted: 0,
                  candidates_placed: 0
                };

                return (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm font-heading">{t.name}</h4>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {t.status || 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {t.description || 'Dedicated executive hiring & recruitment squad'}
                        </p>
                      </div>

                      {isMainAdmin && (
                        <button
                          onClick={() => {
                            setEditingTeam(t);
                            setTeamFormData({
                              name: t.name,
                              lead_user_id: t.lead_user_id || '',
                              description: t.description || '',
                              status: t.status || 'ACTIVE'
                            });
                            setIsTeamModalOpen(true);
                          }}
                          className="text-[11px] text-blue-700 hover:underline font-semibold"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    <div className="p-4 space-y-3 flex-1">
                      {/* Team Lead */}
                      <div className="text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Lead / Manager</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span className="font-semibold text-slate-800">
                            {t.lead_name || t.lead_email || 'Unassigned Lead'}
                          </span>
                        </div>
                      </div>

                      {/* Performance Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-semibold block">Team Members</span>
                          <span className="text-lg font-black text-slate-900">{t.member_count || 0}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-semibold block">Active Mandates</span>
                          <span className="text-lg font-black text-indigo-700">{metrics.active_mandates || 0}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-semibold block">Sourced</span>
                          <span className="text-lg font-black text-slate-800">{metrics.candidates_sourced || 0}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-semibold block">Placed</span>
                          <span className="text-lg font-black text-emerald-600">{metrics.candidates_placed || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TEAM MEMBER */}
      {isCreateModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-1.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading mb-0.5">
                  {isMainAdmin ? 'Create Staff Account' : 'Add Recruiter to Your Team'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isMainAdmin ? 'Configure role, reporting manager, and assigned team' : `Supervised by ${user.name || user.email}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamMember} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                    <input
                      id="team-member-name"
                      type="text"
                      required
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                      placeholder="e.g. Priya Sharma"
                      className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      id="team-member-phone"
                      type="text"
                      value={createFormData.phone}
                      onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    id="team-member-email"
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="priya@vakancy.in"
                    className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Initial Password *</label>
                  <input
                    id="team-member-password"
                    type="password"
                    required
                    minLength={6}
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                  />
                </div>

                {isMainAdmin ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role *</label>
                    <select
                      id="team-member-role"
                      value={createFormData.role}
                      onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                    >
                      <option value="recruiter">Recruiter (Candidate sourcing & screening)</option>
                      <option value="team_manager">Team Manager (Squad oversight & job delegation)</option>
                      <option value="bd">Business Development (Leads & employer intake)</option>
                      <option value="director">Admin (Director / Main Admin)</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                    Role: <strong>Recruiter</strong> (Automatically assigned under your supervision)
                  </div>
                )}

                {isMainAdmin && createFormData.role === 'recruiter' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reports To (Team Manager / Lead)</label>
                      <select
                        value={createFormData.reporting_user_id}
                        onChange={(e) => {
                          const chosenMgr = managersList.find(m => String(m.id) === String(e.target.value));
                          setCreateFormData({
                            ...createFormData,
                            reporting_user_id: e.target.value,
                            team_id: chosenMgr?.team_id || createFormData.team_id
                          });
                        }}
                        className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                      >
                        <option value="">-- Direct Report to Director --</option>
                        {managersList.map(mgr => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.name || mgr.email} ({mgr.role.replace(/_/g, ' ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Assigned Team</label>
                      <select
                        value={createFormData.team_id}
                        onChange={(e) => setCreateFormData({ ...createFormData, team_id: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                      >
                        <option value="">-- No Specific Team Squad --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-team"
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CREATE / EDIT TEAM */}
      {isTeamModalOpen && isMainAdmin && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsTeamModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading mb-0.5">
                  {editingTeam ? 'Edit Recruitment Squad' : 'Create New Recruitment Squad'}
                </h3>
                <p className="text-xs text-slate-500">Configure team scope and assigned team manager</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  placeholder="e.g. Executive Tech Search"
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Team Lead / Manager</label>
                <select
                  value={teamFormData.lead_user_id}
                  onChange={(e) => setTeamFormData({ ...teamFormData, lead_user_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="">-- Unassigned Lead --</option>
                  {managersList.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name || mgr.email} ({mgr.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  placeholder="Focus areas, industry domain, specializations..."
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={teamFormData.status}
                  onChange={(e) => setTeamFormData({ ...teamFormData, status: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {editingTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: REASSIGN TEAM MEMBER */}
      {isReassignModalOpen && isMainAdmin && reassigningUser && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsReassignModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading mb-0.5">Reassign Team Member</h3>
                <p className="text-xs text-slate-500">
                  Update reporting manager & squad for {reassigningUser.name || reassigningUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignMember} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Immediate Access Revocation: Reassigning will revoke the previous manager's visibility over this member's activities and jobs, granting access to the new manager instantly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">New Reporting Head (Manager) *</label>
                <select
                  required
                  value={reassignFormData.reporting_user_id}
                  onChange={(e) => {
                    const chosenMgr = managersList.find(m => String(m.id) === String(e.target.value));
                    setReassignFormData({
                      ...reassignFormData,
                      reporting_user_id: e.target.value,
                      team_id: chosenMgr?.team_id || reassignFormData.team_id
                    });
                  }}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="">-- Select New Reporting Manager --</option>
                  {managersList.filter(m => String(m.id) !== String(reassigningUser.id)).map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name || mgr.email} ({mgr.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">New Team Squad</label>
                <select
                  value={reassignFormData.team_id}
                  onChange={(e) => setReassignFormData({ ...reassignFormData, team_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="">-- Inherit Manager's Team / None --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reason for Reassignment</label>
                <input
                  type="text"
                  placeholder="e.g. Department restructuring, team expansion..."
                  value={reassignFormData.reason}
                  onChange={(e) => setReassignFormData({ ...reassignFormData, reason: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTeamMembers;
