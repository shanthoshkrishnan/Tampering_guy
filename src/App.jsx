import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchFilterProvider } from './context/SearchFilterContext';
import LoginPage from './components/LoginPage';
import Home from './components/Home';
import DeviceInspection from './components/DeviceInspection';
import Profile from './components/Profile';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';
import RegisterUser from './components/RegisterUser';
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import DeviceRegistrationPage from './components/DeviceRegistrationPage';
import RegisterByRole from './components/RegisterByRole';
import VerifyEmailPage from './components/VerifyEmailPage';


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchFilterProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterUser />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/register-device" element={<DeviceRegistrationPage />} />
              <Route
  path="/register-role"
  element={
    <ProtectedRoute
      allowedRoles={[
        'MANUFACTURER',
        'LM_OFFICER',
        'DISTRICT_SUPER_ADMIN',
        'ADMIN',
      ]}
    >
      <RegisterByRole />
    </ProtectedRoute>
  }
/>

              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/" element={<LoginPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/device-inspection" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <DeviceInspection />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <InstallPrompt />
          </BrowserRouter>
        </SearchFilterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
