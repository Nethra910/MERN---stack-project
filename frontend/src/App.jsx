import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

// ✅ Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// ✅ Public route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  return (
    // ✅ FIX: BrowserRouter must wrap ChatProvider so that context consumers
    // (and ChatProvider itself) have access to router context (useNavigate, etc.)
    <BrowserRouter>
      <ThemeProvider>
        <ProfileProvider>
          <ChatProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                className: '',
                style: {
                  borderRadius: '10px',
                  padding: '16px',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* ✅ Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ✅ Public routes - redirect to dashboard if logged in */}
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* ✅ Email verification and password reset */}
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* ✅ Protected Dashboard with all features */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* ✅ 404 - catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ChatProvider>
      </ProfileProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}