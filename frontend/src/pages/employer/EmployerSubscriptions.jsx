import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import API from '../../services/api';
import RazorpayPaymentModal from '../../components/RazorpayPaymentModal';
import StatusBadge from '../../components/StatusBadge';

const EmployerSubscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null });

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [planRes, empRes] = await Promise.all([
        API.get('/subscriptions/plans'),
        API.get('/employers/profile')
      ]);

      if (planRes.success) setPlans(planRes.plans || []);
      if (empRes.success && empRes.employer) {
        setActiveSub(empRes.employer.active_subscription);
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = (plan) => {
    setPaymentModal({
      isOpen: true,
      item: {
        title: `Employer Subscription: ${plan.name}`,
        type: 'employer_subscription',
        amount: plan.price,
        plan_id: plan.id
      }
    });
  };

  const handlePaymentSuccess = () => {
    fetchSubscriptionData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Employer Subscription Plans</h1>
        <p className="text-xs text-slate-400">Unlock candidate database access and resume contacts with Razorpay payment</p>
      </div>

      {/* Active Subscription Summary */}
      {activeSub && (
        <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-heading">{activeSub.plan_name} Plan</h2>
              <StatusBadge status="ACTIVE" />
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Unlocks remaining: <strong className="text-cyan-400 font-bold">{activeSub.unlocks_remaining}</strong> of {activeSub.unlock_limit} | Valid until {new Date(activeSub.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="glass-card glass-card-hover p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-extrabold text-white font-heading">{p.name}</h3>
                <CreditCard className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <span className="text-3xl font-extrabold text-white">₹{Number(p.price).toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-400"> / {p.duration_days} days</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span><strong>{p.unlock_limit} Candidate Contact Unlocks</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Full Resume PDF Downloads</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited Free Job Postings</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleBuyPlan(p)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              <Zap className="w-4 h-4" /> Subscribe via Razorpay
            </button>
          </div>
        ))}
      </div>

      <RazorpayPaymentModal
        isOpen={paymentModal.isOpen}
        item={paymentModal.item}
        onClose={() => setPaymentModal({ isOpen: false, item: null })}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default EmployerSubscriptions;
