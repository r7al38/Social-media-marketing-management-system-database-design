import { Component } from 'react';

/**
 * Global error boundary — catches any unhandled React render error
 * and shows a clean fallback instead of a white crash screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in development; swap for a real logger in production
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'An unexpected error occurred.';

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-border shadow-card-hover
                        p-8 max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-danger-light border border-danger/20
                          flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>

          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>

          <p className="text-xs text-muted leading-relaxed mb-1">
            The application encountered an unexpected error.
          </p>

          {/* Error message — shown in dev, hidden in prod if preferred */}
          {message && (
            <div className="bg-surface border border-border rounded-xl px-4 py-3 mt-3 mb-5
                            text-left overflow-auto max-h-28">
              <p className="text-[11px] font-mono text-danger break-words">{message}</p>
            </div>
          )}

          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-primary text-white text-sm font-medium
                       rounded-xl hover:bg-primary-dark transition-colors cursor-pointer
                       inline-flex items-center gap-2"
          >
            ↻ Reload Page
          </button>

          <p className="text-[11px] text-muted mt-4">
            If this keeps happening, check the browser console for details.
          </p>
        </div>
      </div>
    );
  }
}
