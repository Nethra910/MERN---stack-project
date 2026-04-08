import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ChatProvider } from './context/ChatContext';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './routes/ProtectedRoute';

const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const MainLayout = lazy(() => import('./layouts/MainLayout'));
const MessagesLayout = lazy(() => import('./layouts/MessagesLayout'));

const DashboardHomePage = lazy(() => import('./pages/DashboardHomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const CallsPage = lazy(() => import('./pages/CallsPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MessagesIndex = lazy(() => import('./pages/MessagesIndex'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

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

                {/* ✅ Protected app routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<DashboardHomePage />} />
                    <Route path="/messages" element={<MessagesLayout />}>
                      <Route index element={<MessagesIndex />} />
                      <Route path="chat/:chatId" element={<ChatPage />} />
                    </Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/contacts" element={<ContactsPage />} />
                    <Route path="/calls" element={<CallsPage />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>

                {/* ✅ 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </ChatProvider>
      </ProfileProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}