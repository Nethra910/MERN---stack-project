import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import API from '../api/axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ballDone, setBallDone] = useState(false);
  const navigate = useNavigate();
  const ballControls = useAnimation();

  useEffect(() => {
    const runBallAnimation = async () => {
      // Phase 1: Drop in from top
      await ballControls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeOut' },
      });

      // Phase 2: Bounce 4 times, each bounce slightly smaller
      const bounces = [
        { y: -180, duration: 0.38 },
        { y: -110, duration: 0.32 },
        { y: -60,  duration: 0.26 },
        { y: -25,  duration: 0.20 },
      ];

      for (const b of bounces) {
        await ballControls.start({
          y: b.y,
          scaleX: 0.9,
          scaleY: 1.1,
          transition: { duration: b.duration, ease: 'easeOut' },
        });
        await ballControls.start({
          y: 0,
          scaleX: 1.15,
          scaleY: 0.85,
          transition: { duration: b.duration * 0.8, ease: 'easeIn' },
        });
        await ballControls.start({
          scaleX: 1,
          scaleY: 1,
          transition: { duration: 0.08 },
        });
      }

      // Phase 3: Grow into full background
      await ballControls.start({
        scale: 60,
        borderRadius: '16px',
        transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
      });

      setBallDone(true);
    };

    runBallAnimation();
  }, [ballControls]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', form);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-950 overflow-hidden">

      {/* ── Bouncing Ball ── */}
      <AnimatePresence>
        {!ballDone && (
          <motion.div
            animate={ballControls}
            initial={{ y: -400, opacity: 0, scale: 1, borderRadius: '9999px' }}
            style={{
              position: 'absolute',
              width: 64,
              height: 64,
              backgroundColor: '#ef4444',
              borderRadius: '9999px',
              zIndex: 20,
              top: '50%',
              left: '50%',
              translateX: '-50%',
              translateY: '-50%',
              transformOrigin: 'center bottom',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Red Card Background (visible after ball expands) ── */}
      <AnimatePresence>
        {ballDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: '#ef4444', zIndex: 10 }}
          >
            {/* Subtle radial glow for depth */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Login Card ── */}
      <AnimatePresence>
        {ballDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative', zIndex: 30, width: '100%', maxWidth: 420 }}
            className="mx-4"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 24,
                padding: '40px 36px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.28)',
              }}
            >
              {/* Logo dot */}
              <div className="flex justify-center mb-6">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Welcome back
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 6 }}>
                  Sign in to your account
                </p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.background = 'rgba(255,255,255,0.22)')}
                  onBlur={e => (e.target.style.background = 'rgba(255,255,255,0.15)')}
                />

                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.background = 'rgba(255,255,255,0.22)')}
                  onBlur={e => (e.target.style.background = 'rgba(255,255,255,0.15)')}
                />

                <div style={{ textAlign: 'right', marginTop: -6 }}>
                  <Link
                    to="/forgot-password"
                    style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,1)' }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: 15,
                    border: 'none',
                    borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 4,
                    transition: 'background-color 0.2s',
                  }}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      style={{
                        width: 20,
                        height: 20,
                        border: '2.5px solid #ef4444',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    'Sign in'
                  )}
                </motion.button>
              </form>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 24 }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
                  Sign up
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}