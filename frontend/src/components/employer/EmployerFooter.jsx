import React from 'react';
import { Link } from 'react-router-dom';

export default function EmployerFooter() {
  return (
    <footer className="w-full bg-white py-4 px-6 shadow-[0_-1px_4px_rgba(0,0,0,0.02)] border-t border-slate-200/60 mt-auto">
      <div className="max-w-[80rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#444653]">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
          <span className="font-semibold text-[#0b1c30]">Vakancy.in Employer Workspace</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span>&copy; {new Date().getFullYear()} Vakancy.in. All rights reserved.</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium">
          <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-[#0b1c30] transition-colors">Privacy Policy</Link>
          <Link to="/terms-conditions" target="_blank" rel="noopener noreferrer" className="hover:text-[#0b1c30] transition-colors">Terms & Conditions</Link>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Need help?</span>
            <Link to="/contact" target="_blank" rel="noopener noreferrer" className="text-[#00288e] hover:text-[#1e40af] transition-colors">
              Contact us at help@vakancy.in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
