import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Eye,
  Filter,
  UserCheck,
  Shield,
  Globe,
  Lock,
  Edit,
  DollarSign,
  GraduationCap,
  Layers,
  FileText
} from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

const INITIAL_FORM_STATE = {
  title: '',
  employer_id: '',
  department: 'Executive Search',
  job_domain: 'Leadership',
  employment_type: 'Full Time',
  workplace_type: 'Hybrid',
  seniority_level: 'Mid Level',
  openings_count: 1,
  location: '',
  country: 'India',
  state: '',
  city: '',
  locality: '',
  min_experience: 3,
  max_experience: 8,
  fresher_allowed: false,
  min_qualification: "Bachelor's Degree",
  degree: '',
  specialization: '',
  notice_period: '30 Days',
  required_skills: '',
  keywords: '',
  min_salary: '',
  max_salary: '',
  currency: 'INR',
  salary_period: 'Per Year',
  salary_type: 'CTC',
  benefits: '',
  application_deadline: '',
  description: '',
  responsibilities: '',
  requirements: '',
  is_internal_only: true, // Default to private Executive Search mandate
  status: 'draft',
  assigned_recruiter_id: '',
  internal_notes: ''
};

const parseFieldString = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(', ');
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return parsed.map(item => (typeof item === 'string' ? item : item.title || item.desc || '')).filter(Boolean).join(', ');
    }
  } catch (_) {}
  return String(val);
};

