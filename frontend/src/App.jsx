import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Ticker from './components/Ticker.jsx';
import Footer from './components/Footer.jsx';
import SosButton from './components/SosButton.jsx';
import LiveAlerts from './components/LiveAlerts.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import Shelters from './pages/Shelters.jsx';
import Tasks from './pages/Tasks.jsx';
import Analytics from './pages/Analytics.jsx';
import Safety from './pages/Safety.jsx';
import Contacts from './pages/Contacts.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Navbar />
      <Ticker />
      <LiveAlerts />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/shelters" element={<Shelters />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/tasks" element={<ProtectedRoute roles={['admin', 'volunteer']}><Tasks /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <SosButton />
    </>
  );
}
