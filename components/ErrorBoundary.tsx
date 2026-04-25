import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Custom fallback UI. If omitted, the built-in error card is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for the chat area.
 *
 * Catches runtime errors thrown by any child component and renders a
 * recoverable error card instead of crashing the whole app. The user
 * can dismiss or reload without losing their sidebar or settings state.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd forward this to Sentry / LogRocket / etc.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
          <div className="max-w-md w-full text-center space-y-4 animate-fade-in-up">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            {/* Message */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                An unexpected error occurred in this conversation. Your chat history is safe.
              </p>
            </div>

            {/* Error detail (collapsed) */}
            {this.state.error && (
              <details className="text-left text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 cursor-pointer">
                <summary className="font-medium cursor-pointer select-none">Error details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleDismiss}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
