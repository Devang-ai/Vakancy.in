import React from 'react';
import { useParams, Link } from 'react-router-dom';

const CandidateApplicationSuccessPage = () => {
  const { id } = useParams();

  return (
    <div className="w-full bg-[#f8f9ff] min-h-screen flex items-center justify-center font-sans p-8">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xs border border-slate-200/80 p-8 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0b1c30]">Application Submitted!</h1>
        <p className="text-sm text-[#444653] leading-relaxed">
          Your application has been successfully sent to the employer. You can track its status in the Applications section of your portal.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
          <Link to={`/candidate/jobs/${id}`} className="flex-1 px-4 py-3 bg-slate-100 text-[#0b1c30] text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
            Return to Job
          </Link>
          <Link to="/candidate/applications" className="flex-1 px-4 py-3 bg-[#00288e] text-white text-sm font-bold rounded-lg hover:bg-[#1e40af] transition-colors">
            View My Applications
          </Link>
        </div>
      </div>
    </div>
  );
};
export default CandidateApplicationSuccessPage;
