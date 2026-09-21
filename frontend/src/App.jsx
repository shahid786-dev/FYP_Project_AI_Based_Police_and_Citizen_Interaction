import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import LandingPage           from './pages/LandingPage';
import LoginPage             from './pages/LoginPage';
import RegistrationPage      from './pages/RegistrationPage';
import ForgotPasswordPage    from './pages/ForgotPasswordPage';
import CitizenDashboard      from './pages/CitizenDashboard';
import StaffDashboard        from './pages/StaffDashboard';
import AuthorityDashboard    from './pages/AuthorityDashboard';
import AdminDashboard        from './pages/AdminDashboard';
import VerificationRequestPage from './pages/VerificationRequestPage';
import FaceVerificationPage  from './pages/FaceVerificationPage';
import PaymentPage           from './pages/PaymentPage';
import TrackApplicationPage  from './pages/TrackApplicationPage';
import DigitalCertificatePage from './pages/DigitalCertificatePage';
import BlockchainExplorer    from './pages/BlockchainExplorer';
import NotificationsPage     from './pages/NotificationsPage';
import EmergencySOSPage      from './pages/EmergencySOSPage';
import ReportCrimePage       from './pages/ReportCrimePage';
import WomenSafetyPage       from './pages/WomenSafetyPage';
import AccidentAssistancePage from './pages/AccidentAssistancePage';
import AboutUsPage           from './pages/AboutUsPage';
import { TermsPage, PrivacyPage } from './pages/LegalPages';
import CriminalRecordsPage  from './pages/CriminalRecordsPage';
import AIChatbot             from './components/AIChatbot';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

// Redirect police users to the correct portal based on role
function PoliceRedirect() {
  const { role } = useSelector(s => s.auth);
  if (role === 'POLICE_AUTHORITY') return <Navigate to="/authority/dashboard" replace />;
  if (role === 'POLICE_STAFF')     return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage roleType="citizen" />} />
        <Route path="/login/admin" element={<LoginPage roleType="admin" />} />
        <Route path="/login/staff" element={<LoginPage roleType="staff" />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/emergency-sos" element={<EmergencySOSPage />} />
        <Route path="/report-crime" element={<ReportCrimePage />} />
        <Route path="/women-safety" element={<WomenSafetyPage />} />
        <Route path="/accident-assistance" element={<AccidentAssistancePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/track"    element={<TrackApplicationPage />} />
        <Route path="/criminal-records" element={<CriminalRecordsPage />} />
        <Route path="/blockchain" element={<BlockchainExplorer />} />
        <Route path="/verify/certificate/:certNumber" element={<DigitalCertificatePage />} />

        {/* ── Citizen ── */}
        <Route path="/citizen/dashboard" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><CitizenDashboard /></ProtectedRoute>
        } />
        <Route path="/citizen/request" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><VerificationRequestPage /></ProtectedRoute>
        } />
        <Route path="/citizen/face-verify" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><FaceVerificationPage /></ProtectedRoute>
        } />
        <Route path="/citizen/payment" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><PaymentPage /></ProtectedRoute>
        } />
        <Route path="/citizen/certificate" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><DigitalCertificatePage /></ProtectedRoute>
        } />
        <Route path="/citizen/notifications" element={
          <ProtectedRoute allowedRoles={['CITIZEN']}><NotificationsPage /></ProtectedRoute>
        } />

        {/* ── Police Staff ── */}
        <Route path="/staff/dashboard" element={
          <ProtectedRoute allowedRoles={['POLICE_STAFF']}><StaffDashboard /></ProtectedRoute>
        } />

        {/* ── Police Authority ── */}
        <Route path="/authority/dashboard" element={
          <ProtectedRoute allowedRoles={['POLICE_AUTHORITY']}><AuthorityDashboard /></ProtectedRoute>
        } />

        {/* ── Legacy police route → smart redirect ── */}
        <Route path="/police/dashboard" element={
          <ProtectedRoute allowedRoles={['POLICE_STAFF', 'POLICE_AUTHORITY']}>
            <PoliceRedirect />
          </ProtectedRoute>
        } />

        {/* ── Super Admin ── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AIChatbot />
    </BrowserRouter>
  );
}
