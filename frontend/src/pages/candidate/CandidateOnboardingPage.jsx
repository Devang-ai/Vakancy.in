import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CandidateProfile from './CandidateProfile';
import API from '../../services/api';
import { ArrowLeft, CheckCircle2, FileCheck2 } from 'lucide-react';

export default function CandidateOnboardingPage() {
  const { profile, fetchUserContext } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have profile data, we can check completion
    if (profile) {
      if (profile.is_onboarding_completed) {
        const queryParams = new URLSearchParams(location.search);
        const returnUrl = queryParams.get('returnUrl');
        navigate(returnUrl || '/candidate/dashboard', { replace: true });
      } else {
        setLoading(false);
      }
    } else {
      // It might be undefined initially, give it a moment
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, navigate]);

  const handleComplete = async () => {
    await fetchUserContext();
    const queryParams = new URLSearchParams(location.search);
    const returnUrl = queryParams.get('returnUrl');
    navigate(returnUrl || '/candidate/dashboard', { replace: true });
  };


  const rightCard = (
    <div className="w-full bg-gradient-to-br from-[#f0f6ff] to-[#e6f0ff] rounded-2xl p-8 border border-blue-100 flex flex-col items-center text-center sm:items-start sm:text-left justify-start h-fit">
      <div className="w-24 h-24 mb-6 relative">
        <div className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200 rotate-[-5deg]"></div>
        <div className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-3">
          <div className="w-8 h-8 rounded-full bg-[#00288e] mx-auto mb-2 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded mb-1.5"></div>
          <div className="w-3/4 h-2 bg-slate-100 rounded mb-1.5"></div>
          <div className="w-full h-2 bg-slate-100 rounded"></div>
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#00288e] rounded-full flex items-center justify-center shadow-md">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-extrabold text-[#0b1c30] mb-3">Why complete your profile?</h3>
      <p className="text-slate-600 text-sm mb-8 leading-relaxed">
        A complete profile helps us understand your background and makes applying for jobs easier.
      </p>
      <ul className="space-y-4 w-full">
        <li className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-[#00288e] flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <span className="text-sm font-medium text-slate-700 text-left">Better job recommendations</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-[#00288e] flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <span className="text-sm font-medium text-slate-700 text-left">Faster applications</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-[#00288e] flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <span className="text-sm font-medium text-slate-700 text-left">More complete profile for employers</span>
        </li>
      </ul>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="w-8 h-8 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white px-6 py-4 flex items-center shrink-0 border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-[#0b1c30] tracking-tight">Vakancy.in</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CANDIDATE PORTAL</span>
          </div>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-[#00288e] text-sm font-semibold mb-4 hover:underline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Candidate Profile Setup
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight mb-2">Complete Your Profile</h1>
            <p className="text-sm text-slate-600">
              Please complete your profile to continue with your application.
            </p>
          </div>

          <div className="w-full">
            <CandidateProfile isOnboarding={true} onComplete={handleComplete} rightCard={rightCard} />
          </div>
        </div>
      </main>
    </div>
  );
}
