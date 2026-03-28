import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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
    <BrowserRouter>
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

        {/* ✅ Email verification and password reset don't need PublicRoute */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ✅ Protected routes - require authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                  <h1 className="text-3xl font-bold text-gray-800 mb-4">🎉 Welcome to Dashboard!</h1>
                  <p className="text-gray-600 mb-6">You are successfully logged in.</p>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = '/login';
                    }}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        {/* ✅ 404 - catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}