import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const EmployerHeader = ({ title, searchQuery, setSearchQuery, setSidebarOpen }) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const userDisplayName = profile?.company_name && profile.company_name !== 'Pending Company Profile'
    ? profile.company_name
    : user?.company_name || user?.name || 'Employer Account';

  const logoUrl = profile?.company_logo || profile?.logo_url || user?.logo_url;
  
  const handleSearch = (e) => {
    const val = e.target.value;
    if (setSearchQuery) {
      setSearchQuery(val);
    } else {
      setLocalSearch(val);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && !setSearchQuery && localSearch.trim()) {
      navigate(`/recruiter/jobs?q=${encodeURIComponent(localSearch.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-4 sm:px-6 flex items-center justify-between border-b border-slate-100">
      {/* Mobile hamburger & Title */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-[#444653] hover:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title && <span className="font-bold text-sm text-[#0b1c30]">{title}</span>}
      </div>

      {/* Spacer for desktop if needed */}
      <div className="flex-1 hidden md:block"></div>

      {/* Search Bar */}
      <div className="hidden sm:flex flex-[2] max-w-lg relative items-center">
        <svg className="w-4 h-4 text-[#444653] absolute left-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={setSearchQuery ? searchQuery : localSearch}
          onChange={handleSearch}
          onKeyDown={handleSearchSubmit}
          placeholder="Search by job title, location, or stack (⌘K)..."
          className="w-full pl-10 pr-12 py-2 bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#444653] text-xs rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#1e40af] transition-all border border-transparent focus:border-[#1e40af]"
        />
        {(setSearchQuery ? searchQuery : localSearch) && (
          <button
            onClick={() => setSearchQuery ? setSearchQuery('') : setLocalSearch('')}
            className="absolute right-3 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Spacer to push right actions to the edge */}
      <div className="flex-1"></div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* Post a Job CTA */}
        <Link
          to="/recruiter/jobs/create"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00288e] text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-[#1e40af] transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Post a Job</span>
        </Link>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-[#eff4ff] transition-colors"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={userDisplayName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-xs uppercase">
                {userDisplayName.charAt(0)}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left min-w-0 max-w-[120px]">
              <span className="text-xs text-[#0b1c30] font-semibold leading-tight truncate">
                {userDisplayName}
              </span>
              <span className="text-[10px] text-[#444653] truncate">
                Primary Recruiter
              </span>
            </div>
            <svg className="w-4 h-4 text-[#444653]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-[#0b1c30] truncate">{userDisplayName}</p>
                <p className="text-[11px] text-[#444653] truncate">{user?.email}</p>
              </div>
              <Link
                to="/recruiter/company"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Company Profile
              </Link>
              <Link
                to="/recruiter/settings/security"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Change Password
              </Link>
              <Link
                to="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Help & Support
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-3 py-2 text-[#ba1a1a] hover:bg-red-50 font-semibold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default EmployerHeader;
