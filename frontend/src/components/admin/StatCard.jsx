import React from 'react';

export const StatCard = ({ title, value, icon: Icon, subtitle, color = 'blue' }) => {
  const iconColors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const selectedColor = iconColors[color] || iconColors.blue;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow transition-shadow flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : (value || 0)}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 font-normal pt-0.5">{subtitle}</p>
        )}
      </div>
      {Icon && (
        <div className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${selectedColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
