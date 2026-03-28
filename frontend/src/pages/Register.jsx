import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false); // ✅ Added loading state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // ✅ Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true); // ✅ Set loading

    // ✅ Client-side validation
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
      console.log('✅ Registration successful:', data);
      setSuccess(data.message);
      setForm({ name: '', email: '', password: '' }); // ✅ Clear form
      
      // ✅ Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false); // ✅ Clear loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* ✅ Better header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
          <p className="text-gray-600 text-sm">Join us today and get started</p>
        </div>

        {/* ✅ Success Message with auto-redirect notice */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <p className="font-semibold">✅ {success}</p>
            <p className="text-xs mt-1">Redirecting to login...</p>
          </div>
        )}

        {/* ✅ Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ Added labels for accessibility */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
          </div>

          {/* ✅ Button with loading state */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* ✅ Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}