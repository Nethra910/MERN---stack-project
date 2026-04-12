import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ChatProvider }    from './context/ChatContext';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider }   from './context/ThemeContext';
import { Toaster }         from 'react-hot-toast';
import ProtectedRoute      from './routes/ProtectedRoute';
import { SocketProvider }  from './context/SocketContext';
import { CallProvider }    from './context/CallContext';          // ✅ NEW
import IncomingCallModal   from './components/calls/IncomingCallModal'; // ✅ NEW

const Register      = lazy(() => import('./pages/Register'));
const Login         = lazy(() => import('./pages/Login'));
const VerifyEmail   = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));

const MainLayout     = lazy(() => import('./layouts/MainLayout'));
const MessagesLayout = lazy(() => import('./layouts/MessagesLayout'));

const DashboardHomePage = lazy(() => import('./pages/DashboardHomePage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const ContactsPage      = lazy(() => import('./pages/ContactsPage'));
const CallsPage         = lazy(() => import('./pages/CallsPage'));
const FilesPage         = lazy(() => import('./pages/FilesPage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const MessagesIndex     = lazy(() => import('./pages/MessagesIndex'));
const ChatPage          = lazy(() => import('./pages/ChatPage'));
const NotFound          = lazy(() => import('./pages/NotFound'));
const FriendsPage       = lazy(() => import('./pages/FriendsPage'));
const CallPage          = lazy(() => import('./components/calls/CallPage')); // ✅ NEW

// ✅ Public route — redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <BrowserRouter>
      <ThemeProvider>
        <ProfileProvider>
          <ChatProvider>
            {/* SocketProvider must wrap CallProvider */}
            <SocketProvider user={user}>
              {/* ✅ CallProvider sits inside SocketProvider so it can access the socket */}
              <CallProvider>

                {/* ✅ Global incoming call modal — renders on EVERY page */}
                <IncomingCallModal />

                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: { borderRadius: '10px', padding: '16px' },
                    success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                    error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                  }}
                />

                <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* ── Public routes ───────────────────────────────────────── */}
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                    <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />

                    <Route path="/verify-email/:token"    element={<VerifyEmail />} />
                    <Route path="/forgot-password"        element={<ForgotPassword />} />
                    <Route path="/reset-password/:token"  element={<ResetPassword />} />

                    {/* ── Protected routes ────────────────────────────────────── */}
                    <Route element={<ProtectedRoute />}>
                      {/* ✅ Active call page — full-screen, OUTSIDE MainLayout so
                          it overlays everything (no sidebar, no nav) */}
                      <Route path="/calls/active" element={<CallPage />} />

                      <Route element={<MainLayout />}>
                        <Route path="/dashboard" element={<DashboardHomePage />} />
                        <Route path="/messages"  element={<MessagesLayout />}>
                          <Route index                    element={<MessagesIndex />} />
                          <Route path="chat/:chatId"      element={<ChatPage />} />
                        </Route>
                        <Route path="/profile"   element={<ProfilePage />} />
                        <Route path="/friends"   element={<FriendsPage />} />
                        <Route path="/contacts"  element={<ContactsPage />} />
                        <Route path="/calls"     element={<CallsPage />} />
                        <Route path="/files"     element={<FilesPage />} />
                        <Route path="/settings"  element={<SettingsPage />} />
                      </Route>
                    </Route>

                    {/* ── 404 ─────────────────────────────────────────────────── */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>

              </CallProvider>
            </SocketProvider>
          </ChatProvider>
        </ProfileProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}