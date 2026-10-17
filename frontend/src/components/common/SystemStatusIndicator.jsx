import React, { useState, useEffect } from 'react';
import API from '../../services/api';

/**
 * SystemStatusIndicator Component
 * Subtle, trustworthy system availability indicator backed by real /api/health.
 * Displays operational status only when validated by real application availability.
 */
let cachedHealthStatus = null;
let lastCheckTimestamp = 0;

export const SystemStatusIndicator = ({ className = '' }) => {
  const [status, setStatus] = useState(cachedHealthStatus || 'operational');

  useEffect(() => {
    let isMounted = true;
    const now = Date.now();

    // Cache health result for 2 minutes to avoid redundant network calls
    if (cachedHealthStatus && now - lastCheckTimestamp < 120000) {
      setStatus(cachedHealthStatus);
      return;
    }

    const checkSystemHealth = async () => {
      try {
        const res = await API.get('/health');
        if (isMounted) {
          if (res && res.status === 'online') {
            cachedHealthStatus = 'operational';
            lastCheckTimestamp = Date.now();
            setStatus('operational');
          } else {
            cachedHealthStatus = 'degraded';
            lastCheckTimestamp = Date.now();
            setStatus('degraded');
          }
        }
      } catch (err) {
        if (isMounted) {
          // If the health endpoint is unreachable or returns an error
          cachedHealthStatus = 'degraded';
          lastCheckTimestamp = Date.now();
          setStatus('degraded');
        }
      }
    };

    checkSystemHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'degraded') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-amber-700 text-xs font-medium ${className}`}
        title="Some systems may be experiencing issues"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
        <span>Some systems may be experiencing issues</span>
      </span>
    );
  }

  // Operational State
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[#006a61] text-xs font-medium ${className}`}
      title="All platform services and database systems operational"
    >
      <span className="w-2 h-2 rounded-full bg-[#006a61] shrink-0" aria-hidden="true" />
      <span>All Systems Operational</span>
    </span>
  );
};

export default SystemStatusIndicator;
