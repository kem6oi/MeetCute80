import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check the link or contact support.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully! You can now log in.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Failed to verify email. The token might be invalid or expired.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light)] to-[var(--accent)] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <FaSpinner className="text-5xl text-[var(--primary)] mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Verifying Email...</h3>
            <p className="text-[var(--text-light)]">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">Email Verified!</h3>
            <p className="text-[var(--text-light)]">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block btn-primary py-2 px-4"
            >
              Proceed to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <FaTimesCircle className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">Verification Failed</h3>
            <p className="text-[var(--text-light)]">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block btn-secondary py-2 px-4"
            >
              Back to Login
            </Link>
             <p className="text-xs text-gray-500 mt-2">If you continue to have issues, please try registering again or contact support.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
