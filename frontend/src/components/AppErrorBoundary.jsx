import { Component } from 'react';

// Prevent an unexpected React render error from turning the entire app white.
export default class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('ReliefLink page error:', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page" role="alert" style={{ paddingTop: '4rem', minHeight: '70vh' }}>
        <div className="panel" style={{ maxWidth: 680, margin: '0 auto' }}>
          <h1>Something went wrong loading this page</h1>
          <p>ReliefLink can reload the page. Your records remain stored in the SQLite database.</p>
          <p className="muted" style={{ overflowWrap: 'anywhere' }}>
            Technical detail: {this.state.error?.message || 'Unknown page error'}
          </p>
          <div className="card-actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload this page</button>
            <a className="btn btn-ghost" href="/">Go to Home</a>
          </div>
        </div>
      </main>
    );
  }
}
