import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';

// ── Ripple ring component ─────────────────────────────────────────────────────
function RippleRing({ delay, duration, size }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0.6 }}
      animate={{ scale: size, opacity: 0 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: '2px solid rgba(139, 92, 246, 0.5)',
        top: '50%',
        left: '50%',
        marginLeft: -60,
        marginTop: -60,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation phases
  const [phase, setPhase] = useState('drop');   // 'drop' | 'spread' | 'ripple' | 'done'
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    // Phase 1: ink drop falls (0ms)
    // Phase 2: ink spreads to fill screen (600ms)
    const t1 = setTimeout(() => setPhase('spread'), 600);
    // Phase 3: ripple rings emit (900ms)
    const t2 = setTimeout(() => {
      setPhase('ripple');
      setRipples([
        { id: 1, delay: 0,    duration: 2.2, size: 8  },
        { id: 2, delay: 0.3,  duration: 2.4, size: 12 },
        { id: 3, delay: 0.6,  duration: 2.6, size: 16 },
        { id: 4, delay: 0.9,  duration: 2.8, size: 20 },
        { id: 5, delay: 1.2,  duration: 3.0, size: 24 },
      ]);
    }, 900);
    // Phase 4: show form (1800ms)
    const t3 = setTimeout(() => setPhase('done'), 1800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      setSuccess(data.message);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0d0014' }}
    >

      {/* ── Ink Drop ── */}
      <AnimatePresence>
        {phase === 'drop' && (
          <motion.div
            key="ink-drop"
            initial={{ y: -300, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'absolute',
              zIndex: 30,
              width: 40,
              height: 52,
              top: '50%',
              left: '50%',
              marginLeft: -20,
              marginTop: -26,
            }}
          >
            {/* Teardrop SVG */}
            <svg viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="52">
              <path
                d="M20 2 C20 2, 2 22, 2 34 A18 18 0 0 0 38 34 C38 22, 20 2, 20 2Z"
                fill="url(#inkGrad)"
              />
              <defs>
                <radialGradient id="inkGrad" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </radialGradient>
              </defs>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ink Splash on Impact ── */}
      <AnimatePresence>
        {(phase === 'spread' || phase === 'ripple' || phase === 'done') && (
          <motion.div
            key="splash"
            initial={{ scale: 0, borderRadius: '50%' }}
            animate={{ scale: 40, borderRadius: '50%' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              zIndex: 20,
              width: 80,
              height: 80,
              top: '50%',
              left: '50%',
              marginLeft: -40,
              marginTop: -40,
              background: 'radial-gradient(circle at 38% 35%, #7c3aed, #4c1d95 55%, #2e1065)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Ripple Rings ── */}
      {(phase === 'ripple' || phase === 'done') &&
        ripples.map(r => (
          <div key={r.id} style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
            <RippleRing delay={r.delay} duration={r.duration} size={r.size} />
          </div>
        ))
      }

      {/* ── Settled Background with ink texture ── */}
      <AnimatePresence>
        {(phase === 'ripple' || phase === 'done') && (
          <motion.div
            key="bg-settled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              background: 'radial-gradient(ellipse at 50% 45%, #5b21b6 0%, #3b0764 40%, #1a0030 100%)',
              pointerEvents: 'none',
            }}
          >
            {/* Ink swirl overlays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                top: '-20%',
                left: '-20%',
                width: '70%',
                height: '70%',
                borderRadius: '40% 60% 55% 45%',
                background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
              }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: '-15%',
                right: '-10%',
                width: '60%',
                height: '60%',
                borderRadius: '55% 45% 40% 60%',
                background: 'radial-gradient(circle, rgba(196,181,253,0.07) 0%, transparent 70%)',
              }}
            />
            {/* Floating ink particle dots */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -18, 0],
                  opacity: [0.15, 0.35, 0.15],
                }}
                transition={{
                  duration: 3 + i * 0.4,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  width: 4 + (i % 3) * 3,
                  height: 4 + (i % 3) * 3,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(196,181,253,0.4)',
                  left: `${10 + i * 11}%`,
                  top: `${15 + (i % 4) * 18}%`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form Card ── */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 36, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative', zIndex: 40, width: '100%', maxWidth: 420 }}
            className="mx-4"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(196,181,253,0.25)',
                borderRadius: 24,
                padding: '44px 36px',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'rgba(167,139,250,0.2)',
                    border: '1px solid rgba(167,139,250,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="26" height="26" fill="none" stroke="#c4b5fd" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </motion.div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Forgot Password?
                </h2>
                <p style={{ color: 'rgba(196,181,253,0.7)', fontSize: 14, marginTop: 8 }}>
                  No worries, we'll send you reset instructions
                </p>
              </div>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 20,
                    }}
                  >
                    <p style={{ color: '#86efac', fontSize: 13, fontWeight: 600, margin: 0 }}>
                      ✅ {success}
                    </p>
                    <p style={{ color: 'rgba(134,239,172,0.65)', fontSize: 12, margin: '4px 0 0' }}>
                      Check your inbox and spam folder
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 20,
                    }}
                  >
                    <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>❌ {error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <label
                    htmlFor="email"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'rgba(196,181,253,0.8)',
                      marginBottom: 8,
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    required
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(196,181,253,0.25)',
                      borderRadius: 12,
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                    onFocus={e => {
                      e.target.style.background = 'rgba(167,139,250,0.15)';
                      e.target.style.borderColor = 'rgba(167,139,250,0.55)';
                    }}
                    onBlur={e => {
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                      e.target.style.borderColor = 'rgba(196,181,253,0.25)';
                    }}
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: 'rgba(167,139,250,0.9)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    border: 'none',
                    borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4,
                    boxShadow: '0 4px 24px rgba(139,92,246,0.4)',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      style={{
                        width: 20,
                        height: 20,
                        border: '2.5px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    'Send Reset Link'
                  )}
                </motion.button>
              </form>

              {/* Back to login */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
                style={{ marginTop: 28 }}
              >
                <Link
                  to="/login"
                  style={{
                    color: 'rgba(196,181,253,0.7)',
                    fontSize: 13,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.7)')}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Login
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}