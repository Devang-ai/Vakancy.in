import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import BrandLogo from './BrandLogo';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center flex flex-col items-center">
            <div className="mb-6">
              <BrandLogo variant="wordmark" size="md" />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              We encountered an unexpected display issue while rendering this page. You can reload the view or return to the home screen.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
