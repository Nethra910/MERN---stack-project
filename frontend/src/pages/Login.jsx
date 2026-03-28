import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // ✅ Added loading state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // ✅ Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // ✅ Set loading

    try {
      const { data } = await API.post('/auth/login', form);
      
      // ✅ FIXED: Access nested data correctly
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user)); // ✅ Store user info
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false); // ✅ Clear loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* ✅ Better header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
          <p className="text-gray-600 text-sm">Sign in to your account</p>
        </div>

        {/* ✅ Error message with better styling */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ Added labels for better accessibility */}
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
              disabled={loading} // ✅ Disable during loading
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
              disabled={loading} // ✅ Disable during loading
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* ✅ Added forgot password link */}
          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
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
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* ✅ Register link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}