import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  Users,
  ArrowRight,
  HelpCircle,
  Clock,
  Briefcase,
  Lock,
  Headphones
} from 'lucide-react';

/**
 * PricingPage Component
 * Source of Truth: Google Stitch Screen ID e72736237cb14c90989034ee7b07b1b2 ("Vakancy.in - Pricing")
 * Note: Purely informational public pricing page aligned with the locked ₹1 lakh recruitment agency model.
 */
export const PricingPage = () => {
  return (
    <div className="w-full bg-[#f8f9ff] text-[#0b1c30] min-h-screen">
      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-[#eff4ff] border-b border-slate-200/80 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-xs border border-slate-200/80 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#006a61]" />
              <span className="text-xs text-[#006a61] uppercase tracking-wider font-bold">
                Transparent Institutional Pricing
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0b1c30] leading-tight">
              Predictable, Success-Aligned Recruitment Partnerships
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Zero opaque subscriptions or credit lock-ins. Pay only when verified candidates join your engineering, product, or leadership teams.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3 ENGAGEMENT MODELS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan 1: Standard Success Placement */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-[#1e40af] uppercase tracking-wider">
                Direct Placement
              </div>
              <h3 className="text-xl font-bold text-[#0b1c30]">Contingent Search</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ideal for scaling engineering and product teams with continuous tech requisitions.
              </p>

              <div className="py-4 border-y border-slate-100 flex flex-col gap-1">
                <span className="text-2xl font-extrabold text-[#0b1c30]">8.33% – 12.5%</span>
                <span className="text-xs text-slate-500">of Annual CTC upon successful joining</span>
              </div>

              <ul className="flex flex-col gap-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Verified candidate dossiers with technical evaluations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>90-Day Free Candidate Replacement Guarantee</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Dedicated Tech Recruiter assigned to your requisition</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Standard 30-day net payment terms from joining</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/register?role=employer"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors text-center block"
              >
                Post a Requisition
              </Link>
            </div>
          </div>

          {/* Plan 2: Retained Search (Highlighted) */}
          <div className="bg-white rounded-2xl border-2 border-[#1e40af] shadow-lg p-8 flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1e40af] text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular Mandate
            </div>

            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-[#1e40af] uppercase tracking-wider">
                Leadership &amp; C-Suite
              </div>
              <h3 className="text-xl font-bold text-[#0b1c30]">Retained Executive Search</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confidential executive hiring for CTO, VP of Engineering, CPO, and C-Suite leaders.
              </p>

              <div className="py-4 border-y border-slate-100 flex flex-col gap-1">
                <span className="text-2xl font-extrabold text-[#0b1c30]">Custom Retainer</span>
                <span className="text-xs text-slate-500">Tranche milestone based structure</span>
              </div>

              <ul className="flex flex-col gap-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Managing Partner led market mapping &amp; outreach</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Complete confidentiality &amp; non-disclosure governance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>180-Day Executive Replacement Guarantee</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Full reference &amp; background verification dossier</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/contact-us"
                className="w-full py-2.5 px-4 rounded-lg bg-[#1e40af] hover:bg-[#00288e] text-white text-xs font-bold transition-colors text-center block shadow-sm"
              >
                Inquire for Retained Mandate
              </Link>
            </div>
          </div>

          {/* Plan 3: Enterprise Annual Partnership */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-[#006a61] uppercase tracking-wider">
                Volume Enterprise
              </div>
              <h3 className="text-xl font-bold text-[#0b1c30]">Enterprise Talent Suite</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For high-growth scale-ups hiring 20+ technical and product team members annually.
              </p>

              <div className="py-4 border-y border-slate-100 flex flex-col gap-1">
                <span className="text-2xl font-extrabold text-[#0b1c30]">Institutional Tier</span>
                <span className="text-xs text-slate-500">Discounted annual success tiers</span>
              </div>

              <ul className="flex flex-col gap-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Volume placement fee discounts (preferential terms)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Dedicated 3-person embedded recruitment pod</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Quarterly hiring market &amp; compensation reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006a61] shrink-0 mt-0.5" />
                  <span>Custom ATS API and workflow integrations</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/contact-us"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors text-center block"
              >
                Contact Enterprise Desk
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section className="bg-white border-t border-slate-200/80 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-[#1e40af] uppercase tracking-wider">Frequently Asked Questions</span>
            <h2 className="text-2xl font-bold text-[#0b1c30] mt-1">Hiring &amp; Invoicing Details</h2>
          </div>

          <div className="flex flex-col gap-4 text-xs sm:text-sm">
            <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/60">
              <h4 className="font-bold text-[#0b1c30]">When is the recruitment fee invoiced?</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Fees are invoiced on the date the selected candidate successfully joins your organization, payable within 30 calendar days.
              </p>
            </div>

            <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/60">
              <h4 className="font-bold text-[#0b1c30]">What does the Replacement Guarantee include?</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                If a placed candidate resigns or is terminated for performance within 90 days of joining, Vakancy.in provides a free replacement candidate with highest priority.
              </p>
            </div>

            <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/60">
              <h4 className="font-bold text-[#0b1c30]">Are there upfront charges to post a job?</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                No. Standard job postings and candidate shortlisting are completely free upfront. You only pay upon candidate hiring.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
