import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useStore } from '../store';
import { TRANSLATIONS } from '../i18n';

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
      // A class component can't call the useTranslation() hook, but reading
      // the store directly is safe: if the store module hadn't loaded, this
      // component (and the whole app) couldn't have mounted in the first
      // place, so it's guaranteed to be available by the time render() runs.
      const t = TRANSLATIONS[useStore.getState().language] ?? TRANSLATIONS.en;
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center text-ink">
          <h1 className="text-lg font-semibold">{t.somethingWentWrong}</h1>
          <p className="max-w-sm text-sm text-muted">{t.errorDescription}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-accent px-4 py-2 text-sm"
          >
            {t.reloadButton}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
