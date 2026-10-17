import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import API from '../../services/api';

export const SharedCandidateProfilePage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSharedProfile();
  }, [token]);

  const fetchSharedProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get(`/admin/shared-profile/${token}`);
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Candidate link unavailable.');
      }
    } catch (err) {
      setError(err.message || 'Unable to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-500 text-xs">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading confidential candidate dossier...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-700">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Link Inactive or Revoked</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This candidate sharing link is no longer accessible. Please contact your Vakancy.in recruitment coordinator.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              Return to Vakancy.in Homepage →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { profile } = data;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 font-sans antialiased text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Branding Header */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">Vakancy<span className="text-blue-700">.in</span></span>
              <p className="text-xs text-slate-500 font-medium">Executive Search • Client Confidential Dossier</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Candidate Submission</span>
          </div>
        </div>

        {/* Candidate Profile Header Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
              <p className="text-sm font-medium text-blue-700 mt-1">{profile.professional_headline || 'Senior Professional'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                {profile.current_organization && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {profile.current_designation ? `${profile.current_designation} @ ` : ''}{profile.current_organization}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {profile.total_experience ? `${profile.total_experience} Years Total Experience` : 'Experienced'}
                </span>
                {profile.current_location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profile.current_location}
                  </span>
                )}
              </div>
            </div>

            {profile.resume?.file_url && (
              <a
                href={profile.resume.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs shrink-0 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Resume</span>
              </a>
            )}
          </div>

          {/* Professional Summary */}
          {profile.professional_summary && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                {profile.professional_summary}
              </p>
            </div>
          )}
        </div>

        {/* Experience Timeline */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-700" /> Professional Experience
          </h2>
          {profile.experience?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No experience records attached.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {profile.experience.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-50/70 border border-slate-100 space-y-1 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <p className="font-bold text-slate-900 text-sm">{exp.designation}</p>
                    <span className="text-slate-400 text-[11px]">
                      {exp.from_date ? new Date(exp.from_date).toLocaleDateString() : ''} - {exp.is_currently_working ? 'Present' : (exp.to_date ? new Date(exp.to_date).toLocaleDateString() : '')}
                    </span>
                  </div>
                  <p className="font-medium text-blue-700">{exp.organization}</p>
                  {exp.key_achievements && (
                    <p className="text-slate-600 pt-1 leading-relaxed">{exp.key_achievements}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education & Qualifications */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-700" /> Education & Credentials
          </h2>
          {profile.education?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No education records attached.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {profile.education.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-50/70 border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{edu.degree}</p>
                  <p className="text-slate-600">{edu.institution}</p>
                  <p className="text-[11px] text-slate-400">Specialization: {edu.specialization || 'General'} • Batch {edu.year}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-700" /> Core Capabilities & Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.skills?.map((sk, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-semibold">
                {sk.name}
              </span>
            ))}
          </div>
        </div>

        {/* Confidentiality Footer */}
        <div className="text-center py-4 text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} Vakancy.in Recruitment Services. Confidential document.</p>
          <p>Shared exclusively for client recruitment evaluation under Vakancy partner engagement terms.</p>
        </div>
      </div>
    </div>
  );
};

export default SharedCandidateProfilePage;
