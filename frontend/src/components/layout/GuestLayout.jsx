import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  Home,
  Briefcase,
  Info,
  Award
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export const GuestLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Canonical Public Navigation Routes (Contact Us is placed strictly in Footer)
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/jobs', label: 'Find Jobs' },
    { to: '/for-employers', label: 'For Employers' },
    { to: '/executive-search', label: 'Executive Search' },
    { to: '/about', label: 'About Us' },
  ];

  const mobileNavLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/jobs', label: 'Find Jobs', icon: Search },
    { to: '/for-employers', label: 'For Employers', icon: Briefcase },
    { to: '/executive-search', label: 'Executive Search', icon: Award },
    { to: '/about', label: 'About Us', icon: Info },
  ];

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased selection:bg-[#1e40af] selection:text-white overflow-x-hidden">
      {/* ========================================================================= */}
      {/* HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border-b border-slate-200/80">
        <div className="h-16 lg:h-18 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-8 lg:gap-10">
            <BrandLogo variant="responsive" size="md" />

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="Main Navigation">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-sm font-semibold transition-all py-1 border-b-2 ${
                      isActive
                        ? 'text-[#00288e] border-[#00288e]'
                        : 'text-slate-600 hover:text-[#00288e] border-transparent'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Actions (Desktop Storyboard) */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              aria-label="Quick Search"
              onClick={() => navigate('/jobs')}
              className="p-2 rounded-xl text-slate-500 hover:text-[#00288e] hover:bg-slate-100 transition-colors hidden sm:inline-flex"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-[#00288e] transition-colors px-3 py-2 rounded-xl hover:bg-slate-50"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="hidden sm:inline-flex items-center text-sm font-bold text-white bg-[#00288e] hover:bg-[#1e40af] px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              Sign Up
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
      </header>

      {/* Mobile Navigation Drawer & Backdrop (Full Accessibility & High Z-Index, Outside header to avoid backdrop-filter containing block trap) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true" aria-label="Navigation Menu">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-[290px] sm:w-[320px] max-w-[85vw] h-full h-[100dvh] bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 z-[101]">
            {/* Drawer Brand Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <BrandLogo
                variant="horizontal"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Items with Icons */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3.5 pb-1">
                Menu
              </div>
              {mobileNavLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-blue-50 text-[#00288e] font-bold border border-blue-100'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#00288e]'
                      }`
                    }
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" />}
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Bottom Action Buttons (Visually Separated) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col gap-2.5 shrink-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-0.5">
                Account
              </div>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-[#00288e] bg-white border border-blue-200 hover:bg-blue-50 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-white bg-[#00288e] hover:bg-[#1e40af] rounded-xl shadow-sm transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-center">
                <BrandLogo variant="global-full" size="lg" to="/" />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Find and Hire Great Talent.
              </p>
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
                <li><Link to="/for-employers" className="hover:text-[#00288e] transition-colors">Hiring Solutions</Link></li>
                <li><Link to="/register?role=employer" className="hover:text-[#00288e] transition-colors">Post a Job</Link></li>
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

          <div className="border-t border-slate-200/80 pt-6 flex items-center justify-between gap-4 text-xs text-slate-500">
            <p className="text-left text-xs text-slate-500 leading-relaxed">
              Vakancy.in recruitment platform powering careers and hiring across India.
            </p>
            <div className="flex items-center shrink-0">
              <BrandLogo
                variant="v-symbol"
                size="sm"
                to="/"
                className="hover:scale-105 transition-transform"
                alt="Vakancy.in Symbol"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuestLayout;
