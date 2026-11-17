import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Demo accounts exist in the real SQLite database; buttons use the actual login API.
  async function demo(email) {
    setError(''); setBusy(true);
    try { await login(email, 'ReliefDemo#2026!'); window.location.replace(loc.state?.from || '/dashboard'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form.email, form.password);
      window.location.replace(loc.state?.from || '/dashboard');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <h1>When every minute counts, coordinate in one place.</h1>
        <p>Report incidents, check shelter space and match volunteers to the work that needs doing.</p>
      </aside>
      <form className="auth-card" onSubmit={submit}>
        <h2>Sign in</h2>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="panel" style={{ marginTop: '1rem' }}>
          <strong>Quick login (sample accounts):</strong>
          <div className="card-actions" style={{ marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo('admin@demo.lk')}>Admin</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo('volunteer@demo.lk')}>Volunteer</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo('citizen@demo.lk')}>Citizen</button>
          </div>
        </div>
        <p className="muted">No account yet? <Link to="/register">Create one</Link></p>
      </form>
    </div>
  );
}
