import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';

// ── Shatter particle ──────────────────────────────────────────────────────────
function ShatterParticle({ x, y, rotate, scale, delay }) {
  return (
    <motion.div
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y,
        rotate,
        scale,
        opacity: 0,
      }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #fb923c, #f97316)',
        top: '50%',
        left: '50%',
        marginLeft: -7,
        marginTop: -7,
        boxShadow: '0 0 8px rgba(251,146,60,0.6)',
      }}
    />
  );
}

// Particle configs — scatter in all directions
const PARTICLES = [
  { x: -180, y: -160, rotate: -145, scale: 0.3, delay: 0 },
  { x:  160, y: -180, rotate:  120, scale: 0.4, delay: 0.04 },
  { x: -220, y:   40, rotate: -200, scale: 0.2, delay: 0.02 },
  { x:  200, y:   60, rotate:  170, scale: 0.35, delay: 0.06 },
  { x:  -80, y:  200, rotate: -110, scale: 0.45, delay: 0.03 },
  { x:  100, y:  210, rotate:  130, scale: 0.25, delay: 0.07 },
  { x: -260, y: -80,  rotate: -180, scale: 0.3,  delay: 0.01 },
  { x:  250, y: -90,  rotate:  160, scale: 0.4,  delay: 0.05 },
  { x:  -40, y: -230, rotate:  -90, scale: 0.35, delay: 0.02 },
  { x:   60, y: -220, rotate:  100, scale: 0.2,  delay: 0.04 },
  { x: -140, y:  180, rotate: -130, scale: 0.45, delay: 0.06 },
  { x:  170, y:  160, rotate:  150, scale: 0.3,  delay: 0.03 },
  { x: -300, y:   10, rotate: -220, scale: 0.2,  delay: 0.08 },
  { x:  290, y:  -20, rotate:  200, scale: 0.25, delay: 0.01 },
  { x:   10, y:  260, rotate:   80, scale: 0.4,  delay: 0.05 },
  { x: -180, y: -240, rotate: -160, scale: 0.3,  delay: 0.07 },
];

