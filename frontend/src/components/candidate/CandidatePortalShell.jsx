import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CandidateSidebar from './CandidateSidebar';
import CandidateHeader from './CandidateHeader';
import API from '../../services/api';

export default function CandidatePortalShell({ children }) {
  const [counts, setCounts] = useState({ applications: 0, saved: 0, notifications: 0 });
  const location = useLocation();

  // Determine standard title/subtitle from current route
  let title = 'Candidate Portal';
  let subtitle = 'Manage your career profile and job applications';

  if (location.pathname.includes('/dashboard')) {
    title = 'Dashboard';
    subtitle = 'Welcome back to your candidate overview';
  } else if (location.pathname.includes('/jobs') && location.pathname.split('/').length > 3) {
    title = 'Job Details';
    subtitle = 'Review complete job information';
  } else if (location.pathname.includes('/jobs')) {
    title = 'Find Jobs';
    subtitle = 'Search and discover open opportunities';
  } else if (location.pathname.includes('/applications')) {
    title = 'Applications';
    subtitle = 'Track your submitted job applications';
  } else if (location.pathname.includes('/saved')) {
    title = 'Saved Jobs';
    subtitle = 'Opportunities you have bookmarked';
  } else if (location.pathname.includes('/profile')) {
    title = 'My Profile';
    subtitle = 'Manage your professional details and resumes';
  } else if (location.pathname.includes('/ai-builder')) {
    title = 'AI Resume Builder';
    subtitle = 'ATS-compliant PDF resume generator powered by Gemini';
  } else if (location.pathname.includes('/settings')) {
    title = 'Account Settings';
    subtitle = 'Manage your account, password, and notifications';
  } else if (location.pathname.includes('/notifications')) {
    title = 'Notifications';
    subtitle = 'Your recent updates and alerts';
  }

  const fetchCounts = async () => {
    try {
      const cRes = await API.get('/candidates/me/dashboard');
      if (cRes?.data?.counts) {
        setCounts(cRes.data.counts);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchCounts();
    const handleUpdate = () => fetchCounts();
    window.addEventListener('vakancy:candidate-counts-update', handleUpdate);
    return () => window.removeEventListener('vakancy:candidate-counts-update', handleUpdate);
  }, []);

  return (
    <div
      className="w-full min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30] antialiased flex"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <CandidateSidebar counts={counts} />
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden relative">
        <CandidateHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto pt-20 pb-16 px-8 h-full w-full">
          <div className="max-w-[80rem] mx-auto w-full flex flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
