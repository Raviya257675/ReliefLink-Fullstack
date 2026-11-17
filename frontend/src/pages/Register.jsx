import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', phone: '', skills: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form);
      window.location.replace('/dashboard');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <h1>Join the response.</h1>
        <p>Citizens can report incidents and find shelter. Volunteers can also claim relief tasks and track their work.</p>
      </aside>
      <form className="auth-card" onSubmit={submit}>
        <h2>Create your account</h2>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label>Full name<input required minLength={2} value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <small className="muted">At least 8 characters, with a letter and a number.</small></label>
        <label>I am joining as
          <select value={form.role} onChange={set('role')}>
            <option value="citizen">Citizen – report incidents, find shelters</option>
            <option value="volunteer">Volunteer – also take relief tasks</option>
          </select>
        </label>
        <label>Phone (optional)<input value={form.phone} onChange={set('phone')} /></label>
        {form.role === 'volunteer' && (
          <label>Skills<input placeholder="first aid, driving, logistics" value={form.skills} onChange={set('skills')} /></label>
        )}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
