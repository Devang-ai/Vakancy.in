import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute
 * Guards authenticated portal routes.
 * - requiredRole: if provided, restricts access to users whose role matches.
 * - Unauthenticated → /login?returnUrl=...
 * - Wrong role → / (home)
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, token, loading } = useAuth();
  const location = useLocation();

  // Show nothing while auth context is still loading from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="w-6 h-6 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → redirect to login preserving returnUrl
  if (!token || !user) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Role check — e.g. candidate must not access /recruiter, employer must not access /candidate/*
  if (requiredRole) {
    const isAllowed = Array.isArray(requiredRole)
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    if (!isAllowed) {
      if (user.role === 'candidate') {
        return <Navigate to="/candidate/dashboard" replace />;
      } else if (['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator'].includes(user.role)) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === 'employer') {
        return <Navigate to="/recruiter" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  // Employer Onboarding Enforcement:
  // If employer has not completed onboarding and attempts to access any recruiter route other than /recruiter/onboarding,
  // redirect them directly to /recruiter/onboarding.
  if (
    user.role === 'employer' &&
    location.pathname !== '/recruiter/onboarding'
  ) {
    const isCompleted = profile && 
      profile.is_onboarding_completed !== 0 && 
      profile.is_onboarding_completed !== '0' && 
      profile.is_onboarding_completed !== false && 
      profile.is_onboarding_completed !== 'false' &&
      !!profile.is_onboarding_completed;

    if (!isCompleted) {
      return <Navigate to={`/recruiter/onboarding?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }
  }

  // Candidate Onboarding Enforcement:
  if (
    user.role === 'candidate' &&
    location.pathname !== '/candidate/onboarding'
  ) {
    const isCompleted = profile && 
      profile.is_onboarding_completed !== 0 && 
      profile.is_onboarding_completed !== '0' && 
      profile.is_onboarding_completed !== false && 
      profile.is_onboarding_completed !== 'false' &&
      !!profile.is_onboarding_completed;

    if (!isCompleted) {
      return <Navigate to={`/candidate/onboarding?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
