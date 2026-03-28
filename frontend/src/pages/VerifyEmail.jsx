import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verify = async () => {
      // ✅ Validate token exists
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const { data } = await API.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(data.message);
        
        // ✅ Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage(err.response?.data?.message || 'Email verification failed. The link may be expired.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        
        {/* ✅ Verifying State */}
        {status === 'verifying' && (
          <>
            <div className="mb-6">
              <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Email</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {/* ✅ Success State */}
        {status === 'success' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified! ✅</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-4">Redirecting to login...</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Go to Login
            </Link>
          </>
        )}

        {/* ✅ Error State */}
        {status === 'error' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed ❌</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                to="/register"
                className="block w-full bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Register Again
              </Link>
              <Link
                to="/login"
                className="block w-full bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}