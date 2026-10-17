import React, { useState } from 'react';
import { Crown, CheckCircle2, Sparkles, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RazorpayPaymentModal from '../../components/RazorpayPaymentModal';
import StatusBadge from '../../components/StatusBadge';

const CandidatePremium = () => {
  const { profile, fetchUserContext } = useAuth();
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null });

  const handleBuyPremium = () => {
    setPaymentModal({
      isOpen: true,
      item: {
        title: 'Vakancy Candidate Premium Membership (1 Year)',
        type: 'candidate_premium',
        amount: 999
      }
    });
  };

  const handlePaymentSuccess = () => {
    fetchUserContext();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Candidate Premium Profile</h1>
        <p className="text-xs text-slate-400">Boost your recruiter search visibility and get priority interview recommendations</p>
      </div>

      {profile?.is_premium ? (
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-3">
          <Crown className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-white">You are a Premium Candidate Member!</h2>
          <p className="text-xs text-emerald-300">Your profile is highlighted at the top of recruiter searches with priority tags.</p>
          <div className="pt-2">
            <StatusBadge status="ACTIVE PREMIUM" />
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-950 space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white font-heading">Upgrade to Candidate Premium</h2>
              <p className="text-xs text-slate-300">₹999 / year for 5x recruiter profile views</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              'Highlighted badge on Recruiter & Employer databases',
              'Unlimited Gemini AI Resume enhancements',
              'Featured applicant placement on job postings',
              'Direct notifications when employers view your profile'
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleBuyPremium}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-extrabold text-sm shadow-xl shadow-blue-900/25 flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" /> Upgrade to Premium for ₹999 / Year
          </button>
        </div>
      )}

      <RazorpayPaymentModal
        isOpen={paymentModal.isOpen}
        item={paymentModal.item}
        onClose={() => setPaymentModal({ isOpen: false, item: null })}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default CandidatePremium;
