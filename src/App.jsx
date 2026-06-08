import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import CitizenDashboard from './pages/CitizenDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VerificationRequestPage from './pages/VerificationRequestPage';
import AIFaceRecognitionPage from './pages/AIFaceRecognitionPage';
import PaymentPage from './pages/PaymentPage';
import TrackApplicationPage from './pages/TrackApplicationPage';
import DigitalCertificatePage from './pages/DigitalCertificatePage';
import AIChatbot from './components/AIChatbot';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
        <Route path="/citizen/request" element={<VerificationRequestPage />} />
        <Route path="/citizen/face-verify" element={<AIFaceRecognitionPage />} />
        <Route path="/citizen/payment" element={<PaymentPage />} />
        <Route path="/citizen/certificate" element={<DigitalCertificatePage />} />
        <Route path="/track" element={<TrackApplicationPage />} />
        <Route path="/police/dashboard" element={<PoliceDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIChatbot />
    </BrowserRouter>
  );
}
