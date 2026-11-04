import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const configuredAdminUrl = import.meta.env.VITE_ADMIN_APP_URL?.trim();

const getAdminBaseUrl = () => {
  if (configuredAdminUrl) return configuredAdminUrl.replace(/\/$/, '');
  return import.meta.env.DEV ? 'http://localhost:5174' : 'https://admin.vakancy.in';
};

const LegacyAdminRedirect = () => {
  const location = useLocation();
  const adminPath = location.pathname.replace(/^\/admin(?=\/|$)/, '') || '/dashboard';
  const destination = `${getAdminBaseUrl()}${adminPath}${location.search}${location.hash}`;

  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Opening Vakancy Admin</h1>
        <p className="mt-2 text-sm text-slate-600" role="status" aria-live="polite">
          Internal operations are managed in the dedicated Admin application.
        </p>
        <a className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline" href={destination}>
          Continue to Admin
        </a>
      </div>
    </main>
  );
};

export default LegacyAdminRedirect;
