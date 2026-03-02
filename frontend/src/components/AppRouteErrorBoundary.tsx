import React from 'react';
import { Link } from 'react-router-dom';

type State = { hasError: boolean; message: string };

export default class AppRouteErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected app error' };
  }

  componentDidCatch(error: Error) {
    console.error('[app-error-boundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="deco-page">
          <div className="deco-panel">
            <div className="deco-panel-head">Something went wrong</div>
            <div className="deco-panel-body">
              <p className="text-sm text-slate-600">{this.state.message}</p>
              <div className="mt-3 flex gap-2">
                <button className="deco-btn" onClick={() => this.setState({ hasError: false, message: '' })}>Try again</button>
                <Link to="/app" className="deco-btn-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
