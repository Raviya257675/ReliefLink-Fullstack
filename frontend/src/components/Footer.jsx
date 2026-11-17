import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div><strong style={{ color: '#fff' }}>ReliefLink</strong><br />Real-time relief coordination — academic demonstration only.</div>
        <div>
          <Link to="/dashboard">Dashboard</Link><Link to="/safety">Safety guides</Link><Link to="/contacts">Emergency contacts</Link><Link to="/analytics">Analytics</Link>
          <p style={{ marginTop: '.6rem' }}>Demo data is fictional. Reports do not contact emergency services. In a life-threatening emergency call 117 or 1990.</p>
        </div>
      </div>
    </footer>
  );
}
