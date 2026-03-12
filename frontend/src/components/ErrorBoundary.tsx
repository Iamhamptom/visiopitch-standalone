import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-text-secondary">Please refresh the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
