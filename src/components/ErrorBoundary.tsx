import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any rendering error anywhere in the tree unmounts the whole
 * app — a blank white page with no explanation, and (since saving is
 * manual) no way back to whatever unsaved work was in progress. Error
 * boundaries must be class components; React has no hook equivalent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in rozkroj:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center text-ink">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted">
            Rozkroj hit an unexpected error and can't continue. Your last saved project is still safe in the project
            library — reloading will not lose it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-accent px-4 py-2 text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
