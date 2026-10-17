import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import SystemStatusIndicator from '../common/SystemStatusIndicator';

export const GuestLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/jobs', label: 'Jobs' },
    { to: '/for-employers', label: 'For Employers' },
    { to: '/executive-search', label: 'Executive Search' },
    { to: '/about-us', label: 'About Us' },
    { to: '/pricing', label: 'Pricing' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased selection:bg-[#1e40af] selection:text-white overflow-x-hidden">
      {/* ========================================================================= */}
      {/* HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border-b border-slate-200/80">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-8 lg:gap-10">
            <Link to="/" className="flex items-center gap-2 group shrink-0 select-none">
              <div className="w-8 h-8 rounded-lg bg-[#1e40af] flex items-center justify-center text-white shadow-sm font-bold text-sm">
                V
              </div>
              <span className="text-xl font-bold tracking-tight text-[#00288e] font-sans">
                Vakancy<span className="text-[#006a61]">.in</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 lg:gap-8" aria-label="Main Navigation">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#00288e] font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              aria-label="Quick Search"
              onClick={() => navigate('/jobs')}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors hidden sm:inline-flex"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>

            <Link
              to="/login"
              className="hidden md:inline-flex text-sm font-medium text-slate-600 hover:text-[#00288e] transition-colors px-2 py-1.5"
            >
              Candidate Login
            </Link>

            <Link
              to="/register?role=employer"
              className="hidden sm:inline-flex items-center text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 px-3.5 py-1.5 rounded-lg shadow-xs transition-all"
            >
              Post a Job
            </Link>

            <Link
              to="/register"
              className="hidden sm:inline-flex items-center text-sm font-semibold text-white bg-[#1e40af] hover:bg-[#00288e] px-4 py-1.5 rounded-lg transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
            >
              Register / Get Started
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#00288e] hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#1e40af] hover:bg-[#00288e] rounded-lg shadow-xs"
              >
                Register / Get Started
              </Link>
              <Link
                to="/register?role=employer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Post a Job
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-medium text-slate-600 hover:text-[#00288e] hover:bg-slate-50 rounded-lg"
              >
                Candidate Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full min-w-0 bg-[#f8f9ff]">
        <Outlet />
      </main>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="w-full bg-white border-t border-slate-200/80 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12">
            {/* Col 1: Brand & Tagline */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1e40af] flex items-center justify-center text-white font-bold text-xs">
                  V
                </div>
                <span className="text-xl font-bold tracking-tight text-[#00288e] font-sans">
                  Vakancy<span className="text-[#006a61]">.in</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Find and Hire Great Talent.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-[#006a61] text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ISO 9001:2015
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-[#006a61] text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Agency
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-2">
                © {new Date().getFullYear()} Vakancy.in. All rights reserved.
              </p>
            </div>

            {/* Col 2: For Candidates */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                For Candidates
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                <li><Link to="/jobs" className="hover:text-[#00288e] transition-colors">Browse Jobs</Link></li>
                <li><Link to="/login" className="hover:text-[#00288e] transition-colors">Candidate Login</Link></li>
                <li><Link to="/register?role=candidate" className="hover:text-[#00288e] transition-colors">Register as Candidate</Link></li>
              </ul>
            </div>

            {/* Col 3: For Employers */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                For Employers
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                <li><Link to="/register?role=employer" className="hover:text-[#00288e] transition-colors">Post a Job</Link></li>
                <li><Link to="/pricing" className="hover:text-[#00288e] transition-colors">Pricing & Plans</Link></li>
              </ul>
            </div>

            {/* Col 4: Executive Search */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Executive Search
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                <li><Link to="/executive-search" className="hover:text-[#00288e] transition-colors">Leadership Hiring</Link></li>
                <li><Link to="/executive-search" className="hover:text-[#00288e] transition-colors">Board Advisory</Link></li>
                <li><Link to="/executive-search" className="hover:text-[#00288e] transition-colors">Retained Search</Link></li>
                <li><Link to="/executive-search" className="hover:text-[#00288e] transition-colors">Confidential Hiring</Link></li>
                <li><Link to="/executive-search" className="hover:text-[#00288e] transition-colors">Practice Areas</Link></li>
              </ul>
            </div>

            {/* Col 5: Company & Legal */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Company & Legal
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                <li><Link to="/about" className="hover:text-[#00288e] transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-[#00288e] transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-[#00288e] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-and-conditions" className="hover:text-[#00288e] transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              Vakancy.in recruitment platform powering careers and hiring across India.
            </p>
            <div className="flex items-center gap-4 shrink-0">
              <SystemStatusIndicator />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuestLayout;
