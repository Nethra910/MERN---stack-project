import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';

// ── SVG Blob paths (morph between these) ──────────────────────────────────────
const BLOB_PATHS = [
  "M421,309Q387,368,334,399Q281,430,218,422Q155,414,106,369Q57,324,44,255Q31,186,78,133Q125,80,192,57Q259,34,323,62Q387,90,424,155Q461,220,421,309Z",
  "M405,298Q366,346,316,385Q266,424,203,415Q140,406,95,357Q50,308,52,243Q54,178,96,128Q138,78,204,60Q270,42,330,74Q390,106,420,178Q450,250,405,298Z",
  "M440,315Q410,380,348,408Q286,436,220,425Q154,414,105,364Q56,314,50,245Q44,176,91,125Q138,74,208,57Q278,40,340,70Q402,100,436,178Q470,256,440,315Z",
  "M418,302Q379,354,323,392Q267,430,203,418Q139,406,95,354Q51,302,55,238Q59,174,103,127Q147,80,213,61Q279,42,336,73Q393,104,426,177Q459,250,418,302Z",
];

// Cycle through blob paths
function useBlobMorph() {
  const [pathIndex, setPathIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPathIndex(i => (i + 1) % BLOB_PATHS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return BLOB_PATHS[pathIndex];
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [blobDone, setBlobDone] = useState(false);
  const navigate = useNavigate();
  const blobPath = useBlobMorph();

  // Phase: blob fills screen, then form appears
  useEffect(() => {
    const timer = setTimeout(() => setBlobDone(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (form.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      setLoading(false);
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.post('/auth/register', form);
      setSuccess(data.message);
      setForm({ name: '', email: '', password: '' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0a0f1e' }}
    >

      {/* ── Phase 1: Blob grows from corner and fills screen ── */}
      <AnimatePresence>
        {!blobDone && (
          <motion.div
            key="blob-intro"
            initial={{ scale: 0, x: '-50vw', y: '50vh', opacity: 1 }}
            animate={{ scale: 22, x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'absolute',
              zIndex: 20,
              width: 200,
              height: 200,
              left: '50%',
              top: '50%',
              marginLeft: -100,
              marginTop: -100,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #3b82f6, #1d4ed8)',
              filter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Phase 2: Settled blue background with morphing blob accent ── */}
      <AnimatePresence>
        {blobDone && (
          <motion.div
            key="bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
              zIndex: 5,
            }}
          >
            {/* Morphing SVG blob decoration — top left */}
            <motion.svg
              viewBox="0 0 500 500"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: 'absolute',
                top: -80,
                left: -80,
                width: 420,
                height: 420,
                opacity: 0.18,
              }}
            >
              <motion.path
                d={blobPath}
                fill="#93c5fd"
                animate={{ d: blobPath }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </motion.svg>

            {/* Morphing SVG blob decoration — bottom right */}
            <motion.svg
              viewBox="0 0 500 500"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: 'absolute',
                bottom: -100,
                right: -80,
                width: 480,
                height: 480,
                opacity: 0.14,
              }}
            >
              <motion.path
                d={blobPath}
                fill="#bfdbfe"
                animate={{ d: blobPath }}
                transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.4 }}
              />
            </motion.svg>

            {/* Radial light glow center */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at 50% 40%, rgba(147,197,253,0.15) 0%, transparent 65%)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form Card ── */}
      <AnimatePresence>
        {blobDone && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={{ position: 'relative', zIndex: 30, width: '100%', maxWidth: 440 }}
            className="mx-4"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 24,
                padding: '40px 36px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
              }}
            >
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                      fill="#1d4ed8" />
                    <circle cx="12" cy="12" r="10" stroke="#1d4ed8" strokeWidth="1.5" fill="none" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </motion.div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Create Account
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
                  Join us today and get started
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
                      background: 'rgba(34,197,94,0.2)',
                      border: '1px solid rgba(34,197,94,0.4)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <p style={{ color: '#86efac', fontSize: 13, fontWeight: 600, margin: 0 }}>
                      ✅ {success}
                    </p>
                    <p style={{ color: 'rgba(134,239,172,0.7)', fontSize: 12, margin: '4px 0 0' }}>
                      Redirecting to login...
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
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>❌ {error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {[
                  { id: 'name',     label: 'Full Name',      type: 'text',     placeholder: 'John Doe',           hint: null },
                  { id: 'email',    label: 'Email Address',  type: 'email',    placeholder: 'john@example.com',   hint: null },
                  { id: 'password', label: 'Password',       type: 'password', placeholder: '••••••••',           hint: 'Must be at least 6 characters' },
                ].map(({ id, label, type, placeholder, hint }, i) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  >
                    <label
                      htmlFor={id}
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.75)',
                        marginBottom: 6,
                      }}
                    >
                      {label}
                    </label>
                    <input
                      id={id}
                      name={id}
                      type={type}
                      placeholder={placeholder}
                      value={form[id]}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        borderRadius: 12,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onFocus={e => {
                        e.target.style.background = 'rgba(255,255,255,0.2)';
                        e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                      }}
                      onBlur={e => {
                        e.target.style.background = 'rgba(255,255,255,0.12)';
                        e.target.style.borderColor = 'rgba(255,255,255,0.22)';
                      }}
                    />
                    {hint && (
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                        {hint}
                      </p>
                    )}
                  </motion.div>
                ))}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1d4ed8',
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
                        border: '2.5px solid #1d4ed8',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 24 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
                  Sign In
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}