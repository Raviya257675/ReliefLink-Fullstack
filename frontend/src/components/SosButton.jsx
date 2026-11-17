import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Floating help button, always one tap away.
export default function SosButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="sos" onClick={() => setOpen(true)} aria-label="Need urgent help">SOS</button>
      {open && (
        <Modal title="Need urgent help?" onClose={() => setOpen(false)}>
          <p className="muted">ReliefLink is an academic demonstration. Saving a report here does not dispatch emergency responders. For urgent help, call an official emergency number.</p>
          <div className="sos-actions" onClick={() => setOpen(false)}>
            <a className="btn btn-primary btn-lg" href="tel:117">Call 117 – Disaster Management Centre</a>
            <a className="btn btn-danger btn-lg" href="tel:1990">Call 1990 – Ambulance</a>
            <Link className="btn btn-ghost btn-lg" to={user ? '/incidents?new=1&sos=1' : '/login'}>{user ? 'Save an SOS report in ReliefLink (demo)' : 'Sign in to send a report'}</Link>
            <Link className="btn btn-ghost" to="/contacts">All emergency contacts</Link>
          </div>
        </Modal>
      )}
    </>
  );
}
