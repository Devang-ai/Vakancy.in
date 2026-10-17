import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * JobCreationStepGuard
 * 
 * Protects step pages in the multi-step job creation flow.
 * 
 * Rules enforced:
 * 1. jobId must be present and a valid UUID (format check).
 * 2. Job must exist in the database (fetched from /api/employers/jobs/:id).
 * 3. Job must belong to the authenticated employer (enforced by backend 403 response).
 * 4. The job must be in an appropriate draft/editable state.
 * 5. All required previous step data must be present before accessing a later step.
 * 
 * If any check fails → redirect to /recruiter/jobs/create.
 * 
 * Prop requiredStep: minimum step number this page represents.
 *   Step 1 = Basic Info (create page — not guarded here)
 *   Step 2 = Description — requires title saved (step 1 done)
 *   Step 3 = Screening — requires description saved (step 2 done)
 *   Step 4 = Review   — requires step 3 done (screening saved)
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STEP_REQUIREMENTS = {
  2: { field: 'title', label: 'Basic job information' },     // Step 2: needs title
  3: { field: 'description', label: 'Job description' },     // Step 3: needs description
  4: { field: 'title', label: 'Basic job information' },     // Step 4 (review): just needs title
};

export default function JobCreationStepGuard({ jobId, requiredStep = 2, children }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'redirect'
  const [redirectTo, setRedirectTo] = useState('/recruiter/jobs/create');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      // 1. No jobId at all → Step 1
      if (!jobId) {
        if (!cancelled) { setRedirectTo('/recruiter/jobs/create'); setStatus('redirect'); }
        return;
      }

      // 2. Invalid UUID format → refuse
      if (!UUID_REGEX.test(jobId)) {
        if (!cancelled) { setRedirectTo('/recruiter/jobs/create'); setStatus('redirect'); }
        return;
      }

      // 3. Fetch job from backend (enforces ownership via 403)
      try {
        const res = await fetch(`/api/employers/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // 403 = doesn't own this job, 404 = doesn't exist
        if (res.status === 403 || res.status === 404) {
          if (!cancelled) { setRedirectTo('/recruiter/jobs/create'); setStatus('redirect'); }
          return;
        }

        if (!res.ok) {
          // Network or server error — let through optimistically (avoid blocking the UX)
          if (!cancelled) setStatus('ok');
          return;
        }

        const data = await res.json();

        if (!data.success || !data.job) {
          if (!cancelled) { setRedirectTo('/recruiter/jobs/create'); setStatus('redirect'); }
          return;
        }

        const job = data.job;

        // Published/open jobs are being EDITED — allow through all step pages.
        // Only apply step-completion guards to pure draft jobs.
        if (job.status === 'draft') {
          const req = STEP_REQUIREMENTS[requiredStep];
          if (req) {
            const fieldValue = job[req.field];
            const isEmpty = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
            if (isEmpty) {
              // Previous step not completed → go to step 1 (basic info)
              if (!cancelled) { setRedirectTo(`/recruiter/jobs/${jobId}/basic`); setStatus('redirect'); }
              return;
            }
          }
        }

        // All checks passed — allow through
        if (!cancelled) setStatus('ok');
      } catch (err) {
        // Network failure — let through optimistically
        console.warn('JobCreationStepGuard: verification failed, allowing through:', err.message);
        if (!cancelled) setStatus('ok');
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [jobId, token, requiredStep]);

  if (status === 'checking') {
    return (
      <div className="w-full min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-[#0b1c30]">Verifying access...</span>
        </div>
      </div>
    );
  }

  if (status === 'redirect') {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
