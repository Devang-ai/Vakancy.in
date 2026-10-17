import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color = 'cyan', subtitle }) => {
  const colorMap = {
    blue: 'from-blue-600/20 to-indigo-600/10 text-blue-400 border-blue-500/30',
    cyan: 'from-cyan-500/20 to-teal-500/10 text-cyan-400 border-cyan-500/30',
    indigo: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    rose: 'from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30'
  };

  const theme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`glass-card glass-card-hover p-5 rounded-2xl bg-gradient-to-br ${theme} relative overflow-hidden group`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