export const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState(null);
  const [assignRecruiterId, setAssignRecruiterId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State for "Create / Edit Recruitment Requirement"
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    fetchJobs();
    fetchMetadata();
  }, [search, statusFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/jobs?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.success) {
        setJobs(res.jobs || []);
      }
    } catch (err) {
      console.warn('Error fetching jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [empRes, teamRes] = await Promise.all([
        API.get('/admin/employers').catch(() => ({ employers: [] })),
        API.get('/admin/team').catch(() => ({ users: [] }))
      ]);

      if (empRes?.success && empRes.employers) {
        setEmployers(empRes.employers);
      }
      if (teamRes?.success && teamRes.users) {
        setRecruiters(teamRes.users.filter(u => u.is_active));
      }
    } catch (err) {
      console.warn('Error fetching metadata:', err.message);
    }
  };

  const handleOpenCreate = () => {
    setEditingJobId(null);
    setFormData(INITIAL_FORM_STATE);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (job) => {
    setEditingJobId(job.id);
    setFormData({
      title: job.title || '',
      employer_id: job.employer_id || '',
      department: job.department || 'Executive Search',
      job_domain: job.job_domain || 'Leadership',
      employment_type: job.employment_type || 'Full Time',
      workplace_type: job.workplace_type || 'Hybrid',
      seniority_level: job.seniority_level || 'Mid Level',
      openings_count: job.openings_count || 1,
      location: job.location || '',
      country: job.country || 'India',
      state: job.state || '',
      city: job.city || '',
      locality: job.locality || '',
      min_experience: job.min_experience !== undefined ? job.min_experience : 3,
      max_experience: job.max_experience !== undefined ? job.max_experience : 8,
      fresher_allowed: Boolean(job.fresher_allowed),
      min_qualification: job.min_qualification || "Bachelor's Degree",
      degree: job.degree || '',
      specialization: job.specialization || '',
      notice_period: job.notice_period || '30 Days',
      required_skills: parseFieldString(job.required_skills),
      keywords: parseFieldString(job.keywords),
      min_salary: job.min_salary || '',
      max_salary: job.max_salary || '',
      currency: job.currency || 'INR',
      salary_period: job.salary_period || 'Per Year',
      salary_type: job.salary_type || 'CTC',
      benefits: parseFieldString(job.benefits),
      application_deadline: job.application_deadline ? String(job.application_deadline).slice(0, 10) : '',
      description: job.description || '',
      responsibilities: parseFieldString(job.responsibilities),
      requirements: parseFieldString(job.requirements),
      is_internal_only: Boolean(job.is_internal_only),
      status: job.status || 'draft',
      assigned_recruiter_id: job.assigned_recruiter_id || '',
      internal_notes: job.internal_notes || ''
    });
    setCreateModalOpen(true);
  };

  const handleSaveRequirement = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      alert('Please fill in Job Title and Primary Location.');
      return;
    }

    try {
      setSubmitting(true);
      // Format array fields from comma-separated input
      const skillsArray = formData.required_skills ? formData.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];
      const keywordsArray = formData.keywords ? formData.keywords.split(',').map(s => s.trim()).filter(Boolean) : [];
      const benefitsArray = formData.benefits ? formData.benefits.split(',').map(s => s.trim()).filter(Boolean) : [];

      const payload = {
        ...formData,
        required_skills: skillsArray,
        keywords: keywordsArray,
        benefits: benefitsArray,
        publish_to_board: !formData.is_internal_only && formData.status === 'open'
      };

      let res;
      if (editingJobId) {
        res = await API.put(`/admin/jobs/${editingJobId}`, payload);
      } else {
        res = await API.post('/admin/jobs', payload);
      }

      if (res.success) {
        setCreateModalOpen(false);
        setEditingJobId(null);
        setFormData(INITIAL_FORM_STATE);
        fetchJobs();
      }
    } catch (err) {
      alert('Failed to save recruitment requirement: ' + (err.message || 'Error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      const res = await API.put(`/admin/jobs/${jobId}/status`, { status: newStatus });
      if (res.success) {
        fetchJobs();
      }
    } catch (err) {
      alert('Failed to update job status: ' + err.message);
    }
  };

  const handleAssignRecruiter = async (e) => {
    e.preventDefault();
    if (!selectedJobForAssign || !assignRecruiterId) return;

    try {
      setSubmitting(true);
      const res = await API.put(`/admin/jobs/${selectedJobForAssign.id}/assign-recruiter`, {
        assigned_recruiter_id: assignRecruiterId
      });
      if (res.success) {
        setAssignModalOpen(false);
        setSelectedJobForAssign(null);
        setAssignRecruiterId('');
        fetchJobs();
      }
    } catch (err) {
      alert('Failed to assign recruiter: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Job Requisitions & Executive Search</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage client recruitment mandates, assign recruiters, configure private executive searches, and publish public requisitions.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Recruitment Requirement</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, domain, client, department, location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white focus:outline-hidden focus:border-blue-600 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="open">Active / Open</option>
            <option value="draft">Drafts</option>
            <option value="closed">Closed / Inactive</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-5 py-3">Role / Mandate Title</th>
                <th className="px-5 py-3">Client / Employer</th>
                <th className="px-5 py-3">Assigned Recruiter</th>
                <th className="px-5 py-3">Workplace & Location</th>
                <th className="px-5 py-3">Applicants</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading requisitions...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No recruitment requirements found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Create Recruitment Requirement" or adjust your filter.</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold block">{job.title}</span>
                        <span className="text-[11px] text-slate-400 block">
                          {job.department} • {job.job_domain}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span className="font-medium text-slate-800 block">
                          {job.company_name || 'Vakancy Client'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {job.is_internal_only ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Lock className="w-2.5 h-2.5" /> Private Mandate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              <Globe className="w-2.5 h-2.5" /> Public Job Board
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {job.assigned_recruiter_email ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">{job.assigned_recruiter_email}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedJobForAssign(job);
                            setAssignRecruiterId('');
                            setAssignModalOpen(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Assign Recruiter
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span>{job.location}</span>
                        <span className="text-[11px] text-slate-400 block">{job.employment_type} • {job.workplace_type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-blue-700" />
                        {job.applicant_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(job)}
                        className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedJobForAssign(job);
                          setAssignRecruiterId(job.assigned_recruiter_id || '');
                          setAssignModalOpen(true);
                        }}
                        className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                      >
                        Reassign
                      </button>
                      {job.status === 'open' ? (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'closed')}
                          className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'open')}
                          className="px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                        >
                          Publish
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Employer Parity Job Creation / Edit Modal */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingJobId(null);
        }}
        maxWidth="max-w-3xl"
        title={editingJobId ? "Edit Recruitment Requirement" : "Create Recruitment Requirement"}
        subtitle="Full-parity job posting with all employer specifications, internal scoping, and recruiter assignment."
      >
        <form onSubmit={handleSaveRequirement} className="space-y-5">
          {/* Section 1: Mandate & Employer Association */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Mandate & Client Association
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Job / Mandate Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Chief Technology Officer / Principal Architect"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Associated Client / Employer</label>
                <select
                  value={formData.employer_id}
                  onChange={(e) => setFormData({ ...formData, employer_id: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Direct Vakancy Mandate (No Linked Client Account) --</option>
                  {employers.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.company_name} ({emp.industry || 'Client'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Technology / Executive Search"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Job Domain</label>
                <input
                  type="text"
                  value={formData.job_domain}
                  onChange={(e) => setFormData({ ...formData, job_domain: e.target.value })}
                  placeholder="e.g. Engineering / Leadership"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Seniority Level</label>
                <select
                  value={formData.seniority_level}
                  onChange={(e) => setFormData({ ...formData, seniority_level: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior Level">Senior Level</option>
                  <option value="Lead / Principal">Lead / Principal</option>
                  <option value="Director / Executive">Director / Executive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Work Location & Arrangement */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location & Work Arrangement
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Bengaluru, KA / Remote"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Workplace Type</label>
                <select
                  value={formData.workplace_type}
                  onChange={(e) => setFormData({ ...formData, workplace_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Employment Type</label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State / Region</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Openings Count</label>
                <input
                  type="number"
                  min="1"
                  value={formData.openings_count}
                  onChange={(e) => setFormData({ ...formData, openings_count: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Experience, Qualifications & Skills */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Experience & Candidate Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Exp (Yrs)</label>
                <input
                  type="number"
                  value={formData.min_experience}
                  onChange={(e) => setFormData({ ...formData, min_experience: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Exp (Yrs)</label>
                <input
                  type="number"
                  value={formData.max_experience}
                  onChange={(e) => setFormData({ ...formData, max_experience: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notice Period</label>
                <select
                  value={formData.notice_period}
                  onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="90 Days">90 Days</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="admin_fresher_allowed"
                checked={formData.fresher_allowed}
                onChange={(e) => setFormData({ ...formData, fresher_allowed: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="admin_fresher_allowed" className="text-xs text-slate-700 font-medium">
                Freshers / 0 years experience allowed
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Qualification</label>
                <input
                  type="text"
                  value={formData.min_qualification}
                  onChange={(e) => setFormData({ ...formData, min_qualification: e.target.value })}
                  placeholder="e.g. Bachelor's Degree"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Degree</label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g. B.Tech / MBA"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={formData.required_skills}
                  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  placeholder="e.g. React, Node.js, System Design, Kubernetes"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Keywords / Tags (Comma separated)</label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g. FinTech, Microservices, Scale"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Compensation & Commercial Terms */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Compensation & Benefits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Salary (INR)</label>
                <input
                  type="number"
                  value={formData.min_salary}
                  onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                  placeholder="e.g. 1500000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Salary (INR)</label>
                <input
                  type="number"
                  value={formData.max_salary}
                  onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                  placeholder="e.g. 3500000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Period</label>
                <select
                  value={formData.salary_period}
                  onChange={(e) => setFormData({ ...formData, salary_period: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Per Year">Per Year</option>
                  <option value="Per Month">Per Month</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.salary_type}
                  onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="CTC">CTC</option>
                  <option value="In-Hand">In-Hand</option>
                  <option value="Gross">Gross</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Perks & Benefits (Comma separated)</label>
                <input
                  type="text"
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="Health Insurance, ESOPs, Work From Home Allowance"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={formData.application_deadline}
                  onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Overview, Responsibilities & Requirements */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Mandate Scope & Job Details
            </h4>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role Overview & Job Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Overview of the organization, business domain, and core objective of this mandate..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Key Responsibilities (Comma separated)</label>
                <textarea
                  rows={2}
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="Lead engineering team, scale microservices architecture, drive roadmap"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Requirements & Qualifications (Comma separated)</label>
                <textarea
                  rows={2}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Proven leadership experience, excellent communication, strong architectural mindset"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Governance, Privacy & Scoping */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Admin Scoping, Recruiter Assignment & Governance
            </h4>

            {/* Visibility / Publication Scope Selector */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="block text-xs font-semibold text-slate-800">Publication & Privacy Scope</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  formData.is_internal_only
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="admin_visibility_scope"
                    checked={formData.is_internal_only === true}
                    onChange={() => setFormData({ ...formData, is_internal_only: true })}
                    className="mt-0.5 text-blue-700 focus:ring-blue-600"
                  />
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-700" /> Private Executive Search
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Handled confidentially. Never published to the public candidate board.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  !formData.is_internal_only
                    ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="admin_visibility_scope"
                    checked={formData.is_internal_only === false}
                    onChange={() => setFormData({ ...formData, is_internal_only: false })}
                    className="mt-0.5 text-blue-700 focus:ring-blue-600"
                  />
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-700" /> Public Job Board
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Published publicly on Vakancy.in job board with "Vakancy.in Recommended" priority badge.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status Lifecycle</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="draft">Draft (Private in Admin Portal)</option>
                  <option value="open">Open (Active Requisition)</option>
                  <option value="closed">Closed (Archive)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assign Internal Recruiter</label>
                <select
                  value={formData.assigned_recruiter_id}
                  onChange={(e) => setFormData({ ...formData, assigned_recruiter_id: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Unassigned (Assign Later) --</option>
                  {recruiters.map((u) => (
                    <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Confidential Internal Notes (Admin & Recruiter Only)</label>
              <textarea
                rows={2}
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                placeholder="Confidential client hiring criteria, budget constraints, target competitors, or recruiter guidelines..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingJobId(null);
              }}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingJobId ? 'Update Requirement' : 'Create Requirement'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Assign Recruiter Modal */}
      <ModalDialog
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedJobForAssign(null);
        }}
        title="Assign Recruiter to Requirement"
        subtitle={`Delegate mandate "${selectedJobForAssign?.title || ''}" to an internal recruiter.`}
      >
        <form onSubmit={handleAssignRecruiter} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Recruiter *</label>
            <select
              required
              value={assignRecruiterId}
              onChange={(e) => setAssignRecruiterId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="">-- Choose Recruiter --</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>{r.email} ({r.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedJobForAssign(null);
              }}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !assignRecruiterId}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminJobs;