// ── Animated lock SVG ─────────────────────────────────────────────────────────
function AnimatedLock({ phase }) {
  // shackle moves up when unlocking
  const shackleY = phase === 'unlock' || phase === 'shatter' ? -14 : 0;
  const shackleRotate = phase === 'unlock' || phase === 'shatter' ? -30 : 0;

  return (
    <motion.svg
      width="72"
      height="84"
      viewBox="0 0 72 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={
        phase === 'shake'
          ? { x: [-6, 6, -5, 5, -3, 3, 0], rotate: [-4, 4, -3, 3, -2, 2, 0] }
          : phase === 'shatter'
          ? { scale: [1, 1.25, 0], opacity: [1, 1, 0] }
          : { x: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={
        phase === 'shake'
          ? { duration: 0.55, ease: 'easeInOut' }
          : phase === 'shatter'
          ? { duration: 0.35, ease: 'easeIn' }
          : { duration: 0.3 }
      }
    >
      {/* Shackle (top arc) */}
      <motion.g
        animate={{ y: shackleY, rotate: shackleRotate }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ originX: '36px', originY: '32px' }}
      >
        <path
          d="M18 34V24C18 13.5 54 13.5 54 24V34"
          stroke="url(#lockGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>

      {/* Lock body */}
      <rect x="8" y="32" width="56" height="44" rx="10" fill="url(#lockBodyGrad)" />

      {/* Keyhole */}
      <circle cx="36" cy="52" r="7" fill="rgba(0,0,0,0.35)" />
      <rect x="33" y="52" width="6" height="12" rx="3" fill="rgba(0,0,0,0.35)" />

      {/* Shine */}
      <rect x="14" y="38" width="20" height="4" rx="2" fill="rgba(255,255,255,0.18)" />

      <defs>
        <linearGradient id="lockGrad" x1="18" y1="24" x2="54" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="lockBodyGrad" x1="8" y1="32" x2="64" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // phases: 'idle' → 'shake' → 'unlock' → 'shatter' → 'expand' → 'done'
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shake'),   400);
    const t2 = setTimeout(() => setPhase('unlock'),  1050);
    const t3 = setTimeout(() => setPhase('shatter'), 1700);
    const t4 = setTimeout(() => setPhase('expand'),  1950);
    const t5 = setTimeout(() => setPhase('done'),    2700);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post(`/auth/reset-password/${token}`, {
        password: form.password,
      });
      setSuccess(data.message);
      setForm({ password: '', confirmPassword: '' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#150800' }}
    >

      {/* ── Stage 1: Lock animation (idle → shake → unlock → shatter) ── */}
      <AnimatePresence>
        {phase !== 'done' && (
          <motion.div
            key="lock-stage"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            {/* Glow ring behind lock */}
            <motion.div
              animate={
                phase === 'unlock'
                  ? { scale: [1, 1.4, 1.2], opacity: [0.4, 0.9, 0.5] }
                  : phase === 'shatter'
                  ? { scale: 2.5, opacity: 0 }
                  : { scale: 1, opacity: 0.3 }
              }
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(251,146,60,0.5) 0%, transparent 70%)',
                filter: 'blur(12px)',
              }}
            />

            <AnimatedLock phase={phase} />

            {/* Shatter particles */}
            <AnimatePresence>
              {(phase === 'shatter' || phase === 'expand') &&
                PARTICLES.map((p, i) => (
                  <ShatterParticle key={i} {...p} />
                ))
              }
            </AnimatePresence>

            {/* Label */}
            <motion.p
              animate={
                phase === 'shatter' || phase === 'expand'
                  ? { opacity: 0 }
                  : { opacity: 1 }
              }
              style={{
                color: 'rgba(253,186,116,0.8)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              {phase === 'idle' && 'Verifying link...'}
              {phase === 'shake' && 'Unlocking...'}
              {phase === 'unlock' && 'Access granted!'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage 2: Amber background expands from center ── */}
      <AnimatePresence>
        {(phase === 'expand' || phase === 'done') && (
          <motion.div
            key="bg-expand"
            initial={{ scale: 0, borderRadius: '50%' }}
            animate={{ scale: 35, borderRadius: '10%' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              zIndex: 20,
              width: 100,
              height: 100,
              top: '50%',
              left: '50%',
              marginLeft: -50,
              marginTop: -50,
              background: 'radial-gradient(circle at 38% 35%, #f97316, #c2410c 55%, #7c2d12)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Settled background with ember particles ── */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            key="bg-settled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 22,
              background: 'radial-gradient(ellipse at 50% 45%, #9a3412 0%, #7c2d12 40%, #1c0a00 100%)',
              pointerEvents: 'none',
            }}
          >
            {/* Radial glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 50% 40%, rgba(251,146,60,0.12) 0%, transparent 60%)',
            }} />

            {/* Floating ember dots */}
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.1, 0.5, 0.1],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 2.5 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  width: 3 + (i % 3) * 2,
                  height: 3 + (i % 3) * 2,
                  borderRadius: '50%',
                  backgroundColor: '#fdba74',
                  boxShadow: '0 0 6px rgba(251,146,60,0.8)',
                  left: `${8 + i * 9}%`,
                  top: `${20 + (i % 5) * 14}%`,
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
            style={{ position: 'relative', zIndex: 40, width: '100%', maxWidth: 430 }}
            className="mx-4"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(253,186,116,0.25)',
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
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(251,146,60,0.2)',
                    border: '1px solid rgba(251,146,60,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="26" height="26" fill="none" stroke="#fdba74" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </motion.div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Reset Password
                </h2>
                <p style={{ color: 'rgba(253,186,116,0.7)', fontSize: 14, marginTop: 8 }}>
                  Enter your new password below
                </p>
              </div>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                    }}
                  >
                    <p style={{ color: '#86efac', fontSize: 13, fontWeight: 600, margin: 0 }}>✅ {success}</p>
                    <p style={{ color: 'rgba(134,239,172,0.65)', fontSize: 12, margin: '4px 0 0' }}>
                      Redirecting to login...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                    }}
                  >
                    <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>❌ {error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { id: 'password',        label: 'New Password',     hint: 'Must be at least 6 characters' },
                  { id: 'confirmPassword', label: 'Confirm Password',  hint: null },
                ].map(({ id, label, hint }, i) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                  >
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500,
                      color: 'rgba(253,186,116,0.8)', marginBottom: 8,
                    }}>
                      {label}
                    </label>
                    <input
                      id={id} name={id} type="password" placeholder="••••••••"
                      value={form[id]} onChange={handleChange}
                      required disabled={loading}
                      style={{
                        width: '100%', padding: '13px 16px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(253,186,116,0.22)',
                        borderRadius: 12, color: '#fff', fontSize: 14,
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onFocus={e => {
                        e.target.style.background = 'rgba(251,146,60,0.15)';
                        e.target.style.borderColor = 'rgba(251,146,60,0.55)';
                      }}
                      onBlur={e => {
                        e.target.style.background = 'rgba(255,255,255,0.08)';
                        e.target.style.borderColor = 'rgba(253,186,116,0.22)';
                      }}
                    />
                    {hint && (
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>{hint}</p>
                    )}
                  </motion.div>
                ))}

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: 'rgba(251,146,60,0.9)',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                    border: 'none', borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 4,
                    boxShadow: '0 4px 24px rgba(234,88,12,0.45)',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      style={{
                        width: 20, height: 20,
                        border: '2.5px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff', borderRadius: '50%',
                      }}
                    />
                  ) : 'Reset Password'}
                </motion.button>
              </form>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center" style={{ marginTop: 28 }}
              >
                <Link
                  to="/login"
                  style={{
                    color: 'rgba(253,186,116,0.65)', fontSize: 13, textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(253,186,116,0.65)')}
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