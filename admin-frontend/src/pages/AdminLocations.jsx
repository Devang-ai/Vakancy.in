import React, { useState, useEffect } from 'react';
import { MapPin, Globe } from 'lucide-react';
import API from '../services/api';

const AdminLocations = () => {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await API.get('/master/locations-hierarchy');
      if (res.success) setHierarchy(res.regions || {});
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regionsList = [
    { key: 'ALL', name: 'All Master Regions' },
    { key: 'AFRICA', name: 'Africa (54 Countries)' },
    { key: 'MIDDLE_EAST', name: 'Middle East (17 Countries)' },
    { key: 'SOUTHEAST_ASIA', name: 'Southeast Asia (13 Countries & Pacific Islands)' },
    { key: 'INDIA', name: 'India (Domestic Hub)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Location & Regional Master Data</h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized international geographical taxonomy covering Africa, Middle East, Southeast Asia, and India
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {regionsList.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelectedRegion(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedRegion === r.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading master location data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(hierarchy || {}).map(([regionKey, countries]) => {
            if (selectedRegion !== 'ALL' && selectedRegion !== regionKey) return null;
            return (
              <div key={regionKey} className="ep-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-blue-700" />
                    <h3 className="text-base font-bold text-slate-900 font-heading uppercase tracking-wide">
                      {regionKey.replace('_', ' ')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {countries.length} Locations
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                  {countries.map((country, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 flex items-center gap-2 shadow-2xs"
                    >
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{country}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLocations;

