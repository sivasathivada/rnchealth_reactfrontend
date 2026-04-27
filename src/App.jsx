import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationSocketProvider } from './context/NotificationSocketContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { WebRTCProvider } from './context/WebRTCContext';
import NotificationCenter from './components/NotificationCenter';

import CallRoom from './pages/CallRoom';

import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import PatientDashboard from './pages/patient/PatientDashboard';
import FindConsultants from './pages/patient/FindConsultants';
import PatientProfile from './pages/patient/PatientProfile';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientCalls from './pages/patient/PatientCalls';
import MedicalHistory from './pages/patient/MedicalHistory';

import ConsultantDashboard from './pages/consultant/ConsultantDashboard';
import ConsultantAppointments from './pages/consultant/ConsultantAppointments';
import ConsultantProfile from './pages/consultant/ConsultantProfile';
import ConsultantCalls from './pages/consultant/ConsultantCalls';
import ConsultantPrescriptions from './pages/consultant/ConsultantPrescriptions';
import ConsultantAvailability from './pages/consultant/ConsultantAvailability';

import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <NotificationSocketProvider>
          <WebRTCProvider>
            <Router>
              <NotificationCenter />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

                {/* Patient Routes */}
                <Route path="/patient" element={
                  <ProtectedRoute allowedRoles={['patient']}><Layout /></ProtectedRoute>
                }>
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="find-consultants" element={<FindConsultants />} />
                  <Route path="profile" element={<PatientProfile />} />
                  <Route path="appointments" element={<PatientAppointments />} />
                  <Route path="calls" element={<PatientCalls />} />
                  <Route path="medical-history" element={<MedicalHistory />} />
                </Route>

                {/* Call Room Route (Accessible to both patient and consultant, using its own layout) */}
                <Route path="/call/:sessionId" element={
                  <ProtectedRoute allowedRoles={['patient', 'consultant']}><CallRoom /></ProtectedRoute>
                } />

                {/* Consultant Routes */}
                <Route path="/consultant" element={
                  <ProtectedRoute allowedRoles={['consultant']}><Layout /></ProtectedRoute>
                }>
                  <Route path="dashboard" element={<ConsultantDashboard />} />
                  <Route path="appointments" element={<ConsultantAppointments />} />
                  <Route path="profile" element={<ConsultantProfile />} />
                  <Route path="calls" element={<ConsultantCalls />} />
                  <Route path="prescriptions" element={<ConsultantPrescriptions />} />
                  <Route path="availability" element={<ConsultantAvailability />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>
                }>
                  <Route path="dashboard" element={<AdminDashboard />} />
                </Route>
              </Routes>
            </Router>
          </WebRTCProvider>
        </NotificationSocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
