import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

// ✅ FULLY IMPLEMENTED - Was just a placeholder before
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      setSuccess(data.message);
      setEmail(''); // ✅ Clear form on success
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* ✅ Header with icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
          <p className="text-gray-600 text-sm">No worries, we'll send you reset instructions</p>
        </div>

        {/* ✅ Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <p className="font-semibold">✅ {success}</p>
            <p className="text-xs mt-1">Check your email inbox and spam folder</p>
          </div>
        )}

        {/* ✅ Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        {/* ✅ Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(''); // ✅ Clear error on input change
              }}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* ✅ Submit button with loading state */}
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
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* ✅ Back to login link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}