import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global React ErrorBoundary.
 * Catches unhandled exceptions in the component tree and displays
 * a friendly fallback screen instead of crashing the entire app.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State;
  props: Props;
  setState: (state: Partial<State> | ((state: State) => Partial<State> | null)) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-lg bg-zinc-900/80 border border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-xl">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="p-4 bg-red-950/40 rounded-xl border border-red-900/50">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Une erreur inattendue s'est produite
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                L'application a rencontré un problème. Vos données sont en sécurité.
                Vous pouvez réessayer ou recharger la page.
              </p>
            </div>

            {/* Error details (dev-friendly) */}
            {this.state.error && (
              <details className="text-left bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 cursor-pointer group">
                <summary className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                  Détails techniques
                </summary>
                <p className="mt-2 text-[10px] font-mono text-red-400 break-all leading-relaxed">
                  {this.state.error.message}
                </p>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                <RefreshCw size={13} />
                Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Recharger la page
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
