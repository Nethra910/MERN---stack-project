import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';

// ── Animated Envelope SVG ─────────────────────────────────────────────────────
function Envelope({ phase }) {
  const flapOpen = phase === 'open' || phase === 'expand' || phase === 'done';

  return (
    <motion.svg
      width="120"
      height="90"
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={
        phase === 'land'
          ? { y: [0, -8, 4, -4, 0], rotate: [-3, 3, -2, 2, 0] }
          : phase === 'expand'
          ? { scale: [1, 1.3, 0], opacity: [1, 1, 0] }
          : { y: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={
        phase === 'land'
          ? { duration: 0.5, ease: 'easeOut' }
          : phase === 'expand'
          ? { duration: 0.4, ease: 'easeIn' }
          : { duration: 0.3 }
      }
    >
      <rect x="4" y="24" width="112" height="62" rx="8" fill="url(#envBodyGrad)" />
      <path d="M4 72 L60 48 L116 72" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
      <path d="M4 24 L60 54 L116 24" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
      <motion.g
        style={{ originX: '60px', originY: '24px' }}
        animate={{ rotateX: flapOpen ? -160 : 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
      >
        <path
          d="M4 24 Q60 2 116 24 L60 56 Z"
          fill="url(#envFlapGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
      </motion.g>
      <AnimatePresence>
        {flapOpen && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ transformOrigin: '60px 55px' }}
          >
            <circle cx="60" cy="55" r="16" fill="rgba(255,255,255,0.95)" />
            <motion.path
              d="M51 55 L57 61 L69 49"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
            />
          </motion.g>
        )}
      </AnimatePresence>
      <rect x="12" y="30" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
      <defs>
        <linearGradient id="envBodyGrad" x1="4" y1="24" x2="116" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="envFlapGrad" x1="4" y1="2" x2="116" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

function SparkParticles() {
  const sparks = [
    { x: -55, y: -30, delay: 0,    size: 5 },
    { x:  60, y: -40, delay: 0.08, size: 4 },
    { x: -70, y:  10, delay: 0.04, size: 3 },
    { x:  75, y:  15, delay: 0.1,  size: 5 },
    { x: -30, y:  55, delay: 0.06, size: 4 },
    { x:  35, y:  60, delay: 0.02, size: 3 },
    { x:  -5, y: -60, delay: 0.09, size: 4 },
    { x:  10, y: -65, delay: 0.03, size: 3 },
  ];

  return (
    <>
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.x * 1.8, y: s.y * 1.8, opacity: 0, scale: 0 }}
          transition={{ delay: s.delay, duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            backgroundColor: '#6ee7b7',
            boxShadow: '0 0 6px rgba(110,231,183,0.8)',
            top: '50%',
            left: '50%',
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
          }}
        />
      ))}
    </>
  );
}

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  const [phase, setPhase] = useState('fly');
  const [showSparks, setShowSparks] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('land'),   700);
    const t2 = setTimeout(() => setPhase('open'),   1300);
    const t3 = setTimeout(() => {
      setPhase('spark');
      setShowSparks(true);
    }, 2000);
    const t4 = setTimeout(() => setPhase('expand'), 2400);
    const t5 = setTimeout(() => setPhase('done'),   2900);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }
      try {
        const { data } = await API.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(data.message);
        // ✅ FIX: redirect in 6s to match the UI text below ("6 seconds")
        setTimeout(() => navigate('/login'), 6000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Email verification failed. The link may be expired.');
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#021a0e' }}
    >
      <AnimatePresence>
        {phase !== 'done' && (
          <motion.div
            key="envelope-stage"
            initial={{ x: '60vw', y: '-60vh', rotate: -25, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            style={{
              position: 'absolute',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Envelope phase={phase} />
              {showSparks && <SparkParticles />}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'land' || phase === 'open' ? 1 : 0 }}
              style={{ color: 'rgba(110,231,183,0.7)', fontSize: 14 }}
            >
              Verifying your email...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 36, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative', zIndex: 40, width: '100%', maxWidth: 420 }}
            className="mx-4 text-center"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(110,231,183,0.25)',
                borderRadius: 24,
                padding: '44px 36px',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 68, height: 68, borderRadius: '50%',
                      background: 'rgba(52,211,153,0.2)',
                      border: '1px solid rgba(52,211,153,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 24px',
                    }}
                  >
                    <motion.svg
                      width="32" height="32" viewBox="0 0 24 24" fill="none"
                      stroke="#34d399" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                    >
                      <motion.path
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                      />
                    </motion.svg>
                  </motion.div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                    Email Verified! 🎉
                  </h2>
                  <p style={{ color: 'rgba(110,231,183,0.75)', fontSize: 14, marginBottom: 28 }}>
                    {message}
                  </p>
                  {/* ✅ FIX: Text now matches the actual 6-second redirect timeout */}
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>
                    Redirecting to login in 6 seconds...
                  </p>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to="/login"
                      style={{
                        display: 'inline-block',
                        padding: '12px 32px',
                        background: 'rgba(52,211,153,0.9)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        borderRadius: 12,
                        textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(5,150,105,0.45)',
                      }}
                    >
                      Go to Login
                    </Link>
                  </motion.div>
                </motion.div>
              )}

              {status === 'verifying' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      style={{
                        width: 52, height: 52,
                        border: '3px solid rgba(52,211,153,0.25)',
                        borderTopColor: '#34d399',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                    Verifying Email
                  </h2>
                  <p style={{ color: 'rgba(110,231,183,0.65)', fontSize: 14 }}>
                    Please wait a moment...
                  </p>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <div
                    style={{
                      width: 68, height: 68, borderRadius: '50%',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 24px',
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                      stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                    Verification Failed
                  </h2>
                  <p style={{ color: 'rgba(248,113,113,0.8)', fontSize: 14, marginBottom: 28 }}>
                    {message}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link
                        to="/register"
                        style={{
                          display: 'block', padding: '12px',
                          background: 'rgba(52,211,153,0.85)', color: '#fff',
                          fontWeight: 700, fontSize: 15, borderRadius: 12,
                          textDecoration: 'none',
                          boxShadow: '0 4px 20px rgba(5,150,105,0.35)',
                        }}
                      >
                        Register Again
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link
                        to="/login"
                        style={{
                          display: 'block', padding: '12px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 600, fontSize: 15, borderRadius: 12,
                          textDecoration: 'none',
                        }}
                      >
                        Back to Login
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}